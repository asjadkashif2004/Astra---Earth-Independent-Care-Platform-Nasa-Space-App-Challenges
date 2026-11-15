/* Structural gate for separately collected physical evidence. It never certifies hardware. */
export function validateAC20(record) {
  const issues=[];const need=(ok,message)=>{if(!ok)issues.push(message);};
  need(record?.schema_version==='astra.ac20.physical.v1','Unsupported or missing evidence schema');
  const device=record?.device??{},approval=record?.minimum_machine_designation??{};
  for(const key of ['id','cpu','gpu','gpu_driver','os','browser','power_mode','thermal_conditions','host_placement'])need(typeof device[key]==='string'&&device[key].trim().length>0,'Missing device field: '+key);
  need(Number.isSafeInteger(device.ram_bytes)&&device.ram_bytes>0,'RAM bytes must be a positive integer');
  need(approval.device_id===device.id&&typeof device.id==='string','Minimum-machine designation does not bind this device');
  need(approval.decision==='DESIGNATED'&&typeof approval.owner==='string'&&approval.owner.trim()&&typeof approval.at==='string'&&Number.isFinite(Date.parse(approval.at))&&typeof approval.record_reference==='string'&&approval.record_reference.trim(),'Owner minimum-machine designation is absent or incomplete');
  need(record?.visible_browser===true&&record?.headless===false,'A visible physical browser is required');
  need(record?.measurement==='visible-browser-presented-frame-trace','Presented-frame evidence required; draw submissions and rAF are diagnostics');
  need(record?.viewport?.width===1920&&record?.viewport?.height===1080,'Provisional protocol requires 1920×1080');
  need(Number.isFinite(record?.viewport?.dpr)&&record.viewport.dpr>0&&Number.isFinite(record?.viewport?.zoom)&&record.viewport.zoom>0,'DPR and native zoom must be recorded');
  need(record?.profile==='judge-performance'&&record?.continuous_animation===true&&record?.reduced_motion===false,'Quality-reduced profile must retain continuous animation');
  need(record?.workload?.crew===6&&Number.isFinite(record?.workload?.scalar_events_per_second)&&record.workload.scalar_events_per_second>=60&&record?.workload?.no_source_suppression===true,'Six-crew declared 60 scalar/s workload without suppression is required');
  const scenes=Array.isArray(record?.required_active_scenes)?record.required_active_scenes:[];
  need(scenes.length>0&&scenes.every(s=>typeof s==='string'&&s.trim())&&new Set(scenes).size===scenes.length,'Declare all relevant active scenes without duplicates');
  const trials=Array.isArray(record?.trials)?record.trials:[];
  need(Array.isArray(record?.trials)&&trials.length===scenes.length*3,'Three warmed trials per declared active scene are required');
  const ids=new Set();
  for(const trial of Array.isArray(trials)?trials:[]) {
    if(!trial||typeof trial!=='object'||Array.isArray(trial)){need(false,'Malformed trial');continue;}
    need(typeof trial.id==='string'&&trial.id.trim()&&!ids.has(trial.id),'Missing or duplicate trial ID');ids.add(trial.id);
    need(scenes?.includes(trial.scene),'Trial belongs to an undeclared scene');
    need(trial.warmed===true&&trial.duration_seconds===60,'Each warmed trial must cover 60 seconds');
    need(typeof trial.trace_sha256==='string'&&/^[a-f0-9]{64}$/.test(trial.trace_sha256)&&typeof trial.trace_reference==='string'&&trial.trace_reference.trim(),'Original presentation trace reference and SHA-256 are required');
    need(Array.isArray(trial.seconds)&&trial.seconds.length===60,'Exactly 60 consecutive one-second intervals are required');
    for(const [i,s] of (Array.isArray(trial.seconds)?trial.seconds:[]).entries())need(s?.index===i&&s.active===true&&Number.isInteger(s.presented_frames)&&s.presented_frames>=30,'Every active second must have at least 30 presented frames ('+trial.id+':'+i+')');
  }
  for(const scene of scenes)need(trials.filter(t=>t?.scene===scene).length===3,'Missing three trials for '+scene);
  return {schema_version:'astra.ac20.validation.v1',status:issues.length?'NOT_VERIFIED':'STRUCTURALLY_READY_FOR_OWNER_REVIEW',issues,physical_certification:false,limitations:'Validates submitted structure and arithmetic only. Does not authenticate human identity, trace authenticity, machine designation, scene completeness, physical presentation or owner acceptance. N06 integrated evidence and N26 final revalidation remain separate.'};
}

export function ac20Template() {
  return {schema_version:'astra.ac20.physical.v1',device:{id:'',cpu:'',gpu:'',gpu_driver:'',ram_bytes:null,os:'',browser:'',power_mode:'',thermal_conditions:'',host_placement:''},minimum_machine_designation:{device_id:'',decision:'PENDING',owner:'',at:null,record_reference:''},visible_browser:null,headless:null,measurement:'',viewport:{width:1920,height:1080,dpr:null,zoom:null},profile:'judge-performance',continuous_animation:null,reduced_motion:null,workload:{crew:6,scalar_events_per_second:null,no_source_suppression:null},required_active_scenes:[],trials:[],review:{owner:'',decision:'PENDING',at:null}};
}
