// Authored fictional software fixtures, not measured sleep stages or clinical norms.
export const FIXTURE_VERSION='astra.n10.synthetic-fixtures.v1';
export const DATE='2026-11-14',SOURCE_AT=DATE+'T11:00:00.000Z';
export const actor={id:'demo_admin',role:'demo_admin'},crew='CREW-03';
let serial=0;
export function request(kind,data,options={}){
  return {schema_version:'astra.n10.request.v1',kind,id:options.id??kind+'-'+(++serial),expected_revision:options.revision??0,
    request_id:options.request_id??'request-'+(++serial),source_at:options.source_at??SOURCE_AT,
    source:options.source??{kind:'authored_synthetic',source_id:FIXTURE_VERSION,quality:'good'},data};
}
export const data={
  stage:{start_at:DATE+'T01:00:00.000Z',end_at:DATE+'T02:00:00.000Z',label:'Sleep stage 2',status:'observed'},
  schedule:{start_at:'2026-11-13T23:00:00.000Z',end_at:DATE+'T07:00:00.000Z',effective_from:DATE,effective_to:DATE,reference_hours:8,status:'active'},
  consent:{state:'granted',task:true,mood:true,fatigue:true,share_review:false},
  checkin:{status:'recorded',mood:3,fatigue:4,trials:[200,210,220,230,240],task_id:'reaction-five-v1',device:'fixture-device-v1',consent_revision:1},
  exercise_plan:{start_at:DATE+'T06:00:00.000Z',end_at:DATE+'T07:00:00.000Z',category:'cycling',target_minutes:30,workload:50,workload_unit:'W',status:'planned'},
  exercise:{start_at:DATE+'T06:00:00.000Z',end_at:DATE+'T06:45:00.000Z',category:'cycling',plan_id:null,plan_revision:0,status:'performed',coverage:'complete',workload:50,workload_unit:'W'},
  movement:{start_at:DATE+'T06:00:00.000Z',end_at:DATE+'T07:00:00.000Z',steps:150,coverage:'complete',status:'observed'}
};
