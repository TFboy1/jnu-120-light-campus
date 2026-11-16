// Shenzhen's detailed model uses the original photo-facing coordinate system.
export type LandmarkId = 'gate' | 'academic' | 'sports' | 'dorms' | 'courts'
export const BUILDINGS = {
  academic: { x: -31, z: -22 },
  sports: { x: 65, z: 66 },
  dorms: [
    { x: 18.2, z: -109.8, w: 43, d: 15, floors: 7, name: '学生宿舍1' },
    { x: 38.5, z: -84.6, w: 33, d: 17, floors: 7, name: '学生宿舍2' },
    { x: 82.6, z: -74.3, w: 42, d: 15, floors: 6, name: '学生宿舍3' },
    { x: 101.6, z: -48.3, w: 31, d: 17, floors: 6, name: '学生宿舍4' },
    { x: -44.3, z: -94, w: 43, d: 24, floors: 6, name: '学生宿舍5' },
  ],
}

// Hand-traced from references/satellite-campus.jpg (north-up Esri imagery).
// Relative footprint calibration, not survey or cadastral data.
export function satelliteToWorld(px: number, py: number): [number, number] {
  const x = px - 580, y = py - 795
  return [-31 + (x * Math.cos(Math.PI / 6) + y * .5) * .5,
    -22 + (-x * .5 + y * Math.cos(Math.PI / 6)) * .5]
}

export const STORAGE_KEY = 'jnu120.lights.v1'
