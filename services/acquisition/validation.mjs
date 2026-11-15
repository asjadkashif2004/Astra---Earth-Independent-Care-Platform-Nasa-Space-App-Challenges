import { createHash } from 'node:crypto';

export class AcquisitionError extends Error {
  constructor(code,message){super(message);this.name='AcquisitionError';this.code=code;}
}
export const fail=(code,message)=>{throw new AcquisitionError(code,message);};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function stableJSON(value){
  if(Array.isArray(value))return `[${value.map(stableJSON).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const approvalHash=a=>sha256(stableJSON(a));
export const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const isInstant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function object(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('INVALID_METADATA','Supply exactly the documented metadata fields.');}
export function text(value,max=2000){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value))fail('INVALID_METADATA','Metadata text is missing, too long or contains control characters.');}
export function texts(values){if(!Array.isArray(values)||!values.length||values.length>20)fail('INVALID_METADATA','Supply a bounded nonempty text list.');values.forEach(v=>text(v));}
