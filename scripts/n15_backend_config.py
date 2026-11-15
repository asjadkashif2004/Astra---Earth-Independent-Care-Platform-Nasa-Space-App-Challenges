"""Non-native validation of the isolated, explicitly selected CPU backend file."""
import hashlib
import re
import stat
from pathlib import Path, PurePosixPath

BACKEND_NAME = 'libggml-cpu-haswell.so'
BACKEND_PATH = '/qualified/runtime/' + BACKEND_NAME
BACKEND_SHA256 = 'aec8dcc1487baeac0914aa3f6ba747beb868b61cd398e10c40c39addd2f80b64'


def validate_backend_file(configured_path, manifest, *, expected_sha256=BACKEND_SHA256):
    """Validate trusted controller configuration; never dlopen or execute an ELF.

    The manifest must already be bound to the approved whitelist. Its declared
    dependency closure is checked here; symbol/ABI proof remains a static-preflight
    responsibility. No environment variables or search paths are changed.
    """
    if not isinstance(configured_path, str) or configured_path != BACKEND_PATH:
        raise ValueError('GGML_BACKEND_PATH must be the exact absolute backend FILE path')
    if not PurePosixPath(configured_path).is_absolute():
        raise ValueError('Backend path must be absolute')
    if not isinstance(expected_sha256, str) or not re.fullmatch('[0-9a-f]{64}', expected_sha256):
        raise ValueError('Invalid trusted backend digest')
    rows = [r for r in manifest if r.get('destination') == configured_path]
    if len(rows) != 1:
        raise ValueError('Backend must appear exactly once in the approved whitelist')
    row = rows[0]
    if row.get('name') != BACKEND_NAME or row.get('sha256') != expected_sha256:
        raise ValueError('Backend identity differs from the trusted pin')
    source = Path(row['source'])
    if not source.is_absolute() or not stat.S_ISREG(source.lstat().st_mode):
        raise ValueError('Backend source must be an absolute regular file, not a directory or link')
    payload = source.read_bytes()
    if hashlib.sha256(payload).hexdigest() != expected_sha256:
        raise ValueError('Backend file digest mismatch')
    if (len(payload) < 64 or payload[:7] != b'\x7fELF\x02\x01\x01'
            or int.from_bytes(payload[16:18], 'little') != 3
            or int.from_bytes(payload[18:20], 'little') != 62):
        raise ValueError('Backend must be a little-endian ELF64 x86-64 shared library')
    needed = row.get('needed')
    names = [r.get('name') for r in manifest]
    if not needed or any(names.count(name) != 1 for name in needed):
        raise ValueError('Backend dependency is absent or ambiguous in the whitelist')
    return {'configured_path': configured_path, 'source': str(source),
            'sha256': expected_sha256, 'ELF': 'ELF64/x86-64/DYN',
            'declared_dependencies': needed, 'native_execution': False}
