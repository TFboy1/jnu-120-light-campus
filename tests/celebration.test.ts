import test from 'node:test'
import assert from 'node:assert/strict'
import { showFrame, SHOW_DURATION } from '../src/show-timeline.ts'
import { mapPoint, planPoint } from '../src/campuses.ts'
import { satelliteToWorld } from '../src/campus.ts'

test('前30秒依次巡游五校，每个校区六秒，随后拉远至区域地图', () => {
  assert.equal(showFrame(-10).index, 0)
  for (let index = 0; index < 5; index++) {
    assert.equal(showFrame(index * 6).phase, 'tour')
    assert.equal(showFrame(index * 6).index, index)
    assert.equal(showFrame(index * 6 + 5.999).index, index)
  }
  assert.equal(showFrame(30).phase, 'map')
})

test('地图、星空、120、校徽、蛋糕、生日祝福、烟花按边界依次呈现', () => {
  const boundaries = [[30, 'map'], [37, 'sky'], [41, 'number'], [47, 'emblem'],
    [53, 'cake'], [60, 'birthday'], [66, 'fireworks'], [76, 'complete']] as const
  for (const [time, phase] of boundaries) {
    assert.equal(showFrame(time).phase, phase)
    assert.equal(showFrame(time).local, 0)
    assert.notEqual(showFrame(time - .001).phase, phase)
  }
  assert.equal(SHOW_DURATION, 76)
  assert.equal(showFrame(100).phase, 'complete')
  assert.deepEqual(showFrame(0), {phase: 'tour', index: 0, local: 0, progress: 0})
})

test('减少动态模式24秒保留全部章节，重播回到首校区', () => {
  for (let index = 0; index < 5; index++) assert.equal(showFrame(index * 2, true).index, index)
  const phases = ['map', 'sky', 'number', 'emblem', 'cake', 'birthday', 'fireworks', 'complete']
  phases.forEach((phase, i) => assert.equal(showFrame(10 + i * 2, true).phase, phase))
  assert.equal(showFrame(0, true).phase, 'tour')
})

test('卫星标定及区域投影保持东西南北与深圳体育馆位置', () => {
  assert.deepEqual(planPoint([805, 565], .44, 805, 565), [0, 0, 0])
  assert.ok(planPoint([805, 565], .44, 900, 400)[2] < 0)
  assert.ok(mapPoint(114, 23)[0] > mapPoint(113, 23)[0])
  assert.ok(mapPoint(113, 23)[2] < mapPoint(113, 22)[2])
  assert.deepEqual(satelliteToWorld(580, 795), [-31, -22])
  const [x, z] = satelliteToWorld(608, 984)
  assert.ok(Math.abs(x - 28.4) < .1 && Math.abs(z - 52.8) < .1)
})
