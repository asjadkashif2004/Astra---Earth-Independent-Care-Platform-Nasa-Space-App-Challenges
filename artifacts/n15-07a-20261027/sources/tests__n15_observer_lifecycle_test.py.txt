"""Deterministic non-native QA: fixture trees, thread barriers, mocked children."""
import ast
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import threading
import time
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import n15_probe_accounting as accounting
from n15_observer_lifecycle import ProbeObserver, publish


class ObserverTests(unittest.TestCase):
    def context(self):
        tmp = tempfile.TemporaryDirectory(prefix='astra-n15-07a-qa-')
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        for name in ['controller.py', 'helper.py', 'marker.json']:
            (root / name).write_text('fixture')
        (root / 'nested').mkdir()
        (root / 'nested/data').write_bytes(b'fixture data')
        (root / 'link').symlink_to(root / 'nested/data')
        c = SimpleNamespace(root=root, __file__=str(root / 'controller.py'), MARK=root / 'marker.json',
            HELPER=root / 'helper.py', count_roots=[root], admitted_external=[], accounting=accounting,
            halt=threading.Event(), active={}, active_lock=threading.RLock(), failures=[], samples=[], peaks={},
            start=time.monotonic(), WATERMARK=1350000000, state={'status': 'PASS', 'native_commands': 1})
        # Real original accounting definition, small fixtures only. Never load
        # the frozen one-shot runtime or execute its setup/native functions.
        tree = ast.parse((ROOT / 'artifacts/n15-03h-20261027/probe-source.txt').read_text())
        node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'storage')
        namespace = dict(vars(c), Path=Path, os=os, stat=stat)
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<original fixture accounting>', 'exec'), namespace)
        c.storage = namespace['storage']

        def scan():
            a, b = c.storage()
            if max(a, b) >= c.WATERMARK:
                raise RuntimeError('Storage precautionary stop watermark')
            return {'allocated_bytes': b, 'apparent_bytes': a}

        c.scan = scan
        c.atomic = lambda name, row: accounting.atomic_json(root / name, row)
        c.samples.append(c.scan())
        c.atomic('resources-latest.json', c.samples[-1])
        return c

    def monitor(self, c, **options):
        observer = ProbeObserver(c, **options)

        def cleanup():
            c.halt.set()
            if observer.thread is not None and observer.thread.ident is not None:
                observer.thread.join(2)
                self.assertFalse(observer.thread.is_alive(), 'QA leaked an observer')
        self.addCleanup(cleanup)
        return observer

    def report(self, c):
        return json.loads((c.root / 'report.json').read_text())

    def test_normal_completion_stops_observer_and_commits_final_accounting(self):
        c = self.context()
        checkpoint = threading.Event()
        atomic = c.atomic
        c.atomic = lambda name, row: (atomic(name, row), checkpoint.set())
        o = self.monitor(c)
        o.start()
        self.assertTrue(checkpoint.wait(2))
        o.finish()
        r = self.report(c)
        self.assertEqual(r['status'], 'PASS')
        self.assertTrue(r['observer_lifecycle']['completed'])
        self.assertFalse(r['resources']['observer_alive'])
        self.assertTrue(r['resources']['final_measurement_verified'])
        self.assertEqual(r['accounting_failures'], [])
        self.assertEqual(json.loads((c.root / 'resources-latest.json').read_text()), c.samples[-1])
        self.assertFalse((c.root / 'report.json.new').exists())

    def test_stop_wakes_pending_interval_wait(self):
        c = self.context()
        entered_wait = threading.Event()
        event = c.halt

        class ObservedEvent:
            is_set = event.is_set
            set = event.set

            def wait(self, timeout):
                entered_wait.set()
                return event.wait(timeout)

        c.halt = ObservedEvent()
        o = self.monitor(c)
        o.start()
        self.assertTrue(entered_wait.wait(2))
        o.finish()
        self.assertTrue(self.report(c)['observer_lifecycle']['completed'])

    def test_stop_interrupts_accounting_lock_wait_without_extending_join(self):
        c = self.context()
        entered = threading.Event()
        real = accounting._IO_LOCK

        class ObservedLock:
            def acquire(self, **kwargs):
                entered.set()
                return real.acquire(**kwargs)

            release = real.release

        o = self.monitor(c)
        with real, patch.object(accounting, '_IO_LOCK', ObservedLock()):
            o.start()
            self.assertTrue(entered.wait(2))
            c.halt.set()
            o.thread.join(2)
            self.assertFalse(o.thread.is_alive())
        o.finish()
        self.assertEqual(ProbeObserver.JOIN_SECONDS, 5)
        self.assertTrue(self.report(c)['observer_lifecycle']['interrupted_scan_discarded'])

    def test_stop_mid_traversal_does_not_publish_partial_totals(self):
        c = self.context()
        old = (c.root / 'resources-latest.json').read_bytes()
        first_entry = threading.Event()
        release = threading.Event()
        scan = os.scandir
        o = self.monitor(c)

        class Entry:
            def __init__(self, actual):
                self.actual = actual
                self.path = actual.path

            def stat(self, **kwargs):
                first_entry.set()
                if not release.wait(2):
                    raise RuntimeError('missing test release')
                return self.actual.stat(**kwargs)

        class Entries:
            def __init__(self, path):
                self.actual = scan(path)

            def __enter__(self):
                return (Entry(entry) for entry in self.actual)

            def __exit__(self, *args):
                self.actual.close()

        with patch('n15_observer_lifecycle.os.scandir', side_effect=Entries):
            o.start()
            try:
                self.assertTrue(first_entry.wait(2))
                c.halt.set()
            finally:
                release.set()
                o.thread.join(2)
            self.assertFalse(o.thread.is_alive())
        self.assertEqual((c.root / 'resources-latest.json').read_bytes(), old)
        self.assertEqual(len(c.samples), 1)
        o.finish()
        self.assertTrue(self.report(c)['resources']['final_measurement_verified'])

    def test_observer_totals_match_original_roots_symlinks_and_external_policy(self):
        c = self.context()
        o = self.monitor(c)
        expected = o.original_storage()
        o.thread = threading.current_thread()  # Only exercise observer traversal.
        self.assertEqual(o.storage(), expected)
        o.thread = None

    def test_original_scan_is_not_interruptible_by_halt(self):
        c = self.context()
        entered, release = threading.Event(), threading.Event()
        source = ast.parse((ROOT / 'artifacts/n15-04c-20261027/common-source.txt').read_text())
        node = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'observe')

        def scan():
            entered.set()
            if not release.wait(2):
                raise RuntimeError('fixture release missing')
            return {'allocated_bytes': 1}

        namespace = dict(vars(c), scan=scan, time=time, os=os, json=json)
        exec(compile(ast.Module(body=[node], type_ignores=[]), '<old observer fixture>', 'exec'), namespace)
        thread = threading.Thread(target=namespace['observe'])
        thread.start()
        try:
            self.assertTrue(entered.wait(2))
            c.halt.set()
            thread.join(0)
            self.assertTrue(thread.is_alive())  # halt cannot interrupt old scan.
        finally:
            release.set()
            thread.join(2)
        self.assertFalse(thread.is_alive())

    def test_startup_failure_is_durable_and_never_passes(self):
        c = self.context()
        o = self.monitor(c, thread_factory=Mock(side_effect=RuntimeError('thread unavailable')))
        with self.assertRaisesRegex(RuntimeError, 'thread unavailable'):
            o.start()
        o.finish()
        self.assertEqual(self.report(c)['status'], 'PARTIAL')
        self.assertFalse(self.report(c)['observer_lifecycle']['completed'])
        self.assertIn('startup failed', (c.root / 'accounting-failure.json').read_text())

    def test_scan_crash_kills_children_and_preserves_last_good_checkpoint(self):
        c = self.context()
        old = (c.root / 'resources-latest.json').read_bytes()
        child = Mock()
        c.active[42] = child
        c.scan = Mock(side_effect=OSError('fixture scan crash'))
        o = self.monitor(c)
        try:
            o.start()
        except RuntimeError:
            pass  # Crash can occur during or immediately after start handshake.
        self.assertTrue(o.done.wait(2))
        o.finish()
        self.assertEqual(self.report(c)['status'], 'PARTIAL')
        self.assertEqual((c.root / 'resources-latest.json').read_bytes(), old)
        self.assertTrue(any('fixture scan crash' in reason for reason in c.failures))
        self.assertTrue(child.kill.called)
        self.assertEqual(c.active, {})

    def test_observer_timeout_fails_closed_without_waiting_on_stuck_scan_lock(self):
        c = self.context()
        o = ProbeObserver(c)
        thread = Mock(ident=123, is_alive=Mock(return_value=True))
        o.thread = thread
        o.entered.set()
        o.activity = 'checkpoint'
        o.original_storage = Mock(side_effect=AssertionError('must not scan behind stuck observer'))
        o.finish()
        thread.join.assert_called_once_with(5)
        self.assertEqual(self.report(c)['status'], 'PARTIAL')
        self.assertFalse(self.report(c)['resources']['final_measurement_verified'])
        self.assertTrue(self.report(c)['resources']['observer_alive'])
        o.original_storage.assert_not_called()

    def test_startup_timeout_and_unexpected_exit_are_failures(self):
        for alive in [True, False]:
            with self.subTest(alive=alive):
                c = self.context()
                thread = Mock(ident=123, is_alive=Mock(return_value=alive))
                o = ProbeObserver(c, thread_factory=Mock(return_value=thread))
                o.entered = Mock(wait=Mock(return_value=False), is_set=Mock(return_value=False))
                with self.assertRaisesRegex(RuntimeError, 'did not enter'):
                    o.start()
                o.finish()
                self.assertNotEqual(self.report(c)['status'], 'PASS')

    def test_owned_children_are_killed_reaped_and_removed_only_after_wait(self):
        c = self.context()
        first, second = Mock(poll=Mock(return_value=None)), Mock(poll=Mock(return_value=0))
        c.active.update({1: first, 2: second})
        o = self.monitor(c)
        o.start()
        o.finish()
        first.kill.assert_called_once_with()
        second.kill.assert_not_called()
        for child in [first, second]:
            child.wait.assert_called_once_with(timeout=5)
        self.assertEqual(self.report(c)['resources']['owned_processes_remaining'], 0)

    def test_child_cleanup_failure_does_not_hide_remaining_owned_process(self):
        c = self.context()
        stuck = Mock(poll=Mock(return_value=None), wait=Mock(side_effect=TimeoutError('child stuck')))
        good = Mock(poll=Mock(return_value=None))
        c.active.update({1: stuck, 2: good})
        o = self.monitor(c)
        o.start()
        o.finish()
        r = self.report(c)
        self.assertEqual(r['status'], 'PARTIAL')
        self.assertEqual(set(c.active), {1})
        self.assertTrue(good.wait.called)
        self.assertEqual(r['resources']['owned_processes_remaining'], 1)

    def test_checkpoint_failure_is_sticky_and_no_incomplete_sample_is_admitted(self):
        c = self.context()
        old = (c.root / 'resources-latest.json').read_bytes()
        c.atomic = Mock(side_effect=OSError('checkpoint write failed'))
        o = self.monitor(c)
        try:
            o.start()
        except RuntimeError:
            pass
        self.assertTrue(o.done.wait(2))
        o.finish()
        self.assertEqual(self.report(c)['status'], 'PARTIAL')
        self.assertEqual((c.root / 'resources-latest.json').read_bytes(), old)
        self.assertEqual(len(c.samples), 1)

    def test_final_accounting_failure_is_not_filled_with_a_stale_sample(self):
        c = self.context()
        o = self.monitor(c)
        o.start()
        o.original_storage = Mock(side_effect=OSError('final scan failed'))
        o.finish()
        self.assertIsNone(self.report(c)['resources']['final_allocated'])
        self.assertEqual(self.report(c)['status'], 'PARTIAL')

    def test_final_watermark_is_not_relaxed(self):
        c = self.context()
        o = self.monitor(c)
        o.start()
        o.original_storage = lambda: (1350000000, 1350000000)
        o.finish()
        self.assertEqual(self.report(c)['status'], 'PARTIAL')
        self.assertTrue(any('watermark' in reason for reason in c.failures))

    def test_report_failure_cannot_skip_child_cleanup_or_claim_success(self):
        c = self.context()
        child = Mock(poll=Mock(return_value=None))
        c.active[1] = child
        o = self.monitor(c)
        o.start()
        replace = os.replace

        def fail_report(src, dst):
            if Path(dst).name == 'report.json':
                raise OSError('report interrupted')
            return replace(src, dst)

        with patch('n15_observer_lifecycle.os.replace', side_effect=fail_report):
            with self.assertRaisesRegex(OSError, 'report interrupted'):
                o.finish()
        child.wait.assert_called_once_with(timeout=5)
        self.assertFalse(o.thread.is_alive())
        self.assertEqual(c.state['status'], 'PARTIAL')
        self.assertIn('report interrupted', (c.root / 'accounting-failure.json').read_text())

    def test_atomic_interruption_preserves_previous_complete_report(self):
        c = self.context()
        path = c.root / 'fixture-report.json'
        publish(path, {'complete': 1})
        with patch('n15_observer_lifecycle.os.replace', side_effect=OSError('interruption')):
            with self.assertRaises(OSError):
                publish(path, {'complete': 2})
        self.assertEqual(json.loads(path.read_text()), {'complete': 1})
        self.assertEqual(json.loads(path.with_suffix('.json.new').read_text()), {'complete': 2})

    def test_concurrent_failure_receipts_retain_both_reasons_atomically(self):
        c = self.context()
        o = ProbeObserver(c)
        rendezvous = threading.Barrier(3)
        errors = []

        def failure(reason):
            try:
                rendezvous.wait(2)
                o.fail(reason)
            except BaseException as error:
                errors.append(error)

        threads = [threading.Thread(target=failure, args=(reason,)) for reason in ['first', 'second']]
        for thread in threads:
            thread.start()
        rendezvous.wait(2)
        for thread in threads:
            thread.join(2)
            self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        record = json.loads((c.root / 'accounting-failure.json').read_text())
        self.assertEqual(set(record['failures']), {'first', 'second'})
        self.assertTrue(c.halt.is_set())

    def test_directory_fsync_failure_is_not_reported_as_durable_success(self):
        c = self.context()
        sync = os.fsync

        def fail_directory(fd):
            if stat.S_ISDIR(os.fstat(fd).st_mode):
                raise OSError('directory fsync failed')
            sync(fd)

        with patch('n15_observer_lifecycle.os.fsync', side_effect=fail_directory):
            with self.assertRaisesRegex(OSError, 'directory fsync failed'):
                publish(c.root / 'interrupted.json', {'complete': 1})

    def test_runtime_installs_lifecycle_inside_finalized_try_before_native_work(self):
        tree = ast.parse((ROOT / 'scripts/n15_research_runtime.py').read_text())
        setup = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'setup')
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        self.assertIn('c.observer_lifecycle = ProbeObserver(c)', ast.unparse(setup))
        self.assertIn('c.observer_lifecycle.start()', ast.unparse(setup))
        managed = next(n for n in main.body if isinstance(n, ast.Try))
        self.assertEqual(ast.unparse(managed.body[0]), 'setup(base, c, task)')
        self.assertIn('c.finish()', ast.unparse(ast.Module(body=managed.finalbody, type_ignores=[])))


if __name__ == '__main__':
    unittest.main()
