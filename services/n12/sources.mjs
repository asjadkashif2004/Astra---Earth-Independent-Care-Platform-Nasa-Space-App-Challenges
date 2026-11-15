import { readFileSync,lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { contexts } from '../n11/sources.mjs';
import { ensure,iso } from './contracts.mjs';
const url=new URL('../../artifacts/n11-engineering-20261031/candidate-dispositions.json',import.meta.url),PIN='49473da025efd1af0f28cbf2b4e802e6b3eedcd081810e757a9152607e20a1a7';
export function rejectedN11(){const p=fileURLToPath(url),s=lstatSync(p);ensure(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<65536,'N12_N11_SOURCE');const raw=readFileSync(p);ensure(createHash('sha256').update(raw).digest('hex')===PIN,'N12_N11_PIN');const v=JSON.parse(raw);ensure(v.isolation_forest.status==='REJECTED_FOR_PROMOTION'&&v.operational_promotion_authorized===false,'N12_N11_REJECTED');return {source_sha256:PIN,...v,isolation_forest_inference:'DISABLED'};}
export function contextAt(engine,who,config,issue){return {schema_version:'astra.n12.context.v1',...contexts(engine,who,{...config,before:issue}),N11:rejectedN11(),downstream:{N16:'INACTIVE',N14:'INACTIVE',N15:'INACTIVE',may_create_N02_alert:false},actual_recording_at:iso(engine.state.now),forecast_features:'ONLY_VALIDATED_SAME_METRIC_WINDOW; contexts never injected'};}
