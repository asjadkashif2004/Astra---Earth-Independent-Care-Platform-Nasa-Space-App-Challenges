"""Deterministic OBJ -> plain GLB reference subset. Python standard library only.

Uniform millimetre/Z-up -> metre/Y-up transform for ALL components. Vertex
clustering reduces source geometry; no organs or anatomical surfaces are invented.
"""
from pathlib import Path
import json, hashlib, struct, math

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'packages/three-assets/bodyparts3d-4.3'
OUT = ROOT / 'apps/mission-control-web/assets/anatomy'
OUT.mkdir(parents=True, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
inputs = json.loads((SOURCE / 'inputs.json').read_text())
assert inputs['complete'] and inputs['version'] == '4.3'
records = {r['element_id']: r for r in inputs['assets']}

def original(id):
    record = records[id]; data = (SOURCE / record['file']).read_bytes()
    if sha(data) != record['sha256']: raise RuntimeError('Original geometry hash mismatch: ' + id)
    return data.decode()

def bounds(vertices):
    return [[min(v[i] for v in vertices) for i in range(3)], [max(v[i] for v in vertices) for i in range(3)]]

skin_vertices = [tuple(map(float, l.split()[1:4])) for l in original(inputs['groups']['body'][0]).splitlines() if l.startswith('v ')]
skin_bounds = bounds(skin_vertices)
cx = (skin_bounds[0][0] + skin_bounds[1][0]) / 2
cy = (skin_bounds[0][1] + skin_bounds[1][1]) / 2
floor = skin_bounds[0][2]
del skin_vertices

def convert(id, cell_mm):
    text = original(id)
    points = []; remap = []; buckets = {}; accum = []
    faces = []; input_vertices = 0; input_triangles = 0
    for line in text.splitlines():
        if line.startswith('v '):
            x, y, z = map(float, line.split()[1:4]); input_vertices += 1
            key = (math.floor(x/cell_mm), math.floor(y/cell_mm), math.floor(z/cell_mm))
            i = buckets.get(key)
            if i is None: i = len(accum); buckets[key] = i; accum.append([0.,0.,0.,0])
            a = accum[i]; a[0] += (x-cx)/1000; a[1] += (z-floor)/1000; a[2] -= (y-cy)/1000; a[3] += 1
            remap.append(i)
        elif line.startswith('f '):
            indices = [int(v.split('/')[0]) for v in line.split()[1:]]
            indices = [i-1 if i>0 else len(remap)+i for i in indices]
            if any(i<0 or i>=len(remap) for i in indices): raise RuntimeError('Invalid source face')
            for k in range(1,len(indices)-1):
                input_triangles += 1
                a,b,c = (remap[indices[j]] for j in (0,k,k+1))
                if len({a,b,c}) == 3: faces.append((a,b,c))
    points = [tuple(a[i]/a[3] for i in range(3)) for a in accum]
    # Eliminate exact duplicate triangles introduced by clustering.
    faces = list(dict.fromkeys(faces)); used = sorted(set(i for f in faces for i in f))
    mapping = {old:new for new,old in enumerate(used)}
    points = [points[i] for i in used]; faces = [tuple(mapping[i] for i in f) for f in faces]
    normals = [[0.,0.,0.] for _ in points]
    for a,b,c in faces:
        u=[points[b][i]-points[a][i] for i in range(3)];v=[points[c][i]-points[a][i] for i in range(3)]
        n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        for j in (a,b,c):
            for i in range(3): normals[j][i] += n[i]
    for n in normals:
        length=math.sqrt(sum(v*v for v in n)) or 1
        for i in range(3): n[i]/=length
    if not points or not faces: raise RuntimeError('Simplification erased component: '+id)
    return points,normals,faces,dict(source_vertices=input_vertices,source_triangles=input_triangles,vertices=len(points),triangles=len(faces),cell_mm=cell_mm,bounds_m=bounds(points))

names={'body':'reference.body','skeleton':'reference.skeleton','heart':'reference.heart','lung_left':'reference.lung.left','lung_right':'reference.lung.right'}
catalog=[]; outputs=[]
for filename, groups in [('body.glb',['body']),('organs.glb',['heart','lung_left','lung_right']),('skeleton.glb',['skeleton'])]:
    binary=bytearray();gltf={'asset':{'version':'2.0','generator':'ASTRA N05-01 deterministic reference build v1','copyright':inputs['credit']},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'buffers':[],'bufferViews':[],'accessors':[]}
    def accessor(values,fmt,count,type,component,bbox=None):
        while len(binary)%4:binary.append(0)
        start=len(binary);binary.extend(struct.pack('<'+str(len(values))+fmt,*values))
        view=len(gltf['bufferViews']);gltf['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(binary)-start})
        value={'bufferView':view,'componentType':component,'count':count,'type':type}
        if bbox:value.update(min=bbox[0],max=bbox[1])
        index=len(gltf['accessors']);gltf['accessors'].append(value);return index
    for group in groups:
        vertices=[];normals=[];indices=[];members=[]
        for id in inputs['groups'][group]:
            cell=3.0 if group=='body' else 2.0 if group=='skeleton' else .9
            p,n,f,stats=convert(id,cell);offset=len(vertices);first=len(indices)
            vertices.extend(p);normals.extend(n);indices.extend(offset+i for face in f for i in face)
            members.append({'element_id':id,'first_index':first,'index_count':len(indices)-first,**stats})
        bb=bounds(vertices)
        pos=accessor([v for p in vertices for v in p],'f',len(vertices),'VEC3',5126,bb)
        norm=accessor([v for n in normals for v in n],'f',len(normals),'VEC3',5126)
        ind=accessor(indices,'I',len(indices),'SCALAR',5125)
        index=len(gltf['nodes']);semantic=names[group]
        gltf['nodes'].append({'name':semantic,'mesh':index,'extras':{'astra_semantic_id':semantic,'reference_only':True}})
        gltf['meshes'].append({'name':semantic,'primitives':[{'attributes':{'POSITION':pos,'NORMAL':norm},'indices':ind,'mode':4}]})
        gltf['scenes'][0]['nodes'].append(index)
        catalog.append({'id':semantic,'layer':'organs' if group in ['heart','lung_left','lung_right'] else group,'file':filename,'vertices':len(vertices),'triangles':len(indices)//3,'bounds_m':bb,'members':members})
        print(group,len(vertices),'vertices',len(indices)//3,'triangles',flush=True)
    while len(binary)%4:binary.append(0)
    gltf['buffers']=[{'byteLength':len(binary)}]
    j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
    glb=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(binary))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(binary),b'BIN\0')+binary
    (OUT/filename).write_bytes(glb);outputs.append({'file':filename,'bytes':len(glb),'sha256':sha(glb),'components':[names[g] for g in groups]})

manifest={'version':'astra.reference-anatomy.n05-01.v1','source_release':'BodyParts3D 4.3 / objects set 4.3 / FMA3.0','source_url':inputs['source_url'],'source_inputs_sha256':sha((SOURCE/'inputs.json').read_bytes()),'license':inputs['license'],'license_url':inputs['license_url'],'credit':inputs['credit'],'scope':'Generic adult male reference anatomy. Not an astronaut reconstruction, clinical anatomical certification or physiological simulation. Static geometry; no HR/RR animation or evidence mapping.','transform':{'source_units':'millimetres; original OBJ Bounds(mm) headers','source_up':'Z','scene_units':'metres','scene_up':'Y','formula':'[(x-cx)/1000, (z-floor)/1000, -(y-cy)/1000]','cx_mm':cx,'cy_mm':cy,'floor_mm':floor,'source_body_bounds_mm':skin_bounds,'note':'Identical rigid rotation, uniform scale and translation for every original component; no per-organ registration or reshaping.'},'simplification':'Deterministic per-element vertex clustering; cells body3mm/bones2mm/organs0.9mm, cluster centroids, degenerate/duplicate triangles removed, smooth normals rebuilt. Not clinical fidelity. Original geometry and hashes retained separately.','assets':outputs,'components':catalog,'payload_bytes':sum(a['bytes'] for a in outputs),'decoded_geometry_bytes':sum(a['vertices']*24+a['triangles']*12 for a in catalog),'limitations':['Source model may contain anatomical/concept-assignment errors; independent anatomical expert review not performed.','Whole-heart compound mapping is incomplete; preview explicitly selects three named chamber-wall surfaces.','Skin is an adult male reference; no claims about individual crew anatomy or sex.','No texture maps, compression extensions, skinning or animations. Derived meshes retain CC BY-SA 2.1 Japan.']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'attribution.json').write_text(json.dumps({k:manifest[k] for k in ['source_release','source_url','license','license_url','credit','scope','limitations']},indent=2)+'\n')
earth=json.loads((ROOT/'apps/mission-control-web/assets/earth/manifest.json').read_text())['total_bytes']
vendor=sum(p.stat().st_size for p in (ROOT/'apps/mission-control-web/vendor/three').iterdir() if p.is_file())
critical=earth+vendor+sum(p.stat().st_size for p in OUT.iterdir() if p.is_file())
if critical>20_000_000:raise RuntimeError(f'Critical graphics budget exceeded: {critical}')
print('Anatomy GLBs',manifest['payload_bytes'],'combined critical graphics',critical,'/20,000,000 bytes',flush=True)
