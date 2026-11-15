/* N05 reference-only LOD. Same local surfaces/transform; no physiology or picking. */
export const LOD_POLICY=Object.freeze({version:'astra.reference-lod.v1',cells_m:Object.freeze({body:.008,skeleton:.006,organs:.003}),choices:Object.freeze(['auto','detail','coarse'])});
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
const check=cancelled=>{if(cancelled())throw Object.assign(new Error('Reference LOD cancelled'),{name:'AbortError'});};

// Cluster each original source element separately so adjacent bones/organ members
// are never welded together. This is a visual approximation, not an accuracy claim.
export async function coarsenReference(positions,indices,members,cell,{cancelled=()=>false,yieldTask=pause}={}){
  if(!(positions instanceof Float32Array)||!(indices instanceof Uint32Array||indices instanceof Uint16Array))throw Error('Unsupported geometry encoding');
  if(!positions.length||positions.length%3||positions.length>900000||!indices.length||indices.length%3||indices.length>1500000||!Number.isFinite(cell)||cell<=0||cell>.02)throw Error('Reference geometry bounds invalid');
  if(!Array.isArray(members)||!members.length||members.length>326)throw Error('Reference element ranges required');
  let end=0;for(const m of members){if(m.first_index!==end||!Number.isSafeInteger(m.index_count)||m.index_count<=0||m.index_count%3)throw Error('Reference element coverage invalid');end+=m.index_count;}if(end!==indices.length)throw Error('Reference element coverage mismatch');
  const points=[],faces=[];let work=0;
  for(const member of members){
    check(cancelled);const buckets=new Map(),remap=new Map(),clusters=[],triangles=[],seen=new Set();
    for(let i=member.first_index;i<member.first_index+member.index_count;i++){
      const old=indices[i];if(old*3+2>=positions.length)throw Error('Reference index out of bounds');
      if(!remap.has(old)){
        const x=positions[old*3],y=positions[old*3+1],z=positions[old*3+2];if(![x,y,z].every(Number.isFinite))throw Error('Nonfinite reference position');
        const key=Math.floor(x/cell)+','+Math.floor(y/cell)+','+Math.floor(z/cell);let id=buckets.get(key);
        if(id===undefined){id=clusters.length;buckets.set(key,id);clusters.push([0,0,0,0]);}
        const c=clusters[id];c[0]+=x;c[1]+=y;c[2]+=z;c[3]++;remap.set(old,id);
      }
      if(++work%8192===0){check(cancelled);await yieldTask();}
    }
    for(let i=member.first_index;i<member.first_index+member.index_count;i+=3){
      const a=remap.get(indices[i]),b=remap.get(indices[i+1]),c=remap.get(indices[i+2]);
      if(a!==b&&b!==c&&a!==c){const key=a+','+b+','+c;if(!seen.has(key)){seen.add(key);triangles.push(a,b,c);}}
      if(++work%8192===0){check(cancelled);await yieldTask();}
    }
    // Very small elements may vanish at a coarse grid. Preserve that original
    // element verbatim instead of silently removing its anatomical coverage.
    const offset=points.length/3;
    if(!triangles.length){const map=new Map();for(let i=member.first_index;i<member.first_index+member.index_count;i++){const old=indices[i];if(!map.has(old)){map.set(old,map.size);points.push(positions[old*3],positions[old*3+1],positions[old*3+2]);}faces.push(offset+map.get(old));}}
    else{for(const c of clusters)points.push(c[0]/c[3],c[1]/c[3],c[2]/c[3]);for(const i of triangles)faces.push(offset+i);}
    await yieldTask();check(cancelled);
  }
  return {positions:new Float32Array(points),indices:new Uint32Array(faces),policy:LOD_POLICY.version,cell_m:cell,source_elements:members.length};
}

export function inspectReferenceGLB(data){
  if(!(data instanceof ArrayBuffer)||data.byteLength<28||data.byteLength>16000000)throw Error('Invalid GLB size');
  const v=new DataView(data);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==data.byteLength||v.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid GLB header');
  const size=v.getUint32(12,true);if(size%4||size>data.byteLength-28)throw Error('Invalid GLB JSON length');
  const m=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(new Uint8Array(data,20,size)).trim());const bin=20+size;
  if(v.getUint32(bin+4,true)!==0x004e4942||bin+8+v.getUint32(bin,true)!==data.byteLength)throw Error('Invalid GLB payload length');
  if(m.asset?.version!=='2.0'||m.materials||m.images||m.textures||m.animations||m.skins||m.extensionsRequired||m.extensionsUsed||m.buffers?.length!==1||m.buffers[0].uri||m.buffers[0].byteLength>v.getUint32(bin,true)||!m.meshes?.length||m.meshes.length>5)throw Error('Unsupported or external reference content');
  for(const b of m.bufferViews??[])if(b.buffer!==0||!Number.isSafeInteger(b.byteOffset??0)||!Number.isSafeInteger(b.byteLength)||(b.byteOffset??0)<0||b.byteLength<=0||(b.byteOffset??0)+b.byteLength>m.buffers[0].byteLength)throw Error('Invalid geometry buffer range');
  for(const a of m.accessors??[]){const b=m.bufferViews?.[a.bufferView],width=a.type==='VEC3'?3:a.type==='SCALAR'?1:0,bytes=a.componentType===5126||a.componentType===5125?4:0;if(!b||!width||!bytes||a.sparse||!Number.isSafeInteger(a.count)||a.count<=0||(a.byteOffset??0)!==0||a.count*width*bytes>b.byteLength)throw Error('Unsupported geometry accessor');}
  for(const mesh of m.meshes)for(const p of mesh.primitives??[])if(p.mode!==4||p.targets||p.extensions||!Number.isInteger(p.indices)||!Number.isInteger(p.attributes?.POSITION)||!Number.isInteger(p.attributes?.NORMAL))throw Error('Unsupported geometry primitive');
  return m;
}
