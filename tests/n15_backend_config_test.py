"""Deterministic fixtures; no acquired ELF is loaded or executed."""
import copy
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    'backend_config', Path(__file__).resolve().parents[1] / 'scripts/n15_backend_config.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


class BackendConfigTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.file = Path(self.tmp.name) / backend.BACKEND_NAME
        payload = bytearray(64)
        payload[:7] = b'\x7fELF\x02\x01\x01'
        payload[16:20] = b'\x03\x00\x3e\x00'
        self.file.write_bytes(payload)
        self.sha = hashlib.sha256(payload).hexdigest()
        self.rows = [{'name': backend.BACKEND_NAME, 'source': str(self.file),
                      'destination': backend.BACKEND_PATH, 'sha256': self.sha,
                      'needed': ['libc.so.6']}, {'name': 'libc.so.6'}]

    def check(self, path=None, rows=None):
        return backend.validate_backend_file(
            backend.BACKEND_PATH if path is None else path,
            self.rows if rows is None else rows, expected_sha256=self.sha)

    def test_regular_pinned_whitelisted_file_accepts(self):
        self.assertEqual(self.check()['sha256'], self.sha)

    def test_original_directory_configuration_rejects(self):
        with self.assertRaises(ValueError):
            self.check('/qualified/runtime')

    def test_noncanonical_paths_reject(self):
        for path in ['', 'libggml-cpu-haswell.so', '/qualified/runtime/../runtime/' + backend.BACKEND_NAME,
                     backend.BACKEND_PATH + '/', '/qualified/runtime/other.so', 1]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.check(path)

    def test_source_directory_rejects(self):
        self.rows[0]['source'] = self.tmp.name
        with self.assertRaises(ValueError):
            self.check()

    def test_source_symlink_rejects(self):
        link = Path(self.tmp.name) / 'link.so'
        link.symlink_to(self.file)
        self.rows[0]['source'] = str(link)
        with self.assertRaises(ValueError):
            self.check()

    def test_missing_source_fails_closed(self):
        self.file.unlink()
        with self.assertRaises(FileNotFoundError):
            self.check()

    def test_corrupted_file_rejects(self):
        self.file.write_bytes(self.file.read_bytes() + b'corrupt')
        with self.assertRaises(ValueError):
            self.check()

    def test_false_manifest_digest_rejects(self):
        self.rows[0]['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            self.check()

    def test_absent_or_duplicate_whitelist_rejects(self):
        for rows in [self.rows[1:], self.rows + [copy.deepcopy(self.rows[0])]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                self.check(rows=rows)

    def test_missing_or_duplicate_dependency_rejects(self):
        for rows in [self.rows[:1], self.rows + [{'name': 'libc.so.6'}]]:
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                self.check(rows=rows)

    def test_wrong_elf_identity_rejects(self):
        data = bytearray(self.file.read_bytes())
        data[18:20] = b'\xb7\x00'
        self.file.write_bytes(data)
        self.sha = hashlib.sha256(data).hexdigest()
        self.rows[0]['sha256'] = self.sha
        with self.assertRaises(ValueError):
            self.check()

    def test_wrong_name_rejects(self):
        self.rows[0]['name'] = 'other.so'
        with self.assertRaises(ValueError):
            self.check()


if __name__ == '__main__':
    unittest.main()
