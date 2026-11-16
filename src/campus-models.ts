import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCampus, terrainHeight } from './model'
import { planPoint, type CampusDefinition } from './campuses'
import { PLANS } from './campus-plans'

export interface CampusModel {root:T.Group;occluders:T.Mesh[];groundHeight:(x:number,z:number)=>number;setLight:(progress:number)=>void;miniature:(small:boolean)=>void}
export function createCampusModel(campus:CampusDefinition,compact:boolean):CampusModel {
  if(campus.id==='shenzhen') {
    const existing=createCampus(compact)
    return {root:existing.root,occluders:existing.occluders,groundHeight:terrainHeight,
      setLight(progress){let i=0;existing.lightMaterials.forEach(m=>m.emissiveIntensity=Math.max(0,Math.min(1,progress*1.5-i++*.1))*1.2);existing.lampMat.emissiveIntensity=progress*1.7;existing.pools.forEach(m=>m.opacity=progress*.1)},
      miniature(small){existing.root.children.forEach(o=>{if(o instanceof T.InstancedMesh)o.visible=!small})}}
  }
  const plan=PLANS[campus.id],root=new T.Group(),objects:T.Mesh[]=[],occluders:T.Mesh[]=[],windows:T.MeshStandardMaterial[]=[]
  const boxGeometry=new T.BoxGeometry(1,1,1)
  const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.82})
  const wall=mat(campus.wall),roof=mat(campus.roof),trim=mat('#eff1ee'),paving=mat('#bdc4bf'),roadMat=mat('#535d62'),grass=mat('#446c46'),glass=mat('#345966')
  const treeMat=mat('#315c3d'),water=mat('#326e69'),red=mat('#aa5a50')
  const lampMat=new T.MeshStandardMaterial({color:'#ecddbc',emissive:'#ffd18b',emissiveIntensity:0})
  const groundHeight=(x:number,z:number)=>{
    const edge=campus.id==='guangyuan'?Math.max(0,-x-215):campus.id==='zhuhai'?Math.max(0,x-185):0
    return edge*.4*(.8+.2*Math.sin(z*.03)**2)
  }
  const blocked:{x:number;z:number;w:number;d:number}[]=[],roadPoints:T.Vector3[][]=[]
  const p=(x:number,y:number,h=0)=>new T.Vector3(...planPoint(campus.center,campus.scale,x,y,h))
  function add(geo:T.BufferGeometry,material:T.Material,parent:T.Object3D=root){const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);objects.push(m);return m}
  function box(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){const m=add(boxGeometry,material,parent);m.position.set(x,y,z);m.scale.set(w,h,d);return m}
  function polygon(coords:number[][],material:T.Material,y:number){const points=coords.map(([x,z])=>p(x!,z!));const shape=new T.Shape(points.map(v=>new T.Vector2(v.x,-v.z)));const geo=new T.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const m=add(geo,material);m.position.y=y;return points}
  // Ground is modeled, not a satellite image plane. Hill massing is interpretive.
  const groundGeometry=new T.PlaneGeometry(campus.size[0]+120,campus.size[1]+120,64,64);groundGeometry.rotateX(-Math.PI/2)
  const groundPositions=groundGeometry.attributes.position!
  for(let i=0;i<groundPositions.count;i++)groundPositions.setY(i,groundHeight(groundPositions.getX(i),groundPositions.getZ(i))-.12)
  groundGeometry.computeVertexNormals();const ground=add(groundGeometry,grass);ground.castShadow=false
  for(const points of plan.roads){
    const curve=new T.CatmullRomCurve3(points.map(([x,y])=>p(x!,y!,.13)),false,'catmullrom',.15),samples=curve.getPoints(100);roadPoints.push(samples)
    for(const [halfWidth,lift,material] of [[4.1,.05,paving],[3.1,.15,roadMat]] as const){
      const vertices:number[]=[],indices:number[]=[]
      samples.forEach((v,i)=>{const t=curve.getTangent(i/100);for(const side of [-1,1]){const x=v.x-t.z*halfWidth*side,z=v.z+t.x*halfWidth*side;vertices.push(x,groundHeight(x,z)+lift,z)}if(i<100){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2)}})
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();add(geo,material)
    }
    samples.forEach((v,i)=>{if(i%12!==0)return;const t=curve.getTangent(i/100),x=v.x-t.z*4.6,z=v.z+t.x*4.6,y=groundHeight(x,z);box(root,trim,x,y+2.6,z,.22,5.2,.22);box(root,lampMat,x,y+5.3,z,1.2,.4,1.2)})
  }
  const lakePolygons=plan.lakes.map(coords=>polygon(coords,water,.12))
  function block(parent:T.Group,x:number,z:number,w:number,d:number,h:number,win:T.Material){
    box(parent,wall,x,h/2,z,w,h,d);box(parent,roof,x,h+.2,z,w+.5,.5,d+.5)
    box(parent,trim,x,.6,z,w+.6,1,d+.6)
    for(let y=2;y<h-1;y+=3.1) {
      for(const s of [-1,1])for(let xx=-w/2+1.8;xx<w/2-1;xx+=3.5)box(parent,win,x+xx,y,z+s*(d/2+.035),2.1,1.65,.1)
      for(const s of [-1,1])for(let zz=-d/2+1.8;zz<d/2-1;zz+=4)box(parent,win,x+s*(w/2+.035),y,z+zz,.1,1.65,2)
      for(const s of [-1,1])box(parent,trim,x,y+1.2,z+s*(d/2+.1),w,.2,.2)
    }
    box(parent,trim,x+w*.16,h+1.3,z,Math.min(5,w*.3),2,Math.min(4,d*.5))
  }
  for(const [px,py,pw,pd,floors,angle,type,id] of plan.buildings){
    const position=p(px,py),w=pw*campus.scale,d=pd*campus.scale,h=floors*3.1
    const group=new T.Group();root.add(group);group.position.copy(position);group.rotation.y=-angle*Math.PI/180
    group.userData.landmark=id
    const win=new T.MeshStandardMaterial({color:'#355262',emissive:'#ffcf86',emissiveIntensity:0,roughness:.36});windows.push(win)
    blocked.push({x:position.x,z:position.z,w:w+10,d:d+10})
    if(type==='gate') {
      for(const x of [-w*.4,w*.4])box(group,wall,x,3,0,2,6,2.5)
      box(group,wall,0,6,0,w,1.7,3);box(group,win,0,6.1,1.55,w*.7,.6,.1)
    }else if(type==='round') {
      const base=add(new T.CylinderGeometry(w/2,w/2,h,48),wall,group);base.position.y=h/2
      const top=add(new T.CylinderGeometry(w/2+.5,w/2+.5,.7,48),roof,group);top.position.y=h
      for(let f=1;f<floors;f++){const ring=add(new T.CylinderGeometry(w/2+.08,w/2+.08,.8,48,1,true),win,group);ring.position.y=f*3.1}
      const skylight=add(new T.CylinderGeometry(w*.17,w*.17,.6,32),glass,group);skylight.position.y=h+.7
    }else if(type==='court') {
      const thickness=Math.min(w,d)*.24
      block(group,0,-d/2+thickness/2,w,thickness,h,win);block(group,0,d/2-thickness/2,w,thickness,h,win)
      block(group,-w/2+thickness/2,0,thickness,d-thickness*2,h,win);block(group,w/2-thickness/2,0,thickness,d-thickness*2,h,win)
    }else if(type==='library') {
      block(group,0,0,w,d,h,win)
      box(group,glass,0,h*.5,d/2+.12,w*.48,h*.65,.15)
      for(let x=-w*.24;x<=w*.24;x+=2.5)box(group,trim,x,h*.5,d/2+.23,.25,h*.65,.15)
      box(group,trim,0,h+1,0,w+2,1,d+2)
      box(group,paving,0,.5,d/2+3,w*.65,1,6)
    }else block(group,0,0,w,d,h,win)
  }
  function stadium(r:number,straight:number){const s=new T.Shape();s.moveTo(-r,-straight);s.lineTo(-r,straight);s.absarc(0,straight,r,Math.PI,0,true);s.lineTo(r,-straight);s.absarc(0,-straight,r,0,-Math.PI,true);return s}
  for(const [x,y,w,d,angle,color] of plan.tracks){
    const pos=p(x,y),width=w*campus.scale,depth=d*campus.scale,r=width/2,straight=Math.max(0,(depth-width)/2)
    const group=new T.Group();root.add(group);group.position.copy(pos);group.rotation.y=-angle*Math.PI/180
    const outer=add(new T.ShapeGeometry(stadium(r,straight),32),mat(color),group);outer.rotation.x=-Math.PI/2;outer.position.y=.2
    const inside=add(new T.ShapeGeometry(stadium(r*.75,straight),32),grass,group);inside.rotation.x=-Math.PI/2;inside.position.y=.23
    for(let lane=0;lane<5;lane++){const outline=stadium(r-lane*.8,straight);outline.holes.push(stadium(r-lane*.8-.09,straight));const mesh=add(new T.ShapeGeometry(outline,32),trim,group);mesh.rotation.x=-Math.PI/2;mesh.position.y=.26}
    blocked.push({x:pos.x,z:pos.z,w:width+5,d:depth+5})
  }
  for(const [x,y,w,d,angle] of plan.courts){
    const group=new T.Group();root.add(group);group.position.copy(p(x,y));group.rotation.y=-angle*Math.PI/180
    const width=w*campus.scale,depth=d*campus.scale
    box(group,red,0,.2,0,width,.15,depth);box(group,mat('#3c8578'),0,.3,0,width-2,.05,depth-2)
    for(let i=-width/2+1;i<width/2;i+=8)box(group,trim,i,.35,0,.1,.02,depth-2)
    box(group,trim,0,.35,0,width-2,.02,.1)
    blocked.push({x:group.position.x,z:group.position.z,w:width+4,d:depth+4})
  }
  // Make bodies of water clickable for their historical labels.
  const lakeStory=campus.landmarks.find(l=>l.id==='lake'||l.id==='minghu')
  if(lakeStory)for(const o of objects)if(o.material===water)o.userData.landmark=lakeStory.id
  root.updateMatrixWorld(true)
  const batches=new Map<string,{mat:T.Material;id?:string;geos:T.BufferGeometry[]}>()
  for(const o of objects){
    const material=o.material as T.Material,id=o.userData.landmark??o.parent?.userData.landmark
    const key=material.uuid+':'+(id??'')
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.deleteAttribute('uv')
    if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position!.count},(_,i)=>i))
    const batch=batches.get(key)??{mat:material,id,geos:[] as T.BufferGeometry[]};batch.geos.push(geo);batches.set(key,batch);o.removeFromParent()
  }
  for(const batch of batches.values()){
    const geo=mergeGeometries(batch.geos);if(!geo)throw new Error('校区建筑合并失败')
    const mesh=new T.Mesh(geo,batch.mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.landmark=batch.id;root.add(mesh);occluders.push(mesh)
    batch.geos.forEach(g=>g.dispose())
  }
  new Set(objects.map(o=>o.geometry)).forEach(g=>g.dispose())
  let seed=campus.id.length*2026;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  const inWater=(x:number,z:number)=>lakePolygons.some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i]!,b=poly[j]!;if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside}return inside})
  const trees=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),treeMat,compact?650:1350),dummy=new T.Object3D()
  let count=0
  for(let tries=0;count<trees.count&&tries<25000;tries++){
    const x=(rand()-.5)*(campus.size[0]+70),z=(rand()-.5)*(campus.size[1]+70)
    if(blocked.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)||inWater(x,z)||roadPoints.some(pts=>pts.some((v,i)=>i%3===0&&(v.x-x)**2+(v.z-z)**2<35)))continue
    const scale=2+rand()*2.7;dummy.position.set(x,groundHeight(x,z)+scale*1.4,z);dummy.scale.set(scale,scale*1.35,scale);dummy.rotation.set(rand(),rand()*6,rand());dummy.updateMatrix();trees.setMatrixAt(count,dummy.matrix)
    trees.setColorAt(count,new T.Color().setHSL(.27+rand()*.08,.15+rand()*.15,.6+rand()*.2));count++
  }
  trees.count=count;trees.castShadow=!compact;trees.receiveShadow=true;root.add(trees)
  return {root,occluders,groundHeight,setLight(progress){windows.forEach((m,i)=>m.emissiveIntensity=Math.max(0,Math.min(1,progress*1.8-i/windows.length*.8))*1.2);lampMat.emissiveIntensity=progress*1.7},miniature(small){trees.visible=!small}}
}
