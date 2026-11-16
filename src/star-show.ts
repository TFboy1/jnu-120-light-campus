import * as T from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import fontData from './assets/helvetiker_bold.typeface.json'
import type { ShowPhase } from './show-timeline'

export async function createStarShow(compact:boolean) {
  const root=new T.Group();root.position.set(0,400,-250);root.visible=false
  const image=new Image();image.src=`${import.meta.env.BASE_URL}jnu-emblem.png`;await image.decode()
  const count=compact?4500:8500,positions=new Float32Array(count*3),colors=new Float32Array(count*3)
  const starts=new Float32Array(count*3),startColors=new Float32Array(count*3)
  let seed=120;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=700;const ctx=canvas.getContext('2d',{willReadFrequently:true})!
  type Target={positions:Float32Array;colors:Float32Array}
  const targets=new Map<string,Target>()
  function sampleCanvas(key:string,draw:()=>void){
    ctx.clearRect(0,0,1000,700);draw();const rgba=ctx.getImageData(0,0,1000,700).data,pixels:number[]=[]
    for(let y=0;y<700;y+=3)for(let x=0;x<1000;x+=3)if(rgba[(y*1000+x)*4+3]!>100)pixels.push(x,y)
    const result:Target={positions:new Float32Array(count*3),colors:new Float32Array(count*3)},c=new T.Color()
    for(let i=0;i<count;i++){
      const j=Math.floor(rand()*pixels.length/2)*2,x=pixels[j]!,y=pixels[j+1]!,offset=(y*1000+x)*4
      result.positions.set([(x-500)*.28,(350-y)*.28,(rand()-.5)*1.4],i*3)
      c.setRGB(rgba[offset]!/255,rgba[offset+1]!/255,rgba[offset+2]!/255,T.SRGBColorSpace).multiplyScalar(key==='emblem'?4:2)
      result.colors.set([c.r,c.g,c.b],i*3)
    }
    targets.set(key,result)
  }
  sampleCanvas('number',()=>{ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffe3a0';ctx.font='bold 370px Georgia,serif';ctx.fillText('120',500,310);ctx.font='42px "Microsoft YaHei",sans-serif';ctx.fillStyle='#a9e4ef';ctx.fillText('周 年 · 1906 — 2026',500,550)})
  sampleCanvas('emblem',()=>ctx.drawImage(image,28,0,164,160,250,85,500,488))
  sampleCanvas('birthday',()=>{ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#b6f2ff';ctx.font='bold 111px "STSong","SimSun",serif';ctx.fillText('暨南大学',500,220);ctx.fillStyle='#ffe2a1';ctx.font='bold 146px "STSong","SimSun",serif';ctx.fillText('生日快乐',500,415)})
  const scatter:Target={positions:new Float32Array(count*3),colors:new Float32Array(count*3)}
  for(let i=0;i<count;i++){scatter.positions.set([(rand()-.5)*900,(rand()-.5)*650,(rand()-.5)*450],i*3);scatter.colors.set([.9+rand(),1.2+rand(),1.8+rand()],i*3)}
  targets.set('sky',scatter);positions.set(scatter.positions);colors.set(scatter.colors)
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3))
  const seeds=new Float32Array(count);for(let i=0;i<count;i++)seeds[i]=rand()*Math.PI*2;geometry.setAttribute('aSeed',new T.BufferAttribute(seeds,1))
  // Dense glyph particles must not add unbounded energy where their cores overlap.
  const material=new T.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.NormalBlending,
    uniforms:{uTime:{value:0},uOpacity:{value:1},uMotion:{value:1},uSize:{value:compact?3.8:3.3}},
    vertexShader:'attribute float aSeed;varying vec3 vColor;varying float vSpark;uniform float uTime;uniform float uMotion;uniform float uSize;void main(){vColor=color;vSpark=.78+.22*sin(aSeed+uTime*1.4*uMotion);vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(uSize*450.0/-p.z,1.2,7.0);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vColor;varying float vSpark;uniform float uOpacity;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.0;if(r>1.0)discard;float core=pow(1.0-r,1.8);gl_FragColor=vec4(vColor*vSpark,core*uOpacity);}'})
  const points=new T.Points(geometry,material);points.frustumCulled=false;root.add(points)
  // The cake has real volume, with a crest plaque, blue-green ribbons and gold trim.
  const cake=new T.Group();cake.position.y=-48;root.add(cake)
  const cream=new T.MeshStandardMaterial({color:'#fff3dc',roughness:.4,emissive:'#d8bf8e',emissiveIntensity:.04,transparent:true})
  const teal=new T.MeshStandardMaterial({color:'#00788a',metalness:.2,roughness:.3,emissive:'#009ab3',emissiveIntensity:.12,transparent:true})
  const gold=new T.MeshStandardMaterial({color:'#efc26d',metalness:.55,roughness:.25,emissive:'#b78b39',emissiveIntensity:.18,transparent:true})
  const cakeMaterials:T.Material[]=[cream,teal,gold]
  function cylinder(r:number,h:number,y:number,mat:T.Material){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,80),mat);m.position.y=y;cake.add(m);return m}
  cylinder(58,3,0,gold)
  const cakeTarget:Target={positions:new Float32Array(count*3),colors:new Float32Array(count*3)}
  const tiers=[[50,23,13],[37,21,35],[24,19,55]]
  for(const [r,h,y] of tiers){
    cylinder(r!,h!,y!,cream);cylinder(r!+.15,4,y!-h!*.25,teal)
    const ring=new T.Mesh(new T.TorusGeometry(r!,.7,8,80),gold);ring.rotation.x=Math.PI/2;ring.position.y=y!+h!/2;cake.add(ring)
    for(let i=0;i<30;i++){const a=i/30*Math.PI*2,drop=new T.Mesh(new T.SphereGeometry(1.35,8,6),cream);drop.position.set(Math.cos(a)*(r!-.5),y!+h!/2,Math.sin(a)*(r!-.5));cake.add(drop)}
  }
  const emblemCanvas=document.createElement('canvas');emblemCanvas.width=256;emblemCanvas.height=256
  emblemCanvas.getContext('2d')!.drawImage(image,28,0,164,160,0,0,256,256)
  const emblemTexture=new T.CanvasTexture(emblemCanvas);emblemTexture.colorSpace=T.SRGBColorSpace
  const plaqueMaterial=new T.MeshBasicMaterial({map:emblemTexture,transparent:true,side:T.DoubleSide});cakeMaterials.push(plaqueMaterial)
  const badge=new T.Mesh(new T.CircleGeometry(12,48),cream);badge.position.set(0,16,50.5);cake.add(badge)
  const crest=new T.Mesh(new T.PlaneGeometry(23,23),plaqueMaterial);crest.position.set(0,16,50.7);cake.add(crest)
  const font=new FontLoader().parse(fontData),topperGeometry=new TextGeometry('120',{font,size:14,depth:1.3,bevelEnabled:true,bevelSize:.18,bevelThickness:.18,bevelSegments:2,curveSegments:8});topperGeometry.computeBoundingBox();topperGeometry.translate(-topperGeometry.boundingBox!.getCenter(new T.Vector3()).x,0,0)
  const topper=new T.Mesh(topperGeometry,gold);topper.position.set(0,65,0);cake.add(topper)
  const flameMaterial=new T.MeshBasicMaterial({color:new T.Color('#ffd791').multiplyScalar(1.8),transparent:true});cakeMaterials.push(flameMaterial)
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*18,z=Math.sin(a)*18;const candle=new T.Mesh(new T.CylinderGeometry(.65,.65,8,10),i%2?cream:teal);candle.position.set(x,68,z);cake.add(candle);const flame=new T.Mesh(new T.SphereGeometry(1,10,8),flameMaterial);flame.scale.set(.8,2,.8);flame.position.set(x,73,z);cake.add(flame)}
  const cakeLight=new T.PointLight('#fff2cc',450,500,1.2);cakeLight.position.set(10,100,160);root.add(cakeLight)
  const cakeFill=new T.HemisphereLight('#d5eeff','#886136',.8);root.add(cakeFill)
  const emblemPixels=targets.get('emblem')!
  for(let i=0;i<count;i++){
    if(i<count*.12){const n=i*3;cakeTarget.positions.set([emblemPixels.positions[n]!*.16,emblemPixels.positions[n+1]!*.16-32,51],n);cakeTarget.colors.set(emblemPixels.colors.subarray(n,n+3),n);continue}
    const tier=tiers[Math.floor(rand()*3)]!,r=tier[0]!,h=tier[1]!,y=tier[2]!,angle=rand()*Math.PI*2,onTop=rand()<.25
    const radius=onTop?Math.sqrt(rand())*r:r,yy=onTop?y+h/2:y+(rand()-.5)*h
    cakeTarget.positions.set([Math.cos(angle)*radius,yy-48,Math.sin(angle)*radius],i*3)
    const band=Math.abs(yy-(y-h*.25))<2;cakeTarget.colors.set(band?[.08,1.15,1.55]:[1.7,1.25,.6],i*3)
  }
  targets.set('cake',cakeTarget)
  const skyGeometry=new T.BufferGeometry(),skyPositions:number[]=[],skyColors:number[]=[]
  for(let i=0;i<(compact?1700:3400);i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=1000+rand()*700;skyPositions.push(Math.sqrt(1-z*z)*Math.cos(a)*r,z*r,Math.sqrt(1-z*z)*Math.sin(a)*r);skyColors.push(.7+rand(),.8+rand(),1+rand())}
  skyGeometry.setAttribute('position',new T.Float32BufferAttribute(skyPositions,3));skyGeometry.setAttribute('color',new T.Float32BufferAttribute(skyColors,3))
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64
  const glowContext=glowCanvas.getContext('2d')!,glow=glowContext.createRadialGradient(32,32,0,32,32,32)
  glow.addColorStop(0,'#fff');glow.addColorStop(.2,'#ffffffdd');glow.addColorStop(.55,'#ffffff55');glow.addColorStop(1,'#ffffff00');glowContext.fillStyle=glow;glowContext.fillRect(0,0,64,64)
  const glowTexture=new T.CanvasTexture(glowCanvas)
  const skyMaterial=new T.PointsMaterial({map:glowTexture,size:2,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}),sky=new T.Points(skyGeometry,skyMaterial)
  const fireCount=compact?1300:3200,fireGeo=new T.BufferGeometry(),firePos=new Float32Array(fireCount*3),fireColor=new Float32Array(fireCount*3),velocity=new Float32Array(fireCount*3)
  for(let i=0;i<fireCount;i++){const z=rand()*2-1,a=rand()*Math.PI*2,s=25+rand()*45;velocity.set([Math.cos(a)*Math.sqrt(1-z*z)*s,Math.sin(a)*Math.sqrt(1-z*z)*s,z*s],i*3)}
  fireGeo.setAttribute('position',new T.BufferAttribute(firePos,3));fireGeo.setAttribute('color',new T.BufferAttribute(fireColor,3))
  const fireMat=new T.PointsMaterial({map:glowTexture,size:3.6,vertexColors:true,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}),fire=new T.Points(fireGeo,fireMat);fire.frustumCulled=false;root.add(fire)
  let previous='',transition=0,lastSeconds=0
  function update(phase:ShowPhase,local:number,seconds:number,camera:T.PerspectiveCamera,reduced:boolean){
    const enabled=['sky','number','emblem','cake','birthday','fireworks','complete'].includes(phase)
    root.visible=enabled;sky.visible=enabled;if(!enabled){previous='';lastSeconds=seconds;return}
    sky.position.copy(camera.position);skyMaterial.opacity=phase==='sky'?Math.min(local/2,1):1
    root.quaternion.copy(camera.quaternion)
    const key=['fireworks','complete'].includes(phase)?'birthday':phase
    const vertical=2*camera.position.distanceTo(root.position)*Math.tan(T.MathUtils.degToRad(camera.fov/2)),span=vertical*camera.aspect
    const bounds=key==='cake'?[125,100]:key==='emblem'?[150,150]:[220,140]
    const scale=Math.min(2.3,span*.76/bounds[0]!,vertical*.58/bounds[1]!)
    root.scale.setScalar(reduced?scale:T.MathUtils.damp(root.scale.x,scale,2,Math.max(0,seconds-lastSeconds)));lastSeconds=seconds
    fire.scale.setScalar(Math.min(1,span/460)/root.scale.x)
    if(key!==previous){starts.set(positions);startColors.set(colors);transition=seconds;previous=key}
    const target=targets.get(key)??scatter,t=reduced?1:Math.min(1,(seconds-transition)/2.3),k=t*t*(3-2*t)
    for(let i=0;i<positions.length;i++){positions[i]=T.MathUtils.lerp(starts[i]!,target.positions[i]!,k);colors[i]=T.MathUtils.lerp(startColors[i]!,target.colors[i]!,k)}
    geometry.attributes.position!.needsUpdate=true;geometry.attributes.color!.needsUpdate=true
    material.uniforms.uTime!.value=seconds;material.uniforms.uMotion!.value=reduced?0:1
    material.uniforms.uOpacity!.value=phase==='cake'?1-Math.max(0,Math.min(1,(local-2.8)))*.72:1
    const cakeOpacity=phase==='cake'?(reduced?1:T.MathUtils.clamp((local-2.4)/1.5,0,1)):0
    cake.visible=cakeOpacity>0;cakeLight.visible=cake.visible;cakeFill.visible=cake.visible
    cakeMaterials.forEach(m=>m.opacity=cakeOpacity)
    cake.rotation.y=reduced?0:Math.sin(local*.45)*.12
    fire.visible=phase==='fireworks'&&!reduced
    if(fire.visible){
      for(let i=0;i<fireCount;i++){
        const burst=i%6,age=(local+burst*.53)%3.6,n=i*3,expansion=1-Math.exp(-age*1.5),side=burst%2?1:-1
        firePos[n]=side*(105+(burst%3)*22)+velocity[n]!*expansion
        firePos[n+1]=20+(burst%3)*25+velocity[n+1]!*expansion-age*age*4
        firePos[n+2]=-30+velocity[n+2]!*expansion
        const fade=Math.max(0,1-age/3.6)**1.2,c=burst%3===0?[.4,2.3,3.4]:burst%3===1?[3.4,2.2,.6]:[2.7,.8,2]
        fireColor.set(c.map(v=>v*fade),n)
      }
      fireGeo.attributes.position!.needsUpdate=true;fireGeo.attributes.color!.needsUpdate=true
    }
  }
  return {root,sky,update}
}
