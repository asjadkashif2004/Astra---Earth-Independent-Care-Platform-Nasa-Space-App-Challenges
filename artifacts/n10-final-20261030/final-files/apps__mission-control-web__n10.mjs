import { escape as esc } from './ui.mjs';
const labels=['Sleep stage W','Sleep stage 1','Sleep stage 2','Sleep stage 3','Sleep stage 4','Sleep stage R','Sleep stage ?','Movement time','Sleep stage M'];
const kinds=['stage','schedule','sleep_status','exercise_plan','exercise','movement'];
const field=(name,label,type='text',value='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" '+(type==='number'?'step="any" ':'')+'value="'+esc(value)+'" required></label>';
const options=(name,label,values)=>'<label>'+label+'<select name="'+name+'">'+values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>';
const fmt=v=>v===null||v===undefined?'UNKNOWN':typeof v==='number'?String(Math.round(v*100)/100):esc(v);
const dayStart=d=>d+'T00:00:00.000Z',iso=v=>new Date(v).toISOString();
export function browserDeviceIdentity(storage,uuid=()=>crypto.randomUUID()){
  try{
    const previous=storage.getItem('astra-n10-device-id');
    if(typeof previous==='string'&&/^browser-local-[A-Za-z0-9-]{1,70}$/.test(previous))return previous;
    const next='browser-local-'+uuid();storage.setItem('astra-n10-device-id',next);return next;
  }catch{return 'ephemeral-'+uuid();}
}
export function mountN10(main,{crew,crews=[crew],onCrew=()=>{},identity,api,isCurrent,now,earth=false}){
  const device=browserDeviceIdentity(localStorage);
  let disposed=false,view=null,timer=null,phase='idle',trials=[],readyAt=0,pending=null,editingTask=null,checkinId='task-'+crypto.randomUUID(),loadSequence=0,saving=false;
  const active=()=>!disposed&&isCurrent();
  const root=document.createElement('div');root.className='n10-workspace';main.append(root);
  root.innerHTML='<div class="page-heading"><div><div class="eyebrow">CREW RESILIENCE / N10</div><h1>Sleep, cognition & countermeasures</h1><p>Source-bound synthetic records · UTC mission clock · no diagnosis or clinical scores.</p></div><span class="tag">SYNTHETIC DEMO</span></div>'+
    '<div class="panel n10-controls"><strong id="n10-crew">'+esc(crew)+'</strong>'+options('n10_crew','Fictional crew',crews)+field('day','UTC day','date',now.slice(0,10))+
    field('before','Knowledge / source cutoff UTC','text',now)+field('days','Accounting window days (1–31)','number','7')+'<button class="button" id="n10-load">Apply replay cutoff</button></div>'+
    '<p id="n10-status" role="status" aria-live="polite">Loading N10 records…</p><div id="n10-results"></div>'+
    '<section class="panel n10-private"><h2>Optional personal check-in</h2><p>Participation is voluntary. Decline, skip or cancel without penalty. Raw entries are private; sharing with authorized mission reviewers is optional. Browser/device timing is approximate, not laboratory cognition measurement.</p><p>Local browser-profile identifier: '+esc(device)+'. Not authenticated hardware. Only this non-secret identifier is stored locally; no raw check-ins are cached.</p>'+
    '<form id="n10-consent"><label><input name="task" type="checkbox" checked> Allow task trials</label><label><input name="mood" type="checkbox"> Allow optional mood</label><label><input name="fatigue" type="checkbox"> Allow optional fatigue</label><label><input name="share_review" type="checkbox"> Share with authorized mission reviewers</label>'+
    '<button class="button" name="state" value="granted">Grant consent</button><button class="button" name="state" value="declined">Decline</button><button class="button" name="state" value="withdrawn">Withdraw</button></form>'+
    '<p id="n10-consent-state">UNKNOWN</p><button class="cognitive-target" id="n10-target" disabled>Begin five-trial task</button><p id="n10-trials" aria-live="polite">No task measurements</p>'+
    '<form id="n10-checkin"><label>Optional mood (1–5, blank = UNKNOWN)<input name="mood" type="number" min="1" max="5"></label><label>Optional fatigue (0–10, blank = UNKNOWN)<input name="fatigue" type="number" min="0" max="10"></label>'+
    '<button class="button" name="status" value="recorded" id="n10-save-task">Save permitted check-in</button><button class="button" name="status" value="skipped">Skip</button><button class="button" name="status" value="cancelled">Cancel</button></form></section>'+
    '<section class="panel"><h2>Source record editor</h2><p>Explicitly authored synthetic observations and plans. These controls never infer sensor data or change N02 alerts.</p><form id="n10-record">'+
    options('kind','Record type',kinds)+field('id','Stable record ID','text','record-'+crypto.randomUUID())+
    field('expected_revision','Expected prior revision (0 = new)','number','0')+field('source_id','Source identity','text','authored-n10-v1')+
    options('quality','Source quality',['good','suspect','missing'])+'<div id="n10-fields" class="n10-fields"></div><button class="button primary">Save authored revision</button>'+
    '<button class="button" type="button" id="n10-new">New record</button></form><p>Choose “Correct” on a history row to append a revision. Use cancelled status to cancel; originals remain in history.</p></section>'+
    '<section class="panel"><h2>Revision and provenance history</h2><div id="n10-history"></div></section>';
  const q=s=>root.querySelector(s),status=t=>{if(active())q('#n10-status').textContent=t;};
  const input=name=>q('#n10-record [name="'+name+'"]');
  const canWrite=['astronaut','demo_admin'].includes(identity.role)&&!earth;
  function stopTask(){clearTimeout(timer);timer=null;phase='idle';trials=[];if(active()){q('#n10-target').textContent='Begin five-trial task';q('#n10-trials').textContent='No task measurements';}}
  function defaults(kind){
    const date=q('[name=day]').value,a=date+'T06:00:00.000Z',b=date+'T07:00:00.000Z';
    if(kind==='stage')return {start_at:a,end_at:b,label:labels[2],status:'observed'};
    if(kind==='schedule')return {start_at:date+'T00:00:00.000Z',end_at:b,effective_from:date,effective_to:date,reference_hours:7,status:'active'};
    if(kind==='sleep_status')return {day:date,status:'unknown',session_id:''};
    if(kind==='exercise_plan')return {start_at:a,end_at:b,category:'cycling',target_minutes:30,workload:50,workload_unit:'W',status:'planned'};
    if(kind==='exercise')return {start_at:a,end_at:b,category:'cycling',plan_id:'',plan_revision:0,status:'performed',coverage:'complete',workload:50,workload_unit:'W'};
    return {start_at:a,end_at:b,steps:100,coverage:'complete',status:'observed'};
  }
  function editor(kind,data=defaults(kind)){
    const fields=[];
    for(const [name,value] of Object.entries(data)){
      const choices=name==='label'?labels:name==='status'?(kind==='stage'?['observed','cancelled']:kind==='schedule'?['active','cancelled']:kind==='sleep_status'?['unknown','partial','completed','missed','cancelled']:kind==='exercise_plan'?['planned','cancelled']:kind==='exercise'?['performed','partial','missed','cancelled']:['observed','cancelled'])
        :name==='coverage'?['complete','partial','unknown']:name==='workload_unit'?['W','kg','arbitrary_unit','UNKNOWN']:null;
      fields.push(choices?options(name,name.replaceAll('_',' '),choices):field(name,name.replaceAll('_',' '),typeof value==='number'?'number':name.startsWith('effective_')?'date':'text',value??''));
    }
    q('#n10-fields').innerHTML=fields.join('');
    for(const [name,value] of Object.entries(data)){const el=q('#n10-fields [name="'+name+'"]');if(el)el.value=value??'';}
    // Only optional scalar fields may be left blank; empty is UNKNOWN, never zero.
    for(const name of ['plan_id','session_id','workload','steps']){const el=q('#n10-fields [name="'+name+'"]');if(el)el.required=false;}
  }
  async function submit(kind,id,data,revision=0,source=null){
    if(!canWrite)throw Error('Read-only role/view; no record was submitted.');
    const content={schema_version:'astra.n10.request.v1',kind,id,expected_revision:revision,source_at:view.current_mission_at,
      source:source??{kind:'authored_synthetic',source_id:'authored-n10-v1',quality:'good'},data};
    const key=JSON.stringify(content);
    if(!pending||pending.key!==key)pending={key,request_id:crypto.randomUUID()};
    const result=await api('/n10/crew/'+crew+'/records',{...content,request_id:pending.request_id});
    pending=null;view.current_mission_at=result.record.known_at;return result;
  }
  function render(v){
    const s=v.sleep.history.at(-1),ref=v.cognition.reference,ex=v.exercise;
    const bars=v.stages.intervals.map(r=>'<div class="n10-stage"><span>'+esc(r.label)+'</span><meter min="0" max="86400" value="'+(r.end-r.start)/1000+'" aria-label="'+esc(r.label)+' duration"></meter><span>'+fmt((r.end-r.start)/60000)+' min · '+esc(r.quality)+'</span></div>').join('');
    q('#n10-results').innerHTML='<div class="n10-grid"><section class="panel"><h2>Sleep stages / UTC day</h2><p id="n10-stage-summary">Coverage '+fmt(v.stages.coverage===null?null:100*v.stages.coverage)+'% · '+esc(v.stages.status)+'</p>'+
      (bars||'<p>UNKNOWN — no supplied stage observations.</p>')+'<p>'+esc(v.stages.reason)+'</p><pre>'+esc(JSON.stringify(v.stages.totals_seconds,null,2))+'</pre></section>'+
      '<section class="panel"><h2>Dated sleep accounting</h2><p id="n10-sleep-summary">Planned '+fmt(s.schedule.planned_hours)+' h · observed '+fmt(s.actual.hours)+' h · difference '+fmt(s.difference_hours)+' h</p><p>Schedule '+esc(s.schedule.status)+' · actual '+esc(s.actual.status)+'</p><p id="n10-deficit">Cumulative descriptive shortfall: '+fmt(v.sleep.cumulative_shortfall_hours)+' h ('+v.sleep.covered_days+'/'+v.sleep.requested_days+' covered days)</p><p>'+esc(v.sleep.formula)+'</p>'+v.sleep.history.map(r=>'<p>'+r.day+': '+fmt(r.difference_hours)+' h · '+r.status+'</p>').join('')+'</section>'+
      '<section class="panel"><h2>Personal task history</h2><p id="n10-reference">'+esc(ref.status)+' · '+(ref.status==='KNOWN'?'Reference '+fmt(ref.center_ms)+' ms, current '+fmt(ref.current_mean_ms)+' ms, difference '+fmt(ref.difference_ms)+' ms':esc(ref.reason))+'</p>'+
      '<p>'+esc(v.cognition.limitation)+'</p>'+v.cognition.history.map(r=>'<p>'+esc(r.source_at)+' · '+esc(r.data.status)+' · mood '+fmt(r.data.mood)+' · fatigue '+fmt(r.data.fatigue)+' · '+r.data.trials.length+' trials</p>'+
        (r.data.trials.length?'<meter min="100" max="3000" value="'+r.data.trials.reduce((s,x)=>s+x,0)/r.data.trials.length+'" aria-label="Personal task mean at '+esc(r.source_at)+'"></meter>':'')+
        (canWrite&&r.actor===identity.id?'<button type="button" class="button" data-n10-task-edit="'+esc(r.hash)+'">Correct check-in</button>':'')).join('')+'</section>'+
      '<section class="panel"><h2>Countermeasures</h2><p id="n10-adherence">Adherence '+esc(ex.adherence.status)+' · '+fmt(ex.adherence.percent)+'% · '+ex.adherence.completed_plans+'/'+ex.adherence.eligible_plans+' authored plans</p><p>'+esc(ex.adherence.denominator)+'</p>'+
      ex.sessions.map(r=>'<p>'+esc(r.data.category)+' · '+esc(r.data.status)+' · workload '+fmt(r.data.workload)+' '+fmt(r.data.workload_unit)+'</p>').join('')+
      '<p id="n10-movement">Movement '+esc(ex.movement.status)+' · '+fmt(ex.movement.steps)+' steps · '+fmt(ex.movement.coverage_seconds)+' seconds observed</p><p>'+esc(ex.movement.reason)+'</p></section></div>';
    q('#n10-history').innerHTML=v.records.length?v.records.slice().reverse().map(r=>'<article class="n10-history-row"><strong>'+esc(r.kind)+' / '+esc(r.id)+' r'+r.revision+'</strong><p>Source '+esc(r.source_at)+' · mission known '+esc(r.known_at)+' · host submitted '+esc(r.submitted_at_host)+' · '+esc(r.source.kind)+' / '+esc(r.source.source_id)+'</p>'+
      (canWrite&&!['consent','checkin'].includes(r.kind)?'<button type="button" class="button" data-n10-edit="'+esc(r.hash)+'">Correct</button>':'')+
      '<details><summary>Inspect revision and provenance</summary><pre tabindex="0">'+esc(JSON.stringify(r,null,2))+'</pre></details></article>').join(''):'<p>UNKNOWN — no authorized records known at this cutoff.</p>';
    const grant=v.cognition.current_consent;
    q('#n10-consent-state').textContent='Consent: '+(grant?.data.state??'UNKNOWN')+' · '+v.cognition.status;
    q('#n10-target').disabled=!canWrite||grant?.data.state!=='granted'||!grant?.data.task;
    q('#n10-save-task').disabled=!canWrite||grant?.data.state!=='granted';
    for(const name of ['mood','fatigue'])q('#n10-checkin [name="'+name+'"]').disabled=!canWrite||!grant?.data[name]||grant?.data.state!=='granted';
  }
  async function load(){
    const sequence=++loadSequence;
    status('Loading verified source/knowledge-time projection…');
    try{
      if(earth)throw Error('Onboard N10 records are unavailable in Earth received view; no unreceived data was fetched.');
      const date=q('[name=day]').value,before=q('[name=before]').value;
      const result=await api('/n10/crew/'+crew+'?day='+encodeURIComponent(date)+'&before='+encodeURIComponent(before)+'&days='+encodeURIComponent(q('.n10-controls [name=days]').value));
      if(!active()||sequence!==loadSequence)return;view=result;render(result);status('Loaded '+crew+' · '+result.as_of+' · replay is read-only. N02 authority unchanged.');
    }catch(e){if(!active()||sequence!==loadSequence)return;status('UNAVAILABLE: '+e.message);q('#n10-results').textContent='UNKNOWN — no data substituted.';q('#n10-history').textContent='UNAVAILABLE';}
  }
  function onChange(e){if(e.target.name==='kind')editor(e.target.value);if(e.target.name==='n10_crew'){stopTask();onCrew(e.target.value);}}
  async function onSubmit(e){
    e.preventDefault();if(!active()||!view||saving)return;const form=e.target,button=e.submitter;
    saving=true;status('Saving… waiting for a committed server acknowledgement.');
    const values=new FormData(form),formId=form.getAttribute('id');
    try{
      if(formId==='n10-consent'){
        const state=button?.value??'declined',data={state,...Object.fromEntries(['task','mood','fatigue','share_review'].map(k=>[k,state==='granted'&&values.get(k)==='on']))};
        stopTask();editingTask=null;const c=view.cognition.current_consent;
        await submit('consent','consent:'+identity.id,data,c?.revision??0,{kind:'browser_task',source_id:'explicit-consent-v1',quality:'good'});
      }else if(formId==='n10-checkin'){
        const statusValue=button?.value??'recorded',grant=view.cognition.current_consent;
        if(statusValue==='recorded'&&trials.length>0&&trials.length!==5)throw Error('Finish five valid trials, or cancel/skip without saving measurements.');
        const optional=k=>values.get(k)===''||values.get(k)===null?null:Number(values.get(k));
        await submit('checkin',editingTask?.id??checkinId,{status:statusValue,mood:statusValue==='recorded'?optional('mood'):null,
          fatigue:statusValue==='recorded'?optional('fatigue'):null,trials:statusValue==='recorded'?trials:[],task_id:'reaction-five-v1',
          device:editingTask?.data.device??device,consent_revision:grant?.revision??0},
          editingTask?.revision??0,editingTask?.source??{kind:'browser_task',source_id:'reaction-five-v1',quality:'good'});
        stopTask();editingTask=null;checkinId='task-'+crypto.randomUUID();
      }else if(formId==='n10-record'){
        const kind=values.get('kind'),template=defaults(kind),data={};
        for(const [key,val] of Object.entries(template)){
          const raw=values.get(key);
          data[key]=typeof val==='number'?(raw===''?null:Number(raw)):raw;
        }
        if(kind==='exercise'&&!data.plan_id)data.plan_id=null;
        if(kind==='sleep_status'&&!data.session_id)data.session_id=null;
        if(['exercise','exercise_plan'].includes(kind)&&data.workload_unit==='UNKNOWN'){data.workload=null;data.workload_unit=null;}
        await submit(kind,values.get('id'),data,Number(values.get('expected_revision')),
          {kind:'authored_synthetic',source_id:values.get('source_id'),quality:values.get('quality')});
      }else return;
      q('[name=before]').value=view.current_mission_at;await load();status('Saved append-only revision; source records and prior history retained.');
    }catch(e){status('SAVE FAILED: '+e.message+'. Inputs retained; no success assumed.');}
    finally{saving=false;}
  }
  function onClick(e){
    const button=e.target.closest('button');if(!button||!active())return;
    if(button.id==='n10-load'){stopTask();void load();return;}
    if(button.id==='n10-new'){input('id').value='record-'+crypto.randomUUID();input('expected_revision').value='0';editor(input('kind').value);return;}
    if(button.dataset.n10TaskEdit){
      const r=view.cognition.history.find(r=>r.hash===button.dataset.n10TaskEdit);
      if(r){stopTask();editingTask=r;trials=[...r.data.trials];q('#n10-trials').textContent='Correction of '+r.id+' r'+r.revision+' · '+trials.join(' / ')+' ms';
        for(const name of ['mood','fatigue'])q('#n10-checkin [name="'+name+'"]').value=r.data[name]??'';
        phase=trials.length===5?'complete':'idle';q('#n10-checkin [name=mood]').focus();}return;
    }
    if(button.dataset.n10Edit){
      const r=view.records.find(r=>r.hash===button.dataset.n10Edit);
      if(r){input('kind').value=r.kind;input('id').value=r.id;input('expected_revision').value=String(r.revision);input('source_id').value=r.source.source_id;input('quality').value=r.source.quality;editor(r.kind,r.data);input('id').focus();}return;
    }
    if(button.id!=='n10-target'||button.disabled)return;
    if(phase==='waiting'){clearTimeout(timer);phase='idle';button.textContent='Too early — retry this trial';return;}
    if(phase==='ready'){
      const measured=Math.round(performance.now()-readyAt);phase='idle';
      if(measured>=100&&measured<=3000){trials.push(measured);q('#n10-trials').textContent=trials.join(' / ')+' ms';}
      else q('#n10-trials').textContent='Out of range — excluded; valid trials '+trials.length;
      button.textContent=trials.length===5?'Five trials complete — save permitted check-in':'Begin next trial';
      if(trials.length===5){phase='complete';button.disabled=true;}return;
    }
    if(phase==='complete')return;
    phase='waiting';button.textContent='Wait for target…';timer=setTimeout(()=>{
      if(!active())return;phase='ready';readyAt=performance.now();button.textContent='NOW — press target';
    },1500+Math.random()*1000);
  }
  editor('stage');q('[name=n10_crew]').value=crew;root.addEventListener('submit',onSubmit);root.addEventListener('click',onClick);root.addEventListener('change',onChange);
  if(!canWrite)for(const form of root.querySelectorAll('form'))for(const el of form.querySelectorAll('input,select,button'))el.disabled=true;
  void load();
  return ()=>{disposed=true;clearTimeout(timer);root.removeEventListener('submit',onSubmit);root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);};
}
