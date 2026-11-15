"""Extract searchable Chromium PDF text with only the Python standard library."""
import re,zlib,json,sys,pathlib
def inspect(path):
 b=pathlib.Path(path).read_bytes();assert b.startswith(b'%PDF-') and b'%%EOF' in b
 objects={int(m[1]):m[3] for m in re.finditer(rb'(\d+) (\d+) obj\s*(.*?)\s*endobj',b,re.S)}
 def stream(n):
  v=objects[n];h,d=v.split(b'stream',1);d=d.lstrip(b'\r\n').rsplit(b'endstream',1)[0].rstrip(b'\r\n')
  return zlib.decompress(d) if b'/FlateDecode' in h else d
 fonts={}
 for n,v in objects.items():
  m=re.search(rb'/ToUnicode (\d+) 0 R',v)
  if not m:continue
  cmap=stream(int(m[1])).decode();out={}
  for block in re.findall(r'beginbfchar(.*?)endbfchar',cmap,re.S):
   for a,c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>',block):out[int(a,16)]=bytes.fromhex(c).decode('utf-16-be')
  for block in re.findall(r'beginbfrange(.*?)endbfrange',cmap,re.S):
   for a,e,c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>',block):
    for k in range(int(a,16),int(e,16)+1):out[k]=(int(c,16)+k-int(a,16)).to_bytes(len(c)//2,'big').decode('utf-16-be')
  fonts[n]=out
 root=int(re.search(rb'/Root (\d+) 0 R',b)[1]);tree=int(re.search(rb'/Pages (\d+) 0 R',objects[root])[1])
 def walk(n):
  if re.search(rb'/Type /Page\b',objects[n]):return [n]
  kids=re.search(rb'/Kids\s*\[(.*?)\]',objects[n],re.S)
  return [p for k in re.findall(rb'(\d+) 0 R',kids[1]) for p in walk(int(k))]
 pages=[]
 for n in walk(tree):
  v=objects[n]
  aliases={a.decode():int(f) for a,f in re.findall(rb'/(F\d+) (\d+) 0 R',v)}
  m=re.search(rb'/Contents (\d+) 0 R',v);assert m,'Unsupported page contents'
  data=stream(int(m[1])).decode('latin1');font=None;parts=[]
  for t in re.finditer(r'/(F\d+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj|\[(.*?)\]\s*TJ|\bET\b',data,re.S):
   if t[1]:font=fonts.get(aliases.get(t[1]),{})
   elif t[2] or t[3]:
    for hx in ([t[2]] if t[2] else re.findall(r'<([0-9A-Fa-f]+)>',t[3])):
     parts.append(''.join((font or {}).get(int(hx[i:i+4],16),'�') for i in range(0,len(hx),4)))
   else:parts.append('\n')
  text=''.join(parts);pages.append({'object':n,'text':text,'characters':len(text),'replacement_characters':text.count('�')})
 return {'file':str(path),'bytes':len(b),'page_count':len(pages),'searchable':all(p['characters']>100 for p in pages),'has_outline':b'/Outlines' in b,'tagged':b'/StructTreeRoot' in b,'pages':pages}
if __name__=='__main__':
 for f in sys.argv[1:]:
  r=inspect(f);p=pathlib.Path('artifacts/documentation-20261111')/('user-guide' if 'User Guide' in f else 'technical-report' if 'Technical Architecture' in f else 'probe')
  p.with_suffix('.txt').write_text('\n\n'.join('PAGE '+str(i+1)+'\n'+v['text'] for i,v in enumerate(r['pages'])))
  p.with_suffix('.inspection.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='pages'}))
