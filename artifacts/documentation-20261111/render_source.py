from pathlib import Path
import json,re
work=Path(__file__).parent
scope={'__file__':str(work/'build_documents.py')}
for f in ['build_documents.py','technical_content.py','technical_content_2.py','technical_content_3.py']:
 exec(compile((work/f).read_text(),str(work/f),'exec'),scope)
assert len(scope['U'])==12 and len(scope['T'])==30
for filename,title,pages in [('user-guide.html','Complete User Guide',scope['U']),('technical-report.html','Technical Architecture and Project Report',scope['T'])]:
 html=scope['document'](title,pages);(work/filename).write_text(html)
refs=[]
for f in ['build_documents.py','technical_content.py','technical_content_2.py','technical_content_3.py']:
 s=(work/f).read_text()
 refs.extend(re.findall(r'(?:services|apps|packages|scripts|data|models|docs|research)/[A-Za-z0-9_./-]+\.(?:mjs|json|md|html)',s))
missing=sorted({p for p in refs if not Path(p).exists()})
report={'user_pages':12,'technical_pages':30,'unique_screenshots':sorted(set(scope['used_shots'])),'diagram_count':scope['diagram_count'],'referenced_files':sorted(set(refs)),'missing_references':missing}
(work/'content-inventory.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='referenced_files'}))
assert not missing,missing
