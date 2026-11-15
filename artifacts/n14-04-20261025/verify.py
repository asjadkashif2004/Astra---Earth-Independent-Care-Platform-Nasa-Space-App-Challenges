from pathlib import Path
import json, hashlib, math

root=Path.cwd()
base=Path('artifacts/n14-04-20261025')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((base/'preservation-before.json').read_text())
groups={}
for name in before['groups']:
    rows=[]
    for p in sorted(Path(name).rglob('*')):
        if p.is_file() and str(p)!='services/research-retrieval/hybrid-diagnostic.mjs':
            rows.append([str(p),sha(p)])
    groups[name]={'files':len(rows),'sha256':hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest()}
assert groups==before['groups'],'Original grouped contents or membership changed'
for name,h in {**before['files'],**before['input_sha256']}.items():
    assert sha(Path(name))==h, name
replay=base/'replay'
r=json.loads((replay/'results.json').read_text())
raw=[json.loads(line) for line in (replay/'raw-rows.jsonl').read_text().splitlines()]
assert raw==r['rows'] and len(raw)==40 and len({x['id'] for x in raw})==40
f=json.loads((replay/'input-freeze.json').read_text())
assert f['spec_sha256']==sha(Path('data/research/n14-04/spec.json'))
for name,h in f['code_sha256'].items(): assert sha(Path(name))==h
for v in f['saved_inputs'].values():
    if isinstance(v,dict) and 'file' in v: assert sha(Path(v['file']))==v['sha256']
catalogue=json.loads((replay/'catalogue.json').read_text())
cat={u['unit_id']:u for u in catalogue}
assert len(cat)==33 and sum(len(u['spans']) for u in cat.values())==34
canonical_json=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
assert hashlib.sha256(canonical_json(catalogue)).hexdigest()==f['catalogue_sha256']
checks=0
for row in raw:
    l,s=row['baseline'],row['semantic']
    assert all(x in cat for x in l+s)
    for name,entries in row['candidates'].items():
        ids=[e['unit_id'] for e in entries]
        assert len(ids)<=5 and len(ids)==len(set(ids)) and set(l)<=set(ids)
        union=list(dict.fromkeys(l+s))
        if name=='append_only_semantic_rescue': assert ids==union[:5] and ids[:len(l)]==l
        else:
            score=lambda x:(2/(61+l.index(x)) if x in l else 0)+(1/(61+s.index(x)) if x in s else 0)
            ranks=sorted(union,key=lambda x:(-score(x),l.index(x) if x in l else math.inf,s.index(x) if x in s else math.inf,x))[:5]
            assert ids==ranks
            for e in entries: assert e['rrf_score']==score(e['unit_id'])
        for e in entries:
            c=cat[e['unit_id']]
            assert e['role']==c['role'] and e['catalogue_ref']==c['unit_id']
            assert c['review']=='pending_independent_review'
            if e['semantic_match_window_id'] is not None:
                assert e['semantic_match_window_id'] in [a['window_id'] for a in c['spans']]
            checks+=1
    assert row['seen'] is True
independent={}
for name in r['summaries']:
    metrics={}
    for k in [3,5]:
        values=[]; old=[];counts={'improved':0,'regressed':0,'tied':0}
        for row in raw:
            target=set(row['expected_units'])
            if not target: continue
            a=len(target&set(row['baseline'][:k]))/len(target)
            b=len(target&{e['unit_id'] for e in row['candidates'][name][:k]})/len(target)
            old.append(a);values.append(b)
            counts['improved' if b>a else 'regressed' if b<a else 'tied']+=1
        assert len(values)==32
        v=sum(values)/32;original=sum(old)/32
        summary=r['summaries'][name]['at'+str(k)]
        assert abs(v-summary['recall'])<1e-14 and abs(original-summary['baseline_recall'])<1e-14
        assert all(summary[q]==x for q,x in counts.items())
        metrics['at'+str(k)]={'recall':v,'baseline_recall':original,**counts}
    independent[name]=metrics
files={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(replay.iterdir()) if p.is_file()}
assert all(v['bytes']<=2000000 for v in files.values())
assert sum(v['bytes'] for v in files.values())<=8000000
assert not r['new_model_inference'] and not r['new_storage_policy_exception']
print(json.dumps({'status':'PASS','original_files_preserved':sum(g['files'] for g in groups.values())+len(before['files']),'groups':groups,'fixed_files':before['files'],'frozen_inputs_match':True,'frozen_code_matches':True,'raw_rows_match_summary':True,'candidate_unit_role_bindings_independently_checked':checks,'independent_metrics':independent,'replay_files':files,'replay_output_bytes':sum(v['bytes'] for v in files.values()),'new_native_inference':False,'new_storage_exception':False},separators=(',',':')))
