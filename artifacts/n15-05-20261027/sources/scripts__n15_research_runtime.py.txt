"""Internal, reuse-only N15-05 runner. Never downloads, installs or serves a model.

Reuses hash-pinned N15-04C containment function definitions, not their one-shot
main body or expired setup. This research runner requires fresh owner authority.
"""
from pathlib import Path
import ast,builtins,ctypes,datetime,hashlib,json,os,re,resource,signal,stat,struct,subprocess,symtable,sys,threading,time,types
sys.dont_write_bytecode=True
PROJECT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(PROJECT/'scripts'))
import n15_backend_config as backend_config

PINS={'common-source.txt':'1bdc6860357176b576fd49a2654c132fc878e3b3bd3aa2a760ef3434d0d66698',
      'infer-source.txt':'f4484c16c016e14366cc285baba032cadacf21fcfb5957aa3e2cf7f50d3b3b37',
      'infer/native-identity-manifest.json':'ff40a2f210a48f0cc0f0b018a4cf209a8a9b8771a605a99933887d595f218029'}
FILE='qwen2.5-0.5b-instruct-q4_k_m.gguf'
SHA='74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db'
B_BASE=Path('/var/tmp/astra-n15-04b-0zd6xkaq')
POLICY={'version':'n15-05.v1','method':'lexical','k':1,'context':2048,'output_tokens':192,
        'threads':2,'deadline_s':120,'prompt_bytes':1536,'response_bytes':2048,
        'scope':'general_publication_research_only','independent_review':'pending'}

def load_frozen(name):
    p=PROJECT/'artifacts/n15-04c-20261027'/name
    raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=PINS[name]:raise RuntimeError('Frozen containment source hash changed')
    return raw.decode()

def validate_layout(actual,approved):
    if set(actual)!=set(approved):raise RuntimeError('Unexpected identity group')
    for group in ['native_files','notices','model']:
        rows=actual[group] if group!='model' else [actual[group]]
        expected=approved[group] if group!='model' else [approved[group]]
        if len(rows)!=len(expected):raise RuntimeError('Whitelist size changed')
        for row,original in zip(rows,expected):
            # WSL's two case spellings of the project root can name one inode.
            # Allow only that proven file identity, never an alternative provider.
            if ({k:v for k,v in row.items() if k!='source'}!={k:v for k,v in original.items() if k!='source'}
                or not os.path.samefile(row['source'],original['source'])):
                raise RuntimeError('Identity layout differs from approved C whitelist')

def validate_sandbox_globals(function,namespace):
    table=symtable.symtable(ast.unparse(function),'<frozen-sandbox>','exec')
    required=set()
    def walk(scope):
        required.update(s.get_name() for s in scope.get_symbols() if s.is_referenced() and s.is_global())
        for child in scope.get_children():walk(child)
    for child in table.get_children():walk(child)
    missing=required-set(namespace)-set(vars(builtins))-{'c','manifest','notice_mounts','model_mount'}
    if missing:raise RuntimeError('Frozen sandbox has unresolved controller globals: '+','.join(sorted(missing)))
    return sorted(required)

def setup(base,c):
    resource.setrlimit(resource.RLIMIT_AS,(2000000000,2000000000));resource.setrlimit(resource.RLIMIT_CORE,(0,0))
    c.MARK=base/'native-attempt.json'
    fd=os.open(c.MARK,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'w') as f:
        json.dump({'task':'N15-05','phase':'one_native_attempt_reserved','downloads':0},f);f.flush();os.fsync(f.fileno())
    c.base=base;c.root=base/'runtime';c.root.mkdir()
    for name in ['tmp','home','cache','work','work/tmp','work/tmp/home','work/tmp/cache']:(c.root/name).mkdir(exist_ok=True)
    c.start=time.monotonic();c.halt=threading.Event();c.active={};c.active_lock=threading.RLock();c.failures=[];c.samples=[];c.peaks={}
    c.state={'task':'N15-05','phase':'research-selection','scratch':str(base),'status':'PREFLIGHT',
      'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'native_commands':0,
      'model_acquisition_bytes':0,'runtime_acquisition_bytes':0,'network_requests':0,'network_bytes':0,
      'limits':{'storage':1500000000,'storage_stop':1350000000,'process_RSS':2000000000,'native_wall_s':120},
      'resource_authority':'N15-05-only monitored Choice B; overshoot possible','N15':'In Progress','N16':'Not Started'}
    c.count_roots=[base,B_BASE,c.RUNTIME,c.GOMP,c.ZLIB,Path('/var/tmp/astra-n15-03h-0oauyxf2')]
    c.count_roots += [p for p in Path('/var/tmp').glob('astra-n15-05-*') if p!=base and p.is_dir() and not p.is_symlink()]
    c.count_roots += [PROJECT/p for p in ['artifacts/n15-metadata-20261025','artifacts/n15-03e-20261026',
      'artifacts/n15-03g-20261027','artifacts/n15-03h-20261027','artifacts/n15-04b-20261027',
      'artifacts/n15-04c-20261027','artifacts/n15-05-20261027','data/corpus','data/research/n14-01/index','data/research/n15-05',
      'services/research-answer','services/research-retrieval']]
    c.admitted_external=[Path(__file__),PROJECT/'scripts/n15-research-answer.mjs',
      PROJECT/'scripts/n15_backend_config.py',PROJECT/'artifacts/n15-03f-20261027/static-dependency-closure.json',
      PROJECT/'tests/research-answer.test.mjs']
    c.samples.append(c.scan());c.atomic('resources-latest.json',c.samples[-1])
    c.observer=threading.Thread(target=c.observe,daemon=True);c.observer.start()

def main(args):
    global c,manifest,notice_mounts,model_mount
    if len(args)!=1:raise RuntimeError('One owned scratch directory argument required')
    base=Path(args[0])
    if (base.parent!=Path('/var/tmp') or not re.fullmatch(r'astra-n15-05-[A-Za-z0-9_-]+',base.name)
        or base.is_symlink() or not base.is_dir()):raise RuntimeError('Unsafe scratch path')
    # If the trusted JS controller dies, kill this supervisor; bwrap's unchanged
    # --die-with-parent then tears down its separate session/private PID tree.
    parent=os.getppid()
    if ctypes.CDLL(None,use_errno=True).prctl(1,signal.SIGKILL,0,0,0)!=0:raise RuntimeError('Parent-death guard unavailable')
    if os.getppid()!=parent:raise RuntimeError('Controller parent changed')
    source=load_frozen('common-source.txt')
    c=types.ModuleType('n15_05_supervision');c.__file__=str(PROJECT/'artifacts/n15-04c-20261027/common-source.txt')
    exec(compile(source,c.__file__,'exec'),c.__dict__)
    setup(base,c)
    def cancel(_sig,_frame):
        c.accounting.fail_closed('Controller cancellation',failures=c.failures,stop_event=c.halt,
          active=c.active,active_lock=c.active_lock,report_failure=lambda r:c.atomic('cancellation.json',r))
        raise SystemExit('Cancelled')
    signal.signal(signal.SIGTERM,cancel);signal.signal(signal.SIGINT,cancel)
    manifest=[];notice_mounts=[]
    try:
        request_file=base/'execution-request.json'
        if request_file.stat().st_size>12000:raise RuntimeError('Oversized internal request')
        request=json.loads(request_file.read_text())
        tree=ast.parse(load_frozen('infer-source.txt'))
        functions=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='run_sandbox']
        if len(functions)!=1:raise RuntimeError('Frozen containment function unavailable')
        c.atomic('sandbox-global-preflight.json',{'required_globals':validate_sandbox_globals(functions[0],globals()),'status':'PASS'})
        if set(request)!={'schema_version','policy','prompt','prompt_sha256','selection_sha256'} or request['schema_version']!='astra.n15-05.execution.v1' or request['policy']!=POLICY:
            raise RuntimeError('Unapproved execution policy')
        prompt=request['prompt']
        if not isinstance(prompt,str) or len(prompt.encode())>1536 or not prompt.startswith('<|im_start|>system\nSelect evidence for a general NASA-publication question.') or not prompt.endswith('<|im_start|>assistant\n'):
            raise RuntimeError('Unapproved or oversized prompt')
        if hashlib.sha256(prompt.encode()).hexdigest()!=request['prompt_sha256']:raise RuntimeError('Prompt hash mismatch')
        c.phase('verify-reused-model-and-native-identities')
        model=B_BASE/'acquisition'/FILE
        if model.stat().st_size!=491400032 or c.sha(model)!=SHA:raise RuntimeError('Missing or corrupt approved model')
        model_mount={'name':'approved_model','source':str(model),'destination':'/qualified/model/'+FILE,'sha256':SHA}
        closure=json.loads((PROJECT/'artifacts/n15-03f-20261027/static-dependency-closure.json').read_text())['records']
        if len(closure)!=17:raise RuntimeError('Unexpected native whitelist size')
        for name,row in closure.items():
            p=Path(row['path']);c.gate()
            if c.sha(p)!=row['sha256']:raise RuntimeError('Changed native file '+name)
            dest='/qualified/'+('runtime/' if p.is_relative_to(c.RUNTIME) else 'lib/')+name
            manifest.append({'name':name,'source':str(p),'destination':dest,'sha256':row['sha256'],'needed':row['needed']})
            if not any(p.is_relative_to(root) for root in c.count_roots):c.admitted_external.append(p)
        backend=backend_config.validate_backend_file(backend_config.BACKEND_PATH,manifest)
        for file,digest in [(c.RUNTIME/'llama-b11669-bin-ubuntu-x64.tar.gz','cf07c1c112d709bd67e522017471de57ed0ec8bea031d732c5422351c07f65ac'),
          (c.GOMP/'libgomp1_16-20260322-1ubuntu1_amd64.deb','add19738c63794d2aa9ac529d3b8aebe2e88980faecb6c1c59f07aefd6c3c314'),
          (c.ZLIB/'zlib1g_1.3.dfsg+really1.3.1-1ubuntu3.2_amd64.deb','10084666f747247550c3e82f9a12cbfd9184c19241a42eb34d8893ecb8e03b35')]:
            c.gate()
            if c.sha(file)!=digest:raise RuntimeError('Changed original artifact')
        notices=json.loads((PROJECT/'artifacts/n15-03g-20261027/notices.json').read_text())
        paths={str((PROJECT/p).resolve()) for row in notices['license_groups'] for p in row['evidence']}
        paths.add(str(B_BASE/'model-notices/model-license.txt'))
        for file in sorted(paths):
            p=Path(file);notice_mounts.append({'source':str(p),'destination':'/qualified/notices/'+p.name,'sha256':c.sha(p)})
            if not any(p.is_relative_to(root) for root in c.count_roots):c.admitted_external.append(p)
        approved=json.loads(load_frozen('infer/native-identity-manifest.json'))
        validate_layout({'native_files':manifest,'notices':notice_mounts,'model':model_mount},approved)
        c.atomic('native-identity-manifest.json',{'native_files':manifest,'notices':notice_mounts,'model':model_mount,'backend':backend})
        exec(compile(ast.Module(body=functions,type_ignores=[]),'N15-04C/run_sandbox','exec'),globals())
        prefix=['/qualified/lib/ld-linux-x86-64.so.2','--inhibit-cache','--library-path','/qualified/lib:/qualified/runtime','/qualified/runtime/llama-completion']
        options=['--offline','--no-conversation','--no-display-prompt','--simple-io','--no-warmup','--n-gpu-layers','0',
          '--ctx-size','2048','--threads','2','--threads-batch','2','--batch-size','64','--ubatch-size','64',
          '--no-context-shift','--seed','42','--temp','0','--perf','--model',model_mount['destination'],
          '--n-predict','192','--prompt',prompt]
        c.phase('one-offline-research-selection')
        result,trace=run_sandbox('generation',prefix+options,True,120)
        c.state['execution_result']=result
        if result['exit_code']!=0 or result['timeout_hit'] or not result['Haswell_backend_initialized']:raise RuntimeError('Native research selection failed')
        patterns={'load_ms':r'load time\s*=\s*([0-9.]+)\s*ms',
          'prompt_eval':r'prompt eval time\s*=\s*([0-9.]+)\s*ms\s*/\s*(\d+)\s*tokens[^\n]*?([0-9.]+)\s*tokens per second',
          'decode_eval':r'(?<!prompt )eval time\s*=\s*([0-9.]+)\s*ms\s*/\s*(\d+)\s*runs[^\n]*?([0-9.]+)\s*tokens per second'}
        perf={k:[float(x) for x in m.groups()] for k,pattern in patterns.items() if (m:=re.search(pattern,trace))}
        c.atomic('generation-performance.json',perf)
        if not perf.get('decode_eval') or perf['decode_eval'][1]<=0:raise RuntimeError('No positive model decode evidence')
        c.state['generation']={'performance':perf,'selection_sha256':request['selection_sha256'],'raw_stdout':'generation/native.stdout'}
        c.state['status']='PASS'
    except BaseException as e:
        c.state['status']='PARTIAL' if c.state['native_commands'] else 'BLOCKED'
        c.state['failure']={'stage':c.state.get('stage'),'type':type(e).__name__,'reason':str(e)}
        c.event('failure',**c.state['failure'])
    finally:c.finish()
    return 0 if c.state['status']=='PASS' else 1

if __name__=='__main__':
    try:raise SystemExit(main(sys.argv[1:]))
    except Exception as e:
        print(json.dumps({'status':'BLOCKED','type':type(e).__name__,'reason':str(e)}),file=sys.stderr)
        raise SystemExit(1)
