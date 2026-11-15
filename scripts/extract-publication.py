"""Bounded offline PDF-to-page-text adapter. Never executes PDF actions or follows links."""
import hashlib,json,sys,logging,warnings
from pathlib import Path
import resource

ROOT=Path(__file__).resolve().parent.parent
WHEEL=ROOT/'packages/corpus-tools/pypdf-6.21.2-py3-none-any.whl'
WHEEL_SHA='1d44d1a3a200f25062adff0085b02040e4646431ac2ccac22e42679e91466084'
VERSION='astra.pdf-text.v1'

def main():
    if len(sys.argv)!=2:raise ValueError('Exactly one local PDF path required')
    resource.setrlimit(resource.RLIMIT_AS,(1073741824,1073741824))
    resource.setrlimit(resource.RLIMIT_CPU,(90,90))
    resource.setrlimit(resource.RLIMIT_FSIZE,(24000000,24000000))
    if hashlib.sha256(WHEEL.read_bytes()).hexdigest()!=WHEEL_SHA:raise ValueError('Parser wheel hash mismatch')
    sys.path.insert(0,str(WHEEL))
    from pypdf import PdfReader,__version__
    if __version__!='6.21.2':raise ValueError('Parser version mismatch')
    path=Path(sys.argv[1]);raw=path.read_bytes()
    if not 10<len(raw)<=6753988 or not raw.startswith(b'%PDF-') or b'%%EOF' not in raw[-1024:]:raise ValueError('Invalid bounded PDF original')
    diagnostics=[]
    class Capture(logging.Handler):
        def emit(self,record):
            if len(diagnostics)<100:diagnostics.append(record.getMessage()[:500])
    logging.getLogger('pypdf').addHandler(Capture())
    with warnings.catch_warnings(record=True) as caught:
        reader=PdfReader(path,strict=True)
        if reader.is_encrypted:raise ValueError('Encrypted originals unsupported')
        if not 1<=len(reader.pages)<=800:raise ValueError('Page count outside approved extraction bound')
        labels=reader.page_labels
        pages=[];total=0
        for i,page in enumerate(reader.pages):
            content=page.get_contents()
            if content and len(content.get_data())>8000000:raise ValueError('Page content stream exceeds 8 MB extraction bound')
            text=(page.extract_text(extraction_mode='plain') or '').replace('\r\n','\n').replace('\r','\n')
            total+=len(text.encode('utf-8'))
            if len(text)>200000 or total>16000000:raise ValueError('Extracted text exceeds bound')
            pages.append({'page_index':i+1,'pdf_page_label':str(labels[i]),'text':text,'status':'text_extracted' if text.strip() else 'empty_or_image_only'})
        diagnostics.extend(str(w.message)[:500] for w in caught[:100])
    result={'schema_version':VERSION,'parser':{'name':'pypdf','version':__version__,'wheel_sha256':WHEEL_SHA,'mode':'plain','strict':True},'original_sha256':hashlib.sha256(raw).hexdigest(),'pages':pages,'diagnostics':diagnostics,'limitations':['No OCR, image/figure interpretation, table reconstruction or mathematical semantic validation.','PDF page labels may differ from printed page numbers; physical page_index is authoritative.','PDF actions, scripts, attachments and external links are not executed or fetched.']}
    output=json.dumps(result,ensure_ascii=True,separators=(',',':'))+'\n'
    if len(output.encode())>24000000:raise ValueError('Extraction JSON exceeds bound')
    sys.stdout.write(output)

if __name__=='__main__':
    try:main()
    except Exception as e:
        print(json.dumps({'status':'BLOCKED','error':type(e).__name__,'message':str(e)[:1000]}),file=sys.stderr)
        sys.exit(1)
