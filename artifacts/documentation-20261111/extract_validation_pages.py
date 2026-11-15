"""Make temporary single-page validation copies from final PDFs; originals stay intact."""
from pathlib import Path
import re,json
from pdf_inspect import inspect
W=Path(__file__).parent;reports=[]
for file,slug,pages in [('ASTRA - Complete User Guide.pdf','user-guide',[1,2,4,6,7,11,12]),('ASTRA - Technical Architecture and Project Report.pdf','technical-report',[1,3,5,10,17,21,25,27,30])]:
 b=Path(file).read_bytes();objects={int(m[1]):(int(m[2]),m[3]) for m in re.finditer(rb'(\d+) (\d+) obj\s*(.*?)\s*endobj',b,re.S)}
 root=int(re.search(rb'/Root (\d+) 0 R',b)[1]);tree=int(re.search(rb'/Pages (\d+) 0 R',objects[root][1])[1]);r=inspect(file)
 for page in pages:
  target=r['pages'][page-1]['object'];copy=dict(objects)
  copy[tree]=(0,f'<< /Type /Pages /Count 1 /Kids [{target} 0 R] >>'.encode())
  gen,obj=copy[target];obj=re.sub(rb'/Parent \d+ 0 R',f'/Parent {tree} 0 R'.encode(),obj);copy[target]=(gen,obj)
  out=bytearray(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n');offsets={}
  for n,(g,v) in sorted(copy.items()):offsets[n]=len(out);out+=f'{n} {g} obj\n'.encode()+v+b'\nendobj\n'
  xref=len(out);size=max(copy)+1;out+=f'xref\n0 {size}\n0000000000 65535 f \n'.encode()
  for n in range(1,size):out+=(f'{offsets[n]:010d} {copy[n][0]:05d} n \n' if n in copy else '0000000000 65535 f \n').encode()
  out+=f'trailer\n<< /Size {size} /Root {root} 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
  dest=W/f'{slug}-validation-page-{page}.pdf';dest.write_bytes(out);check=inspect(dest)
  assert check['page_count']==1 and check['pages'][0]['text']==r['pages'][page-1]['text']
  reports.append({'source':file,'source_page':page,'temporary_pdf':dest.name,'text_identical':True})
(W/'representative-pages.json').write_text(json.dumps(reports,indent=2));print(len(reports),'exact page-content copies verified')
