"""QA supervision only. Importing never starts an observer or a native process.

Keep the frozen containment/accounting implementation intact. The observer's
copy of storage traversal is cancellable; foreground gates and final accounting
still use the original complete scan. An interrupted scan is never a sample.
"""
import json
import os
from pathlib import Path
import resource
import stat
import threading
import time

_PUBLISH_LOCK = threading.RLock()


class ObserverStopped(Exception):
    """Cooperative shutdown, distinct from an accounting error."""


def publish(path, data):
    """Serialize lifecycle writers, independently of a possibly stuck scan lock.

    Used only after closing the resource gate. Failure receipts are serialized;
    the finalizer alone writes shutdown/report paths. Retain replace + fsync.
    """
    with _PUBLISH_LOCK:
        path = Path(path)
        temporary = path.with_suffix(path.suffix + '.new')
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


class ProbeObserver:
    JOIN_SECONDS = 5  # Preserve the existing shutdown deadline.

    def __init__(self, context, *, thread_factory=threading.Thread):
        self.c = context
        self.original_storage = context.storage
        self.thread_factory = thread_factory
        self.thread = None
        self.entered = threading.Event()
        self.done = threading.Event()
        self.failure_lock = threading.RLock()
        self.activity = 'not_started'
        self.interrupted_scan = False
        context.storage = self.storage
        context.finish = self.finish

    def check_stop(self):
        if self.c.halt.is_set():
            raise ObserverStopped()

    def storage(self):
        if threading.current_thread() is not self.thread:
            return self.original_storage()
        c = self.c
        self.activity = 'waiting_accounting_lock'
        while not c.accounting._IO_LOCK.acquire(timeout=.05):
            self.check_stop()
        try:
            self.activity = 'storage_scan'
            apparent = allocated = 0
            # Same inode/symlink/root/external totals as the original storage().
            # Check between entries and roots, including before any new I/O.
            for base in c.count_roots:
                self.check_stop()
                pending = [Path(base)]
                while pending:
                    self.check_stop()
                    with os.scandir(pending.pop()) as entries:
                        for entry in entries:
                            self.check_stop()
                            info = entry.stat(follow_symlinks=False)
                            apparent += info.st_size
                            allocated += info.st_blocks * 512
                            if stat.S_ISDIR(info.st_mode):
                                pending.append(Path(entry.path))
                self.check_stop()
                info = base.lstat()
                apparent += info.st_size
                allocated += info.st_blocks * 512
            for path in [Path(c.__file__), c.MARK, c.HELPER] + c.admitted_external:
                self.check_stop()
                info = path.stat()
                apparent += info.st_size
                allocated += info.st_blocks * 512
            self.check_stop()
            return apparent, allocated
        finally:
            c.accounting._IO_LOCK.release()

    def fail(self, reason):
        c = self.c
        with self.failure_lock:
            c.accounting.fail_closed(reason, failures=c.failures, stop_event=c.halt,
                active=c.active, active_lock=c.active_lock,
                report_failure=lambda record: publish(c.root / 'accounting-failure.json',
                    {**record, 'failures': list(c.failures), 'observer_activity': self.activity}))

    def start(self):
        try:
            self.thread = self.thread_factory(target=self.observe, daemon=True)
            self.c.observer = self.thread
            self.thread.start()
            if not self.entered.wait(self.JOIN_SECONDS):
                raise RuntimeError('Observer startup did not enter monitoring')
            if self.c.failures or self.done.is_set():
                raise RuntimeError('Observer stopped during startup')
        except BaseException as error:
            self.fail('Observer startup failed: ' + str(error))
            raise

    def observe(self):
        c = self.c
        self.entered.set()
        try:
            while not c.halt.is_set():
                started = time.monotonic()
                self.activity = 'scan'
                sample = c.scan()
                self.check_stop()
                self.activity = 'waiting_checkpoint_lock'
                while not c.accounting._IO_LOCK.acquire(timeout=.05):
                    self.check_stop()
                try:
                    self.check_stop()
                    self.activity = 'checkpoint'
                    c.atomic('resources-latest.json', sample)
                    with (c.root / 'resources.jsonl').open('a') as stream:
                        stream.write(json.dumps(sample) + '\n')
                        stream.flush()
                        os.fsync(stream.fileno())
                    c.samples.append(sample)
                finally:
                    c.accounting._IO_LOCK.release()
                self.activity = 'waiting_interval'
                c.halt.wait(max(0, .25 - (time.monotonic() - started)))
        except ObserverStopped:
            self.interrupted_scan = True
        except BaseException as error:
            self.fail('Observer failed: ' + str(error))
        finally:
            self.activity = 'stopped'
            self.done.set()

    def finish(self):
        c = self.c
        # Close registration and wake interval/lock/traversal checks first.
        with c.active_lock:
            c.halt.set()
            children = list(c.active.items())
        # Preserve owned wrappers until reaped. Their unchanged private-PID/
        # die-with-parent containment handles native descendants.
        for pid, child in children:
            try:
                if child.poll() is None:
                    child.kill()
                child.wait(timeout=self.JOIN_SECONDS)
                with c.active_lock:
                    c.active.pop(pid, None)
            except BaseException as error:
                self.fail(f'Owned child {pid} cleanup failed: {error}')
        if self.thread is not None and self.thread.ident is not None:
            self.thread.join(self.JOIN_SECONDS)
        alive = self.thread is not None and self.thread.is_alive()
        complete = self.entered.is_set() and self.done.is_set() and not alive
        if not complete:
            self.fail('Observer shutdown incomplete: ' + self.activity)
        lifecycle = {'observer_alive': alive, 'started': self.entered.is_set(),
            'completed': complete, 'activity': self.activity, 'join_seconds': self.JOIN_SECONDS,
            'interrupted_scan_discarded': self.interrupted_scan}
        final = None
        if not alive:
            try:
                final = self.original_storage()
                if max(final) >= c.WATERMARK:
                    raise RuntimeError('Storage precautionary stop watermark at final accounting')
            except BaseException as error:
                self.fail('Final accounting failed: ' + str(error))
                final = None
        if c.failures or c.active or not complete or final is None:
            c.state['status'] = 'PARTIAL' if c.state['native_commands'] else 'BLOCKED'
        c.state['accounting_failures'] = list(c.failures)
        c.state['observer_lifecycle'] = lifecycle
        c.state['resources'] = {'elapsed_s': time.monotonic() - c.start,
            'observations': len(c.samples), 'final_apparent': final[0] if final else None,
            'final_allocated': final[1] if final else None, 'final_measurement_verified': final is not None,
            'max_sampled_allocated': max((s['allocated_bytes'] for s in c.samples), default=0),
            'process_RSS_peaks': c.peaks,
            'supervisor_kernel_lifetime_RSS_bytes': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024,
            'max_reaped_child_kernel_RSS_bytes': resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss * 1024,
            'owned_processes_remaining': len(c.active), 'observer_alive': alive}
        try:
            publish(c.root / 'observer-shutdown.json', lifecycle)
            publish(c.root / 'report.json', c.state)
        except BaseException as error:
            self.fail('Final report persistence failed: ' + str(error))
            c.state['status'] = 'PARTIAL' if c.state['native_commands'] else 'BLOCKED'
            raise
