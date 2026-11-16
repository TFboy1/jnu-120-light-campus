import * as T from 'three'
import geography from './assets/guangdong.geo.json'
import { CAMPUSES, mapPoint, type CampusId } from './campuses'

export function createRegionalMap() {
  const root=new T.Group(),materials:T.Material[]=[],pins=new Map<CampusId,T.Group>()
  const add=(o:T.Object3D)=>{root.add(o);return o}
  const sea=new T.Mesh(new T.PlaneGeometry(3500,3500),new T.MeshBasicMaterial({color:'#071b30',transparent:true}));sea.rotation.x=-Math.PI/2;sea.position.y=-3;add(sea)
  const allowed=new Set([440100,440300,440400,440600,440700,441300,441900,442000])
  const data=geography as unknown as {features:{properties:{adcode:number};geometry:{type:string;coordinates:number[][][][]}}[]}
  for(const feature of data.features){
    if(!allowed.has(feature.properties.adcode))continue
    for(const polygon of feature.geometry.coordinates){
      const shape=new T.Shape()
      polygon.forEach((ring,index)=>{
        const path=index?new T.Path():shape
        ring.forEach(([lon,lat],i)=>{const [x,,z]=mapPoint(lon!,lat!);if(i===0)path.moveTo(x,-z);else path.lineTo(x,-z)})
        if(index)shape.holes.push(path)
      })
      const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2)
      const material=new T.MeshBasicMaterial({color:feature.properties.adcode===440100?'#183e53':'#103247',transparent:true,side:T.DoubleSide})
      add(new T.Mesh(geometry,material))
      const ring=polygon[0]!
      const points=ring.map(([lon,lat])=>{const [x,,z]=mapPoint(lon!,lat!);return new T.Vector3(x,.25,z)})
      const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#36819a',transparent:true,opacity:.65}));add(line)
    }
  }
  const labelOffsets:Record<CampusId,[number,number]>={shipai:[43,-13],guangyuan:[-80,-40],panyu:[38,24],zhuhai:[0,26],shenzhen:[0,26]}
  for(const campus of CAMPUSES){
    const position=new T.Vector3(...mapPoint(...campus.coordinates)),group=new T.Group();group.position.copy(position);group.userData.campus=campus.id;root.add(group);pins.set(campus.id,group)
    const core=new T.Mesh(new T.SphereGeometry(3.5,16,12),new T.MeshBasicMaterial({color:new T.Color('#ffdc8c').multiplyScalar(1.35),transparent:true}));core.position.y=5;group.add(core)
    for(const r of [7,11]){const ring=new T.Mesh(new T.RingGeometry(r-.35,r,48),new T.MeshBasicMaterial({color:'#62dcec',transparent:true,opacity:.7,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.8;group.add(ring)}
    const [dx,dz]=labelOffsets[campus.id],leader=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,2,0),new T.Vector3(dx,2,dz)]),new T.LineBasicMaterial({color:'#72cddd',transparent:true,opacity:.5}));group.add(leader)
    group.userData.label=new T.Vector3(position.x+dx,6,position.z+dz)
  }
  for(let i=0;i<CAMPUSES.length-1;i++){
    const a=new T.Vector3(...mapPoint(...CAMPUSES[i]!.coordinates)),b=new T.Vector3(...mapPoint(...CAMPUSES[i+1]!.coordinates))
    const middle=a.clone().add(b).multiplyScalar(.5);middle.y=Math.min(100,a.distanceTo(b)*.2)
    const arc=new T.QuadraticBezierCurve3(a,middle,b)
    add(new T.Line(new T.BufferGeometry().setFromPoints(arc.getPoints(64)),new T.LineBasicMaterial({color:'#d7b87c',transparent:true,opacity:.45})))
  }
  root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){const m=o.material as T.Material;materials.push(m);m.userData.baseOpacity=m.opacity}})
  function opacity(value:number){root.visible=value>.001;materials.forEach(m=>m.opacity=(m.userData.baseOpacity??1)*value)}
  function visited(ids:readonly CampusId[]){pins.forEach((pin,id)=>{const mat=(pin.children[0] as T.Mesh).material as T.MeshBasicMaterial;mat.color.set(ids.includes(id)?'#ffe1a0':'#4c9db4').multiplyScalar(ids.includes(id)?1.35:1)})}
  return {root,pins,opacity,visited}
}
