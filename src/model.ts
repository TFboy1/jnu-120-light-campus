import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { BUILDINGS, satelliteToWorld, type LandmarkId } from './campus'

// Coordinates follow the reference: south is +Z, the dormitories sit behind the main building.
export function terrainHeight(x: number, z: number): number {
  const edge = Math.max(0, Math.min(Math.hypot(x / 170, (z + 5) / 190), Math.hypot((x - 58.6) / 85, (z - 183.2) / 110)) - 1)
  return edge * (14 + 12 * Math.sin(x * .013 + z * .009) ** 2) +
    edge * 7 * Math.sin(z * .027) * Math.cos(x * .023)
}

function seededRandom(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}

export function createCampus(compact: boolean) {
  const root = new T.Group()
  const occluders: T.Mesh[] = []
  const lightMaterials = new Map<LandmarkId, T.MeshStandardMaterial>()
  const random = seededRandom(120)
  const material = (color: T.ColorRepresentation, roughness = .85) => new T.MeshStandardMaterial({ color, roughness })
  const white = material('#e5e9e9'), trim = material('#f4f6f7'), concrete = material('#a5acae')
  const glass = material('#253e48', .23), dark = material('#394347'), asphalt = material('#50565b')
  const paving = material('#cccfc9'), grass = material('#426e3e'), hedge = material('#244f36')
  const red = material('#a64e46'), lineMat = material('#eceeed'), steel = material('#c8d0d4', .4)
  const trunkMat = material('#686044')
  const lampMat = new T.MeshStandardMaterial({ color: '#fff0ca', emissive: '#ffcc79', emissiveIntensity: 0 })
  const boxes = new T.BoxGeometry(1, 1, 1)
  const cylinder = new T.CylinderGeometry(1, 1, 1, 12)
  const groups: T.Group[] = []
  const greenRects: number[][] = []
  const roads: T.Vector3[][] = []

  function mesh(g: T.BufferGeometry, m: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o
  }
  function box(p: T.Object3D, m: T.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
    const o = mesh(boxes, m, p, x, y, z); o.scale.set(w, h, d); return o
  }
  function cyl(p: T.Object3D, m: T.Material, x: number, y: number, z: number, r: number, h: number) {
    const o = mesh(cylinder, m, p, x, y, z); o.scale.set(r, h, r); return o
  }
  function group(id?: LandmarkId) {
    const p = new T.Group(); if (id) p.userData.landmark = id
    root.add(p); groups.push(p); return p
  }
  const landscape = group()

  // Ground is flat within the campus platform, then rises into forested hills.
  const terrain = new T.PlaneGeometry(1050, 1050, 130, 130)
  terrain.rotateX(-Math.PI / 2)
  const pos = terrain.attributes.position!
  const colors: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    pos.setY(i, terrainHeight(x, z) - .12)
    const c = new T.Color().setHSL(.27 + random() * .065, .27 + random() * .12, .18 + random() * .065)
    colors.push(c.r, c.g, c.b)
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); terrain.computeVertexNormals()
  const ground = mesh(terrain, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), root)
  ground.receiveShadow = true

  function ribbon(points: T.Vector3[], width: number, m: T.Material, lift: number, parent = landscape) {
    const vertices: number[] = [], indices: number[] = []
    points.forEach((p, i) => {
      const before = points[Math.max(0, i - 1)]!, after = points[Math.min(points.length - 1, i + 1)]!
      const dx = after.x - before.x, dz = after.z - before.z, len = Math.hypot(dx, dz) || 1
      for (const side of [-1, 1]) {
        const x = p.x - dz / len * width / 2 * side, z = p.z + dx / len * width / 2 * side
        vertices.push(x, terrainHeight(x, z) + lift, z)
      }
      if (i < points.length - 1) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    })
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals()
    mesh(g, m, parent)
  }
  function curve(coords: number[][], closed = false) {
    return new T.CatmullRomCurve3(coords.map(([x, z]) => new T.Vector3(x!, 0, z!)), closed, 'catmullrom', .22)
  }
  function road(coords: number[][], width: number, closed = false) {
    const c = curve(coords, closed), pts = c.getPoints(260); roads.push(pts)
    ribbon(pts, width + 4, paving, .11); ribbon(pts, width, asphalt, .15)
    // Continuous edge lines and individually spaced center dashes follow the actual road curve.
    for (const side of [-1, 1]) {
      const shifted = pts.map((p, i) => {
        const tangent = c.getTangent(i / 260)
        return new T.Vector3(p.x - tangent.z * (width / 2 - .45) * side, 0, p.z + tangent.x * (width / 2 - .45) * side)
      })
      ribbon(shifted, .16, lineMat, .18)
    }
    const count = Math.ceil(c.getLength() / 7)
    for (let i = 0; i < count; i++) {
      const t = i / count, p = c.getPointAt(t), tangent = c.getTangentAt(t)
      const dash = box(landscape, lineMat, p.x, terrainHeight(p.x, p.z) + .2, p.z, .18, .025, 2.8)
      dash.rotation.y = Math.atan2(tangent.x, tangent.z)
    }
    return c
  }
  const traced = (points: number[][]) => points.map(([x,y]) => satelliteToWorld(x!,y!))
  // Only visible approach corridors are traced. The foliage-covered northern connections
  // remain an approximation, deliberately narrower than the old illustrative road loop.
  const ring = road(traced([[455,876],[426,820],[441,735],[489,681],[560,604],[650,597],[744,640],[809,717],[888,836],[891,934],[781,1005],[687,1064],[592,1086],[454,1010],[427,944]]), 5.5, true)
  road(traced([[140,575],[227,720],[338,896],[425,1030],[455,1120],[400,1295],[310,1420]]),7)
  road(traced([[338,896],[427,944]]),5)
  road(traced([[227,720],[325,674],[441,735]]),5)
  road(traced([[687,1064],[748,1110],[730,1260],[840,1380]]),5)
  // Walkways around the central axis and between dormitories.
  for (const [x, z, w, d] of [[-32, 28, 58, 22], [8, -82, 4, 40], [-66, -99, 4, 33], [62, -78, 4, 34]]) {
    box(landscape, paving, x!, .12, z!, w!, .12, d!)
  }

  // Each building family has a shared emissive window material for its own light state.
  function windowMaterial(id: LandmarkId) {
    const m = new T.MeshStandardMaterial({ color: '#334b59', roughness: .27, metalness: .18, emissive: '#ffcf7c', emissiveIntensity: 0 })
    lightMaterials.set(id, m); return m
  }
  function building(p: T.Group, win: T.Material, x: number, z: number, w: number, d: number, floors: number, base = 0, balconies = false) {
    const h = floors * 3.5
    box(p, white, x, base + h / 2 + .45, z, w, h, d)
    box(p, concrete, x, base + .6, z, w + .5, 1, d + .5)
    box(p, trim, x, base + h + .55, z, w + 1, .55, d + 1)
    box(p, concrete, x, base + h + .88, z, w - 1.3, .15, d - 1.3)
    greenRects.push([x, z, w + 4, d + 4])
    const cols = Math.floor((w - 3) / 3.6)
    for (let floor = 0; floor < floors; floor++) {
      const y = base + 2.1 + floor * 3.5
      for (const front of [-1, 1]) {
        for (let col = 0; col < cols; col++) {
          const xx = x + (col - (cols - 1) / 2) * 3.6
          box(p, win, xx, y, z + front * (d / 2 + .035), 2.45, 2.05, .1)
          box(p, trim, xx, y, z + front * (d / 2 + .1), .10, 2.1, .13)
          if (balconies) {
            box(p, trim, xx, y - 1, z + front * (d / 2 + .75), 3.2, .2, 1.55)
            box(p, concrete, xx, y - .4, z + front * (d / 2 + 1.43), 3.1, .65, .14)
          }
        }
        box(p, trim, x, y + 1.25, z + front * (d / 2 + .15), w, .27, .35)
      }
      for (const side of [-1, 1]) for (let k = -1; k <= 1; k++) {
        box(p, win, x + side * (w / 2 + .05), y, z + k * d / 4, .1, 1.95, 2.15)
      }
    }
    box(p, trim, x + w * .2, base + h + 2.4, z - d * .14, 7, 3.2, 6)
    box(p, dark, x + w * .2, base + h + 4.1, z - d * .14, 7.1, .3, 6.1)
    for (let k = 0; k < 3; k++) box(p, concrete, x - w * .25 + k * 3, base + h + 1.6, z + d * .12, 2, 1.6, 3)
    cyl(p, steel, x - w * .35, base + h + 2.5, z - d * .18, 1.5, 3)
    box(p, glass, x, base + 1.8, z + d / 2 + .2, 5, 3, .3)
    box(p, trim, x, base + 3.5, z + d / 2 + 1.9, 7, .25, 4)
  }

  const academic = group('academic'), aw = windowMaterial('academic')
  const { x: ax, z: az } = BUILDINGS.academic
  building(academic, aw, ax, az, 94, 34, 6)
  building(academic, aw, ax + 51, az + 3, 29, 29, 5)
  building(academic, aw, ax - 14, az - 9, 56, 21, 2, 21.7)
  building(academic, aw, ax - 31, az - 12, 15, 15, 2, 28.9)
  // Rounded western glass wing: half-cylinder facade with floor bands and vertical mullions.
  const wing = new T.CylinderGeometry(20, 20, 22, 36, 1, false, Math.PI, Math.PI)
  mesh(wing, aw, academic, ax - 45, 11.5, az + 2)
  for (let f = 0; f <= 6; f++) {
    const band = new T.CylinderGeometry(20.35, 20.35, .45, 36, 1, false, Math.PI, Math.PI)
    mesh(band, trim, academic, ax - 45, .5 + f * 3.6, az + 2)
  }
  for (let k = 0; k <= 18; k++) {
    const theta = Math.PI + k / 18 * Math.PI
    box(academic, trim, ax - 45 + Math.sin(theta) * 20.15, 11.5, az + 2 + Math.cos(theta) * 20.15, .23, 22, .23)
  }
  // Entrance portico and recessed steps.
  for (let i = 0; i < 6; i++) box(academic, paving, ax + 1, .15 + i * .13, az + 24 - i * 1.2, 29, .3, 2)
  for (const x of [-13, 13]) box(academic, white, ax + x, 3.1, az + 20, .8, 5.8, .8)
  box(academic, trim, ax, 6, az + 20, 28, .6, 5)
  // Distinctive semicircular roof pediments visible in the university's facade photo.
  for (const [x,y,z,r] of [[ax-30,35.7,az-1,5.8],[ax-46,22.6,az+17,4.6],[ax+58,18.2,az+17.6,3.5]]) {
    const shape=new T.Shape();shape.moveTo(-r!,0);shape.absarc(0,0,r!,Math.PI,0,true);shape.lineTo(-r!,0)
    mesh(new T.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:false,curveSegments:20}),trim,academic,x!,y!,z!)
    const inset=new T.Shape();inset.moveTo(-r!*.72,0);inset.absarc(0,0,r!*.72,Math.PI,0,true);inset.lineTo(-r!*.72,0)
    mesh(new T.ShapeGeometry(inset,20),aw,academic,x!,y!+.1,z!+1.82)
    box(academic,trim,x!,y!+r!*.32,z!+1.85,.15,r!*.65,.12)
  }

  const dorms = group('dorms'), dw = windowMaterial('dorms')
  for (const d of BUILDINGS.dorms) {
    building(dorms, dw, d.x, d.z, d.w, d.d, d.floors, 0, true)
    box(dorms, trim, d.x - d.w * .15, d.floors * 1.75 + 1, d.z + d.d / 2 + .5, 4.5, d.floors * 3.5 + 2, 2)
  }
  // Rear section of dormitory 5 visible in the source.
  building(dorms, dw, -42, -115, 25, 13, 7)

  function sign(p: T.Group, text: string, x: number, y: number, z: number, w: number, h: number, bg: string, fg: string) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 192)
    ctx.fillStyle = fg; ctx.font = '600 80px "STSong", "SimSun", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 100)
    const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace
    const mat = new T.MeshStandardMaterial({ map: tex, roughness: .8 })
    mesh(new T.PlaneGeometry(w, h), mat, p, x, y, z)
  }
  sign(academic, '暨 南 大 学', ax, 7.3, az + 17.1, 21, 2.3, '#dfdcd1', '#963e2f')

  const sports = group('sports'), sw = windowMaterial('sports')
  const { x: sx, z: sz } = BUILDINGS.sports
  box(sports, concrete, sx, 1.6, sz, 70, 3, 47)
  box(sports, sw, sx, 11, sz, 63, 17, 40)
  for (const side of [-1, 1]) {
    for (let i = -3; i <= 3; i++) box(sports, white, sx + i * 10, 11, sz + side * 23, 1.6, 19, 1.6)
    for (let i = -2; i <= 2; i++) box(sports, white, sx + side * 33.5, 11, sz + i * 10, 1.6, 19, 1.6)
    for (let i = -14; i <= 14; i++) box(sports, steel, sx + i * 2.1, 11, sz + side * 20.1, .15, 16, .15)
  }
  // Chamfered roof outline, with shallow pitched ridge and standing seams.
  const outline = [[-39,-20],[-31,-29],[30,-29],[39,-20],[39,20],[30,28],[-30,28],[-39,20]]
  const roofPositions: number[] = [], roofIndices: number[] = []
  for (const [x,z] of outline) roofPositions.push(sx + x!, 22, sz + z!)
  roofPositions.push(sx, 27, sz)
  for (let i = 0; i < 8; i++) roofIndices.push(i, 8, (i + 1) % 8)
  const roofGeo = new T.BufferGeometry(); roofGeo.setAttribute('position', new T.Float32BufferAttribute(roofPositions, 3)); roofGeo.setIndex(roofIndices); roofGeo.computeVertexNormals()
  const roofMat = material('#eef1f5', .52); roofMat.side = T.DoubleSide
  mesh(roofGeo, roofMat, sports)
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!, b = outline[(i + 1) % outline.length]!
    const dx = b[0]! - a[0]!, dz = b[1]! - a[1]!
    const fascia = box(sports, trim, sx + (a[0]! + b[0]!) / 2, 21.1, sz + (a[1]! + b[1]!) / 2, Math.hypot(dx, dz), 1.8, .45)
    fascia.rotation.y = -Math.atan2(dz, dx)
  }
  for (let x = -28; x <= 28; x += 1.4) {
    for (const side of [-1, 1]) {
      const a = new T.Vector3(sx + x, 22.12, sz + side * 28), b = new T.Vector3(sx + x * .12, 27.07, sz)
      const seam = mesh(new T.CylinderGeometry(.045, .045, a.distanceTo(b), 4), steel, sports)
      seam.position.copy(a).add(b).multiplyScalar(.5); seam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), b.sub(a).normalize())
    }
  }
  sign(sports, '英 东 体 育 中 心', sx + 4, 20.9, sz + 28.3, 39, 3.7, '#a74c39', '#fff2de')
  for (let i = 0; i < 9; i++) box(sports, paving, sx, .25 + i * .23, sz + 37 - i * 1.1, 42, .4, 2)
  // Satellite roof: near-square, rotated 30 degrees relative to the academic facade.
  function relocate(g: T.Group, oldX: number, oldZ: number, x: number, z: number, scaleX = 1, scaleZ = 1, angle = 0) {
    const center = new T.Vector3(oldX, 0, oldZ)
    g.scale.set(scaleX, 1, scaleZ); g.rotation.y = angle
    center.multiply(g.scale).applyAxisAngle(new T.Vector3(0, 1, 0), angle)
    g.position.set(x - center.x, 0, z - center.z)
  }
  relocate(sports, sx, sz, 28.4, 52.8, .64, .91, Math.PI / 6)
  greenRects.push([28.4,52.8,70,76])

  // Central plaza: concentric paving, planted islands, radial paths and low hedges.
  const plaza = group()
  box(plaza, paving, -33, .13, 53, 57, .2, 37)
  cyl(plaza, paving, -33, .2, 62, 28, .25)
  for (const r of [9, 13, 18, 22, 26]) {
    const ringGeo = new T.RingGeometry(r, r + .18, 64); ringGeo.rotateX(-Math.PI / 2)
    mesh(ringGeo, concrete, plaza, -33, .35, 62)
  }
  cyl(plaza, concrete, -33, .6, 62, 6, .9); cyl(plaza, grass, -33, 1.1, 62, 5.6, .2)
  cyl(plaza, concrete, -33, .6, 43, 4.2, .8); cyl(plaza, hedge, -33, 1.2, 43, 3.8, .6)
  for (let x = -57; x < 0; x += 4) box(plaza, concrete, x, .32, 46, .12, .05, 25)
  relocate(plaza, -33, 53, -40, 28, .9, .62)
  greenRects.push([-40,28,60,40])
  for (const x of [-58, -8]) for (const z of [39,49,59,69]) box(plaza, hedge, x, .7, z, 2, 1.3, 3)

  const courts = group('courts'); windowMaterial('courts')
  const courtGreen = material('#347e69'), courtRed = material('#ba6055')
  box(courts, paving, -14, .2, 93, 24, .25, 34)
  function court(cx: number, cz: number) {
    box(courts, courtRed, cx, .38, cz, 22, .12, 30)
    box(courts, courtGreen, cx, .46, cz, 15, .05, 26)
    const line = (x: number, z: number, w: number, d: number) => box(courts, lineMat, x, .51, z, w, .025, d)
    for (const side of [-1, 1]) { line(cx + side * 7.5, cz, .12, 26); line(cx, cz + side * 13, 15, .12) }
    line(cx, cz, 15, .12)
    const ringGeo = new T.RingGeometry(1.75, 1.87, 32); ringGeo.rotateX(-Math.PI / 2); mesh(ringGeo, lineMat, courts, cx, .53, cz)
    for (const side of [-1,1]) {
      line(cx - 2.5, cz + side * 10.1, .12, 5.8); line(cx + 2.5, cz + side * 10.1, .12, 5.8); line(cx, cz + side * 7.2, 5, .12)
      const arc = new T.RingGeometry(5.8, 5.93, 32, 1, side === 1 ? 0 : Math.PI, Math.PI); arc.rotateX(-Math.PI / 2)
      mesh(arc, lineMat, courts, cx, .53, cz + side * 11.7)
      box(courts, dark, cx, 1.8, cz + side * 14, .18, 3.3, .18)
      box(courts, steel, cx, 3.5, cz + side * 12.8, 1.8, 1.1, .14)
      const hoop = new T.TorusGeometry(.36, .045, 5, 16); hoop.rotateX(Math.PI / 2); mesh(hoop, red, courts, cx, 3.15, cz + side * 12.3)
    }
  }
  court(-14, 93)
  for (const z of [75,111]) {
    for (let x = -26; x <= -2; x += 4) box(courts, dark, x, 2.1, z, .12, 4, .12)
    for (const h of [1.1, 2.1, 3.1, 4.1]) box(courts, steel, -14, h, z, 24, .045, .045)
  }
  relocate(courts,-14,93,-29.4,63.7,1,1,Math.PI/6)
  greenRects.push([-29.4,63.7,39,43])

  const gate = group('gate'); const gw = windowMaterial('gate')
  box(gate, paving, 3, .2, 140, 62, .3, 21)
  box(gate, white, 3, 4.6, 132, 44, 8.8, 2.8)
  for (const x of [-24,30]) { box(gate, concrete, x, 5.1, 133, 4, 10, 6); box(gate, trim, x, 10.2, 133, 4.7, .4, 6.5) }
  box(gate, gw, 3, .9, 134, 43, .5, .5)
  sign(gate, '暨  南  大  学', 3, 5.4, 133.45, 33, 5.2, '#d9d5c6', '#8a6b2d')
  box(gate, hedge, 3, 1.2, 135.5, 41, 1.5, 2)
  relocate(gate,3,137,47.7,95.4,.72,1)
  greenRects.push([47.7,95.4,50,27])
  function smallGate(x: number,z: number,angle: number) {
    const g = new T.Group(); landscape.add(g); g.position.set(x,terrainHeight(x,z),z); g.rotation.y = angle
    for (const xx of [-7,7]) box(g, white, xx, 3.6, 0, 2, 7, 5)
    box(g, trim, 0, 7.4, 0, 17, 1, 6)
    box(g, glass, 7, 2.5, 0, 2.1, 2, 3.5)
  }
  const northGate=satelliteToWorld(441,735), westGate=satelliteToWorld(427,944)
  smallGate(...northGate,-.4); smallGate(...westGate,-.6)
  // Crosswalks at campus entries.
  for (const [x,z,a] of [[...northGate,-.3],[...westGate,.3],[47,105,0]]) {
    for (let i = -4; i <= 4; i++) { const s = box(landscape, lineMat, x! + i * 1.2, terrainHeight(x! + i*1.2,z!) + .23, z!, .55, .03, 7); s.rotation.y = a! }
  }
  // Boundary wall and street lights follow the outer campus loop.
  for (let i = 0; i < 220; i++) {
    const t = i / 220, p = ring.getPointAt(t), tan = ring.getTangentAt(t)
    const x = p.x - tan.z * 9.5, z = p.z + tan.x * 9.5
    if (z > 125 && Math.abs(x) < 40) continue
    const wall = box(landscape, concrete, x, terrainHeight(x,z) + .65, z, .4, 1.25, 3.7); wall.rotation.y = Math.atan2(tan.x,tan.z)
  }
  for (let i = 0; i < 54; i++) {
    const t = i / 54, p = ring.getPointAt(t), tan = ring.getTangentAt(t)
    const x = p.x + tan.z * 6.1, z = p.z - tan.x * 6.1, y = terrainHeight(x,z)
    cyl(landscape, dark, x, y+3, z, .12, 6)
    box(landscape, dark, x, y+6, z, 2.1, .16, .25)
    box(landscape, lampMat, x+.7, y+5.85, z, .8, .2, .5)
    const pool = new T.CircleGeometry(3, 16); pool.rotateX(-Math.PI / 2)
    // A shared translucent emissive pool avoids dozens of real-time point lights.
    mesh(pool, new T.MeshBasicMaterial({ color: '#ffd68a', transparent: true, opacity: 0, depthWrite: false }), landscape, x, y + .24, z).userData.lampPool = true
  }

  // Satellite: athletics track south of the gym, with straight sides and rounded ends.
  const trackGroup = group()
  function stadiumShape(radius:number) {
    const shape=new T.Shape()
    shape.moveTo(-radius,-32);shape.lineTo(-radius,32)
    shape.absarc(0,32,radius,Math.PI,0,true);shape.lineTo(radius,-32)
    shape.absarc(0,-32,radius,0,-Math.PI,true);shape.closePath()
    return shape
  }
  const track = mesh(new T.ShapeGeometry(stadiumShape(40),48),red,trackGroup,0,.3,0)
  track.rotation.x=-Math.PI/2
  for (let i=0;i<7;i++) {
    const outer=stadiumShape(40-i*1.5)
    outer.holes.push(stadiumShape(39.88-i*1.5))
    const geo=new T.ShapeGeometry(outer,48);geo.rotateX(-Math.PI/2)
    mesh(geo,lineMat,trackGroup,0,.34,0)
  }
  const field=mesh(new T.ShapeGeometry(stadiumShape(29),48),material('#a59b7e'),trackGroup,0,.4,0);field.rotation.x=-Math.PI/2
  trackGroup.position.set(58.6,terrainHeight(58.6,183.2),183.2); trackGroup.rotation.y=Math.PI/6
  greenRects.push([58.6,183.2,115,154])

  // Context buildings outside the campus, kept subdued and less detailed.
  for (const [x,z,w,d,h] of [[-224,4,27,20,27],[-241,66,35,25,23],[-211,131,30,28,18],[-159,220,29,24,35],[-99,249,32,21,24]]) {
    const y=terrainHeight(x!,z!); box(landscape,white,x!,y+h!/2,z!,w!,h!,d!)
    box(landscape,trim,x!,y+h!+.3,z!,w!+1,.5,d!+1)
    for(let yy=3;yy<h!;yy+=3.5) for(let xx=-w!/2+3;xx<w!/2-2;xx+=4) box(landscape,glass,x!+xx,y+yy,z!+d!/2+.05,2,1.8,.1)
    greenRects.push([x!,z!,w!+5,d!+5])
  }

  // Tree placement excludes footprints, courts, paths, lake and the sampled road surfaces.
  const treeData: { x:number; y:number; z:number; size:number }[] = []
  const nearRoad = (x:number,z:number) => roads.some(pts => pts.some((p,i) => i % 2 === 0 && (p.x-x)**2+(p.z-z)**2 < 105))
  const wanted = compact ? 2000 : 4700
  for(let tries=0;treeData.length<wanted && tries<wanted*12;tries++) {
    const x=(random()-.5)*820,z=(random()-.5)*800
    if(greenRects.some(([cx,cz,w,d])=>Math.abs(x-cx!)<w!/2+2 && Math.abs(z-cz!)<d!/2+2)) continue
    if (nearRoad(x,z)) continue
    if (Math.abs(x-5)<5 && z < -55 && z > -150) continue
    treeData.push({x,z,y:terrainHeight(x,z),size:2.5+random()*3.5})
  }
  for(const x of [-65,-15]) for(const z of [19,28,37]) treeData.push({x,y:0,z,size:2.1})
  const leafGeo = new T.IcosahedronGeometry(1,1)
  const leafMat = new T.MeshStandardMaterial({color:'#ffffff',roughness:1})
  const leaves = new T.InstancedMesh(leafGeo,leafMat,treeData.length*3)
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(.15,.23,1,5),trunkMat,treeData.length)
  const dummy=new T.Object3D(), color=new T.Color()
  treeData.forEach((t,i)=>{
    dummy.position.set(t.x,t.y+t.size*.65,t.z); dummy.scale.set(t.size*.44,t.size*1.3,t.size*.44); dummy.rotation.set(0,0,0); dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix)
    for(let k=0;k<3;k++) {
      dummy.position.set(t.x+(k-1)*t.size*.38,t.y+t.size*(1.45+(k===1?.5:0)),t.z+(random()-.5)*t.size*.5)
      dummy.scale.set(t.size*.75,t.size*(.85+random()*.4),t.size*.78); dummy.rotation.set(random(),random()*6,random()); dummy.updateMatrix()
      leaves.setMatrixAt(i*3+k,dummy.matrix); color.setHSL(.28+random()*.095,.33+random()*.18,.12+random()*.105); leaves.setColorAt(i*3+k,color)
    }
  })
  leaves.castShadow=!compact; leaves.receiveShadow=true; root.add(leaves,trunks)

  // Merge static geometry by material, retaining one pickable group per landmark.
  // Transparent streetlight pools stay separate so opacity can be animated together.
  const pools: T.MeshBasicMaterial[] = []
  for (const g of groups) {
    g.updateMatrixWorld(true)
    const batches = new Map<T.Material,T.BufferGeometry[]>()
    const originals: T.Mesh[] = []
    g.traverse(o=>{
      if (!(o instanceof T.Mesh)) return
      if(o.userData.lampPool) { pools.push(o.material as T.MeshBasicMaterial); return }
      const geo=o.geometry.clone(); geo.applyMatrix4(o.matrixWorld)
      // Extruded pediments are non-indexed, unlike boxes and curved facades.
      // Normalize here so every caller can safely share a material batch.
      if(!geo.index) geo.setIndex(Array.from({length:geo.attributes.position!.count},(_,index)=>index))
      // All primitives expose position/normal/uv; custom roofs and ribbons do not need UVs.
      geo.deleteAttribute('uv'); geo.deleteAttribute('uv1')
      const mat=o.material as T.Material
      // Textured signs require their original UV coordinates.
      if ((mat as T.MeshStandardMaterial).map && o.geometry.attributes.uv) geo.setAttribute('uv',o.geometry.attributes.uv.clone())
      const geometries=batches.get(mat) ?? []; geometries.push(geo); batches.set(mat,geometries); originals.push(o)
    })
    for(const o of originals) o.removeFromParent()
    // Coordinates above have already been baked into world space. Do not apply
    // the satellite calibration a second time when attaching the merged meshes.
    g.position.set(0,0,0); g.quaternion.identity(); g.scale.set(1,1,1); g.updateMatrixWorld(true)
    for(const [mat,geometries] of batches) {
      const merged=mergeGeometries(geometries,false)
      if(!merged) throw new Error('校园几何体合并失败')
      const o=mesh(merged,mat,g); o.castShadow=true; o.receiveShadow=true
      if(g.userData.landmark) {o.userData.landmark=g.userData.landmark; occluders.push(o)}
      geometries.forEach(geo=>geo.dispose())
    }
    // Original geometries have been copied into the merged buffers.
    new Set(originals.map(o=>o.geometry)).forEach(geo=>geo.dispose())
  }

  return { root, occluders, lightMaterials, lampMat, pools }
}
