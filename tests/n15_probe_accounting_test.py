"""Non-native QA: small fixtures, deterministic barriers and mock owned children."""

import ast
import copy
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import threading
import time
import unittest
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('n15_probe_accounting', ROOT / 'scripts/n15_probe_accounting.py')
accounting = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(accounting)
ORIGINAL = ast.parse((ROOT / 'artifacts/n15-03-20261025/probe-source.txt').read_text())
CORRECTED = ast.parse((ROOT / 'artifacts/n15-03a-20261025/probe-source-corrected-final.txt').read_text())


def function(tree, name, namespace):
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
    exec(compile(ast.Module(body=[copy.deepcopy(node)], type_ignores=[]), '<isolated QA function>', 'exec'), namespace)
    return namespace[name]


class AccountingTests(unittest.TestCase):
    def setUp(self):
        self.fixture = tempfile.TemporaryDirectory(prefix='astra-n15-03a-test-')
        self.addCleanup(self.fixture.cleanup)
        self.root = Path(self.fixture.name)
        self.latest = self.root / 'resources-latest.json'

    def test_clean_startup(self):
        self.assertEqual(accounting.disk_usage(self.root), (0, 0))

    def test_atomic_complete_checkpoint_and_private_mode(self):
        accounting.atomic_json(self.latest, {'sequence': 1, 'bytes': 23})
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1, 'bytes': 23})
        self.assertFalse(self.latest.with_suffix('.json.new').exists())
        self.assertEqual(stat.S_IMODE(self.latest.stat().st_mode), 0o600)

    def test_apparent_and_allocated_totals_keep_symlink_policy(self):
        directory = self.root / 'nested'
        directory.mkdir()
        (directory / 'data').write_bytes(b'x' * 37)
        (self.root / 'link').symlink_to(directory / 'data')
        expected = [p.lstat() for p in self.root.rglob('*') if not p.is_symlink()]
        self.assertEqual(accounting.disk_usage(self.root),
                         (sum(s.st_size for s in expected), sum(s.st_blocks * 512 for s in expected)))

    def test_original_race_is_reproduced_without_sleeps(self):
        temporary = self.latest.with_suffix('.json.new')
        temporary.write_text('{"sequence": 1}')
        paths = list(self.root.rglob('*'))

        class EnumeratedThenRenamed:
            def rglob(inner, pattern):
                os.replace(temporary, self.latest)
                return iter(paths)

        original_disk = function(ORIGINAL, 'disk', {'root': EnumeratedThenRenamed()})
        with self.assertRaises(FileNotFoundError):
            original_disk()
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1})

    def test_scan_waits_for_atomic_rename_in_same_critical_section(self):
        ready, release, reader_attempted = (threading.Event() for _ in range(3))
        real_replace, real_scandir = os.replace, os.scandir
        underlying = threading.RLock()
        scans, errors, result = [], [], []

        class ObservedLock:
            def __enter__(inner):
                if threading.current_thread().name == 'accounting-reader':
                    reader_attempted.set()
                underlying.acquire()

            def __exit__(inner, *args):
                underlying.release()

        def rename(source, destination):
            ready.set()
            if not release.wait(3):
                raise AssertionError('writer release missing')
            return real_replace(source, destination)

        def scan(path):
            scans.append(path)
            return real_scandir(path)

        def writer():
            try:
                accounting.atomic_json(self.latest, {'sequence': 2})
            except BaseException as error:
                errors.append(error)

        def reader():
            try:
                result.append(accounting.disk_usage(self.root))
            except BaseException as error:
                errors.append(error)

        with patch.object(accounting, '_IO_LOCK', ObservedLock()), \
             patch.object(accounting.os, 'replace', rename), \
             patch.object(accounting.os, 'scandir', scan):
            writing = threading.Thread(target=writer, name='accounting-writer')
            reading = threading.Thread(target=reader, name='accounting-reader')
            writing.start()
            try:
                self.assertTrue(ready.wait(3))
                reading.start()
                self.assertTrue(reader_attempted.wait(3))
                self.assertEqual(scans, [])  # Reader cannot enumerate .new mid-rename.
            finally:
                release.set()
                writing.join(3)
                if reading.ident is not None:
                    reading.join(3)
            self.assertFalse(writing.is_alive())
            self.assertFalse(reading.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(result, [accounting.disk_usage(self.root)])
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 2})

    def test_concurrent_updates_never_publish_missing_or_torn_JSON(self):
        accounting.atomic_json(self.latest, {'writer': -1, 'sequence': -1, 'mirror': [-1, -1]})
        barrier = threading.Barrier(5, timeout=3)
        errors = []

        def update(writer):
            try:
                for sequence in range(8):
                    barrier.wait()
                    accounting.atomic_json(self.latest, {'writer': writer, 'sequence': sequence,
                                                         'mirror': [writer, sequence]})
                    barrier.wait()
            except BaseException as error:
                errors.append(error)

        threads = [threading.Thread(target=update, args=(i,)) for i in range(4)]
        for thread in threads:
            thread.start()
        completed = False
        try:
            for _ in range(8):
                barrier.wait()
                value = json.loads(self.latest.read_text())
                self.assertEqual(value['mirror'], [value['writer'], value['sequence']])
                accounting.disk_usage(self.root)
                barrier.wait()
            completed = True
        finally:
            if not completed:
                barrier.abort()
            for thread in threads:
                thread.join(3)
        self.assertTrue(all(not t.is_alive() for t in threads))
        self.assertEqual(errors, [])

    def test_interrupted_replace_preserves_complete_committed_checkpoint(self):
        accounting.atomic_json(self.latest, {'sequence': 1})
        with patch.object(accounting.os, 'replace', side_effect=OSError('interrupted replace')):
            with self.assertRaisesRegex(OSError, 'interrupted replace'):
                accounting.atomic_json(self.latest, {'sequence': 2})
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1})
        orphan = self.latest.with_suffix('.json.new')
        self.assertEqual(json.loads(orphan.read_text()), {'sequence': 2})
        self.assertEqual(accounting.disk_usage(self.root)[0], self.latest.stat().st_size + orphan.stat().st_size)

    def test_interrupted_serialization_does_not_replace_checkpoint(self):
        accounting.atomic_json(self.latest, {'sequence': 1})
        with self.assertRaises(TypeError):
            accounting.atomic_json(self.latest, {'sequence': object()})
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1})
        with self.assertRaises(json.JSONDecodeError):
            json.loads(self.latest.with_suffix('.json.new').read_text())

    def test_recovery_uses_only_committed_file_then_allows_new_commit(self):
        accounting.atomic_json(self.latest, {'sequence': 1})
        orphan = self.latest.with_suffix('.json.new')
        orphan.write_text('{"sequence":')
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1})
        self.assertEqual(accounting.disk_usage(self.root)[0], self.latest.stat().st_size + orphan.stat().st_size)
        accounting.atomic_json(self.latest, {'sequence': 3})
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 3})

    def test_orphan_without_committed_checkpoint_is_not_promoted(self):
        self.latest.with_suffix('.json.new').write_text('{"sequence": 9}')
        with self.assertRaises(FileNotFoundError):
            self.latest.read_text()
        self.assertGreater(accounting.disk_usage(self.root)[0], 0)

    def test_corrupt_committed_state_is_not_silently_repaired(self):
        self.latest.write_text('broken')
        self.latest.with_suffix('.json.new').write_text('{"sequence": 9}')
        with self.assertRaises(json.JSONDecodeError):
            json.loads(self.latest.read_text())

    def test_file_and_directory_fsync_order(self):
        operations = []
        fsync, replace = os.fsync, os.replace

        def sync(fd):
            operations.append('directory-fsync' if stat.S_ISDIR(os.fstat(fd).st_mode) else 'file-fsync')
            fsync(fd)

        def rename(source, target):
            operations.append('replace')
            replace(source, target)

        with patch.object(accounting.os, 'fsync', sync), patch.object(accounting.os, 'replace', rename):
            accounting.atomic_json(self.latest, {'sequence': 1})
        self.assertEqual(operations, ['file-fsync', 'replace', 'directory-fsync'])

    def test_directory_fsync_error_is_not_success(self):
        fsync = os.fsync

        def sync(fd):
            if stat.S_ISDIR(os.fstat(fd).st_mode):
                raise OSError('directory persistence failed')
            fsync(fd)

        with patch.object(accounting.os, 'fsync', sync):
            with self.assertRaisesRegex(OSError, 'directory persistence failed'):
                accounting.atomic_json(self.latest, {'sequence': 1})
        self.assertEqual(json.loads(self.latest.read_text()), {'sequence': 1})  # Visible, durability not certified.

    def test_unreadable_scan_fails_instead_of_reporting_zero(self):
        with patch.object(accounting.os, 'scandir', side_effect=PermissionError('unreadable')):
            with self.assertRaises(PermissionError):
                accounting.disk_usage(self.root)

    def test_missing_root_is_not_healthy_zero(self):
        with self.assertRaises(FileNotFoundError):
            accounting.disk_usage(self.root / 'absent')

    def test_genuine_missing_entry_is_not_ignored(self):
        entry = Mock()
        entry.stat.side_effect = FileNotFoundError('uncoordinated deletion')
        context = Mock()
        context.__enter__ = Mock(return_value=iter([entry]))
        context.__exit__ = Mock(return_value=False)
        with patch.object(accounting.os, 'scandir', return_value=context):
            with self.assertRaisesRegex(FileNotFoundError, 'uncoordinated deletion'):
                accounting.disk_usage(self.root)

    def test_staging_symlink_is_rejected(self):
        target = self.root / 'unrelated'
        target.write_text('preserve')
        self.latest.with_suffix('.json.new').symlink_to(target)
        with self.assertRaises(OSError):
            accounting.atomic_json(self.latest, {'sequence': 1})
        self.assertEqual(target.read_text(), 'preserve')


class FailureAndIntegrationTests(unittest.TestCase):
    def context(self):
        return {'failures': [], 'stop_event': threading.Event(), 'active': {1: Mock(), 2: Mock()},
                'active_lock': threading.Lock(), 'report_failure': Mock()}

    def test_owned_children_killed_and_gate_closed_before_failure_persistence(self):
        context = self.context()

        def persist(record):
            self.assertTrue(context['stop_event'].is_set())
            self.assertEqual(context['failures'], ['scan failed'])
            for child in context['active'].values():
                child.kill.assert_called_once_with()
            self.assertFalse(record['accounting_trustworthy'])

        context['report_failure'] = persist
        accounting.fail_closed('scan failed', **context)

    def test_failure_record_can_be_durable_without_altering_last_good_state(self):
        with tempfile.TemporaryDirectory(prefix='astra-n15-03a-failure-') as name:
            good, failure = Path(name) / 'latest.json', Path(name) / 'failure.json'
            accounting.atomic_json(good, {'bytes': 11})
            context = self.context()
            context['report_failure'] = lambda record: accounting.atomic_json(failure, record)
            accounting.fail_closed('scan failed', **context)
            self.assertEqual(json.loads(good.read_text()), {'bytes': 11})
            self.assertFalse(json.loads(failure.read_text())['accounting_trustworthy'])

    def test_unwritable_failure_log_stays_failed_after_children_are_killed(self):
        context = self.context()
        context['report_failure'].side_effect = OSError('disk unavailable')
        result = accounting.fail_closed('scan failed', **context)
        self.assertTrue(context['stop_event'].is_set())
        self.assertIn('disk unavailable', result['persistence_error'])
        self.assertEqual(len(context['failures']), 2)
        for child in context['active'].values():
            child.kill.assert_called_once_with()

    def test_one_child_kill_error_does_not_skip_other_owned_children(self):
        context = self.context()
        context['active'][1].kill.side_effect = PermissionError('kill denied')
        result = accounting.fail_closed('scan failed', **context)
        context['active'][2].kill.assert_called_once_with()
        self.assertTrue(context['stop_event'].is_set())
        self.assertTrue(result['termination_errors'])
        self.assertTrue(any('kill denied' in error for error in context['failures']))

    def test_already_exited_child_does_not_reopen_gate(self):
        context = self.context()
        context['active'][1].kill.side_effect = ProcessLookupError()
        result = accounting.fail_closed('scan failed', **context)
        self.assertEqual(result['termination_errors'], [])
        self.assertTrue(context['stop_event'].is_set())

    def test_actual_observer_scan_error_stops_after_first_failure(self):
        context = self.context()
        scan, events = Mock(side_effect=PermissionError('fixture scan failed')), []
        scope = {'stop': context['stop_event'], 'violation': context['failures'], 'active': context['active'],
                 'lock': context['active_lock'], 'disk': scan, 'fail_closed': accounting.fail_closed,
                 'event': lambda *args, **data: events.append((args, data))}
        function(CORRECTED, 'observe', scope)()
        scan.assert_called_once_with()
        self.assertTrue(context['stop_event'].is_set())
        self.assertEqual(events[0][0], ('accounting-failure',))
        for child in context['active'].values():
            child.kill.assert_called_once_with()

    def test_actual_observer_checkpoint_error_immediately_kills_children(self):
        context = self.context()
        persistence = Mock(side_effect=OSError('fixture persistence failed'))
        status = Mock(read_text=Mock(return_value='VmRSS: 1 kB\nVmHWM: 1 kB\n'))
        scope = {'stop': context['stop_event'], 'violation': context['failures'], 'active': context['active'],
                 'lock': context['active_lock'], 'disk': lambda: (0, 0), 'fail_closed': accounting.fail_closed,
                 'event': Mock(), 'os': Mock(getpid=Mock(return_value=99)), 'Path': Mock(return_value=status),
                 're': __import__('re'), 'peaks': {}, 'LIMIT': 2000000000, 'atomic': persistence,
                 'state': {}, 'root': Path('/unused-fixture'), 'time': Mock(monotonic=Mock(return_value=1)), 'start': 0}
        function(CORRECTED, 'observe', scope)()
        persistence.assert_called_once()
        self.assertTrue(context['stop_event'].is_set())
        for child in context['active'].values():
            child.kill.assert_called_once_with()

    def test_sticky_failure_prevents_next_action(self):
        context = self.context()
        accounting.fail_closed('scan failed', **context)
        disk = Mock()
        gate = function(CORRECTED, 'check', {'violation': context['failures'], 'disk': disk, 'WATERMARK': 1350000000})
        with self.assertRaisesRegex(RuntimeError, 'scan failed'):
            gate()
        disk.assert_not_called()

    def test_storage_watermark_boundaries_remain_unchanged(self):
        for value in [1349999999, 1350000000, 1500000000]:
            with self.subTest(value=value):
                gate = function(CORRECTED, 'check', {'violation': [], 'disk': lambda: (value, 0), 'WATERMARK': 1350000000})
                if value < 1350000000:
                    gate()
                else:
                    with self.assertRaisesRegex(RuntimeError, 'Storage precautionary watermark'):
                        gate()

    def test_actual_wrappers_use_corrected_helpers(self):
        writer, scanner = Mock(), Mock(return_value=(17, 4096))
        function(CORRECTED, 'atomic', {'atomic_json': writer})('fixture.json', {'a': 1})
        writer.assert_called_once_with('fixture.json', {'a': 1})
        self.assertEqual(function(CORRECTED, 'disk', {'disk_usage': scanner, 'root': 'fixture-root'})(), (17, 4096))
        scanner.assert_called_once_with('fixture-root')

    def test_failure_between_precheck_and_child_registration_blocks_spawn(self):
        context = self.context()
        context['active'].clear()
        subprocess = Mock()

        def initial_check():
            accounting.fail_closed('accounting failed during startup', **context)

        with tempfile.TemporaryDirectory(prefix='astra-n15-03a-start-') as name:
            scope = {'check': initial_check, 'root': Path(name), 'time': time, 'lock': context['active_lock'],
                     'violation': context['failures'], 'stop': context['stop_event'], 'subprocess': subprocess,
                     'active': context['active']}
            with self.assertRaisesRegex(RuntimeError, 'accounting failed during startup'):
                function(CORRECTED, 'run', scope)(['fixture-only'], 'start')
        subprocess.Popen.assert_not_called()
        self.assertEqual(context['active'], {})

    def test_healthy_child_registration_and_completion_positive_control(self):
        context = self.context()
        context['active'].clear()
        child = Mock(pid=321, wait=Mock(return_value=0))

        def created(*args, **kwargs):
            self.assertTrue(context['active_lock'].locked())
            return child

        subprocess = Mock(Popen=Mock(side_effect=created), DEVNULL=-3)
        with tempfile.TemporaryDirectory(prefix='astra-n15-03a-positive-') as name:
            scope = {'check': Mock(), 'root': Path(name), 'time': time, 'lock': context['active_lock'],
                     'violation': context['failures'], 'stop': context['stop_event'], 'subprocess': subprocess,
                     'active': context['active'], 'peaks': {}, 'event': Mock()}
            self.assertEqual(function(CORRECTED, 'run', scope)(['fixture-only'], 'start'), '')
            self.assertEqual(scope['check'].call_count, 2)
        subprocess.Popen.assert_called_once()
        child.wait.assert_called_once_with(timeout=10)
        child.kill.assert_not_called()
        self.assertEqual(context['active'], {})

    def test_runtime_identity_limits_guards_and_launcher_unchanged(self):
        old, new = copy.deepcopy(ORIGINAL), copy.deepcopy(CORRECTED)
        old_observe = next(n for n in old.body if isinstance(n, ast.FunctionDef) and n.name == 'observe')
        new_observe = next(n for n in new.body if isinstance(n, ast.FunctionDef) and n.name == 'observe')
        old_handler = next(n for n in ast.walk(old_observe) if isinstance(n, ast.ExceptHandler) and n.name == 'e')
        new_handler = next(n for n in ast.walk(new_observe) if isinstance(n, ast.ExceptHandler) and n.name == 'e')
        old_handler.body = new_handler.body = [ast.Pass()]
        self.assertEqual(ast.dump(old_observe), ast.dump(new_observe))

        old_run = next(n for n in old.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        new_run = next(n for n in new.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        old_io = next(n for n in ast.walk(old_run) if isinstance(n, ast.With)
                      and isinstance(n.items[0].context_expr, ast.Call)
                      and ast.unparse(n.items[0].context_expr.func) == 'open')
        new_io = next(n for n in ast.walk(new_run) if isinstance(n, ast.With)
                      and isinstance(n.items[0].context_expr, ast.Call)
                      and ast.unparse(n.items[0].context_expr.func) == 'open')
        critical = new_io.body[0]
        self.assertEqual(ast.unparse(critical.items[0].context_expr), 'lock')
        self.assertEqual(ast.unparse(critical.body[0].test), 'violation')
        self.assertEqual(ast.unparse(critical.body[1].test), 'stop.is_set()')
        self.assertEqual(ast.dump(critical.body[2]), ast.dump(old_io.body[0]))
        self.assertEqual(ast.dump(critical.body[3]), ast.dump(old_io.body[1].body[0]))
        new_io.body[0:1] = copy.deepcopy(old_io.body[:2])
        self.assertEqual(ast.dump(old_run), ast.dump(new_run))

        def retained(tree):
            nodes = []
            for node in tree.body:
                if isinstance(node, ast.FunctionDef) and node.name in ['atomic', 'disk']:
                    continue
                if isinstance(node, ast.ImportFrom) and node.module == 'n15_probe_accounting':
                    continue
                if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and ast.unparse(node.value.func) == 'sys.path.insert':
                    continue
                if isinstance(node, ast.Import):
                    node.names = [n for n in node.names if n.name != 'sys']
                nodes.append(node)
            return ast.dump(ast.Module(body=nodes, type_ignores=[]))
        self.assertEqual(retained(old), retained(new))


if __name__ == '__main__':
    unittest.main()
