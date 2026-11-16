# 参考依据与标定记录

本轮核对日期：2026-11-16。下载日期不等于影像拍摄日期；本次未取得卫星影像的具体拍摄日期，不能宣称反映当天现状。

## 卫星影像

- 服务：Esri ArcGIS World Imagery。
- 元数据：https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson
- 来源标注：Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community。
- 校区参考图：`satellite-campus.jpg`，请求范围 WGS84 `113.978,22.540,113.985,22.546`，输出 1500 × 1400，投影 EPSG:3857。
- 请求：https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=113.978,22.540,113.985,22.546&bboxSR=4326&size=1500,1400&imageSR=3857&format=jpg&f=image
- `satellite-context.jpg` 仅用于确定周边位置。参考影像保留于开发资料，不作为线上贴图或背景发布。

### 新增四校卫星标定

官网校区范围依据：[暨南大学校园地图](https://www.jnu.edu.cn/2569/list.htm)。按用户确认，石牌、番禺、广园东、珠海、深圳五校全部纳入。

四幅卫星图均由同一 World Imagery 服务导出为 1400 × 1400，北向朝上，范围参数为 WGS84，输出 EPSG:3857。范围与像素原点记录如下：

| 文件 | bbox（西、南、东、北） | 局部原点像素 | 单像素模型单位 |
| --- | --- | --- | --- |
| `satellite-shipai.jpg` | 113.334,23.126,113.347,23.139 | 805,565 | 0.44 |
| `satellite-panyu.jpg` | 113.401,23.013,113.419,23.028 | 715,800 | 0.43 |
| `satellite-guangyuan.jpg` | 113.322,23.150,113.332,23.159 | 640,695 | 0.58 |
| `satellite-zhuhai.jpg` | 113.522,22.245,113.537,22.260 | 670,735 | 0.52 |

请求模板：`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=范围&bboxSR=4326&size=1400,1400&imageSR=3857&format=jpg&f=image`。

四校以 `x=(像素x-原点x)*比例`、`z=(像素y-原点y)*比例` 转换，保留北为 -Z。建筑屋顶形状简化为条形、院落、圆形或层叠体量，逐栋窗格与背面未取得实测资料。

- 石牌对齐明湖、北部密集住宿区、东北蓝紫跑道和南北主路；另核对 `official-campus-map.jpg` 校方导览图。原图：[官方导览图](https://www.jnu.edu.cn/_upload/article/images/97/b4/c0ed5c1f4718b4ccaf91c05db262/76dc553c-81df-450c-af7e-29b7daedd26b.jpg)。
- 番禺对齐惠全楼、裕华堂、湖岸、斜向教学轴线和东西运动场。图书馆地上六层取自校方 2014 年报道，其余多数层数为估计。
- 广园东对齐西北红褐屋顶教学区、东侧运动场、南部建筑和西侧山林；未制作完整周边铁路/城市街区。
- 珠海对齐中部教学区、日月湖、北侧圆形建筑、西侧运动场与东侧住宿区；山体高度为艺术化补齐。

区域地图中心点为卫星定位的近似校内点，不用于导航。四校的局部建筑比例与深圳不同，跨校地图里的模型再统一缩小为视觉符号。

将综合楼主体中心参考像素 `(580,795)` 定为局部坐标 `(-31,-22)`；图像平面旋转 30°，每像素约 0.5 个模型单位，用于相对位置对齐。其比例并非经实地测量。

| 目标 | 卫星图参考像素 | 修正内容 |
| --- | --- | --- |
| 英东体育中心 | 608,984 | 中心移至 28.4,52.8；屋顶收窄成近方形，朝向独立旋转 |
| 可见篮球场 | 497,945 | 中心移至 -29.4,63.7；按影像中可辨识的单片完整球场建模，红色外围、绿色场内 |
| 宿舍1～4 | 753,692 / 763,756 / 829,818 / 836,882 | 调整间距与错列位置 |
| 宿舍5 | 629,657 | 收拢到综合楼北侧，保留后段体量 |
| 操场 | 530,1240 | 移至体育馆南侧，直道加半圆端部，内场采用影像中的浅土色 |
| 南侧入口附近 | 599,1077 | 入口移至南侧道路附近；门墙形态继续参考用户概念图，未视为卫星确认的构造 |

概念图的湖泊、宽阔环路与实际影像不完全一致，因此删除近校园的推断湖泊，收窄道路并以可见通道为依据。林冠遮挡道路、立面背面、海拔地形仍为推断。北向相对场景轴转 30°；不是原先默认的画面正上方。

## 官方校区照片

- 页面：https://sz.jnu.edu.cn/2019/0318/c10770a301026/page.psp
- 原图：https://sz.jnu.edu.cn/_upload/article/images/71/1d/ade602d94147b51e9ac84911161d/6c6200e8-0b06-470c-a099-ebca0905d18a.jpg
- 本地：`official-campus.jpg`。
- 用于立面冷白色、蓝灰玻璃、屋顶形态、综合楼半圆山墙、宿舍结构的交叉核对；这是历史实景照片，不当作实时影像。

## 校徽

- 官方说明：https://www.jnu.edu.cn/2927/list.htm
- 官方原图：https://www.jnu.edu.cn/_upload/tpl/00/f5/245/template245/images/list/logo.png
- 发布文件：`public/jnu-emblem.png`，保留原始文件，CSS 仅显示其中圆形校徽区域，未重绘校徽，也未把校徽改成金色。
- 官方标准色说明为蓝绿色；UI 使用相近的蓝绿色，与夜景金色庆生字区分。
- 校方下载页：https://120th.jnu.edu.cn/2026/0402/c43915a852962/page.htm
- 校庆主题出处：https://120th.jnu.edu.cn/2026/0318/c43897a851912/page.htm

## 三维字体

- 来源：https://github.com/mrdoob/three.js/blob/dev/examples/fonts/helvetiker_bold.typeface.json
- 本地：`src/assets/helvetiker_bold.typeface.json`。
- 字体许可：`helvetiker-LICENSE.txt`，同时复制到 `public/helvetiker-LICENSE.txt` 随构建发布。本版用于蛋糕顶部实体数字 120；星光文字使用浏览器本地字体栅格采样。

## 地标历史出处

历史卡片采用概述文字，并可直接打开来源。校区/学院沿革不作为单栋建筑的竣工年份；未添加无法核实的捐建金额。

| 校区 / 地标 | 引用信息 | 校方来源 |
| --- | --- | --- |
| 石牌 · 明湖 | 1959 年 10 月师生修建明湖的校友回忆 | [《挑灯夜战挖明湖》](https://wxy.jnu.edu.cn/2023/0320/c23913a739767/page.htm) |
| 石牌 · 北门 | 1958 年重建开学后在当时正门前的合影 | [广州重建时期的校园](https://120th.jnu.edu.cn/2026/0414/c43907a853645/page.htm) |
| 石牌 · 邵逸夫体育馆 | 二十世纪八九十年代校园基建成果 | [周耀明纪念文章](https://www.jnu.edu.cn/2026/0617/c2632a857339/page.htm) |
| 番禺 · 图书馆 | 2014 年 4 月封顶，地上六层，“知识宝盒”设计 | [“知识宝盒”闪耀“科技范儿”](https://panyu.jnu.edu.cn/2014/0906/c27109a580855/page.htm) |
| 番禺 · 校区入口 | 2012 年奠基、2014 年一期落成 | [校区介绍](https://panyu.jnu.edu.cn/2016/1105/c2757a48828/page.psp) |
| 番禺 · 裕华堂、惠全楼命名 | 2015 年校董捐赠揭牌，食堂和图书馆命名 | [三年南校，根植我心](https://panyu.jnu.edu.cn/2016/1114/c27109a580437/page.htm) |
| 广园东 · 教学区 | 1993 年华文学院组建 | [华文学院简介](https://hwy.jnu.edu.cn/2018/1028/c13359a339845/page.psp) |
| 广园东 · 入口 | 1953 年侨生补校、1925 年预科部的办学源流 | [华文学院领导致辞](https://hwy.jnu.edu.cn/2024/0202/c13360a807003/page.htm) |
| 珠海 · 教学区、入口 | 1998 年成立、2000 年合作迁建、2009 年更名校区 | [珠海校区简介](https://zh.jnu.edu.cn/8369/list.htm) |
| 珠海 · 日月湖 | 山泉汇聚的校园景观 | [珠海校区概况](https://zh.jnu.edu.cn/8354/list.htm) |
| 深圳 · 南门、综合楼、英东体育中心 | 1993 年学院成立、1996 年建成开学、2020 年管委会成立；霍英东曾任名誉院长 | [深圳校区历史沿革](https://sz.jnu.edu.cn/lsyg/) |

## 区域地图

- 原始轮廓：[阿里云 DataV 广东地市 GeoJSON](https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json)。
- 保存为 `src/assets/guangdong.geo.json`，本地打包，运行时不请求地图服务。
- 选取广州、深圳、珠海、佛山、江门、惠州、东莞、中山轮廓，用作三地五校巡游的区域示意背景；不是行政区划展示产品或导航底图。
- 校区中心采用卫星影像近似定位，底图和校区点未进行测绘级坐标系联合标定；不能用于判断边界、精确距离或面积。
- 校区标签的引导线有排版偏移，亮点本身使用校区中心点。微缩模型和底图比例刻意不同，以便在区域尺度上辨认校园。
