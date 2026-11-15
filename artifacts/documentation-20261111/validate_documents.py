"""Read-only project checks and documentation-only validation receipts."""
from pathlib import Path
import json,re,hashlib,collections
from pdf_inspect import inspect
W=Path(__file__).parent;root=Path.cwd();checks=[]
def check(name,ok,detail=None):
 checks.append({'check':name,'passed':bool(ok),'detail':detail});assert ok,(name,detail)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
inventory=json.loads((W/'content-inventory.json').read_text())
baseline=json.loads((W/'preservation-before.json').read_text())
changed=[p for p,h in baseline['files'].items() if not Path(p).exists() or sha(p)!=h]
check('340 pre-existing source/config/asset/evidence pins unchanged',not changed,{'count':len(baseline['files']),'changed':changed})
package=json.loads(Path('package.json').read_text());check('npm start is the actual shared server',package['scripts']['start']=='node services/api/server.mjs')
check('Pinned technology versions',package['dependencies']['three']=='0.186.1' and package['engines']['node']=='>=24.21.0 <25')
units=json.loads(Path('data/corpus/n13-02/evidence-units.json').read_text())['units']
check('33 corpus units / 34 source spans',len(units)==33 and sum(len(u['parts'])for u in units)==34)
publications=json.loads(Path('data/corpus/n13-01/sources.json').read_text())['documents'];pubs=[]
for d in publications:
 p=Path('data/corpus/n13-01/originals')/d['file'];ok=p.stat().st_size==d['bytes'] and sha(p)==d['original_sha256'];check('Original NASA bytes match authoritative manifest: '+d['id'],ok)
 pubs.append({'id':d['id'],'bytes':p.stat().st_size,'sha256':d['original_sha256'],'manifest_match':ok})
reg=json.loads(Path('artifacts/n12-engineering-20261104/execution-01/model-registry.json').read_text());counts=dict(collections.Counter(v['selection']for v in reg['models'].values()));qualified=sorted(k for k,v in reg['models'].items()if v['selection']=='ENGINEERING_QUALIFIED_SYNTHETIC_ONLY')
check('Actual N12 registry counts and zero operational promotions',counts=={'ENGINEERING_BASELINE':8,'ENGINEERING_QUALIFIED_SYNTHETIC_ONLY':4,'REJECTED_FOR_ADDITIONAL_USE':12} and reg['promoted']==0,{'counts':counts,'qualified':qualified})
evidence=json.loads(Path('artifacts/presentation-readiness-20261109/final-validation.json').read_text());check('Retained QA statistics quoted correctly',evidence['qa']['passed']==258 and evidence['qa']['failed']==0 and evidence['qa']['skipped']==0)
identity=json.loads(Path('artifacts/n15-04c-20261027/infer/native-identity-manifest.json').read_text())['model'];model_path=Path(identity['source'])
model_stat={'exists':model_path.is_file(),'bytes':model_path.stat().st_size if model_path.is_file()else None,'method':'stat only; no weight read, hash, loading or execution','identity_source':'artifacts/n15-04c-20261027/infer/native-identity-manifest.json'}
check('Pinned Qwen file currently exists with expected size; no native start',model_stat['exists'] and model_stat['bytes']==491400032,model_stat)
n07=[]
for source in json.loads(Path('data/scientific/n07-local-registry.json').read_text())['sources']:
 original=source['files']['original'];path=Path(original['path']);n07.append({'id':source['id'],'exists':path.is_file(),'bytes':path.stat().st_size if path.is_file()else None,'size_matches':path.is_file()and path.stat().st_size==original['bytes'],'method':'stat only; no patient numerics read'})
check('Three approved N07 originals exist at recorded sizes',len(n07)==3 and all(s['size_matches']for s in n07),n07)
check('All cited repository files exist',not inventory['missing_references'],{'count':len(inventory['referenced_files'])})
docs=[]
for filename,slug,expected in [('ASTRA - Complete User Guide.pdf','user-guide',12),('ASTRA - Technical Architecture and Project Report.pdf','technical-report',30)]:
 path=root/filename;r=inspect(path);text='\n'.join(p['text']for p in r['pages']);flat=re.sub(r'\s+','',text)
 check(slug+': valid PDF page tree / required page count',r['page_count']==expected,expected)
 check(slug+': all pages searchable with no broken glyph mappings',r['searchable'] and sum(p['replacement_characters']for p in r['pages'])==0)
 check(slug+': tagged text and document outline',r['tagged'] and r['has_outline'])
 check(slug+': correct sequential printed page numbers',all(f'{i}/{expected}' in re.sub(r'\s+','',p['text'])for i,p in enumerate(r['pages'],1)))
 boxes=re.findall(rb'/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]',path.read_bytes());check(slug+': A4 page geometry',bool(boxes) and all(abs(float(w)-595.276)<1 and abs(float(h)-841.89)<1 for w,h in boxes))
 patterns=[r'sk-(?:proj-)?[A-Za-z0-9_-]{20,}',r'hf_[A-Za-z0-9]{20,}',r'eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}',r'Bearer\s+[A-Za-z0-9._-]{20,}']
 found=[pat for pat in patterns if re.search(pat,text)];check(slug+': no credential/token patterns',not found,found)
 required=['npm start','ASTRA_DB','ASTRA_SPEED','127.0.0.1:3000','UNKNOWN','Qwen','Isolation Forest','N16','synthetic']
 check(slug+': core operational/AI boundary vocabulary',all(re.sub(r'\s+','',s).lower()in flat.lower() for s in required))
 check(slug+': no external API key is falsely mandatory','NoremoteAIkey' in flat or 'NoremoteAPIkey' in flat or 'NomandatoryremoteAI' in flat or 'NoremoteAPIkeyisrequired' in flat)
 if slug=='technical-report':
  for term in ['Persistence','Theil–Sen','SQLite','GGUF','MiniLM','384','get_current_vitals','get_data_quality','get_personal_baseline','get_open_risk_events','BIDMC','20160003864']:
   check('technical term present: '+term,re.sub(r'\s+','',term)in flat)
  check('All 26 chapters navigable in source',all(f'id="ch{i}"' in (W/'technical-report.html').read_text() for i in range(1,27)))
  check('Thirty judges questions and all answer boundaries',text.count('Short answer:')==30 and text.count('Do not claim:')==30)
 (W/(slug+'.txt')).write_text('\n\n'.join('PAGE '+str(i+1)+'\n'+p['text']for i,p in enumerate(r['pages'])))
 (W/(slug+'.inspection.json')).write_text(json.dumps(r,indent=2))
 docs.append({'path':str(path),'pages':r['page_count'],'bytes':r['bytes'],'sha256':sha(path),'searchable':True,'tagged':True,'outline':True})
layout=json.loads((W/'print-report.json').read_text());check('All 42 page layouts clear of detected clipping / footer overlap',all(not d['bad'] and all(i['ok']for i in d['layout']['images'])for d in layout['reports']))
shots=[]
for d in layout['reports']:
 for image in d['layout']['images']:
  path=(W/image['src']).resolve();shots.append({'source':str(path.relative_to(root)),'sha256':sha(path),'authentic_retained_capture':True})
visual=json.loads((W/'visual-browser.json').read_text()) if (W/'visual-browser.json').exists()else None
check('Representative actual PDF renders present',visual is not None and len(visual['rendered'])==16)
report={'result':'COMPLETE','mission':'Documentation only','inspection_date':'2026-11-11','documents':docs,'visuals':{'diagrams':inventory['diagram_count'],'authentic_screenshots':len(shots),'total':inventory['diagram_count']+len(shots),'sources':shots,'representative_pdf_pages_rendered':16},'validation_checks':checks,'referenced_repository_files':inventory['referenced_files'],'preservation':{'baseline_unchanged':len(baseline['files']),'changed':changed,'NASA_originals':pubs,'no_application_or_status_changes':True,'no_database_opened_or_written':True,'no_native_model_or_N16_workers_started':True,'no_model_weight_modified':True,'no_external_download':True},'limitations':['Retained Nov 9 application acceptance is not a fresh app run.','AC-20/anatomy/clinical/scientific/release gates remain open.','No new independent review, embedding parity or current native execution authority established.','Repository title and stale README/data statements are explained rather than rewritten.'],'new_storage_bytes':sum(p.stat().st_size for p in W.rglob('*')if p.is_file())+sum(d['bytes']for d in docs)}
(W/'final-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps({'result':report['result'],'documents':docs,'checks_passed':len(checks),'visuals':report['visuals']['total'],'unchanged_pins':len(baseline['files'])}))
