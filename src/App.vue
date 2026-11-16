<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { CAMPUSES, JOURNEY_KEY, allVisited, restoreJourney, resetJourney, readLandmark, visitCampus, type CampusId } from './campuses'
import { STORAGE_KEY } from './campus'
import type { ShowPhase } from './show-timeline'
import type { CampusScene } from './scene'
const canvasHost=ref<HTMLElement>(),aboutDialog=ref<HTMLDialogElement>()
const ready=ref(false),error=ref(''),loading=ref('正在展开三地五校区'),storageNotice=ref('')
const progress=ref(restoreJourney(null)),current=ref<CampusId|null>(null),selected=ref<string|null>(null)
const night=ref(true),performing=ref(false),finished=ref(false),paused=ref(false),countdown=ref(false),phase=ref<ShowPhase>('tour'),tourCampus=ref<CampusId|null>(null)
const emblemUrl=`${import.meta.env.BASE_URL}jnu-emblem.png`
const recording=new URLSearchParams(location.search).get('record')==='1'
let scene:CampusScene|undefined,unmounted=false,autoStart:ReturnType<typeof setTimeout>|undefined
const campus=computed(()=>CAMPUSES.find(c=>c.id===current.value)),active=computed(()=>campus.value?.landmarks.find(l=>l.id===selected.value)),complete=computed(()=>allVisited(progress.value))
const phaseText:Record<ShowPhase,string>={tour:'灯火，正从校园升起',map:'三地五校，同一片星光',sky:'把目光，交给星空',number:'一百二十载，星光不息',emblem:'同一枚校徽，同一份归属',cake:'这一份生日礼物，献给暨南',birthday:'暨南大学，生日快乐',fireworks:'让这份祝福，照亮四海',complete:'百廿暨南，声教四海'}
const touringCampus=computed(()=>CAMPUSES.find(c=>c.id===tourCampus.value))
const caption=computed(()=>phase.value==='tour'?touringCampus.value?.celebrationSlogan??phaseText.tour:phaseText[phase.value])
function save(){try{localStorage.setItem(JOURNEY_KEY,JSON.stringify(progress.value))}catch{storageNotice.value='浏览器未允许保存进度，本次探索仍可继续。'}}
function cancelCountdown(){if(autoStart)clearTimeout(autoStart);autoStart=undefined;countdown.value=false}
function enter(id:CampusId){if(!ready.value||performing.value||error.value)return;cancelCountdown();const wasComplete=complete.value;if(!scene?.enterCampus(id))return;current.value=id;selected.value=null;night.value=false;finished.value=false;progress.value=visitCampus(progress.value,id);save();scene.setVisited(progress.value.visited);if(!wasComplete&&complete.value){countdown.value=true;autoStart=setTimeout(()=>{countdown.value=false;celebrate()},2600)}}
function select(id:string){if(!ready.value||performing.value||!campus.value||!campus.value.landmarks.some(l=>l.id===id))return;cancelCountdown();selected.value=id;progress.value=readLandmark(progress.value,campus.value.id,id);save();scene?.focus(id)}
function overview(){cancelCountdown();scene?.showMap();performing.value=false;finished.value=false;paused.value=false;current.value=null;selected.value=null;night.value=true}
function celebrate(){if(!complete.value||!ready.value||error.value)return;cancelCountdown();if(!scene?.celebrate())return;phase.value='tour';tourCampus.value=CAMPUSES[0]!.id;performing.value=true;finished.value=false;paused.value=false;selected.value=null;night.value=true;aboutDialog.value?.close()}
function togglePause(){paused.value=!paused.value;scene?.pause(paused.value)}
function toggleNight(){night.value=!night.value;scene?.setNight(night.value)}
function reset(){overview();progress.value=resetJourney();save();scene?.setVisited([])}
function escape(e:KeyboardEvent){if(e.key==='Escape'){cancelCountdown();if(performing.value)overview();else selected.value=null}}
function reload(){location.reload()}
onMounted(async()=>{try{progress.value=restoreJourney(localStorage.getItem(JOURNEY_KEY),localStorage.getItem(STORAGE_KEY))}catch{storageNotice.value='浏览器未允许保存进度，本次探索仍可继续。'}window.addEventListener('keydown',escape);await nextTick();try{const {createScene}=await import('./scene');if(unmounted||!canvasHost.value)return;scene=await createScene(canvasHost.value,{onSelect:select,onRequestCampus:enter,onLoading:m=>loading.value=m,onPhase:(p,id)=>{phase.value=p;tourCampus.value=id},onFinale:()=>{finished.value=true;paused.value=false},onError:m=>error.value=m,onRecover:()=>error.value=''});if(unmounted){scene.dispose();return}scene.setVisited(progress.value.visited);ready.value=true}catch(cause){console.error('校园初始化失败',cause);error.value='暂时无法呈现校园。请开启浏览器硬件加速，并确认本地资源加载正常后重试。'}})
onBeforeUnmount(()=>{unmounted=true;cancelCountdown();scene?.dispose();window.removeEventListener('keydown',escape)})
</script>
<template>
  <main class="experience" :class="{'is-night':night,'is-performing':performing,'is-overview':!current&&!performing,'is-recording':recording}">
    <div ref="canvasHost" class="campus-canvas"></div><div class="edge-shade" aria-hidden="true"></div>
    <header class="masthead">
      <a class="identity" href="#" aria-label="返回五校区地图" @click.prevent="overview"><span class="emblem-crop"><img :src="emblemUrl" alt="暨南大学校徽"></span><span class="identity-wordmark">暨南大学<span>JINAN UNIVERSITY</span></span><span class="identity-divider"></span><span class="edition">120 周年<br><span>三地五校 · 共此星光</span></span></a>
      <nav class="top-actions" aria-label="场景选项"><button v-if="current&&!performing" :disabled="!ready||!!error" @click="overview">五校地图 ↗</button><button v-if="current&&!performing" class="day-switch" :aria-pressed="night" :disabled="!ready||!!error" @click="toggleNight"><span class="day-dot" :class="{moon:night}"></span>{{night?'夜色校园':'日光校园'}}</button><button v-if="!performing" class="about-button" @click="aboutDialog?.showModal()">关于作品 ↗</button></nav>
    </header>
    <section v-if="!current&&!performing" class="intro" aria-labelledby="intro-heading"><p class="eyebrow"><span></span>从校园出发，向星空相聚</p><div class="anniversary-number">120<span>载</span></div><h1 id="intro-heading">五方灯火，<br>同一<span>暨南。</span></h1><p class="intro-copy">走过广州、珠海与深圳，<br>让五座校园的记忆汇成星光。</p><button class="intro-start" :disabled="!ready||!!error" @click="enter('shipai')">从石牌出发 <span>↗</span></button><span class="intro-footnote">点击校区 · 阅读往事 · 共赴星空</span></section>
    <section v-if="campus&&!performing" class="campus-heading"><p class="eyebrow">{{campus.city}} · 已抵达</p><h1>{{campus.name}}</h1><p>{{campus.tagline}}</p><div class="history-links" aria-label="重要地标"><button v-for="landmark in campus.landmarks" :key="landmark.id" :class="{active:selected===landmark.id}" @click="select(landmark.id)">{{landmark.name}}<span>{{progress.read.includes(`${campus.id}:${landmark.id}`)?'✓':'↗'}}</span></button></div></section>
    <Transition name="card"><aside v-if="active&&!performing" :key="`${current}:${active.id}`" class="memory-card history-card" aria-live="polite"><button class="close-button" aria-label="关闭历史介绍" @click="selected=null">×</button><div class="memory-kicker">校园往事<span>{{active.year}}</span></div><h2>{{active.name}}</h2><h3>{{active.title}}</h3><p>{{active.body}}</p><a class="history-source" :href="active.source" target="_blank" rel="noopener noreferrer">{{active.sourceName}} ↗</a></aside></Transition>
    <div v-if="!performing" class="view-tools" role="group" aria-label="视角控制"><span class="compass" aria-hidden="true"><i></i>北</span><button :disabled="!ready||!!error" aria-label="放大" @click="scene?.zoom(.8)">+</button><button :disabled="!ready||!!error" aria-label="缩小" @click="scene?.zoom(1.25)">−</button><span class="tool-divider"></span><button :disabled="!ready||!!error" aria-label="恢复当前默认视角" @click="scene?.home()">⌂</button></div>
    <footer v-if="!performing" class="exploration-footer"><div class="journey-status"><p><span class="status-light"></span>{{countdown?'五校已抵达，即将开启星空庆典':complete?'五校灯火已齐，随时启程':'访问五座校园，解锁完整庆生演出'}}</p><span><strong>{{String(progress.visited.length).padStart(2,'0')}}</strong><span class="count-slash">/</span>05 <span class="count-label">座校园</span></span></div><div class="journey-dock"><ol aria-label="五校区访问进度"><li v-for="(item,index) in CAMPUSES" :key="item.id"><button :class="{lit:progress.visited.includes(item.id),active:current===item.id}" :disabled="!ready||!!error" :aria-label="`${item.name}，${progress.visited.includes(item.id)?'已访问':'未访问'}`" @click="enter(item.id)"><span class="stop-index">{{progress.visited.includes(item.id)?'✓':String(index+1).padStart(2,'0')}}</span><span>{{item.name}}</span></button></li></ol><button v-if="complete" class="celebrate-button" :disabled="!ready||!!error" @click="celebrate">开启星空庆典 <span>✧</span></button><span v-else class="dock-end">✧</span></div><div class="footer-meta"><p>拖动旋转 <i>·</i> 滚轮缩放 <i>·</i> 右键平移</p><p class="mobile-hint">单指旋转 · 双指缩放与平移</p><button v-if="countdown" @click="cancelCountdown">先继续探索</button><button v-else :disabled="!ready||!progress.visited.length" @click="reset">重新出发 ↺</button></div></footer>
    <section v-if="performing" class="show-hud" aria-label="庆生演出控制">
      <div class="show-chapter" role="status" aria-live="polite" aria-atomic="true">
        <p v-if="phase==='tour'&&touringCampus" class="tour-campus">{{touringCampus.name}} · 点亮暨南</p>
        <p v-else>JINAN UNIVERSITY · 120 YEARS</p>
        <h2 :class="{'tour-slogan':phase==='tour'}">{{caption}}</h2>
        <span v-if="finished">愿星光所至，皆是暨南人的远方。</span>
      </div>
      <div class="show-controls"><button v-if="!finished" :aria-pressed="paused" @click="togglePause">{{paused?'继续演出':'暂停演出'}}</button><button v-if="finished" @click="celebrate">重温庆生 ↺</button><button @click="overview">返回校园 ↗</button></div>
    </section>
    <p v-if="storageNotice" class="storage-notice" role="status">{{storageNotice}}</p>
    <div v-if="!ready||error" class="loading-overlay" role="status"><span class="emblem-crop"><img :src="emblemUrl" alt="暨南大学校徽"></span><h2>{{error?'校园暂未展开':'五座校园，同一片星空。'}}</h2><p>{{error||loading}}</p><button v-if="error" class="primary-button" @click="reload">重新打开校园</button><div v-else class="loading-line"></div></div>
    <dialog ref="aboutDialog" class="about-dialog" @click="e=>{if(e.target===aboutDialog)aboutDialog.close()}"><button class="close-button" aria-label="关闭关于作品" @click="aboutDialog?.close()">×</button><p class="eyebrow">点亮暨南 · 三地五校</p><h2>走过校园，<br>把祝福写进星空。</h2><p>作品纳入石牌、番禺、广园东、珠海和深圳五个国内校区。首次访问全部校区后自动开启演出，也可取消倒计时继续阅读历史。</p><p>建筑布局参考卫星影像，深圳另以实景照片交叉核对；建筑高度、背面、树冠遮挡部分和地形仍为推断，并非测绘模型。卫星图拍摄日期未知。</p><p>地标介绍区分建筑史与所在校区的办学沿革，每条附有校方来源。校徽使用官方蓝绿色原图。地图表达相对地理位置，微缩建筑与地理底图的比例不同。</p><p class="source-links"><a href="https://www.jnu.edu.cn/2569/list.htm" target="_blank" rel="noopener noreferrer">官方校区列表 ↗</a><a href="https://www.jnu.edu.cn/2927/list.htm" target="_blank" rel="noopener noreferrer">官方校徽 ↗</a></p><p class="map-credit">影像参考：Esri、Vantor、Earthstar Geographics、GIS User Community。区域轮廓：阿里云 DataV。</p></dialog>
  </main>
</template>
