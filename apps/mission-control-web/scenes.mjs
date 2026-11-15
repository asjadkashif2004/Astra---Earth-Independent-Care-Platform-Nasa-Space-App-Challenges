/* Native WebGL2 scenes. Earth uses credited local NASA textures; twin remains schematic. */
import { EARTH_MATERIAL } from './earth.mjs';
const VERTEX = `#version 300 es
in vec2 position;
out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const COMMON = `
precision highp float;
in vec2 uv;out vec4 color;
uniform vec2 resolution;
uniform float elapsed,rotation,heartRate,breathingRate,warning,blackout,layer,zoom;
uniform sampler2D landMap;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=mix(mix(hash21(i.xy+i.z*17.),hash21(i.xy+vec2(1,0)+i.z*17.),f.x),mix(hash21(i.xy+vec2(0,1)+i.z*17.),hash21(i.xy+1.+i.z*17.),f.x),f.y);float b=mix(mix(hash21(i.xy+(i.z+1.)*17.),hash21(i.xy+vec2(1,0)+(i.z+1.)*17.),f.x),mix(hash21(i.xy+vec2(0,1)+(i.z+1.)*17.),hash21(i.xy+1.+(i.z+1.)*17.),f.x),f.y);return mix(a,b,f.z);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
`;
const TWIN = `#version 300 es
${COMMON}
float ellipsoid(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/max(k1,.00001);}
float capsule(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float body(vec3 p){
 float d=ellipsoid(p-vec3(0.,1.48,0.),vec3(.205,.275,.195));
 d=min(d,capsule(p,vec3(0.,1.07,0.),vec3(0.,1.25,0.),.11));
 float breathScale=1.+.025*sin(elapsed*breathingRate/60.*6.283185);
 float chest=ellipsoid(p-vec3(0.,.79,0.),vec3(.37*breathScale,.45,.19*breathScale));
 d=min(d,chest);d=min(d,ellipsoid(p-vec3(0.,.3,0.),vec3(.27,.35,.17)));
 d=min(d,ellipsoid(p-vec3(0.,.03,0.),vec3(.29,.25,.19)));
 for(int j=0;j<2;j++){float s=j==0?-1.:1.;
 d=min(d,ellipsoid(p-vec3(s*.36,.98,0.),vec3(.16,.19,.16)));
 d=min(d,capsule(p,vec3(s*.43,.91,0.),vec3(s*.52,.47,.01),.095));
 d=min(d,capsule(p,vec3(s*.52,.47,.01),vec3(s*.61,.06,.035),.075));
 d=min(d,ellipsoid(p-vec3(s*.63,-.07,.035),vec3(.075,.14,.045)));
 d=min(d,capsule(p,vec3(s*.16,-.08,0.),vec3(s*.18,-.67,0.),.135));
 d=min(d,capsule(p,vec3(s*.18,-.67,0.),vec3(s*.19,-1.22,.035),.095));
 d=min(d,ellipsoid(p-vec3(s*.19,-1.32,.11),vec3(.105,.095,.21)));
 }return d;
}
vec3 normal(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(body(p+e.xyy)-body(p-e.xyy),body(p+e.yxy)-body(p-e.yxy),body(p+e.yyx)-body(p-e.yyx)));}
void main(){
 float aspect=resolution.x/resolution.y;
 // Narrow panels zoom out just enough that the arms and ground ring stay inside the frame; wide panels are unchanged.
 float fit=max(1.,.74/aspect);
 vec2 p=(uv*2.-1.)*vec2(aspect,1.)*fit;
 vec3 ro=vec3(p.x*1.53/zoom,p.y*1.86/zoom+.14,4.);vec3 rd=vec3(0,0,-1);
 ro.xz=rot(rotation)*ro.xz;rd.xz=rot(rotation)*rd.xz;
 vec3 c=vec3(.033,.055,.085);
 float grid=step(.985,fract(uv.x*20.))+step(.985,fract(uv.y*24.));c+=grid*vec3(.013,.025,.04);
 float t=0.;bool hit=false;vec3 pos;
 for(int i=0;i<80;i++){pos=ro+rd*t;float d=body(pos);if(d<.002){hit=true;break;}t+=max(d,.004);if(t>8.)break;}
 if(hit){
   vec3 n=normal(pos);float light=max(dot(n,normalize(vec3(-1,1,2))),0.);float rim=pow(1.-abs(dot(n,rd)),2.);
   float scan=pow(.5+.5*cos(pos.y*190.),18.);
   float wire=pow(.5+.5*cos(atan(pos.z,pos.x)*20.),24.);
   vec3 base=vec3(.055,.19,.32);c=base*(.3+light*.6)+rim*vec3(.21,.53,.85)*.7+(scan+wire*.3)*vec3(.05,.2,.35);
   vec3 front=pos;front.xz=rot(-rotation)*front.xz;
   float heart=exp(-length((front.xy-vec2(.08,.79))/vec2(.08,.11))*1.1);
   float pulse=pow(max(0.,sin(elapsed*heartRate/60.*6.283185)),8.);
   float lungs=exp(-length((front.xy-vec2(-.15,.8))/vec2(.11,.24))*1.5)+exp(-length((front.xy-vec2(.16,.8))/vec2(.11,.24))*1.5);
   float resp=.75+.25*sin(elapsed*breathingRate/60.*6.283185);
   if(layer<.5||layer>1.5&&layer<2.5)c+=lungs*vec3(.06,.33,.46)*resp*.7;
   if(layer<1.5)c+=heart*mix(vec3(.95,.31,.36),vec3(1.,.64,.21),warning)*(1.+pulse*.9);
   float ribs=exp(-pow((front.x/.29),6.))*smoothstep(.4,.55,front.y)*(1.-smoothstep(.98,1.1,front.y));
   c+=ribs*pow(.5+.5*cos(front.y*68.+abs(front.x)*5.),14.)*vec3(.1,.3,.45)*.5;
   if(warning>.5&&front.y>.4&&front.y<1.05)c+=rim*vec3(.6,.25,.04)*.6;
   if(layer>2.5)c+=exp(-length((front.xy-vec2(0,1.52))/vec2(.15,.16))*2.)*vec3(.35,.25,.6)*.8;
 }
 // Ground ring and crosshair communicate a schematic inspection volume.
 float ring=abs(length(vec2(p.x/ .7,(p.y+.78)/.09))-1.);c+=exp(-ring*80.)*vec3(.06,.14,.24);
 color=vec4(c,1.);
}`;

export const SHADERS = Object.freeze({ vertex: VERTEX, earth: EARTH_MATERIAL, twin: TWIN });

export class Scene {
  constructor(container, type = 'earth', options = {}) {
    this.container = container; this.type = type; this.options = options;
    this.rotation = type === 'earth' ? -.4 : -.12; this.zoom = 1; this.data = {};
    this.disposed = false; this.listeners = []; this.start = performance.now(); this.frames = 0; this.fpsStart = this.start; this.last = 0; this.frame = null;
    this.images=[];this.textures=[];this.assetGeneration=0;this.assetState='loading';this.assetTier=null;
    this.canvas = document.createElement('canvas'); this.canvas.tabIndex = 0; this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', type === 'earth' ? 'Earth with historical NASA imagery and schematic mission orbit. Drag or use arrow keys to rotate; plus and minus zoom; Home resets.' : 'Schematic data-linked twin. Arrow keys rotate; Enter inspects the selected domain. No diagnostic anatomy.');
    container.append(this.canvas);
    try {
      this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
      if (!this.gl) throw new Error('WebGL2 unavailable');
      this.setupGL(); this.mode = 'WebGL2'; this.attachCanvas();
    } catch { this.switchFallback(); }
    if (typeof ResizeObserver !== 'undefined') { this.resize = new ResizeObserver(() => this.size()); this.resize.observe(container); }
    else this.listen(window, 'resize', () => this.size());
    this.visible=true;
    if(typeof IntersectionObserver!=='undefined'){
      this.visibility=new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);if(this.visible)this.requestPaint();else{cancelAnimationFrame(this.frame);this.frame=null;}},{rootMargin:'32px'});
      this.visibility.observe(container);
    }
    this.listen(document, 'visibilitychange', () => { if (!document.hidden) this.requestPaint(); });
    this.size(); this.notifyMode(); this.requestPaint();
  }
  listen(target, event, fn) { target.addEventListener(event, fn); this.listeners.push([target, event, fn]); }
  clearCanvasListeners() {
    this.listeners = this.listeners.filter(([target, event, fn]) => {
      if (target !== this.canvas) return true;
      target.removeEventListener?.(event, fn); return false;
    });
  }
  attachCanvas() {
    this.listen(this.canvas, 'webglcontextlost', event => { event.preventDefault(); if (!this.disposed) this.switchFallback(); });
    let drag = null, downX = 0, downY = 0;
    this.listen(this.canvas, 'pointerdown', e => { drag = e.clientX; downX = e.clientX; downY = e.clientY; this.canvas.setPointerCapture?.(e.pointerId); });
    this.listen(this.canvas, 'pointermove', e => { if (drag !== null) { this.rotation += (e.clientX - drag) * .008; drag = e.clientX; this.requestPaint(); } });
    this.listen(this.canvas, 'pointerup', e => {
      if (drag !== null && this.type === 'twin' && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        const rect = this.canvas.getBoundingClientRect(); const y = (e.clientY - rect.top) / Math.max(1, rect.height);
        this.options.onInspect?.(y < .28 ? 'head' : y < .62 ? 'thorax' : 'lower_body');
      }
      drag = null;
    });
    this.listen(this.canvas, 'pointercancel', () => { drag = null; });
    this.listen(this.canvas, 'keydown', e => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); this.rotation += e.key === 'ArrowLeft' ? -.15 : .15; this.requestPaint(); }
      if (e.key === 'Enter' && this.type === 'twin') { e.preventDefault(); this.options.onInspect?.(this.data.layer === 3 ? 'head' : 'thorax'); }
      if(this.type==='earth'&&['+','=','-','Home'].includes(e.key)){e.preventDefault();this.camera(e.key==='Home'?'reset':e.key==='-'?'out':'in');}
    });
  }
  notifyMode() { try { this.options.onMode?.(this.mode); } catch { /* UI callbacks cannot disable the fallback. */ } }
  camera(action){if(this.disposed)return;if(action==='reset'){this.rotation=-.4;this.zoom=1;this.start=performance.now();}else if(action==='in'||action==='out')this.zoom=Math.min(1.35,Math.max(.65,this.zoom+(action==='in'?.1:-.1)));this.requestPaint();}
  notifyAsset(){try{this.options.onAsset?.(this.assetState);}catch{}}
  cancelAssets(){this.assetGeneration++;for(const image of this.images){image.onload=null;image.onerror=null;image.src='';}this.images=[];}
  loadEarthTextures(){
    if(this.type!=='earth'||!this.gl||this.disposed)return;
    const tier=this.options.performance||this.container.getBoundingClientRect().width<700?1024:2048;
    if(this.assetTier===tier)return;this.assetTier=tier;this.cancelAssets();const generation=this.assetGeneration;
    this.assetState='loading';this.notifyAsset();let loaded=0,failed=false;
    for(const [unit,kind]of [[0,'day'],[1,'cloud']]){
      let image;try{image=this.options.imageFactory?this.options.imageFactory():typeof Image!=='undefined'?new Image():null;}catch{image=null;}
      if(!image){this.assetState='unavailable';this.notifyAsset();continue;}
      this.images.push(image);
      image.onload=()=>{
        if(this.disposed||!this.gl||generation!==this.assetGeneration)return;
        try{const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,this.textures[unit]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);loaded++;if(loaded===2&&!failed)this.assetState='ready';this.notifyAsset();this.requestPaint();}
        catch{failed=true;this.assetState='unavailable';this.notifyAsset();}
      };
      image.onerror=()=>{if(!this.disposed&&generation===this.assetGeneration){failed=true;this.assetState='unavailable';this.notifyAsset();this.requestPaint();}};
      image.src=`/assets/earth/${kind}-${tier}.jpg`;
    }
  }
  releaseGL() {
    if (!this.gl) return;
    this.cancelAssets();
    try { if (this.buffer) this.gl.deleteBuffer(this.buffer); if (this.program) this.gl.deleteProgram(this.program); for(const texture of this.textures)this.gl.deleteTexture(texture); }
    catch { /* Lost contexts may reject cleanup; no monitoring state is involved. */ }
    this.gl = null;
  }
  switchFallback(forceText = false) {
    this.releaseGL(); this.clearCanvasListeners();
    if(this.type==='earth'){this.assetState='unavailable';this.notifyAsset();}
    const previous = this.canvas; this.canvas = previous.cloneNode(); previous.replaceWith(this.canvas);
    try { this.ctx = forceText ? null : this.canvas.getContext('2d'); } catch { this.ctx = null; }
    if (this.ctx) { this.mode = '2D fallback'; this.attachCanvas(); }
    else {
      this.mode = 'Text fallback'; this.canvas.hidden = true;
      if (!this.fallbackLabel) { this.fallbackLabel = document.createElement('p'); this.fallbackLabel.className = 'graphics-fallback'; this.fallbackLabel.textContent = 'Graphical scene unavailable. Use the telemetry and evidence panels.'; this.container.append(this.fallbackLabel); }
    }
    this.notifyMode(); this.size(); this.requestPaint();
  }
  setupGL() {
    const gl = this.gl; const shaders = [];
    const compile = (type, src) => {
      const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, src); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed'); return shader;
    };
    try {
      this.program = gl.createProgram(); const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, this.type === 'earth' ? EARTH_MATERIAL : TWIN);
      gl.attachShader(this.program, vs); gl.attachShader(this.program, fs); gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
    } finally { for (const shader of shaders) gl.deleteShader(shader); }
    gl.useProgram(this.program);
    this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program,'position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.uniforms = Object.fromEntries(['resolution','elapsed','rotation','heartRate','breathingRate','warning','blackout','layer','zoom','quality','linkAvailable','planetRadius'].map(name=>[name,gl.getUniformLocation(this.program,name)]));
    if(this.type==='earth'){
      for(const [unit,name,pixel]of [[0,'landMap',[12,23,32,255]],[1,'cloudMap',[0,0,0,255]]]){
        const texture=gl.createTexture();this.textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixel));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(this.program,name),unit);
      }
    }
  }
  size() {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    const cap=this.options.performance?650000:1600000;
    const ratio=Math.min(this.options.performance ? .8 : Math.min(window.devicePixelRatio||1,1.35),Math.sqrt(cap/Math.max(1,rect.width*rect.height)));
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.loadEarthTextures();
    this.requestPaint();
  }
  update(data) { this.data = { ...data }; this.requestPaint(); }
  requestPaint() { if (!this.disposed && this.visible!==false && this.frame === null && this.mode !== 'Text fallback') this.frame = requestAnimationFrame(t => this.render(t)); }
  render(t) {
    this.frame = null; if (this.disposed) return;
    if (document.hidden||this.visible===false) return;
    if (t - this.last < 8) { this.requestPaint(); return; }
    this.last = t;
    const seconds = (t - this.start) / 1000, reduced = this.options.reducedMotion;
    const elapsed = reduced || this.type === 'twin' && this.data.quality !== 'good' ? 0 : seconds;
    const rotation = this.rotation + (reduced || this.type === 'twin' ? 0 : seconds * .006);
    try {
      if (this.gl) {
        const g = this.gl, u = this.uniforms; g.viewport(0,0,this.canvas.width,this.canvas.height); g.useProgram(this.program);
        g.uniform2f(u.resolution,this.canvas.width,this.canvas.height); g.uniform1f(u.elapsed,elapsed); g.uniform1f(u.rotation,rotation);
        g.uniform1f(u.heartRate,Number.isFinite(this.data.heartRate) ? this.data.heartRate : 0); g.uniform1f(u.breathingRate,Number.isFinite(this.data.breathingRate) ? this.data.breathingRate : 0);
        g.uniform1f(u.warning,this.data.warning && this.data.quality === 'good' ? 1 : 0); g.uniform1f(u.blackout,this.data.blackout ? 1 : 0);
        g.uniform1f(u.layer,this.data.layer ?? 0); g.uniform1f(u.zoom,this.zoom);
        g.uniform1f(u.quality,this.options.performance?1:0);g.uniform1f(u.linkAvailable,this.data.linkAvailable?1:0);g.uniform1f(u.planetRadius,this.options.planetRadius??.70);g.drawArrays(g.TRIANGLES,0,6);
      } else this.fallback(elapsed, rotation);
    } catch {
      if (this.gl) this.switchFallback();
      else this.switchFallback(true);
    }
    this.frames++;
    if (t - this.fpsStart > 2000) { try { this.options.onFps?.(Math.round(this.frames * 1000 / (t - this.fpsStart))); } catch {} this.frames = 0; this.fpsStart = t; }
    if (!reduced && this.mode !== 'Text fallback') this.requestPaint();
  }
  fallback(elapsed, rotation) {
    const ctx = this.ctx; if (!ctx) return; const w = this.canvas.width, h = this.canvas.height; ctx.clearRect(0,0,w,h);
    if (this.type === 'earth') {
      const x = w * .58,y = h * .48,r = h * .32*this.zoom;
      const gradient = ctx.createRadialGradient(x-r*.4,y-r*.5,r*.05,x,y,r);gradient.addColorStop(0,'#3e6685');gradient.addColorStop(.5,'#14334f');gradient.addColorStop(1,'#050508');
      ctx.shadowColor='#54c9b7';ctx.shadowBlur=12;ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle='#697776';ctx.lineWidth=.7;
      for(let i=-3;i<=3;i++){ctx.beginPath();ctx.ellipse(x,y+i*r/4,Math.sqrt(Math.max(0,r*r-(i*r/4)**2)),r*.08,0,0,Math.PI*2);ctx.stroke();}
      for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(x,y,Math.abs(Math.cos(rotation+i*Math.PI/6))*r,r,0,0,Math.PI*2);ctx.stroke();}
      ctx.strokeStyle='#9875e880';ctx.beginPath();ctx.ellipse(x,y,r*1.55,r*.36,-.3,0,Math.PI*2);ctx.stroke();
    } else {
      ctx.save();ctx.translate(w*.5,h*.52);const s=h*.36;ctx.scale(s,s);ctx.scale(Math.max(.25,Math.abs(Math.cos(rotation))),1);
      ctx.strokeStyle='#54c9b7';ctx.fillStyle='#24242c80';ctx.lineWidth=.012;
      const ellipse=(x,y,rx,ry)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();};
      ellipse(0,-.95,.15,.2);ellipse(0,-.44,.27,.38);ellipse(0,-.06,.22,.2);
      ctx.lineCap='round';ctx.lineWidth=.12;ctx.beginPath();ctx.moveTo(-.29,-.65);ctx.lineTo(-.44,.05);ctx.moveTo(.29,-.65);ctx.lineTo(.44,.05);ctx.moveTo(-.11,.1);ctx.lineTo(-.14,.95);ctx.moveTo(.11,.1);ctx.lineTo(.14,.95);ctx.stroke();
      ctx.lineWidth=.008;ctx.fillStyle=this.data.warning&&this.data.quality==='good'?'#f3a64a':'#b7b7c0';const pulse=1+.15*Math.sin(elapsed*(this.data.heartRate??0)/60*Math.PI*2);ellipse(.06,-.48,.04*pulse,.05*pulse);
      ctx.restore();
    }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.frame); this.frame = null;
    this.resize?.disconnect();
    this.visibility?.disconnect();
    for (const [target, event, fn] of this.listeners) target.removeEventListener?.(event, fn);
    this.listeners = []; const gl=this.gl;this.releaseGL();
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
    this.canvas.remove(); this.fallbackLabel?.remove();
  }
}
