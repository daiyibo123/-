// 《手搓神经网络》答辩 PPT v7 —— 扣题（深度学习·智慧教育）+ 专业标题 + 试用数据与迭代页
const pptxgen = require("pptxgenjs");
const P = "D:/GYY/长春理工/学生竞赛/本科生竞赛/数媒竞赛_手搓神经网络/docs/交付素材/截图/";
const OUT = "D:/GYY/长春理工/学生竞赛/本科生竞赛/手搓神经网络_答辩.pptx";

const BG="0D1B2A", PANEL="15293F", GLOW="5FB4EE", GLOW2="8FD3F2", CORAL="FF8A65",
      TXT="EAF3FA", MUT="8FA5BC", LINE="2A4258", NUMDIM="3A5570";
const F="微软雅黑";
const M=0.7;

let p=new pptxgen();
p.layout="LAYOUT_WIDE"; p.author="长春理工大学"; p.title="手搓神经网络——深度学习智慧教育应用";

const glowSh=()=>({type:"outer",color:"2E6EA6",blur:12,offset:4,angle:45,opacity:.45});
function page(){ const s=p.addSlide(); s.background={color:BG};
  for(let i=0;i<5;i++) s.addShape("ellipse",{x:11.6+i*0.28,y:6.95,w:0.09,h:0.09,fill:{color:i<4?NUMDIM:GLOW}});
  return s;
}
function dimTag(s,text,x,y){
  s.addShape("roundRect",{x,y,w:1.95,h:0.42,rectRadius:0.21,fill:{color:PANEL},line:{color:GLOW,width:1}});
  s.addText(text,{x,y,w:1.95,h:0.42,fontSize:12.5,bold:true,color:GLOW2,align:"center",valign:"middle",fontFace:F,margin:0});
}
function header(s,title){
  s.addText("《深度学习》智慧教育作品 · 答辩",{x:M,y:0.34,w:4.4,h:0.3,fontSize:10,color:MUT,fontFace:F,margin:0,charSpacing:2});
  s.addText(title,{x:M,y:0.62,w:9.6,h:0.72,fontSize:27,bold:true,color:TXT,fontFace:F,margin:0});
  s.addShape("line",{x:M,y:1.56,w:11.93,h:0,line:{color:LINE,width:1}});
}
function foot(s,n){
  s.addText(String(n).padStart(2,"0"),{x:12.3,y:7.0,w:0.55,h:0.3,fontSize:10,color:NUMDIM,fontFace:F,margin:0,align:"right"});
}

/* 1 封面 */
let s=p.addSlide(); s.background={color:BG};
s.addShape("ellipse",{x:7.8,y:-1.8,w:7.8,h:7.8,fill:{color:"16334E",transparency:55}});
s.addImage({path:P+"07_AI助手突触_640.png",x:8.75,y:1.7,w:3.6,h:3.6});
s.addShape("roundRect",{x:8.95,y:5.42,w:3.2,h:0.55,rectRadius:0.27,fill:{color:PANEL},line:{color:GLOW,width:1}});
s.addText("突触 · AI 助教",{x:8.95,y:5.42,w:3.2,h:0.55,fontSize:15,bold:true,color:GLOW2,align:"center",valign:"middle",fontFace:F,margin:0});
s.addShape("line",{x:M,y:1.3,w:4.6,h:0,line:{color:GLOW,width:2.5}});
s.addText("手搓神经网络",{x:M,y:1.9,w:7.9,h:1.35,fontSize:74,bold:true,color:TXT,fontFace:F,margin:0});
s.addText("面向《深度学习》课程的游戏化智慧学习系统",{x:M,y:3.5,w:7.9,h:0.6,fontSize:22,color:GLOW2,fontFace:F,margin:0});
s.addText("大纲对齐 · 第 2–6 章 20 个互动案例 · AI 助教全程随行",{x:M,y:4.22,w:7.9,h:0.45,fontSize:14,color:MUT,fontFace:F,margin:0});
s.addText([
  {text:"第14届中国大学生数字媒体科技作品及创意竞赛 · 智慧教育赛道",options:{breakLine:true}},
  {text:"长春理工大学 计算机科学技术学院　｜　团队成员：（填写）　｜　指导教师：关媛元",options:{}}
],{x:M,y:6.3,w:11.9,h:0.8,fontSize:12.5,color:MUT,fontFace:F,margin:0,paraSpaceAfter:6});

/* 2 作品概述 */
s=page(); header(s,"作品概述：面向深度学习课程的智慧教育应用");
dimTag(s,"作品定位",10.6,0.62);
s.addText([
  {text:"将《深度学习》课程的 ",options:{color:TXT}},
  {text:"9 条教学基本要求",options:{color:GLOW}},
  {text:" 逐一转化为 ",options:{color:TXT}},
  {text:"20 个可交互的智慧学习案例",options:{color:GLOW}},
  {text:"，以游戏化路径承载“教、学、练、评”全过程。",options:{color:TXT}}
],{x:M,y:2.0,w:12,h:1.7,fontSize:24,bold:true,fontFace:F,margin:0,lineSpacingMultiple:1.35});
s.addShape("line",{x:M,y:4.15,w:11.93,h:0,line:{color:LINE,width:1}});
const imp=[["5 章 20 关","覆盖深度学习第 2–6 章（基础/CNN/序列/注意力/生成）"],["3 种教学范式","预测—验证 · 直觉训练 · 诊断纠错，环环对应课程难点"],["0 使用门槛","浏览器打开即用，离线全功能，适配教室环境"]];
imp.forEach((it,i)=>{
  const x=M+i*4.05;
  s.addText(it[0],{x,y:4.5,w:3.8,h:0.7,fontSize:30,bold:true,color:GLOW,fontFace:F,margin:0});
  s.addText(it[1],{x,y:5.3,w:3.7,h:1.0,fontSize:13,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.25});
});
s.addText("定位：不是课件或题库，而是深度学习课程的智慧教育基础设施——学与教的数据闭环。",{x:M,y:6.5,w:11.9,h:0.4,fontSize:13,color:MUT,fontFace:F,margin:0});
foot(s,2);

/* 3 设计来源 */
s=page(); header(s,"设计来源：深度学习课程的三大教学痛点");
dimTag(s,"创新性",10.6,0.62);
const pains=[["“公式课听得懂，下课就忘”","深度学习公式抽象、缺动手试错空间 → 将每个难点做成可玩机制"],
["“错了只知道错了，不知道错在哪”","作业仅判对错、无归因反馈 → 建立 49 条误区库，逐错命名与针对性矫治"],
["“章节各自为政，学完串不成线”","知识碎片化 → 五章一条闯关路径，按大纲弧线组织"]];
pains.forEach((it,i)=>{
  const y=1.95+i*1.62;
  s.addText("“"+it[0]+"”",{x:M,y:y,w:4.3,h:1.0,fontSize:15.5,bold:true,color:CORAL,fontFace:F,margin:0,lineSpacingMultiple:1.25});
  s.addText("→",{x:5.15,y:y+0.15,w:0.5,h:0.5,fontSize:20,bold:true,color:GLOW,fontFace:F,margin:0});
  s.addText(it[1],{x:5.8,y:y,w:6.4,h:1.3,fontSize:14.5,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
  if(i<2)s.addShape("line",{x:M,y:y+1.45,w:11.9,h:0,line:{color:LINE,width:1}});
});
foot(s,3);

/* 4 创新一 */
s=page(); header(s,"创新点一：课程大纲的游戏化转译");
dimTag(s,"创新性",10.6,0.62);
s.addImage({path:P+"01_课程路径页.png",x:M,y:1.9,w:8.45,h:4.75,shadow:glowSh(),sizing:{type:"contain",w:8.45,h:4.75}});
const g=[["章节 = 学习路径","深度学习第 2–6 章各一条，按序解锁"],["考点 = 交互关卡","20 关各盯一条大纲基本要求"],["掌握度 = 星级评价","三星制 + 本地进度存档"],["先修知识 = 图鉴","线性代数/微积分/概率/机器学习 27 卡"]];
g.forEach((it,i)=>{
  const y=2.0+i*1.18;
  s.addShape("ellipse",{x:9.62,y:y+0.1,w:0.13,h:0.13,fill:{color:GLOW}});
  s.addText(it[0],{x:9.92,y:y-0.04,w:2.8,h:0.4,fontSize:14,bold:true,color:TXT,fontFace:F,margin:0});
  s.addText(it[1],{x:9.92,y:y+0.38,w:2.8,h:0.6,fontSize:11.5,color:MUT,fontFace:F,margin:0,lineSpacingMultiple:1.15});
});
foot(s,4);

/* 5 创新二 */
s=page(); header(s,"创新点二：预测—验证的交互教学范式");
dimTag(s,"创新性",10.6,0.62);
s.addImage({path:P+"03_注意力手算台.png",x:M,y:1.9,w:7.4,h:4.16,shadow:glowSh(),sizing:{type:"contain",w:7.4,h:4.16}});
s.addText("以大纲考核原题“Scaled Dot-Product Attention 手算”为例",{x:M,y:6.15,w:7.4,h:0.35,fontSize:11.5,color:MUT,fontFace:F,margin:0,align:"center"});
s.addShape("roundRect",{x:8.4,y:1.9,w:4.25,h:3.1,rectRadius:0.1,fill:{color:PANEL},line:{color:LINE,width:1}});
s.addText("一次真实的人机对话",{x:8.7,y:2.05,w:3.7,h:0.4,fontSize:13.5,bold:true,color:CORAL,fontFace:F,margin:0});
s.addText([
  {text:"题目：s₁ = q·k₁/√d = ？",options:{breakLine:true,color:TXT,bold:true}},
  {text:"学生选择了 2",options:{breakLine:true,color:MUT}},
  {text:"“✗ 忘了除以 √d——score 还要缩放。”",options:{color:GLOW2,breakLine:true}},
  {text:"（记为误区 M-AT-03，进入学情档案）",options:{color:MUT}}
],{x:8.7,y:2.5,w:3.7,h:2.4,fontSize:12.5,fontFace:F,margin:0,paraSpaceAfter:8,lineSpacingMultiple:1.25});
s.addText("每个知识点先预测再验证：错误被收集、命名、针对性矫治——将“思维定式”本身变成可教学的对象。",{x:8.4,y:5.25,w:4.25,h:1.4,fontSize:13,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
foot(s,5);

/* 6 创新三 */
s=page(); header(s,"创新点三：全程随行的 AI 助教");
dimTag(s,"创新性",10.6,0.62);
s.addShape("ellipse",{x:0.95,y:1.9,w:3.9,h:3.9,fill:{color:"16334E",transparency:35}});
s.addImage({path:P+"07_AI助手突触_640.png",x:1.35,y:2.2,w:3.1,h:3.1});
s.addShape("roundRect",{x:1.45,y:5.55,w:2.9,h:0.5,rectRadius:0.25,fill:{color:PANEL},line:{color:GLOW,width:1}});
s.addText("原创 SVG 角色 · 全局常驻",{x:1.45,y:5.55,w:2.9,h:0.5,fontSize:12.5,bold:true,color:GLOW2,align:"center",valign:"middle",fontFace:F,margin:0});
const roles=[["随行","精讲、闯关、复盘、测评任意界面唤起提问，问题自动携带当前关卡与误区上下文"],["点灯","知识路逐节点苏格拉底式追问，答对点亮一盏灯，全亮通关"],["兜底","在线大模型讲解 / 弱网本地缓存 / 离线 27 级提示阶梯，三级降级永远可用"]];
roles.forEach((it,i)=>{
  const y=2.0+i*1.55;
  s.addText(it[0],{x:5.35,y:y,w:1.4,h:0.5,fontSize:18,bold:true,color:GLOW,fontFace:F,margin:0});
  s.addText(it[1],{x:6.85,y:y+0.02,w:5.6,h:1.3,fontSize:14,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
  if(i<2)s.addShape("line",{x:5.35,y:y+1.4,w:7.15,h:0,line:{color:LINE,width:1}});
});
foot(s,6);

/* 7 交互与视觉设计 */
s=page(); header(s,"交互与视觉设计：为深度学习概念定制可视化");
dimTag(s,"艺术性",10.6,0.62);
s.addImage({path:P+"02_精讲翻卡.png",x:M,y:1.95,w:5.75,h:3.23,shadow:glowSh(),sizing:{type:"contain",w:5.75,h:3.23}});
s.addText("精讲翻卡：先讲重点与难点预告",{x:M,y:5.28,w:5.75,h:0.35,fontSize:12,color:MUT,align:"center",fontFace:F,margin:0});
s.addImage({path:P+"04_知识路智能体.png",x:6.85,y:1.95,w:5.75,h:3.23,shadow:glowSh(),sizing:{type:"contain",w:5.75,h:3.23}});
s.addText("知识路复盘：答对一题点亮一盏灯",{x:6.85,y:5.28,w:5.75,h:0.35,fontSize:12,color:MUT,align:"center",fontFace:F,margin:0});
s.addText("物理控件（摇杆/旋钮/换挡/步进/拖拽）承载直觉操作；每章一个主题色；20 关各有专属可视化——注意力矩阵、梯度传递时间轴、对抗训练曲线、扩散加噪链——每一关都长成它要教的深度学习概念的样子。",{x:M,y:6.0,w:11.9,h:0.95,fontSize:13.5,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
foot(s,7);

/* 8 技术亮点 */
s=page(); header(s,"技术亮点：页内真实计算与数值可验证");
dimTag(s,"技术性",10.6,0.62);
s.addImage({path:P+"06_GAN真实训练.png",x:M,y:1.9,w:7.4,h:4.16,shadow:glowSh(),sizing:{type:"contain",w:7.4,h:4.16}});
s.addText("生成对抗训练在浏览器内实时运行（240 轮交替梯度下降）",{x:M,y:6.15,w:7.4,h:0.35,fontSize:11.5,color:MUT,fontFace:F,margin:0,align:"center"});
s.addText("生成器均值 1.9 → 3.04",{x:8.5,y:2.0,w:4.2,h:0.8,fontSize:27,bold:true,color:CORAL,fontFace:F,margin:0});
s.addText("向真实分布 4.0 收敛；训练曲线与样本均为运行时计算，非预制素材。",{x:8.5,y:2.9,w:4.15,h:0.9,fontSize:13,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
s.addText([
  {text:"反向传播金标准：独立工具有限差分校验",options:{bullet:{code:"2013",indent:10},breakLine:true}},
  {text:"扩散加噪链 / BPTT 梯度衰减：逐站实算",options:{bullet:{code:"2013",indent:10},breakLine:true}},
  {text:"AI 三级降级：API → 本地缓存 → 内置阶梯",options:{bullet:{code:"2013",indent:10},breakLine:true}},
  {text:"零构建零依赖：双击部署，离线全功能",options:{bullet:{code:"2013",indent:10}}}
],{x:8.5,y:3.95,w:4.15,h:2.3,fontSize:12.5,color:TXT,fontFace:F,margin:0,paraSpaceAfter:9,lineSpacingMultiple:1.2});
foot(s,8);

/* 9 完成度 */
s=page(); header(s,"完成度与质量保障");
dimTag(s,"完成度",10.6,0.62);
s.addImage({path:P+"05_个人分析报告.png",x:M,y:1.9,w:7.4,h:4.16,shadow:glowSh(),sizing:{type:"contain",w:7.4,h:4.16}});
s.addText("个人学习报告由真实使用数据生成（大纲对照/误区榜/建议）",{x:M,y:6.15,w:7.4,h:0.35,fontSize:11.5,color:MUT,fontFace:F,margin:0,align:"center"});
const done=[["20/20","案例全部通过端到端自动化测试（含故意答错路径）"],["49+27","误区库 + 提示阶梯全部接线贯通"],["四段式","精讲—闯关—AI 复盘—测评全流程可用"],["1 屏","全部案例页适配单屏，无滚动遗漏"]];
done.forEach((it,i)=>{
  const y=1.95+i*1.18;
  s.addText(it[0],{x:8.45,y:y,w:1.85,h:0.55,fontSize:22,bold:true,color:GLOW,fontFace:F,margin:0});
  s.addText(it[1],{x:8.45,y:y+0.56,w:4.2,h:0.55,fontSize:12,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.15});
});
foot(s,9);

/* 10 试用情况与迭代优化 */
s=page(); header(s,"试用情况与迭代优化");
dimTag(s,"完成度",10.6,0.62);
s.addText("试用与验证数据",{x:M,y:1.85,w:5.8,h:0.4,fontSize:15,bold:true,color:TXT,fontFace:F,margin:0});
s.addText("28",{x:M,y:2.25,w:1.6,h:1.0,fontSize:58,bold:true,color:GLOW,fontFace:F,margin:0});
s.addText("名同学完成试玩",{x:2.4,y:2.62,w:3.6,h:0.5,fontSize:16,bold:true,color:TXT,fontFace:F,margin:0});
s.addText("60%–80%",{x:M,y:3.35,w:3.1,h:0.8,fontSize:38,bold:true,color:CORAL,fontFace:F,margin:0});
s.addText("整体通关率（主线 20 案例）",{x:3.9,y:3.62,w:3.2,h:0.5,fontSize:14,bold:true,color:TXT,fontFace:F,margin:0});
s.addText([
  {text:"20/20 案例端到端自动化验证（含故意答错路径）",options:{bullet:{code:"2013",indent:10},breakLine:true}},
  {text:"反向传播等关键数值经独立工具复核",options:{bullet:{code:"2013",indent:10},breakLine:true}},
  {text:"全部案例页单屏适配，无滚动遗漏",options:{bullet:{code:"2013",indent:10}}}
],{x:M,y:4.35,w:5.85,h:2.2,fontSize:12.5,color:TXT,fontFace:F,margin:0,paraSpaceAfter:9,lineSpacingMultiple:1.2});
s.addShape("roundRect",{x:6.95,y:1.8,w:5.7,h:4.85,rectRadius:0.1,fill:{color:PANEL},line:{color:LINE,width:1},shadow:glowSh()});
s.addText("迭代优化记录（试玩反馈驱动）",{x:7.3,y:2.0,w:5.0,h:0.4,fontSize:15,bold:true,color:GLOW,fontFace:F,margin:0});
const itrs=[["视觉体系 3 版演进","纸色底 → 白底天蓝 → 多邻国语义色 + 五章分色 + 3D 按钮"],["可读性专项","SVG 与面板字号四档标准化，可视化图形整体放大"],["布局专项","案例页单屏化适配，AI 提问面板布局修正"],["质量专项","测试发现并修复教学判定缺陷 6 处，全部回归验证"]];
itrs.forEach((it,i)=>{
  const y=2.6+i*1.02;
  s.addText(it[0],{x:7.3,y:y,w:1.95,h:0.75,fontSize:13,bold:true,color:GLOW2,fontFace:F,margin:0,lineSpacingMultiple:1.1});
  s.addText(it[1],{x:9.35,y:y,w:3.1,h:0.95,fontSize:11.5,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.18});
});
foot(s,10);

/* 11 应用场景 */
s=page(); header(s,"应用场景与推广价值");
const apps=[["课前","替代预习提纲，按章布置，进度可查"],["课中","概念演示与全班预测的互动教具"],["实验","E-Net 脑肿瘤分割实验前置训练"],["延伸","已立项本科毕设，扩展后续章节"]];
apps.forEach((it,i)=>{
  const x=M+i*3.05;
  s.addShape("roundRect",{x,y:2.1,w:2.85,h:2.9,rectRadius:0.1,fill:{color:PANEL},line:{color:LINE,width:1},shadow:glowSh()});
  s.addText(it[0],{x,y:2.4,w:2.85,h:0.5,fontSize:19,bold:true,color:GLOW2,align:"center",fontFace:F,margin:0});
  s.addText(it[1],{x:x+0.28,y:3.05,w:2.3,h:1.7,fontSize:13,color:TXT,fontFace:F,margin:0,lineSpacingMultiple:1.3});
});
s.addShape("line",{x:M,y:5.5,w:11.93,h:0,line:{color:LINE,width:1}});
s.addText([
  {text:"教育公平价值：",options:{bold:true,color:GLOW2}},
  {text:"零安装、零依赖、离线全功能——缺乏网络与算力条件的课堂，同样能开展深度学习的智慧教学。",options:{color:TXT}}
],{x:M,y:5.85,w:11.9,h:0.7,fontSize:15,fontFace:F,margin:0,lineSpacingMultiple:1.3});
foot(s,11);

/* 12 系统演示 */
s=p.addSlide(); s.background={color:BG};
s.addShape("ellipse",{x:4.2,y:-2.2,w:8.5,h:8.5,fill:{color:"16334E",transparency:55}});
s.addText("系统演示",{x:M,y:2.15,w:11.9,h:1.0,fontSize:52,bold:true,color:TXT,align:"center",fontFace:F,margin:0});
s.addText("从课程路径出发，完整走一遍深度学习第二章的学习旅程",{x:M,y:3.45,w:11.9,h:0.6,fontSize:20,color:GLOW2,align:"center",fontFace:F,margin:0});
const flow=["进入路径","精讲翻卡","闯一关","AI 复盘","个人报告"];
flow.forEach((t,i)=>{
  const x=2.3+i*1.95;
  s.addShape("roundRect",{x,y:4.7,w:1.65,h:0.6,rectRadius:0.3,fill:{color:PANEL},line:{color:GLOW,width:1}});
  s.addText(t,{x,y:4.7,w:1.65,h:0.6,fontSize:14,bold:true,color:TXT,align:"center",valign:"middle",fontFace:F,margin:0});
  if(i<4)s.addText("→",{x:x+1.66,y:4.78,w:0.3,h:0.45,fontSize:15,bold:true,color:GLOW,fontFace:F,margin:0});
});
s.addText("以下为系统实机演示",{x:M,y:5.9,w:11.9,h:0.5,fontSize:15,color:CORAL,align:"center",bold:true,fontFace:F,margin:0});

/* 13 结尾 */
s=p.addSlide(); s.background={color:BG};
s.addShape("ellipse",{x:5.4,y:-2.0,w:7.0,h:7.0,fill:{color:"16334E",transparency:55}});
s.addImage({path:P+"07_AI助手突触_640.png",x:10.6,y:4.6,w:1.9,h:1.9});
s.addText("让深度学习，学得会、记得住",{x:M,y:2.5,w:10.2,h:0.9,fontSize:42,bold:true,color:TXT,fontFace:F,margin:0});
s.addText("手搓神经网络 · 深度学习课程智慧教育应用",{x:M,y:3.6,w:10.2,h:0.5,fontSize:16,color:GLOW2,fontFace:F,margin:0});
s.addText("谢谢聆听　·　长春理工大学 计算机科学技术学院",{x:M,y:6.4,w:10.0,h:0.45,fontSize:13,color:MUT,fontFace:F,margin:0});

p.writeFile({fileName:OUT}).then(()=>console.log("WROTE",OUT));
