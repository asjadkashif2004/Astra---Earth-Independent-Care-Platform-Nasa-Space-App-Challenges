"""Focused offline QA; downloader main and real network requests never execute."""
import ast
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock
from urllib.request import HTTPRedirectHandler, Request
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from n15_redirect_diagnostics import sanitized_redirect, sanitized_failure

BEFORE=ROOT/'artifacts/n15-04-20261027/download-source.txt'
AFTER=ROOT/'artifacts/n15-04a-20261027/downloader-after-final.txt'
REV='9217f5db79a29953eb74d5343926648285ec7e67'
URL='https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/'+REV+'/qwen2.5-0.5b-instruct-q4_k_m.gguf'


def definitions(path):
    events=[]
    namespace={'urlsplit':urlsplit,'HTTPRedirectHandler':HTTPRedirectHandler,
               'sanitized_redirect':sanitized_redirect,'sanitized_failure':sanitized_failure,'redirects':[],
               'support_bytes':0,'start':0,'time':Mock(monotonic=lambda:1),
               'Request':Request,'log':lambda event,**data:events.append((event,data))}
    tree=ast.parse(path.read_text())
    nodes=[node for node in tree.body if isinstance(node,(ast.FunctionDef,ast.ClassDef)) and node.name in ['allowed','Redirect']]
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(path),'exec'),namespace)
    return namespace,events


class RedirectDiagnosticsTests(unittest.TestCase):
    def test_allowed_scheme_and_hostname_only(self):
        d=sanitized_redirect(URL,302)
        self.assertEqual((d['scheme'],d['hostname'],d['http_status']),('https','huggingface.co',302))
        self.assertTrue(d['well_formed'])
        self.assertNotIn('path',d)

    def test_blocked_host_and_safe_reason_retained(self):
        d=sanitized_redirect('https://blocked.example.invalid/object?Signature=DO_NOT_STORE',302,RuntimeError('Redirect host outside strict publisher/CDN allowlist'))
        self.assertEqual(d['hostname'],'blocked.example.invalid')
        self.assertEqual(d['rejection_reason'],'Redirect host outside strict publisher/CDN allowlist')
        self.assertNotIn('DO_NOT_STORE',json.dumps(d))

    def test_malformed_ipv6_does_not_expose_input(self):
        d=sanitized_redirect('https://[malformed?access_token=DO_NOT_STORE',302,ValueError('Invalid IPv6 URL'))
        self.assertFalse(d['well_formed'])
        self.assertNotIn('DO_NOT_STORE',json.dumps(d))

    def test_credentials_query_fragment_are_redacted(self):
        d=sanitized_redirect('https://PRIVATE_USER:PRIVATE_PASSWORD@huggingface.co/object?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT',307,RuntimeError('Unsafe model transport URL'))
        self.assertEqual(d['hostname'],'huggingface.co')
        self.assertTrue(d['credentials_present'])
        self.assertTrue(d['query_present'])
        self.assertTrue(d['fragment_present'])
        for secret in ['PRIVATE_USER','PRIVATE_PASSWORD','PRIVATE_TOKEN','PRIVATE_FRAGMENT']:
            self.assertNotIn(secret,json.dumps(d))

    def test_invalid_port_error_is_not_echoed(self):
        d=sanitized_redirect('https://huggingface.co:PRIVATE_PORT/object',302,ValueError('PRIVATE_PORT'))
        self.assertFalse(d['well_formed'])
        self.assertNotIn('PRIVATE_PORT',json.dumps(d))

    def test_unknown_exception_text_is_redacted(self):
        d=sanitized_redirect(URL,302,RuntimeError('token=PRIVATE_TOKEN'))
        self.assertEqual(d['rejection_reason'],'Malformed or rejected redirect URL')
        self.assertNotIn('PRIVATE_TOKEN',json.dumps(d))

    def test_actual_worker_error_receipt_redacts_untrusted_text(self):
        tree=ast.parse(AFTER.read_text())
        block=next(n for n in tree.body if isinstance(n,ast.Try))
        handler=block.handlers[0]
        node=ast.FunctionDef(name='record_failure',args=ast.arguments(posonlyargs=[],args=[ast.arg(arg='exc')],kwonlyargs=[],kw_defaults=[],defaults=[]),body=handler.body,decorator_list=[])
        events=[];receipt={}
        ns={'sanitized_failure':sanitized_failure,'receipt':receipt,'received':0,'start':0,
            'time':Mock(monotonic=lambda:1),'log':lambda event,**data:events.append(data)}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[node],type_ignores=[])),'<isolated failure receipt>','exec'),ns)
        for error in [ValueError('PRIVATE_PASSWORD'),RuntimeError('https://user:PRIVATE_PASSWORD@host/?Signature=PRIVATE_SIGNATURE')]:
            ns['record_failure'](error)
            self.assertNotIn('PRIVATE_PASSWORD',json.dumps([receipt,events]))
            self.assertNotIn('PRIVATE_SIGNATURE',json.dumps([receipt,events]))
        ns['record_failure'](RuntimeError('Redirect host outside strict publisher/CDN allowlist'))
        self.assertEqual(receipt['failure']['reason'],'Redirect host outside strict publisher/CDN allowlist')

    def test_nonstring_and_empty_are_handled(self):
        for value in [None,7,'']:
            self.assertFalse(sanitized_redirect(value)['well_formed'])

    def test_signed_query_values_not_retained(self):
        d=sanitized_redirect('https://allowed.example.invalid/x?Policy=POLICY_SECRET&Signature=SIG_SECRET&Key-Pair-Id=KEY_SECRET&Expires=1234',302)
        self.assertFalse(d['query_values_retained'])
        for value in ['POLICY_SECRET','SIG_SECRET','KEY_SECRET','1234']:
            self.assertNotIn(value,json.dumps(d))

    def test_guard_function_AST_identical(self):
        def guard(path):
            return next(n for n in ast.parse(path.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='allowed')
        self.assertEqual(ast.dump(guard(BEFORE),include_attributes=False),ast.dump(guard(AFTER),include_attributes=False))

    def test_actual_observed_host_remains_blocked(self):
        old,_=definitions(BEFORE);new,_=definitions(AFTER)
        for namespace in [old,new]:
            with self.assertRaisesRegex(RuntimeError,'outside strict'):
                namespace['allowed']('https://us.aws.cdn.hf.co/xet-bridge-us/object?Signature=REDACT')

    def test_pinned_URL_hash_and_size_constants_unchanged(self):
        def constants(path):
            return {node.targets[0].id:ast.literal_eval(node.value)
                    for node in ast.parse(path.read_text()).body
                    if isinstance(node,ast.Assign) and len(node.targets)==1
                    and isinstance(node.targets[0],ast.Name)
                    and node.targets[0].id in ['URL','EXPECTED','SIZE']}
        self.assertEqual(constants(BEFORE),constants(AFTER))

    def test_guard_decisions_and_errors_unchanged(self):
        old,_=definitions(BEFORE);new,_=definitions(AFTER)
        urls=[URL,'https://cas-bridge.xethub.hf.co/xet-bridge-us/object?Signature=SECRET',
              'https://cdn-lfs.huggingface.co/object','https://cdn-lfs-us-1.huggingface.co/object',
              'https://blocked.example.invalid/object','http://huggingface.co/object',
              'https://user:secret@huggingface.co/object','https://huggingface.co/other',
              'https://[bad','https://huggingface.co:bad/object']
        def result(f,url):
            try:return ('allowed',f(url).hostname)
            except Exception as e:return (type(e).__name__,str(e))
        for url in urls:
            with self.subTest(category=urlsplit(url).scheme if '[' not in url else 'malformed'):
                self.assertEqual(result(old['allowed'],url),result(new['allowed'],url))

    def test_blocked_redirect_logs_before_rethrow_and_never_follows(self):
        ns,events=definitions(AFTER);handler=ns['Redirect']();handler.parent=Mock()
        with self.assertRaisesRegex(RuntimeError,'outside strict'):
            handler.http_error_302(Request(URL),io.BytesIO(b''),302,'Found',{'Location':'https://blocked.example.invalid/object?Signature=SECRET'})
        handler.parent.open.assert_not_called()
        self.assertEqual(events[0][0],'redirect_rejected')
        self.assertEqual(events[0][1]['hostname'],'blocked.example.invalid')
        self.assertNotIn('SECRET',json.dumps(events))

    def test_credentials_stay_rejected_with_safe_evidence(self):
        ns,events=definitions(AFTER);handler=ns['Redirect']();handler.parent=Mock()
        with self.assertRaisesRegex(RuntimeError,'Unsafe model'):
            handler.http_error_302(Request(URL),io.BytesIO(b''),307,'Redirect',{'Location':'https://USER:PASSWORD@huggingface.co/object?token=TOKEN'})
        handler.parent.open.assert_not_called()
        self.assertTrue(events[0][1]['credentials_present'])
        self.assertNotIn('PASSWORD',json.dumps(events))

    def test_malformed_stays_rejected_without_raw_error(self):
        ns,events=definitions(AFTER);handler=ns['Redirect']();handler.parent=Mock()
        with self.assertRaises(ValueError):
            handler.http_error_302(Request(URL),io.BytesIO(b''),302,'Found',{'Location':'https://[bad?token=SECRET'})
        handler.parent.open.assert_not_called()
        self.assertNotIn('SECRET',json.dumps(events))

    def test_allowed_redirect_positive_control_unchanged(self):
        ns,events=definitions(AFTER);handler=ns['Redirect']();handler.parent=Mock()
        handler.parent.open.return_value='mock response; no network'
        value=handler.http_error_302(Request(URL),io.BytesIO(b''),302,'Found',{'Location':'https://cas-bridge.xethub.hf.co/xet-bridge-us/object?Signature=SECRET'})
        self.assertEqual(value,'mock response; no network')
        handler.parent.open.assert_called_once()
        self.assertEqual(events[0][0],'redirect')
        self.assertNotIn('SECRET',json.dumps(events))

    def test_logging_failure_does_not_authorize_or_replace_original_rejection(self):
        ns,_=definitions(AFTER);handler=ns['Redirect']();handler.parent=Mock()
        original=RuntimeError('Redirect host outside strict publisher/CDN allowlist')
        def reject(_):raise original
        ns['allowed']=reject;ns['log']=Mock(side_effect=OSError('fixture disk failure'))
        with self.assertRaises(RuntimeError) as got:
            handler.http_error_302(Request(URL),io.BytesIO(b''),302,'Found',{'Location':'https://blocked.example.invalid/'})
        self.assertIs(got.exception,original)
        handler.parent.open.assert_not_called()


if __name__=='__main__':
    unittest.main()
