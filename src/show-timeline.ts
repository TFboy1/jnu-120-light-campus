import { CAMPUS_IDS } from './campuses.ts'
export type ShowPhase='tour'|'map'|'sky'|'number'|'emblem'|'cake'|'birthday'|'fireworks'|'complete'
export const SHOW_SEGMENTS=[['map',7],['sky',4],['number',6],['emblem',6],['cake',7],['birthday',6],['fireworks',10]] as const
export const TOUR_SECONDS=6
export const SHOW_DURATION=CAMPUS_IDS.length*TOUR_SECONDS+SHOW_SEGMENTS.reduce((n,s)=>n+s[1],0)
export function showFrame(seconds:number,reduced=false) {
  // Reduced motion retains every stage, with static compositions and shorter holds.
  const tourDuration=reduced?2:TOUR_SECONDS
  let elapsed=Math.max(0,seconds)
  if(elapsed<CAMPUS_IDS.length*tourDuration){const index=Math.floor(elapsed/tourDuration);return {phase:'tour' as ShowPhase,index,local:elapsed-index*tourDuration,progress:(elapsed%tourDuration)/tourDuration}}
  elapsed-=CAMPUS_IDS.length*tourDuration
  for(const [phase,duration] of SHOW_SEGMENTS){const hold=reduced?2:duration;if(elapsed<hold)return {phase:phase as ShowPhase,index:0,local:elapsed,progress:elapsed/hold};elapsed-=hold}
  return {phase:'complete' as ShowPhase,index:0,local:elapsed,progress:1}
}
