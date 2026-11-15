"""QA accounting primitives only; importing this module never starts a probe."""

import json
import os
from pathlib import Path
import stat
import threading


# Both N15-03 writers/readers are threads in the same supervisor process.
# Do not ignore ENOENT: serialize our renames and keep real scan errors fatal.
_IO_LOCK = threading.RLock()


def atomic_json(path, data):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.new')
    with _IO_LOCK:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(data, stream, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)


def disk_usage(root):
    """Preserve apparent/allocated non-symlink totals; never suppress I/O errors."""
    apparent = allocated = 0
    with _IO_LOCK:
        pending = [Path(root)]
        while pending:
            with os.scandir(pending.pop()) as entries:
                for entry in entries:
                    info = entry.stat(follow_symlinks=False)
                    if stat.S_ISLNK(info.st_mode):
                        continue
                    apparent += info.st_size
                    allocated += info.st_blocks * 512
                    if stat.S_ISDIR(info.st_mode):
                        pending.append(Path(entry.path))
    return apparent, allocated


def fail_closed(reason, *, failures, stop_event, active, active_lock, report_failure):
    """Immediately close the supervisor gate and kill owned children before logging."""
    termination_errors = []
    with active_lock:
        failures.append(reason)
        stop_event.set()
        for pid, process in tuple(active.items()):
            try:
                process.kill()
            except ProcessLookupError:
                pass  # Already exited; the gate remains closed.
            except Exception as error:
                message = f'Owned child {pid} termination failed: {error}'
                termination_errors.append(message)
                failures.append(message)
    record = {'reason': reason, 'accounting_trustworthy': False,
              'termination_errors': termination_errors}
    try:
        report_failure(record)
    except Exception as error:
        # A broken filesystem cannot guarantee a new durable record. Keep the
        # original failure sticky and expose persistence failure as well.
        message = f'Accounting failure evidence persistence failed: {error}'
        failures.append(message)
        record['persistence_error'] = message
    return record
