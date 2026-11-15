import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fail } from './validation.mjs';

const numeric=(s,integer=false)=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s))||integer&&!Number.isSafeInteger(Number(s)))fail('INVALID_EDF','Invalid EDF numeric field.');return Number(s);};
function localDate(date,time){
  if(!/^\d\d\.\d\d\.\d\d$/.test(date)||!/^\d\d\.\d\d\.\d\d$/.test(time))fail('INVALID_EDF','Malformed EDF local date/time.');
  const [d,m,y]=date.split('.').map(Number),[hh,mm,ss]=time.split('.').map(Number),year=y>=85?1900+y:2000+y;
  if(hh>23||mm>59||ss>59)fail('INVALID_EDF','Invalid EDF clock.');const iso=`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${time.replaceAll('.',':')}`;
  const utc=new Date(iso+'Z');if(!Number.isFinite(utc.getTime())||utc.getUTCDate()!==d||utc.getUTCMonth()+1!==m)fail('INVALID_EDF','Invalid EDF calendar date.');return iso;
}
/** Structural metadata only;never decodes physiological samples or infers a clinical state. */
export function parseEDFHeader(bytes,fileBytes){
  if(bytes.length<256||!Number.isSafeInteger(fileBytes)||fileBytes<256)fail('INVALID_EDF','Incomplete EDF fixed header.');
  const field=(offset,n)=>{const b=bytes.subarray(offset,offset+n);if(b.length!==n||b.some(v=>v<32||v>126))fail('INVALID_EDF','EDF header must be complete printable ASCII.');return b.toString('ascii').trim();};
  if(field(0,8)!=='0')fail('INVALID_EDF','Unsupported EDF version.');
  const signals=numeric(field(252,4),true),headerBytes=numeric(field(184,8),true),records=numeric(field(236,8),true),duration=numeric(field(244,8));
  if(signals<1||signals>16||headerBytes!==256*(signals+1)||bytes.length<headerBytes||records<1||duration<0||duration>172800)fail('INVALID_EDF','Unsupported or inconsistent EDF header bounds.');
  const widths=[16,80,8,8,8,8,8,80,8,32],columns=[];let offset=256;
  for(const width of widths){columns.push(Array.from({length:signals},(_,i)=>field(offset+i*width,width)));offset+=signals*width;}
  const channels=Array.from({length:signals},(_,i)=>{
    const physical_min=numeric(columns[3][i]),physical_max=numeric(columns[4][i]),digital_min=numeric(columns[5][i],true),digital_max=numeric(columns[6][i],true),samples=numeric(columns[8][i],true);
    if(!columns[0][i]||physical_min>=physical_max||digital_min>=digital_max||digital_min< -32768||digital_max>32767||samples<1||samples>1000000)fail('INVALID_EDF','Invalid signal calibration/sample count.');
    return {label:columns[0][i],transducer:columns[1][i],unit:columns[2][i],physical_min,physical_max,digital_min,digital_max,prefilter:columns[7][i],samples_per_record:samples,sampling_hz:duration>0?samples/duration:null};
  });
  const recordBytes=channels.reduce((n,c)=>n+2*c.samples_per_record,0),expected=headerBytes+records*recordBytes;
  if(!Number.isSafeInteger(expected)||recordBytes>2000000||expected!==fileBytes)fail('INVALID_EDF','EDF declared records do not match complete file length.');
  if(duration===0&&channels.some(c=>c.label!=='EDF Annotations'))fail('INVALID_EDF','Only annotation-only EDF+ may have zero-duration records.');
  const reserved=field(192,44);if(reserved.startsWith('EDF+D'))fail('UNSUPPORTED_EDF','Discontinuous EDF+ is outside this exact-source adapter.');
  const date=field(168,8),time=field(176,8);
  return {version:'0',patient_header:field(8,80),recording_header:field(88,80),local_start:localDate(date,time),timezone:null,start_date_field:date,start_time_field:time,header_bytes:headerBytes,reserved,record_count:records,record_duration_seconds:duration,duration_seconds:records*duration,record_bytes:recordBytes,channels};
}
export async function readEDFHeader(path,expectedBytes){
  const f=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try{const s=await f.stat();if(!s.isFile()||s.size!==expectedBytes)fail('INVALID_EDF','EDF original size/type changed.');
    const exact=async buffer=>{let n=0;while(n<buffer.length){const {bytesRead}=await f.read(buffer,n,buffer.length-n,n);if(!bytesRead)fail('INVALID_EDF','Short EDF header.');n+=bytesRead;}return buffer;};
    const fixed=await exact(Buffer.alloc(256));
    const count=numeric(fixed.subarray(252,256).toString('ascii').trim(),true);if(count<1||count>16)fail('INVALID_EDF','Unbounded EDF signal count.');
    const buffer=await exact(Buffer.alloc(256*(count+1)));return parseEDFHeader(buffer,s.size);
  }finally{await f.close();}
}
export function parseHypnogram(bytes){
  const header=parseEDFHeader(bytes,bytes.length);
  if(!header.reserved.startsWith('EDF+C')||header.channels.length!==1||header.channels[0].label!=='EDF Annotations')fail('INVALID_EDF','Require the approved continuous annotation-only EDF+.');
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(header.header_bytes));}catch{fail('INVALID_EDF','Invalid annotation UTF-8.');}
  const annotations=[];let prior=-Infinity;
  for(const tal of text.split('\0').filter(Boolean)){
    const m=/^([+-]\d+(?:\.\d+)?)(?:\x15(\d+(?:\.\d+)?))?\x14(.*)\x14$/s.exec(tal);if(!m)fail('INVALID_EDF','Malformed EDF+ time-stamped annotation.');
    const onset=Number(m[1]),duration=m[2]===undefined?null:Number(m[2]);if(!Number.isFinite(onset)||onset<prior||duration!==null&&(!Number.isFinite(duration)||duration<=0))fail('INVALID_EDF','Invalid annotation time order/duration.');prior=onset;
    for(const label of m[3].split('\x14').filter(Boolean)){
      if(duration===null||!['Sleep stage W','Sleep stage 1','Sleep stage 2','Sleep stage 3','Sleep stage 4','Sleep stage R','Sleep stage ?','Movement time','Sleep stage M'].includes(label))fail('INVALID_EDF','Unsupported annotation label or missing duration.');
      annotations.push({onset_seconds:onset,duration_seconds:duration,label});
    }
  }
  if(!annotations.length)fail('INVALID_EDF','No sleep-stage annotations.');return {header,annotations};
}
export function validateSleepPair(psg,hyp){
  if(psg.local_start!==hyp.header.local_start||psg.duration_seconds<=0||psg.channels.some(c=>c.label==='EDF Annotations'))fail('PAIR_MISMATCH','PSG/hypnogram clocks or signal roles disagree.');
  if(!['EEG Fpz-Cz','EEG Pz-Oz','EOG horizontal'].every(label=>psg.channels.some(c=>c.label===label)))fail('PAIR_MISMATCH','Required documented PSG signals are missing.');
  let end=0;const counts={};
  for(const a of hyp.annotations){if(a.onset_seconds<end||a.onset_seconds<0||a.onset_seconds+a.duration_seconds>psg.duration_seconds)fail('PAIR_MISMATCH','Annotations overlap or lie outside the recording.');end=a.onset_seconds+a.duration_seconds;counts[a.label]=(counts[a.label]??0)+1;}
  return {record_id:'SC4001',source_subject_number:'00',night_number:1,scorer_code:'C',pair_binding:'Exact original filenames and publisher SHA256,matching source-local start and bounded annotations.',local_start:psg.local_start,timezone:null,psg_duration_seconds:psg.duration_seconds,annotation_count:hyp.annotations.length,first_annotation_onset_seconds:hyp.annotations[0].onset_seconds,last_annotation_end_seconds:end,annotation_label_counts:counts,clinical_validation:false};
}
