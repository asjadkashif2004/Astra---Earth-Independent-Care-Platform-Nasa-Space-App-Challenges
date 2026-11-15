"""File-only independent evidence checks. No SQL, application or browser startup."""
from pathlib import Path
import hashlib,json,unittest
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/n10-final-20261030'
read=lambda p:json.loads((OUT/p).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
canonical=lambda v:json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def digest(v):return hashlib.sha256(canonical(v)).hexdigest()
def verify(rows):
 previous='GENESIS';revisions={}
 for r in rows:
  body={k:v for k,v in r.items() if k!='hash'}
  assert r['hash']==digest(body) and r['previous_hash']==previous
  key=r['kind']+':'+r['id'];assert r['revision']==revisions.get(key,0)+1
  revisions[key]=r['revision'];previous=r['hash']
 return digest(rows)
class Evidence(unittest.TestCase):
 def test_final_257_distinct_checks(self):
  q=read('final-qa/qa-summary.json');self.assertEqual(q['exit_code'],0)
  self.assertEqual(q['counts'],{'tests':257,'pass':257,'fail':0,'cancelled':0,'skipped':0})
  self.assertEqual(q['remaining_scratch_entries'],[])
 def test_resource_journal_rows(self):
  q=read('final-qa/qa-summary.json');rows=[json.loads(s) for s in (OUT/'final-qa/qa-resources.jsonl').read_text().splitlines()]
  self.assertEqual([r['seq'] for r in rows],list(range(1,len(rows)+1)))
  self.assertEqual(len(rows),q['samples']);self.assertEqual(max(r['sampled_tree_RSS_bytes'] for r in rows),q['sampled_max_tree_RSS_bytes'])
 def test_actual_browser_acceptance(self):
  b=read('browser-04/report.json');self.assertEqual(b['status'],'passed');self.assertEqual(len(b['checks']),10)
  self.assertTrue(all(c['status']=='passed' for c in b['checks']));self.assertEqual(b['console_errors'],[])
  self.assertEqual(len(b['viewports']),4);self.assertEqual(len(b['screenshots']),9)
  for p in b['screenshots']:self.assertTrue((OUT/'browser-04'/p).read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
 def test_native_keyboard_not_static_labels(self):
  transitions=read('browser-04/report.json')['N10_keyboard_transitions'];self.assertEqual(len(transitions),12)
  for t in transitions:
   self.assertEqual(t['target'],t['expected']);self.assertTrue(t['visible'] and t['page_focused']);self.assertGreaterEqual(float(t['outline'].removesuffix('px')),2)
 def test_actual_task_rows_bound_to_receipts(self):
  b=read('browser-04/report.json');rows=read('browser-04/n10-records.json')
  self.assertEqual(len(b['N10_actual_browser_trials']),4)
  for trial in b['N10_actual_browser_trials']:
   row=next(r for r in rows if r['hash']==trial['hash']);self.assertEqual(row['data']['trials'],trial['trials'])
   self.assertEqual(len(trial['trials']),5);self.assertTrue(all(100<=n<=3000 for n in trial['trials']))
   self.assertEqual(row['source']['kind'],'browser_task')
 def test_browser_recovery_chain(self):
  b=read('browser-04/report.json');rows=read('browser-04/n10-records.json')
  self.assertEqual(verify(rows),b['N10_recovery']['ledger_sha256']);self.assertEqual(len(rows),b['N10_recovery']['records'])
  self.assertEqual(b['N10_recovery']['replayed_writes'],0)
 def test_tampered_and_missing_rows_fail(self):
  rows=read('browser-04/n10-records.json');changed=json.loads(json.dumps(rows));changed[0]['data']['state']='forged'
  with self.assertRaises(AssertionError):verify(changed)
  with self.assertRaises(AssertionError):verify(rows[1:])
 def test_cold_recovery_receipt(self):
  c=read('final-qa/cold-recovery.json');self.assertEqual(c['rows'],1);self.assertTrue(c['audit']);self.assertEqual(c['replays'],0)
 def test_history_roots_unchanged(self):
  pins=read('preservation-before.json')['files'];n=0
  for name,h in pins.items():
   if name.startswith(('artifacts/n16-','artifacts/n10-master-')):
    self.assertEqual(sha(ROOT/name),h,name);n+=1
  self.assertGreater(n,500)
 def test_browser_execution_code_pins_current(self):
  a=read('browser-startups.json');self.assertEqual(len(a['attempts']),4)
  for name,h in a['attempts'][-1]['code_pins'].items():self.assertEqual(sha(ROOT/name),h,name)
 def test_owned_browser_cleanup(self):
  for i in range(1,5):
   b=read('browser-0'+str(i)+'/report.json')['N10_cleanup']
   for k in ['application_closed','browser_exited','profile_removed','database_directory_removed']:self.assertTrue(b[k])
   self.assertEqual(b['N16_designated_starts'],0);self.assertEqual(b['model_executions'],0)
 def test_performance_scope_cleanup(self):
  p=read('performance.json');self.assertEqual(p['records'],22);self.assertEqual(p['read_projections'],75)
  self.assertTrue(all(p['cleanup'].values()));self.assertEqual(p['N16_starts'],0);self.assertEqual(p['network_acquisitions'],0)
if __name__=='__main__':unittest.main(verbosity=2)
