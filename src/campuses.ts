export type CampusId = 'shipai' | 'panyu' | 'guangyuan' | 'zhuhai' | 'shenzhen'
export interface HistoryLandmark {
  id: string; name: string; year: string; title: string; body: string
  source: string; sourceName: string; point: [number,number,number]
}
export interface CampusDefinition {
  id: CampusId; name: string; city: string; tagline: string; celebrationSlogan: string; coordinates: [number,number]
  center: [number,number]; scale: number; size: [number,number]; wall: string; roof: string
  landmarks: HistoryLandmark[]
}
export function planPoint(center: readonly number[],scale:number,x:number,y:number,height=0):[number,number,number] {
  return [(x-center[0]!)*scale,height,(y-center[1]!)*scale]
}
const story=(id:string,name:string,year:string,title:string,body:string,source:string,sourceName:string,point:[number,number,number]):HistoryLandmark=>({id,name,year,title,body,source,sourceName,point})
const sp=(x:number,y:number,h=12)=>planPoint([805,565],.44,x,y,h)
const py=(x:number,y:number,h=14)=>planPoint([715,800],.43,x,y,h)
const gy=(x:number,y:number,h=14)=>planPoint([640,695],.58,x,y,h)
const zh=(x:number,y:number,h=14)=>planPoint([670,735],.52,x,y,h)
// Celebration slogans are original copy for this work, not official campus mottos.
export const CAMPUSES: CampusDefinition[] = [
  {id:'shipai',name:'石牌校区',city:'广州',tagline:'从重建的灯火，到今日的暨南园',celebrationSlogan:'薪火相传，弦歌不辍',coordinates:[113.3417,23.1318],center:[805,565],scale:.44,size:[425,520],wall:'#e5e1d6',roof:'#8c9695',landmarks:[
    story('minghu','明湖','1959','师生双手筑起的校园记忆','校方刊载的校友回忆记述，1959年10月，师生共同参与明湖修建。今天的湖岸与树影，连接着广州重建初期的劳动与求学记忆。','https://wxy.jnu.edu.cn/2023/0320/c23913a739767/page.htm','暨南大学文学院 ·《挑灯夜战挖明湖》',sp(1055,510,5)),
    story('north','北门','1958','重建后的第一张合影','1958年9月24日，暨南大学在广州举行重建后的开学典礼。校庆历史图片记录了同学们在当时正门、今天北门前的合影。','https://120th.jnu.edu.cn/2026/0414/c43907a853645/page.htm','120周年校庆官网 · 广州重建时期的校园',sp(490,100,10)),
    story('gym','邵逸夫体育馆','1980s—1990s','从校园建设到共同的欢呼','校方人物纪念文章将邵逸夫体育馆列入二十世纪八九十年代石牌校区大规模基础设施建设的成果。它承载着一代代师生的体育与校园活动。','https://www.jnu.edu.cn/2026/0617/c2632a857339/page.htm','暨南大学官网 · 周耀明纪念文章',sp(735,410,24)),
  ]},
  {id:'panyu',name:'番禺校区',city:'广州',tagline:'知识宝盒，打开新的十年',celebrationSlogan:'笃学求新，智启未来',coordinates:[113.4107,23.0192],center:[715,800],scale:.43,size:[480,520],wall:'#ddd3bb',roof:'#7c929a',landmarks:[
    story('library','惠全楼 · 图书馆','2014','一座“知识宝盒”的诞生','图书馆于2014年4月封顶，是新校区最早封顶的主体建筑。校方报道以“知识宝盒”形容它的建筑设计；由书籍与信息汇聚的空间，成为新校区的文化地标。','https://panyu.jnu.edu.cn/2014/0906/c27109a580855/page.htm','番禺校区官网 ·“知识宝盒”闪耀“科技范儿”',py(585,749,29)),
    story('gate','校区入口','2012—2014','向南，拓展求知的天地','番禺校区于2012年5月19日奠基，2014年9月落成并完成一期建设。新的教学、科研与生活空间，承接着学校向新兴学科发展的期待。','https://panyu.jnu.edu.cn/2016/1105/c2757a48828/page.psp','番禺校区官网 · 校区介绍',py(761,1050,8)),
    story('hall','裕华堂 · 食堂','2015','一餐一饭里的校友情谊','109周年校庆之际，南校区举行校董捐赠及揭牌仪式。食堂获名“裕华堂”，与图书馆等建筑一起，留下校董支持教育事业的印记。','https://panyu.jnu.edu.cn/2016/1114/c27109a580437/page.htm','番禺校区官网 · 三年南校，根植我心',py(715,681,19)),
  ]},
  {id:'guangyuan',name:'广园东校区',city:'广州',tagline:'以华文为桥，与世界相连',celebrationSlogan:'华文为桥，声教四海',coordinates:[113.3262,23.1540],center:[640,695],scale:.58,size:[430,390],wall:'#e8ddd0',roof:'#ac6b4b',landmarks:[
    story('teaching','华文教学区','1993','三支教育传统，在这里汇合','1993年，广州华侨学生补习学校并入暨南大学，与对外汉语教学系和预科部合并组建华文学院。点击的教学区承载这段办学文脉；此年份指学院组建，不是该楼竣工年。','https://hwy.jnu.edu.cn/2018/1028/c13359a339845/page.psp','华文学院官网 · 学院简介',gy(532,550,24)),
    story('gate','侨园入口','1953 / 1925','跨越山海，来到中文课堂','华文学院的办学源流包括1953年成立的广州华侨学生补习学校，以及1925年创立的暨南大学预科部。侨校的使命，在一代代海外学子的求学路上延续。','https://hwy.jnu.edu.cn/2024/0202/c13360a807003/page.htm','华文学院官网 · 领导致辞',gy(570,920,8)),
  ]},
  {id:'zhuhai',name:'珠海校区',city:'珠海',tagline:'山海之间，共写暨南新章',celebrationSlogan:'山海逐梦，扬帆致远',coordinates:[113.52959,22.25265],center:[670,735],scale:.52,size:[400,490],wall:'#e9e6d9',roof:'#899f9f',landmarks:[
    story('academic','教学综合楼','1998—2000','暨南，在珠海扎根','1998年，学校成立珠海学院并与珠海市签订共建协议。2000年进一步合作建设，将学院从唐家湾迁至珠海市区。这段沿革是校园的历史背景，并非单栋建筑的落成年份。','https://zh.jnu.edu.cn/8369/list.htm','珠海校区官网 · 校区简介',zh(780,723,27)),
    story('lake','日月湖','校园记忆','山泉汇成的宁静','校区官方简介介绍，日月湖由山泉汇聚而成，与教学楼、图书馆、学生公寓共同构成依山而建的校园。它是日常生活的地标，也是校园建设留下的景观记忆。','https://zh.jnu.edu.cn/8354/list.htm','珠海校区官网 · 校区简介',zh(746,837,5)),
    story('gate','珠海校区入口','2009','从学院，到校区','2009年4月1日，学校实施校区化改革，珠海学院更名为暨南大学珠海校区，进入全面校区化管理的发展阶段。','https://zh.jnu.edu.cn/8369/list.htm','珠海校区官网 · 校区简介',zh(448,754,8)),
  ]},
  {id:'shenzhen',name:'深圳校区',city:'深圳',tagline:'在华侨城，让青春与城市同行',celebrationSlogan:'敢闯敢创，勇立潮头',coordinates:[113.9810,22.5425],center:[0,0],scale:1,size:[400,440],wall:'#e5e9e9',roof:'#eef1f5',landmarks:[
    story('gate','南门','1993 / 1996','从中旅学院走来的校园','1993年，暨南大学中旅学院获批成立；1996年学院正式建成开学，面向全国及海外、港澳台地区招生。这座校园见证了暨南在深圳办学的起步。','https://sz.jnu.edu.cn/lsyg/','深圳校区官网 · 校区介绍',[47.7,10,95.4]),
    story('academic','综合楼','2020','深圳校区的新篇章','2020年1月，学校发文成立深圳校区管委会、深圳校区党工委。综合楼所在的华侨城校园，继续承担暨南在深圳的教学与人才培养。','https://sz.jnu.edu.cn/lsyg/','深圳校区官网 · 校区介绍',[-30,39,-13]),
    story('sports','英东体育中心','校区文脉','名字背后的侨校情谊','校区介绍记载，霍英东曾任中旅学院名誉院长。英东体育中心作为校园地标，在这里连接体育生活与侨校记忆；本介绍不据此推断场馆的捐建金额或落成时间。','https://sz.jnu.edu.cn/lsyg/','深圳校区官网 · 校区介绍',[28.4,28,52.8]),
  ]},
]
export const CAMPUS_IDS=CAMPUSES.map(c=>c.id)
export interface JourneyProgress { visited:CampusId[]; read:string[] }
export const JOURNEY_KEY='jnu120.journey.v2'
export function resetJourney():JourneyProgress { return {visited:[],read:[]} }
export function restoreJourney(raw:string|null,legacy:string|null=null):JourneyProgress {
  try {
    const data=raw ? JSON.parse(raw) : null
    if(data && typeof data==='object' && !Array.isArray(data)) {
      const visited=Array.isArray(data.visited)?[...new Set<CampusId>(data.visited.filter((id:unknown)=>CAMPUS_IDS.includes(id as CampusId)))]:[]
      const validStories=new Set(CAMPUSES.flatMap(c=>c.landmarks.map(l=>`${c.id}:${l.id}`)))
      const read=Array.isArray(data.read)?[...new Set<string>(data.read.filter((id:unknown)=>typeof id==='string'&&validStories.has(id)))]:[]
      return {visited,read}
    }
  } catch { /* A corrupt new record should not invent visits. */ }
  try { const old=JSON.parse(legacy??'null');if(Array.isArray(old)&&old.some(id=>['gate','academic','sports','dorms','courts'].includes(id)))return {visited:['shenzhen'],read:[]} } catch {}
  return resetJourney()
}
export function visitCampus(progress:JourneyProgress,id:CampusId):JourneyProgress {
  return {visited:[...new Set([...progress.visited,id])],read:[...progress.read]}
}
export function readLandmark(progress:JourneyProgress,campus:CampusId,id:string):JourneyProgress {
  if(!CAMPUSES.find(c=>c.id===campus)?.landmarks.some(l=>l.id===id))return progress
  return {visited:[...progress.visited],read:[...new Set([...progress.read,`${campus}:${id}`])]}
}
export function allVisited(progress:JourneyProgress){return CAMPUS_IDS.every(id=>progress.visited.includes(id))}
export function mapPoint(lon:number,lat:number):[number,number,number] {
  return [(lon-113.65)*700*Math.cos(22.7*Math.PI/180),0,(22.7-lat)*700]
}
