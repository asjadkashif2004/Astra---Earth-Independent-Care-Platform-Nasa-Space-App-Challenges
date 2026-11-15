/* N04 native Earth material. Historical NASA textures; schematic vehicle and orbit. */
export const EARTH_MATERIAL = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform vec2 resolution;
uniform float elapsed,rotation,blackout,zoom,quality,linkAvailable,planetRadius;
uniform sampler2D landMap,cloudMap;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float box(vec2 p,vec2 b){return length(max(abs(p)-b,0.))+min(max(abs(p.x)-b.x,abs(p.y)-b.y),0.);}
vec2 mapUV(vec3 n,float turn){n.xz=rot(turn)*n.xz;return vec2(atan(n.x,n.z)/6.283185+.5,asin(clamp(n.y,-1.,1.))/3.141593+.5);}
void main(){
 vec2 p=(uv*2.-1.)*vec2(resolution.x/resolution.y,1.);
 vec3 c=vec3(.0196,.0196,.0314);
 // Sparse seeded star cells, irregular positions and brightness; no repeating blue grid.
 vec2 grid=p*65.;vec2 cell=floor(grid);float seed=hash(cell);
 vec2 star=fract(grid)-vec2(hash(cell+3.1),hash(cell+7.4));
 c+=exp(-dot(star,star)*1100.)*step(.982,seed)*(.15+seed*.55)*mix(vec3(1.,.91,.8),vec3(.83,.87,1.),hash(cell+9.));
 vec2 center=vec2(.42,-.07);vec2 q=rot(-.16)*(p-center)/(planetRadius*zoom);
 float rr=dot(q,q),r=sqrt(rr);
 vec3 light=normalize(vec3(-.85,.45,.58));
 float orbitAngle=.34;
 vec2 o=rot(orbitAngle)*(p-center);
 float arc=length(o/vec2(1.11,.35));
 if(rr>1.||o.y<-.16)c+=exp(-abs(arc-1.)*420.)*vec3(.34,.31,.28)*.6;
 // Thin directional atmospheric approximation, not a volumetric scattering claim.
 float litRim=clamp(dot(normalize(vec3(q,.1)),light),0.,1.);
 c+=exp(-abs(r-1.)*100.)*vec3(.15,.32,.46)*(.12+litRim*.6);
 if(rr<1.){
   vec3 n=vec3(q,sqrt(1.-rr));vec2 tex=mapUV(n,rotation);
   vec3 surface=pow(texture(landMap,tex).rgb,vec3(2.2));
   float sun=dot(n,light),day=smoothstep(-.10,.15,sun);
   vec2 cloudUV=mapUV(n,rotation+elapsed*.00065);
   float cloud=texture(cloudMap,cloudUV).r;
   float shade=quality>.5?0.:texture(cloudMap,cloudUV+vec2(.002,-.001)).r*.18;
   surface*=1.-shade;
   float ocean=1.-smoothstep(.02,.12,surface.r+surface.g-surface.b*.5);
   float spec=pow(max(0.,dot(reflect(-light,n),vec3(0,0,1))),60.)*ocean*.08;
   vec3 linear=surface*(.012+max(sun,0.)*1.12)*day+surface*.004;
   linear+=vec3(spec)*day*(1.-cloud);
   linear=mix(linear,vec3(.87,.9,.94)*(.04+max(sun,0.)*.86),smoothstep(.08,.94,cloud)*.88);
   linear+=pow(1.-n.z,4.)*vec3(.045,.15,.29)*day*.55;
   c=pow(max(linear,vec3(0.)),vec3(1./2.2));
 }
 // Explicitly schematic spacecraft: hub, antenna and twin solar wings, not a point light.
 float angle=4.2+elapsed*.014;vec2 ship=center+rot(-orbitAngle)*vec2(cos(angle)*1.11,sin(angle)*.35);
 vec2 s=rot(-.4)*(p-ship);
 bool front=sin(angle)<-.45||rr>1.;
 if(front){
   float body=1.-smoothstep(0.,.003,box(s,vec2(.013,.027)));
   float wings=1.-smoothstep(0.,.003,box(vec2(abs(s.x)-.045,s.y),vec2(.024,.015)));
   float strut=1.-smoothstep(.001,.003,abs(s.y));strut*=1.-step(.07,abs(s.x));
   c=mix(c,vec3(.62,.60,.55),max(body,strut*.8));
   c=mix(c,vec3(.22,.25,.29)+vec3(.14)*step(.5,fract(s.x*250.)),wings*.95);
   c+=exp(-dot(s,s)*24000.)*vec3(.32,.22,.10);
 }
 // This line shows configured link availability, never proves message delivery.
 vec2 a=ship,b=center+vec2(.12,.04),ab=b-a;
 float u=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);
 float line=length(p-a-ab*u);
 if(rr>1.&&linkAvailable>.5){float dash=step(.45,fract(u*25.-elapsed*.24*(1.-blackout)));
 c+=exp(-line*1100.)*dash*mix(vec3(.15,.35,.31),vec3(.48,.32,.13),blackout)*.8;}
 color=vec4(c,1.);
}`;
