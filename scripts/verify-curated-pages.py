"""Re-extract only selected pages of the two already preserved PDFs; no downloads or PDF actions."""
import hashlib,json,sys,resource,warnings,logging
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
FILES={'nasa-hrp-sleep-2016':('20160003864.pdf','252d4993a040ab8b989664b1da7a3143a5fd8169fac65b67f1f43231250ef1f5'),'nasa-std-3001-v2-f':('NASA-STD-3001 Vol 2 Rev F.pdf','a09e0a3853306f59a62b5ab494734c25afc8f83eadb159fdb5825706bc36d48f')}
def main():
    if len(sys.argv)!=3 or sys.argv[1] not in FILES:raise ValueError('Approved local document ID and exact page list required')
    pages=json.loads(sys.argv[2])
    if not isinstance(pages,list) or not 1<=len(pages)<=48 or any(type(p) is not int or p<1 or p>800 for p in pages) or pages!=sorted(set(pages)):raise ValueError('Bounded unique sorted page list required')
    resource.setrlimit(resource.RLIMIT_AS,(1073741824,1073741824));resource.setrlimit(resource.RLIMIT_CPU,(30,30))
    wheel=ROOT/'packages/corpus-tools/pypdf-6.21.2-py3-none-any.whl'
    if hashlib.sha256(wheel.read_bytes()).hexdigest()!='1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084':raise ValueError('Parser pin mismatch')
    sys.path.insert(0,str(wheel))
    from pypdf import PdfReader,__version__
    name,expected=FILES[sys.argv[1]];path=ROOT/'data/corpus/n13-01/originals'/name
    if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:raise ValueError('Original hash mismatch')
    reader=PdfReader(path,strict=True)
    if reader.is_encrypted or max(pages)>len(reader.pages):raise ValueError('Unavailable original pages')
    results=[]
    for n in pages:
        page=reader.pages[n-1];stream=page.get_contents()
        if stream and len(stream.get_data())>8000000:raise ValueError('Page stream limit exceeded')
        text=(page.extract_text(extraction_mode='plain') or '').replace('\r\n','\n').replace('\r','\n')
        if len(text)>200000:raise ValueError('Page text limit exceeded')
        results.append({'page_index':n,'text_sha256':hashlib.sha256(text.encode('utf-8')).hexdigest(),'text_bytes':len(text.encode('utf-8'))})
    print(json.dumps({'schema_version':'astra.target-pages-proof.v1','document_id':sys.argv[1],'original_sha256':expected,'parser_version':__version__,'pages':results,'network_requests':0},sort_keys=True,separators=(',',':')))
if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'status':'BLOCKED','error':type(e).__name__,'message':str(e)[:500]}),file=sys.stderr);sys.exit(1)
