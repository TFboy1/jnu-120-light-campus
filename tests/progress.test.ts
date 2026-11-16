import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMPUS_IDS, restoreJourney, resetJourney, readLandmark, visitCampus, allVisited } from '../src/campuses.ts'

test('损坏存储、未知校区与过期地标安全恢复', () => {
  for (const raw of [null, '', '{', 'null', '42', '[]', '{}']) {
    assert.deepEqual(restoreJourney(raw), {visited: [], read: []})
  }
  assert.deepEqual(restoreJourney(JSON.stringify({
    visited: ['shipai', null, 'unknown', 'shipai', 'shenzhen', 2],
    read: ['shipai:minghu', 'shipai:minghu', 'panyu:unknown', {}, 'shenzhen:gate'],
  })), {visited: ['shipai', 'shenzhen'], read: ['shipai:minghu', 'shenzhen:gate']})
})

test('旧深圳点亮记录仅迁移深圳；新记录和重置结果优先', () => {
  assert.deepEqual(restoreJourney(null, '["gate","sports"]'), {visited: ['shenzhen'], read: []})
  assert.deepEqual(restoreJourney(null, '["unknown"]'), resetJourney())
  assert.deepEqual(restoreJourney(JSON.stringify(resetJourney()), '["gate"]'), resetJourney())
  assert.deepEqual(restoreJourney(null, '{'), resetJourney())
})

test('重复访问、重复阅读去重；同名地标分属不同校区；原记录不变', () => {
  const initial = visitCampus(resetJourney(), 'shipai')
  const again = visitCampus(initial, 'shipai')
  assert.deepEqual(again.visited, ['shipai'])
  const read = readLandmark(readLandmark(again, 'shenzhen', 'gate'), 'panyu', 'gate')
  assert.deepEqual(readLandmark(read, 'shenzhen', 'gate').read, ['shenzhen:gate', 'panyu:gate'])
  assert.deepEqual(readLandmark(read, 'panyu', 'not-a-landmark'), read)
  assert.deepEqual(initial, {visited: ['shipai'], read: []})
})

test('必须访问五个不同校区；刷新恢复完成状态；重置后不能演出', () => {
  assert.equal(allVisited({visited: Array(5).fill('shipai'), read: []}), false)
  const full = CAMPUS_IDS.reduce(visitCampus, resetJourney())
  for (const missing of CAMPUS_IDS) {
    assert.equal(allVisited({...full, visited: full.visited.filter(id => id !== missing)}), false)
  }
  assert.equal(allVisited(restoreJourney(JSON.stringify(full))), true)
  const reset = restoreJourney(JSON.stringify(resetJourney()))
  assert.equal(allVisited(reset), false)
  assert.deepEqual(reset.read, [])
})
