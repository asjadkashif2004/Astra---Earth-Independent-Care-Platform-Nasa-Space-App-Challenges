// Staged alone inside bwrap. No operational imports, paths, arbitrary SQL or model.
import { DatabaseSync,constants } from 'node:sqlite';
import { readFileSync,writeFileSync,openSync,closeSync,existsSync,readlinkSync,readdirSync,lstatSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { SQLITE_EDITION,AS_OF,SCHEMA,QUERIES,PROFILES,rowsFor,sourceMeta,projectRows } from './sqlite-fixture-contract.mjs';
import { parseJSON,stable,sha,validateCall,fail } from './read-contract.mjs';

const emit=v=>process.stdout.write(stable(v)+'\n');
const lines=createInterface({input:process.stdin,crlfDelay:Infinity})[Symbol.asyncIterator]();
const next=async()=>{const r=await lines.next();if(r.done)fail('CONTROL_CLOSED');return parseJSON(r.value,65536);};
const file='/fixture/source.sqlite';
function files(){return Object.fromEntries(['source.sqlite','source.sqlite-wal','source.sqlite-shm'].map(name=>{
  if(!existsSync('/fixture/'+name))return [name,null];const s=lstatSync('/fixture/'+name);
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>(name.endsWith('-wal')?4194304:1048576))fail('SOURCE_FILE_UNSAFE');
  return [name,{bytes:s.size,sha256:sha(readFileSync('/fixture/'+name))}];}));}
function containment(reader){
  if(existsSync('/home')||existsSync('/mnt')||existsSync('/project'))fail('SANDBOX_PATH_LEAK');
  const routes=readFileSync('/proc/net/route','utf8').trim().split('\n');if(routes.length!==1)fail('NETWORK_NOT_ISOLATED');
  let rootDenied=false,dbDenied=false;
  try{writeFileSync('/must-not-write','x');}catch(e){rootDenied=e.code==='EROFS';}
  if(!rootDenied)fail('ROOT_NOT_READONLY');
  if(reader){let directoryDenied=false;try{writeFileSync('/fixture/must-not-create','x');}catch(e){directoryDenied=e.code==='EROFS';}
    try{const fd=openSync(file,'r+');closeSync(fd);}catch(e){dbDenied=['EROFS','ENOENT'].includes(e.code);}if(!dbDenied||!directoryDenied)fail('SOURCE_NOT_READONLY');}
  return {root_write_denied:rootDenied,database_write_denied:reader?dbDenied:null,network_namespace:readlinkSync('/proc/self/ns/net'),
    mount_namespace:readlinkSync('/proc/self/ns/mnt'),routes:routes.length-1,project_visible:false,home_visible:false,
    source_mount:reader?'read_only':'test_writer_only',pid:process.pid,sqlite:process.versions.sqlite,node:process.version};
}
function insert(db,profile,generation){
  const rows=rowsFor(profile,generation);
  for(const [key,v] of Object.entries(sourceMeta(profile,generation)))db.prepare('INSERT INTO fixture_meta VALUES(?,?)').run(key,stable(v));
  for(const table of ['observations','baselines'])for(const r of rows[table])db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?)`).run(r.crew_id,r.metric,r.json,r.sha256);
  for(const r of rows.risks)db.prepare('INSERT INTO risks VALUES(?,?,?,?,?)').run(r.id,r.crew_id,r.status,r.json,r.sha256);
}
let db;
try{
  const mode=process.argv[2],request=await next();
  if(!['build','writer','read','negative','timeout'].includes(mode)||!PROFILES.includes(request.profile))fail('PROCESS_MODE_FORBIDDEN');
  const isolation=containment(mode==='read'||mode==='negative'||mode==='timeout');
  if(mode==='build'){
    if(readdirSync('/fixture').length)fail('BUILD_NOT_EMPTY');
    db=new DatabaseSync(file,{allowExtension:false,timeout:0});db.exec('PRAGMA page_size=4096; PRAGMA max_page_count=256;'+SCHEMA);
    db.exec('BEGIN');insert(db,request.profile,0);db.exec('COMMIT');db.close();db=null;
    emit({event:'BUILT',synthetic:true,isolation,files:files()});
  }else if(mode==='writer'){
    db=new DatabaseSync(file,{allowExtension:false,timeout:0});
    if(request.busy)db.exec('PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;');
    else {db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;');
      db.prepare('INSERT INTO fixture_meta VALUES(?,?)').run('writer_marker',stable('synthetic-writer-ready'));}
    // NEVER open/close a second database fd in this SQLite-owning writer: that can drop its POSIX locks.
    emit({event:'WRITER_READY',synthetic:true,isolation,locking_mode:db.prepare('PRAGMA locking_mode').get(),transaction:db.isTransaction});
    let commands=0;
    while(true){const c=await next();if(++commands>8)fail('WRITER_BUDGET');
      if(c.command==='exit'){if(request.busy)db.exec('ROLLBACK');break;}
      if(request.busy)fail('BUSY_WRITER_ONLY_RELEASE');
      if(c.command==='commit'){
        const r=rowsFor(request.profile,1).observations.find(r=>r.crew_id==='CREW-03'&&r.metric==='heart_rate');
        db.exec('BEGIN IMMEDIATE');
        db.prepare('UPDATE observations SET json=?,sha256=? WHERE crew_id=? AND metric=?').run(r.json,r.sha256,r.crew_id,r.metric);
        // Generation1 only changes this channel; other observations retain generation0 identities.
        db.prepare('UPDATE fixture_meta SET json=? WHERE key=?').run('1','generation');db.exec('COMMIT');
      }else if(c.command==='checkpoint'||c.command==='truncate'){
        emit({event:'WRITER_STEP',command:c.command,checkpoint:db.prepare(c.command==='checkpoint'?'PRAGMA wal_checkpoint(PASSIVE)':'PRAGMA wal_checkpoint(TRUNCATE)').get()});continue;
      }else fail('WRITER_COMMAND_FORBIDDEN');
      emit({event:'WRITER_STEP',command:c.command});
    }
    db.close();db=null;emit({event:'WRITER_CLOSED'});
  }else{
    const call=validateCall(request.call),before=files();
    if(mode==='timeout'){emit({event:'SQL_CONTROL_WAIT'});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2000);}
    db=new DatabaseSync(file,{readOnly:true,allowExtension:false,defensive:true,timeout:0,enableForeignKeyConstraints:false,
      limits:{length:1048576,sqlLength:4096,attach:0,column:32}});
    db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;');
    const allowed={fixture_meta:['key','json'],observations:['crew_id','metric','json','sha256'],baselines:['crew_id','metric','json','sha256'],risks:['id','crew_id','status','json','sha256']};
    let denied=0;
    db.setAuthorizer((action,table,column,database)=>{
      if(action===constants.SQLITE_SELECT||action===constants.SQLITE_TRANSACTION)return constants.SQLITE_OK;
      if(action===constants.SQLITE_READ&&database==='main'&&allowed[table]?.includes(column))return constants.SQLITE_OK;
      denied++;return constants.SQLITE_DENY;
    });
    if(mode==='negative'){
      const failures=[];
      for(const sql of ['UPDATE observations SET json=\'{}\'','CREATE TABLE forbidden(x)','ATTACH DATABASE \':memory:\' AS forbidden',"SELECT * FROM sqlite_schema"]){
        try{db.exec(sql);fail('UNAUTHORIZED_SQL_EXECUTED');}catch(e){if(e.code==='UNAUTHORIZED_SQL_EXECUTED')throw e;failures.push(e.message);}
      }
      db.close();db=null;emit({event:'NEGATIVE_CONTROLS',denied,failures,isolation,before,after:files()});
    }else{
      const started=performance.now();db.exec('BEGIN');
      const meta=Object.fromEntries(db.prepare(QUERIES.metadata).all('schema_version','profile','generation').map(r=>[r.key,JSON.parse(r.json)]));
      if(stable(meta)!==stable(sourceMeta(request.profile,request.generation)))fail('SOURCE_IDENTITY_MISMATCH');
      if(request.barrier){emit({event:'READ_SNAPSHOT',generation:meta.generation});let timer;
        try{const message=await Promise.race([next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('READ_TRANSACTION_LIMIT'),{code:'READ_TRANSACTION_LIMIT'})),Math.max(1,250-(performance.now()-started)));})]);
          if(message.command!=='continue')fail('INVALID_READ_BARRIER');}finally{clearTimeout(timer);}}
      const query_ids=['metadata'];let selected;
      if(call.tool==='get_open_risk_events'){query_ids.push('risks');selected=db.prepare(QUERIES.risks).all(call.args.crew_id,'open',call.args.limit+1);}
      else{const table=call.tool==='get_personal_baseline'?'baseline':'observation';
        selected=call.args.metrics.map(m=>{query_ids.push(table);return db.prepare(QUERIES[table]).get(call.args.crew_id,m)??null;});}
      const result=projectRows(request.profile,request.generation,call,selected),transaction_ms=performance.now()-started;
      db.exec('ROLLBACK');db.close();db=null;
      if(transaction_ms>250)fail('READ_TRANSACTION_LIMIT');
      emit({event:'RESULT',result,receipt:{actual_sql_queries:query_ids.length,query_ids,selected_rows_sha256:sha(stable(selected)),
        transaction_ms,readOnly:true,isolation,denied_operations:denied,before,after:files(),rss:process.memoryUsage().rss}});
    }
  }
}catch(e){if(db){try{db.close();}catch{}}
  emit({event:'FAILED',code:e.errcode===5?'SQLITE_BUSY':e.errcode===6?'SQLITE_LOCKED':e.code?.startsWith('ERR_SQLITE')?'SQLITE_UNAVAILABLE':e.code??'SOURCE_UNAVAILABLE',message:String(e.message).slice(0,300)});process.exitCode=1;
}finally{process.stdin.destroy();await lines.return?.();}
