import { sha256 } from '../../services/acquisition/validation.mjs';
export const VERSION='astra.n07.split-fixtures.v1';
export const POLICY={schema_version:'astra.n07.split-policy.v1',version:'synthetic-grouped-v1',seed:71030,mode:'group',ratios:[.6,.2,.2],purge_gap_seconds:0,preprocessing_fit:'training_only'};
export function units(){return Array.from({length:12},(_,i)=>({id:'SYN-U-'+i,source_id:'SYN-D-'+i,source_sha256:sha256('fictional-original-'+i),
  subject:'SYN-P-'+i,session:'SYN-S-'+i,scenario:'SYN-C-'+i,related:[],content_sha256:sha256('fictional-content-'+i),start_seconds:i*100,end_seconds:i*100+20,synthetic:true}));}
