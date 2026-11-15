/* Offline QA of existing Chromium PNGs. No application imports or image mutation. */
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function decodeScreenshot(bytes){
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not a PNG');
  let header,offset=8,ended=false;const chunks=[];
  while(offset+12<=bytes.length){
    const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);
    if(offset+12+length>bytes.length)throw Error('Truncated PNG');
    const data=bytes.subarray(offset+8,offset+8+length);
    if(kind==='IHDR')header=data;if(kind==='IDAT')chunks.push(data);if(kind==='IEND')ended=true;
    offset+=12+length;
  }
  if(!header||!ended||header.length!==13||header[8]!==8||![2,6].includes(header[9])||header[12]!==0)throw Error('Unsupported or incomplete PNG');
  const width=header.readUInt32BE(0),height=header.readUInt32BE(4),channels=header[9]===2?3:4,stride=width*channels;
  const raw=inflateSync(Buffer.concat(chunks));if(raw.length!==(stride+1)*height)throw Error('Invalid PNG scanlines');
  const pixels=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];if(filter>4)throw Error('Unsupported PNG filter');
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;
      let predictor=0;
      if(filter===1)predictor=a;else if(filter===2)predictor=b;else if(filter===3)predictor=Math.floor((a+b)/2);else if(filter===4)predictor=paeth(a,b,c);
      pixels[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return {width,height,channels,pixels};
}
export function numericGlyph(image,rect){
  const x=Math.floor(rect.x),y=Math.floor(rect.y),right=Math.ceil(rect.x+rect.width),bottom=Math.ceil(rect.y+rect.height);
  if(![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0||x<0||y<0||right>image.width||bottom>image.height)throw Error('Numeric bounds outside captured image');
  const ink=[];let left=right,top=bottom,r=x,b=y;
  for(let py=y;py<bottom;py++)for(let px=x;px<right;px++){
    const i=(py*image.width+px)*image.channels,p=image.pixels;
    const alpha=image.channels===4?p[i+3]/255:1;
    if((.2126*p[i]+.7152*p[i+1]+.0722*p[i+2])*alpha>=145){ink.push([px,py]);left=Math.min(left,px);r=Math.max(r,px);top=Math.min(top,py);b=Math.max(b,py);}
  }
  if(ink.length<8||r-left<1||b-top<3)throw Error('No readable numeric glyph mask');
  const width=r-left+1,height=b-top+1,mask=Buffer.alloc(width*height);
  for(const [px,py]of ink)mask[(py-top)*width+px-left]=1;
  return {sha256:digest(Buffer.concat([Buffer.from(width+':'+height+':'),mask])),width,height,ink_pixels:ink.length};
}
export function verifyGlyphReferences(items,manual=[]){
  const references=new Map(),errors=[];
  for(const item of items){
    if(!item.glyph)continue;
    const reviewed=manual.find(m=>m.file===item.file&&m.id===item.id&&m.screenshot_sha256===item.screenshot_sha256&&m.expected===item.expected);
    if(!item.ocr_matched&&!reviewed)continue;
    const previous=references.get(item.glyph.sha256);
    if(previous&&previous.expected!==item.expected)errors.push('Conflicting glyph reference '+item.glyph.sha256);
    else references.set(item.glyph.sha256,{expected:item.expected,file:item.file,id:item.id,method:reviewed?'Manual rendered PNG inspection':'Windows OCR',screenshot_sha256:item.screenshot_sha256});
  }
  if(errors.length)throw Error(errors.join(';'));
  return items.map(item=>{
    const reviewed=manual.find(m=>m.file===item.file&&m.id===item.id&&m.screenshot_sha256===item.screenshot_sha256&&m.expected===item.expected);
    if(reviewed)return {...item,matched:true,reference:{expected:item.expected,file:item.file,id:item.id,method:'Direct Codex inspection of this exact rendered PNG/target;no blank-mask propagation',screenshot_sha256:item.screenshot_sha256}};
    const ref=item.glyph?references.get(item.glyph.sha256):null,matched=ref?.expected===item.expected;
    return {...item,matched:!!matched,reference:matched?ref:null};
  });
}
