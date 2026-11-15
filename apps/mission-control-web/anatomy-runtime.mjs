/* Locally bundled Three.js only. Static reference geometry; no postprocessing. */
import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { coarsenReference,inspectReferenceGLB,LOD_POLICY } from './anatomy-lod.mjs';

export function disposeAnatomyTree(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root?.traverse(node=>{for(const g of [node.geometry,node.userData?.reference_detail_geometry,node.userData?.reference_coarse_geometry])if(g)geometries.add(g);for(const m of(Array.isArray(node.material)?node.material:node.material?[node.material]:[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
  for(const t of textures)t.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
}

export function createAnatomyWorld(canvas,changed){
  let renderer,controls;const scene=new THREE.Scene(),loaded=[],meshes=new Map();let disposed=false,level='detail',renders=0,selected=null,linked=false,heartPhase=0,breathPhase=0;const timings=[];
  try{
    const context=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'low-power'});
    if(!context)throw Error('WebGL2 unavailable');
    renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setClearColor(0x050508,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
    const camera=new THREE.PerspectiveCamera(34,1,.01,20);camera.position.set(.12,.94,3.1);let fitDistance=3.1;
    controls=new OrbitControls(camera,canvas);controls.target.set(0,.84,0);controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=true;controls.minDistance=.65;controls.maxDistance=5;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;controls.rotateSpeed=.65;controls.update();controls.saveState();controls.addEventListener('change',changed);
    scene.add(new THREE.HemisphereLight(0xeee9df,0x242330,2.2));
    const key=new THREE.DirectionalLight(0xffe0bb,3.2);key.position.set(-2,3,4);scene.add(key);
    const fill=new THREE.DirectionalLight(0xa6a0d9,1.8);fill.position.set(2,1,-2);scene.add(fill);
    const loader=new GLTFLoader(); // No external buffers, textures, animation, WASM or compression decoders.
    function layerName(id){return id==='reference.body'?'body':id==='reference.skeleton'?'skeleton':'organs';}
    return {
      async parse(data){inspectReferenceGLB(data);const start=performance.now();const gltf=await loader.parseAsync(data,'');timings.push({stage:'GLTF decode',ms:performance.now()-start});if(gltf.animations.length){disposeAnatomyTree(gltf.scene);throw Error('Unexpected reference animation');}return gltf.scene;},
      async prepare(root,components,active){
        const nodes=[];root.traverse(n=>{if(n.isMesh)nodes.push(n);});
        try{for(const n of nodes){
          const c=components.find(c=>c.id===n.userData.astra_semantic_id),g=n.geometry;
          if(!c||g.attributes.position.count!==c.vertices||g.index.count!==c.triangles*3)throw Error('Reference mesh identity/complexity mismatch');
          n.userData.reference_detail_geometry=g;const start=performance.now();
          const coarse=await coarsenReference(g.attributes.position.array,g.index.array,c.members,LOD_POLICY.cells_m[c.layer],{cancelled:()=>disposed||!active()});
          const low=new THREE.BufferGeometry();low.setAttribute('position',new THREE.BufferAttribute(coarse.positions,3));low.setIndex(new THREE.BufferAttribute(coarse.indices,1));low.computeVertexNormals();low.computeBoundingBox();low.computeBoundingSphere();n.userData.reference_coarse_geometry=low;
          timings.push({stage:'LOD '+c.id,ms:performance.now()-start,source_triangles:c.triangles,coarse_triangles:coarse.indices.length/3,elements:coarse.source_elements});
        }}catch(e){disposeAnatomyTree(root);throw e;}
      },
      attach(root,expected){
        const found=[];
        root.traverse(node=>{
          if(!node.isMesh)return;
          const id=node.userData.astra_semantic_id;
          if(!expected.includes(id)||meshes.has(id)||found.includes(id))throw Error('Unexpected/duplicate semantic anatomy component');
          found.push(id);
        });
        if(expected.some(id=>!found.includes(id)))throw Error('Missing semantic anatomy component');
        if(disposed){disposeAnatomyTree(root);return;}
        root.traverse(node=>{
          if(!node.isMesh)return;const id=node.userData.astra_semantic_id;node.material.dispose();
          const body=id==='reference.body',bone=id==='reference.skeleton';
          // Colors identify reference materials, never current health severity.
          node.material=new THREE.MeshStandardMaterial({color:body?0xa3b3b7:bone?0xd7d0bf:id==='reference.heart'?0xc49b91:0x9f9ab9,metalness:body?.15:.05,roughness:body?.42:.65,transparent:body,opacity:body?.12:1,depthWrite:!body,side:body?THREE.FrontSide:THREE.DoubleSide});
          node.renderOrder=body?2:0;node.userData.layer=layerName(id);node.geometry=node.userData[level==='coarse'?'reference_coarse_geometry':'reference_detail_geometry']??node.geometry;meshes.set(id,node);
          node.geometry.computeBoundingBox();node.userData.reference_center=node.geometry.boundingBox.getCenter(new THREE.Vector3());node.userData.reference_position=node.position.clone();node.userData.reference_scale=node.scale.clone();
        });
        loaded.push(root);scene.add(root);
      },
      layer(name,on){for(const mesh of meshes.values())if(mesh.userData.layer===name)mesh.visible=on;},
      select(id){if(id!==null&&!['reference.body','reference.skeleton','reference.heart','reference.lung.left','reference.lung.right'].includes(id))throw Error('Unsupported reference selection');const different=selected!==id;selected=id;for(const [key,m]of meshes)m.material.emissive.setHex(key===id?0x125064:0x000000);if(different)changed();},
      pick(x,y){const ray=new THREE.Raycaster();scene.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(x,y),camera);const all=ray.intersectObjects([...meshes.values()].filter(m=>m.visible),false);return (all.find(h=>h.object.userData.astra_semantic_id!=='reference.body')??all[0])?.object.userData.astra_semantic_id??null;},
      project(id){const m=meshes.get(id);if(!m)return null;scene.updateMatrixWorld(true);const p=m.localToWorld(m.userData.reference_center.clone()).project(camera);return {x:p.x,y:p.y};},
      pose(phases,enabled){linked=true;[heartPhase,breathPhase]=phases;for(const [id,m]of meshes){const amount=id==='reference.heart'?.018*Math.sin(heartPhase*2*Math.PI):id.startsWith('reference.lung.')?.012*Math.sin(breathPhase*2*Math.PI):0;const s=enabled?1+amount:1;m.scale.copy(m.userData.reference_scale).multiplyScalar(s);m.position.copy(m.userData.reference_position).addScaledVector(m.userData.reference_center,1-s);}},
      quality(value){if(!['detail','coarse'].includes(value))throw Error('Unsupported reference LOD');level=value;for(const mesh of meshes.values())mesh.geometry=mesh.userData[value==='coarse'?'reference_coarse_geometry':'reference_detail_geometry']??mesh.geometry;changed();},
      size(width,height,ratio){camera.aspect=width/height;const fit=Math.max(3.1,.85/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));if(Math.abs(fit-fitDistance)>.001){camera.position.sub(controls.target).multiplyScalar(fit/fitDistance).add(controls.target);fitDistance=fit;controls.maxDistance=Math.max(5,fit*1.8);controls.update();}camera.updateProjectionMatrix();renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);},
      camera(action){
        if(action==='reset'){controls.target.set(0,.84,0);camera.position.set(.12,.94,fitDistance);controls.update();changed();return;}
        const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
        if(action==='left')s.theta-=Math.PI/12;if(action==='right')s.theta+=Math.PI/12;
        if(action==='up')s.phi=Math.max(.12,s.phi-.12);if(action==='down')s.phi=Math.min(Math.PI-.12,s.phi+.12);
        if(action==='in')s.radius=Math.max(controls.minDistance,s.radius*.85);if(action==='out')s.radius=Math.min(controls.maxDistance,s.radius/ .85);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();changed();
      },
      render(){if(!disposed){renderer.render(scene,camera);renders++;}},
      metrics(){let bytes=0;const geos=new Set();for(const m of meshes.values())for(const g of [m.userData.reference_detail_geometry,m.userData.reference_coarse_geometry])if(g&&!geos.has(g)){geos.add(g);for(const a of Object.values(g.attributes))bytes+=a.array.byteLength;if(g.index)bytes+=g.index.array.byteLength;}return {policy:LOD_POLICY.version,level,meshes:meshes.size,visible_meshes:[...meshes.values()].filter(m=>m.visible).length,triangles:[...meshes.values()].filter(m=>m.visible).reduce((s,m)=>s+m.geometry.index.count/3,0),decoded_geometry_bytes:bytes,renderer_geometries:renderer.info.memory.geometries,renderer_textures:renderer.info.memory.textures,renders,camera:camera.position.toArray(),target:controls.target.toArray(),min_distance:controls.minDistance,max_distance:controls.maxDistance,mesh_projections:Object.fromEntries([...meshes].map(([id,m])=>{const p=m.localToWorld(m.userData.reference_center.clone()).project(camera);return [id,{x:p.x,y:p.y}]})),timings,N06_linkage:linked?'SYNTHETIC_RESEARCH':'INACTIVE',selected,heart_phase:heartPhase,breath_phase:breathPhase,reference_only:true};},
      dispose(){if(disposed)return;disposed=true;controls.removeEventListener('change',changed);controls.dispose();for(const root of loaded){scene.remove(root);disposeAnatomyTree(root);}loaded.length=0;meshes.clear();scene.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();},
    };
  }catch(error){controls?.dispose();renderer?.dispose();renderer?.forceContextLoss();throw error;}
}
