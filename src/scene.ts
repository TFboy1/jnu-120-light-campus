import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { CAMPUSES, mapPoint, type CampusId } from './campuses'
import { createCampusModel, type CampusModel } from './campus-models'
import { createRegionalMap } from './regional-map'
import { createStarShow } from './star-show'
import { showFrame, type ShowPhase } from './show-timeline'

export interface SceneOptions {
  onSelect:(id:string)=>void; onRequestCampus:(id:CampusId)=>void
  onPhase:(phase:ShowPhase,campus:CampusId|null)=>void;onFinale:()=>void
  onError:(message:string)=>void;onRecover:()=>void;onLoading:(message:string)=>void
}
function disposeGraph(scene:T.Scene){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>()
  scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points||o instanceof T.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o instanceof T.InstancedMesh)o.dispose()}})
  materials.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v)});m.dispose()});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose())
}
export async function createScene(host:HTMLElement,options:SceneOptions){
  const compact=window.innerWidth<768,motion=window.matchMedia('(prefers-reduced-motion: reduce)'),reduced=()=>motion.matches
  const scene=new T.Scene(),daySky=new T.Color('#cddde8'),nightSky=new T.Color('#050d1d');scene.background=nightSky.clone()
  const camera=new T.PerspectiveCamera(compact?55:42,1,.5,5000)
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.3:1.65));renderer.shadowMap.enabled=!compact;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false
  renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=.95
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','五校区三维探索。拖动旋转、滚轮缩放；也可使用校区与地标按钮。');host.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced();controls.dampingFactor=.08;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI/2-.16;controls.screenSpacePanning=false;controls.listenToKeyEvents(renderer.domElement)
  const hemisphere=new T.HemisphereLight('#e8f2ff','#455c4b',1.35),sun=new T.DirectionalLight('#ffffff',2.1)
  sun.position.set(-170,340,160);sun.castShadow=!compact;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-390;sun.shadow.camera.right=390;sun.shadow.camera.top=390;sun.shadow.camera.bottom=-390;sun.shadow.camera.near=10;sun.shadow.camera.far=850;sun.shadow.normalBias=.6;scene.add(hemisphere,sun)
  const composer=new EffectComposer(renderer);composer.setPixelRatio(Math.min(devicePixelRatio,compact?1:1.4))
  const bloom=new UnrealBloomPass(new T.Vector2(1,1),.2,.25,1.2),output=new OutputPass();composer.addPass(new RenderPass(scene,camera));composer.addPass(bloom);composer.addPass(output)
  const models=new Map<CampusId,CampusModel>()
  let region:ReturnType<typeof createRegionalMap>,stars:Awaited<ReturnType<typeof createStarShow>>
  try {
    region=createRegionalMap();scene.add(region.root)
    for(const campus of CAMPUSES){options.onLoading(`正在铺展${campus.name}`);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));const model=createCampusModel(campus,compact);model.root.visible=false;models.set(campus.id,model);scene.add(model.root)}
    options.onLoading('正在汇集星光与校徽');stars=await createStarShow(compact);scene.add(stars.root,stars.sky)
  }catch(error){disposeGraph(scene);bloom.dispose();output.dispose();composer.dispose();controls.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();throw error}
  const labelLayer=document.createElement('div');labelLayer.className='landmark-layer';host.appendChild(labelLayer)
  type Label={button:HTMLButtonElement;position:T.Vector3;visible:boolean;kind:'map'|'landmark';id:string}
  const labels:Label[]=[]
  function makeLabel(name:string,id:string,position:T.Vector3,kind:'map'|'landmark',click:()=>void){const button=document.createElement('button');button.className=`landmark-label ${kind==='map'?'campus-map-label':''}`;button.type='button';button.textContent=name;button.addEventListener('click',click);labelLayer.appendChild(button);labels.push({button,position,visible:true,kind,id})}
  CAMPUSES.forEach(c=>makeLabel(`${c.city} · ${c.name}`,c.id,region.pins.get(c.id)!.userData.label.clone(),'map',()=>options.onRequestCampus(c.id)))
  let mode:'map'|'campus'|'show'='map',current:CampusId='shipai',visited:CampusId[]=[],night=1,nightTarget=1
  let width=1,height=1,frame=0,last=performance.now(),labelTime=0,disposed=false,contextLost=false
  let flight:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;start:number;duration:number}|null=null
  let showSeconds=0,paused=false,phaseKey='',ended=false
  let showReduced=false
  const pullbackFrom=new T.Vector3(),pullbackTarget=new T.Vector3()
  const mapCamera=new T.Vector3(0,compact?1150:850,compact?750:650),mapTarget=new T.Vector3(),skyCamera=new T.Vector3(0,330,180),skyTarget=new T.Vector3(0,400,-250)
  const raycaster=new T.Raycaster(),projected=new T.Vector3(),direction=new T.Vector3(),ease=(t:number)=>t*t*(3-2*t)
  function campusHome(id:CampusId){const c=CAMPUSES.find(c=>c.id===id)!;return new T.Vector3(65,c.size[1]*(compact?1.3:.92),c.size[1]*(compact?1.5:1.1))}
  function moveTo(to:T.Vector3,target:T.Vector3,duration=1200){if(reduced()){camera.position.copy(to);controls.target.copy(target);controls.update();flight=null;return}flight={from:camera.position.clone(),to,fromTarget:controls.target.clone(),toTarget:target,start:performance.now(),duration}}
  function localModel(id:CampusId){current=id;models.forEach((m,key)=>{m.root.visible=key===id;m.root.position.set(0,0,0);m.root.scale.setScalar(1);m.miniature(false)});renderer.shadowMap.needsUpdate=true}
  function updateLandmarkLabels(){for(let i=labels.length-1;i>=0;i--)if(labels[i]!.kind==='landmark'){labels[i]!.button.remove();labels.splice(i,1)}CAMPUSES.find(c=>c.id===current)!.landmarks.forEach(l=>makeLabel(l.name,l.id,new T.Vector3(...l.point),'landmark',()=>options.onSelect(l.id)))}
  function enterCampus(id:CampusId){if(mode==='show')return false;mode='campus';localModel(id);region.opacity(0);stars.root.visible=false;stars.sky.visible=false;nightTarget=0;models.get(id)!.setLight(0);controls.enabled=true;controls.minDistance=55;controls.maxDistance=1100;controls.maxTargetRadius=350;updateLandmarkLabels();moveTo(campusHome(id),new T.Vector3());return true}
  function showMap(){mode='map';paused=false;flight=null;controls.enabled=true;controls.minDistance=350;controls.maxDistance=1800;controls.maxTargetRadius=500;region.opacity(1);stars.root.visible=false;stars.sky.visible=false;nightTarget=1;models.forEach(m=>m.root.visible=false);moveTo(mapCamera.clone(),mapTarget.clone());phaseKey='';ended=false}
  function focus(id:string){if(mode!=='campus')return;const l=CAMPUSES.find(c=>c.id===current)!.landmarks.find(l=>l.id===id);if(!l)return;const target=new T.Vector3(...l.point);target.y=Math.min(target.y,20);const offset=camera.position.clone().sub(controls.target).normalize().multiplyScalar(185);offset.y=Math.max(offset.y,115);moveTo(target.clone().add(offset),target);labels.forEach(l=>l.button.classList.toggle('selected',l.id===id&&l.kind==='landmark'))}
  function setVisited(ids:readonly CampusId[]){visited=[...ids];region.visited(visited);labels.forEach(l=>{if(l.kind==='map')l.button.classList.toggle('is-lit',visited.includes(l.id as CampusId))})}
  function setNight(value:boolean){if(mode==='campus')nightTarget=value?1:0}
  function celebrate(){if(!CAMPUSES.every(c=>visited.includes(c.id)))return false;mode='show';showSeconds=0;paused=false;phaseKey='';ended=false;showReduced=reduced();flight=null;controls.enabled=false;nightTarget=1;models.forEach(m=>m.setLight(0));return true}
  function pause(value:boolean){paused=value}
  function zoom(factor:number){if(mode==='show')return;const offset=camera.position.clone().sub(controls.target);offset.setLength(T.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));moveTo(controls.target.clone().add(offset),controls.target.clone(),300)}
  function home(){if(mode==='campus')moveTo(campusHome(current),new T.Vector3());else if(mode==='map')moveTo(mapCamera.clone(),mapTarget.clone())}
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height)}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();camera.position.copy(mapCamera);controls.target.copy(mapTarget);controls.update();showMap()
  let down:{x:number;y:number;id:number}|null=null,dragged=false
  function pointerDown(e:PointerEvent){if(down){dragged=true;return}if(e.button===0){down={x:e.clientX,y:e.clientY,id:e.pointerId};dragged=false}}
  function pointerMove(e:PointerEvent){if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true}
  function pointerUp(e:PointerEvent){
    if(!down||down.id!==e.pointerId)return
    const click=!dragged&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6;down=null
    if(!click||mode==='show')return
    const rect=renderer.domElement.getBoundingClientRect()
    raycaster.setFromCamera(new T.Vector2((e.clientX-rect.left)/width*2-1,-(e.clientY-rect.top)/height*2+1),camera)
    if(mode==='map'){
      const hit=raycaster.intersectObjects([...region.pins.values()],true)[0],id=hit?.object.parent?.userData.campus as CampusId|undefined
      if(id)options.onRequestCampus(id)
    }else{
      const hit=raycaster.intersectObjects(models.get(current)!.occluders,false)[0],id=hit?.object.userData.landmark
      if(id&&CAMPUSES.find(c=>c.id===current)!.landmarks.some(l=>l.id===id))options.onSelect(id)
    }
  }
  function cancelPointer(){down=null;dragged=true}function interruptFlight(){flight=null}
  function lost(e:Event){e.preventDefault();contextLost=true;cancelAnimationFrame(frame);options.onError('图形连接暂时中断，等待恢复后可继续。访问进度已保留。')}
  function restored(){contextLost=false;renderer.shadowMap.needsUpdate=true;last=performance.now();options.onRecover();frame=requestAnimationFrame(tick)}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp,true);renderer.domElement.addEventListener('pointercancel',cancelPointer);renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);controls.addEventListener('start',interruptFlight)
  function tick(now:number){
    if(disposed||contextLost)return
    const dt=document.hidden?0:Math.min((now-last)/1000,.05);last=now;let phase:ShowPhase|null=null
    if(mode==='show'){
      if(!paused&&!ended)showSeconds+=dt
      const shot=showFrame(showSeconds,showReduced);phase=shot.phase;const key=`${shot.phase}:${shot.index}`
      if(key!==phaseKey){phaseKey=key;options.onPhase(shot.phase,shot.phase==='tour'?CAMPUSES[shot.index]!.id:null)
        if(shot.phase==='tour'){localModel(CAMPUSES[shot.index]!.id);region.opacity(0)}
        if(shot.phase==='map'){pullbackFrom.copy(camera.position);pullbackTarget.copy(controls.target);models.forEach((m,id)=>{m.root.visible=true;m.miniature(true);m.setLight(1);m.root.position.set(...mapPoint(...CAMPUSES.find(c=>c.id===id)!.coordinates));m.root.scale.setScalar(.014)})}
        if(shot.phase==='sky')models.forEach(m=>m.root.visible=false)
      }
      if(shot.phase==='tour'){
        const t=ease(shot.progress),base=campusHome(current),angle=showReduced?.18:-.2+t*.6,distance=base.z*(showReduced?.9:.85+.15*Math.sin(t*Math.PI))
        camera.position.set(Math.sin(angle)*distance,base.y*(showReduced?.86:.8+.12*t),Math.cos(angle)*distance);controls.target.set(0,8,0);camera.lookAt(controls.target);nightTarget=1;models.get(current)!.setLight(showReduced?1:Math.min(1,t*1.3))
      }else if(shot.phase==='map'){
        const k=showReduced?1:ease(Math.min(1,shot.progress/.65)),lastCampus=CAMPUSES.at(-1)!,lastModel=models.get(lastCampus.id)!,pin=new T.Vector3(...mapPoint(...lastCampus.coordinates))
        lastModel.root.position.copy(pin).multiplyScalar(k);lastModel.root.scale.setScalar(T.MathUtils.lerp(1,.014,k));region.opacity(k);camera.position.lerpVectors(pullbackFrom,mapCamera,k);controls.target.lerpVectors(pullbackTarget,mapTarget,k);camera.lookAt(controls.target)
      }else if(shot.phase==='sky'){
        const k=showReduced?1:ease(shot.progress);region.opacity(1-k);camera.position.lerpVectors(mapCamera,skyCamera,k);controls.target.lerpVectors(mapTarget,skyTarget,k);camera.lookAt(controls.target)
      }else{region.opacity(0);camera.position.copy(skyCamera);controls.target.copy(skyTarget);camera.lookAt(skyTarget)}
      stars.update(shot.phase,shot.local,showSeconds,camera,showReduced)
      if(shot.phase==='complete'&&!ended){ended=true;options.onFinale()}
    }else{
      if(flight){const t=Math.min(1,(now-flight.start)/flight.duration),k=ease(t);camera.position.lerpVectors(flight.from,flight.to,k);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,k);if(t===1)flight=null}
      controls.enableDamping=!reduced();controls.update();camera.position.y=Math.max(camera.position.y,mode==='campus'?models.get(current)!.groundHeight(camera.position.x,camera.position.z)+12:12);if(mode==='campus')models.get(current)!.setLight(night)
    }
    camera.updateMatrixWorld();host.parentElement?.style.setProperty('--north-angle',`${controls.getAzimuthalAngle()*180/Math.PI-(mode==='campus'&&current==='shenzhen'?30:0)}deg`);night=T.MathUtils.damp(night,nightTarget,reduced()?30:1.5,dt);(scene.background as T.Color).lerpColors(daySky,nightSky,night)
    hemisphere.intensity=T.MathUtils.lerp(1.35,.45,night);sun.intensity=T.MathUtils.lerp(2.1,.23,night);sun.color.set('#ffffff').lerp(new T.Color('#91b6ff'),night)
    const check=now-labelTime>200;if(check)labelTime=now
    labels.forEach(label=>{
      const show=(label.kind==='map'&&(mode==='map'||phase==='map'))||(label.kind==='landmark'&&mode==='campus');if(!show){label.button.hidden=true;return}
      projected.copy(label.position).project(camera)
      if(label.kind==='landmark'&&check){direction.copy(label.position).sub(camera.position);const distance=direction.length();raycaster.set(camera.position,direction.normalize());raycaster.far=distance-2;label.visible=raycaster.intersectObjects(models.get(current)!.occluders,false).length===0;raycaster.far=Infinity}
      label.button.hidden=(!label.visible&&label.kind==='landmark')||(label.kind==='landmark'&&camera.position.distanceTo(label.position)>1150)||projected.z<=-1||projected.z>=1||Math.abs(projected.x)>.98||Math.abs(projected.y)>.9;label.button.disabled=mode==='show'
      if(!label.button.hidden)label.button.style.transform=`translate(-50%,-100%) translate(${(projected.x*.5+.5)*width}px,${(-projected.y*.5+.5)*height}px)`
    })
    // Campus windows keep a restrained halo; the star show gets a little more bloom.
    const starStage=phase!==null&&!['tour','map','sky'].includes(phase)
    bloom.strength=(starStage?.35:.2)*night
    if(night>.1)composer.render(dt);else renderer.render(scene,camera);frame=requestAnimationFrame(tick)
  }
  frame=requestAnimationFrame(tick)
  function dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp,true);renderer.domElement.removeEventListener('pointercancel',cancelPointer);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('webglcontextrestored',restored);disposeGraph(scene);bloom.dispose();output.dispose();composer.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();labelLayer.remove()}
  return {enterCampus,showMap,focus,setVisited,setNight,celebrate,pause,zoom,home,dispose}
}
export type CampusScene=Awaited<ReturnType<typeof createScene>>
