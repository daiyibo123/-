// L4 核工坊（3-2）：看核滑行（预测）→ 设计核 ×2（主体）→ 逆向推断
// 设计文档：docs/案例设计/3B-核工坊-设计文档.md（口算与池化已按评审移除）
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeStepper } from '../ui/controls.js';
import { rngOf } from '../engine/rng.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const N=10, CELL=34, GRID=N*CELL;                 // 图像 10×10
const K=3, OUT=N-K+1, OCELL=26, OGRID=OUT*OCELL;  // 特征图 8×8
const SOBEL_X=[[1,0,-1],[2,0,-2],[1,0,-1]];
const SOBEL_Y=[[1,2,1],[0,0,0],[-1,-2,-1]];
const SOBEL_Y_NEG=[[-1,-2,-1],[0,0,0],[1,2,1]];
const ONES=[[1,1,1],[1,1,1],[1,1,1]];

export default class L4Kernel extends LevelBase{
  static id='l4'; static title='核工坊';

  mount(){
    const cfg=this.cfg=LEVELS.l4;
    this.combo=0;this.errs=0;
    const rng=rngOf(cfg.seed||44);
    const g=()=> (rng.next()+rng.next()+rng.next()-1.5)*0.5;
    // 图 A：左亮右暗（竖直边界）
    this.imgA=[];for(let i=0;i<N;i++){const row=[];
      for(let j=0;j<N;j++){row.push(Math.max(0,Math.min(1,(j<5?0.82:0.3)+g()*0.07)));}this.imgA.push(row);}
    // 图 B：均匀底 + 对角亮纹（暗记）
    this.imgB=[];for(let i=0;i<N;i++){const row=[];
      for(let j=0;j<N;j++){let v=0.45+g()*0.05;if(i===j)v=Math.min(1,v+0.42);
        row.push(Math.max(0,Math.min(1,v)));}this.imgB.push(row);}
    // 图 C（逆向用）：上亮下暗（水平边界）
    this.imgC=[];for(let i=0;i<N;i++){const row=[];
      for(let j=0;j<N;j++){row.push(Math.max(0,Math.min(1,(i<5?0.82:0.3)+g()*0.07)));}this.imgC.push(row);}

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:440px"></div>
        <div class="side">
          <div class="target-card"><h4>当前目标</h4><p id="goalTxt"></p></div>
          <div class="tool-panel" id="askPanel"><h4 id="askTitle">🔮 先预测</h4>
            <p id="askQ" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <div id="askOpts" style="display:flex;flex-direction:column;gap:8px"></div>
            <div id="askFb"></div>
          </div>
          <div class="tool-panel" id="simPanel" style="display:none"><h4 id="kTitle">核设计台（9 个拨轮）</h4>
            <div id="kgrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;justify-items:center"></div>
            <div class="readout" style="margin-top:6px">与目标特征图相似度 <b id="simv">–</b></div>
            <div style="height:10px;border-radius:5px;background:#E8EDF2;overflow:hidden;margin:6px 0">
              <div id="simbar" style="height:100%;width:0;background:linear-gradient(90deg,#C2543C,#3E8A5E);transition:width .2s"></div></div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'核工坊',steps:'幕一 · 看核滑行',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('核工坊 · 三幕',`<p>① 看一枚标准核滑过图像，先预测它在哪里响应最强；② 亲手拨轮设计两枚核（竖边、对角暗记）；③ 只看响应图，反推是哪枚核。</p><p class="dim2 small" style="margin-top:8px">核=可设计的眼睛：一枚核只认一种模式，同一枚核滑全图（权值共享）。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l4'}),
      quick:['为什么这枚核能检测边缘？','权值共享是什么意思？','负响应说明什么？']
    });
    this.buildStage();
    this.act1();
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  conv(img,kern){
    const out=[];
    for(let i=0;i<OUT;i++){const row=[];
      for(let j=0;j<OUT;j++){let s=0;
        for(let a=0;a<K;a++)for(let b=0;b<K;b++)s+=img[i+a][j+b]*kern[a][b];
        row.push(s);}out.push(row);}
    return out;
  }
  cosSim(A,B){
    const a=A.flat(),b=B.flat();let d=0,na=0,nb=0;
    for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
    return d/Math.sqrt(na*nb+1e-9);
  }

  buildStage(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:12px;align-items:flex-start;justify-content:center;padding:8px;flex-wrap:nowrap';
    stage.appendChild(wrap);
    const imgBox=document.createElement('div');imgBox.style.position='relative';
    wrap.appendChild(imgBox);
    this.imgLabel=this.el('div',{class:'dim2 small',style:'text-align:center;margin-bottom:4px'},imgBox);
    this.svgImg=this.svg('svg',{viewBox:`0 0 ${GRID} ${GRID}`,width:320,height:320},imgBox);
    this.svgImg.style.cssText='border-radius:10px;touch-action:none;border:1px solid var(--line)';
    this.winRect=null;
    const fmapBox=document.createElement('div');wrap.appendChild(fmapBox);
    this.fLabel=this.el('div',{class:'dim2 small',style:'text-align:center;margin-bottom:4px'},fmapBox);
    this.svgF=this.svg('svg',{viewBox:`0 0 ${OGRID} ${OGRID}`,width:215,height:215},fmapBox);
    this.svgF.style.cssText='border-radius:10px;border:1px solid var(--line)';
    this.fcells={};
    for(let i=0;i<OUT;i++)for(let j=0;j<OUT;j++){
      const g=this.svg('g',{},this.svgF);
      const r=this.svg('rect',{x:j*OCELL+1,y:i*OCELL+1,width:OCELL-2,height:OCELL-2,rx:3,
        fill:'rgba(255,253,247,.5)',stroke:'#D9E0E8'},g);
      this.fcells[i+','+j]={g,r};
    }
  }
  drawImg(img){
    [...this.svgImg.querySelectorAll('rect')].forEach(r=>r.remove());
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){
      const v=img[i][j];
      this.svg('rect',{x:j*CELL+1,y:i*CELL+1,width:CELL-2,height:CELL-2,rx:3,
        fill:`hsl(210,${18+v*40}%,${94-v*62}%)`},this.svgImg);
    }
    if(this.winRect)this.winRect.remove();
  }
  setWinBox(i,j,color){
    if(this.winRect)this.winRect.remove();
    this.winRect=this.svg('rect',{x:j*CELL,y:i*CELL,width:K*CELL,height:K*CELL,
      fill:'rgba(28,176,246,.12)',stroke:color,'stroke-width':2.5,rx:6},this.svgImg);
  }
  clearFmap(){for(const k in this.fcells)this.fcells[k].r.setAttribute('fill','rgba(255,253,247,.5)');}
  paintFmap(out,ref){
    const flat=ref?ref.flat():out.flat();
    const mx=Math.max(...flat.map(Math.abs),1e-9);
    for(let i=0;i<OUT;i++)for(let j=0;j<OUT;j++){
      const t=out[i][j]/mx;
      this.fcells[i+','+j].r.setAttribute('fill',
        t>0.05?`rgba(28,176,246,${0.08+t*0.5})`:(t<-0.05?`rgba(194,84,60,${0.08-t*0.5})`:'rgba(255,253,247,.5)'));
    }
  }

  /* ---------- 幕一：看核滑行 + 预测 ---------- */
  act1(){
    this.phase='act1';
    this.drawImg(this.imgA);
    this.imgLabel.textContent='图像 A：左亮右暗';
    this.fLabel.textContent='响应图（Sobel-x 核滑行中…）';
    this.clearFmap();
    this.setGoal('幕一 · 看核滑行：一枚标准竖边核 [1 0 −1; 2 0 −2; 1 0 −1] 正在滑过图像——先预测它的响应分布。');
    this.hudApi.setSteps('幕一 · 看核滑行');
    this.ask('这枚核响应最强的位置在哪？',[
      {v:'明暗交界的那一列',ok:true,
       why:'核左边加权和为正、右边为负，两边差异越大响应越强——交界处差异最大。'},
      {v:'左边均匀的亮区',mId:'M-CV-03',
       why:'均匀区左右两边一样亮：正项负项相消，响应≈0。核是"差异探测器"，不是"亮度探测器"。'},
      {v:'图像四个角落',mId:'M-CV-01',
       why:'角落没有什么特殊结构，响应平平。'}
    ],()=>this.runSlideDemo());
  }
  runSlideDemo(){
    document.getElementById('askPanel').style.display='none';
    const out=this.conv(this.imgA,SOBEL_X);
    const mx=Math.max(...out.flat().map(Math.abs));
    const total=OUT*OUT, rate=14;   // 14 格/秒 ≈ 4.6s；按墙钟进度补画（后台节流也能按时完成）
    const t0=performance.now();
    let painted=0;
    const paintTo=n=>{
      while(painted<n){
        const i=Math.floor(painted/OUT), j=painted%OUT;
        this.setWinBox(i,j,'#1CB0F6');
        const t=out[i][j]/mx;
        this.fcells[i+','+j].r.setAttribute('fill',
          t>0.05?`rgba(28,176,246,${0.08+t*0.5})`:(t<-0.05?`rgba(194,84,60,${0.08-t*0.5})`:'rgba(255,253,247,.5)'));
        painted++;
      }
    };
    const tick=()=>{
      if(this.phase!=='act1')return;
      const n=Math.min(total,Math.ceil((performance.now()-t0)/1000*rate));
      paintTo(n);
      if(n>=total){setTimeout(()=>this.act2(),700);return;}
      setTimeout(tick,70);
    };
    setTimeout(tick,400);
  }

  /* ---------- 幕二：设计核 ×2 ---------- */
  act2(){
    this.phase='designA';
    this.startDesign(this.imgA,this.conv(this.imgA,SOBEL_X),
      '设计任务 A · 竖边检测：图 A 左亮右暗。拨动 9 个拨轮，让你的核在特征图上点亮那条竖直边界（相似度 ≥ 0.85）。',
      ()=>this.act3a());
  }
  act3a(){
    this.phase='designB';
    toast('任务 A 完成！换一张藏暗记的图 🔧','ok');
    this.startDesign(this.imgB,this.conv(this.imgB,[[0,-1,0],[-1,2.4,-1],[0,-1,0]]),
      '设计任务 B · 对角暗记：图 B 藏着一条对角亮纹。重新设计你的核，让特征图点亮这条暗记（相似度 ≥ 0.85）。',
      ()=>this.act4());
  }
  startDesign(img,refMap,goalTxt,next){
    this.drawImg(img);
    this.clearFmap();
    this.imgLabel.textContent= img===this.imgA?'图像 A：左亮右暗':'图像 B：均匀底 + 对角暗记';
    this.fLabel.textContent='你的核的响应图（实时）';
    this.setGoal(goalTxt);
    this.hudApi.setSteps(img===this.imgA?'幕二 · 设计核 A':'幕二 · 设计核 B');
    document.getElementById('askPanel').style.display='none';
    document.getElementById('simPanel').style.display='';
    document.getElementById('kTitle').textContent= img===this.imgA
      ?'核设计台 A（9 个拨轮）':'核设计台 B（9 个拨轮）';
    this.kernel=[[1,1,1],[1,1,1],[1,1,1]];   // 从"全 1 核"起步：响应一片均匀不显边——逼学生动手设计
    const kg=document.getElementById('kgrid');kg.innerHTML='';
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){
      makeStepper(kg,{value:this.kernel[a][b],min:-4,max:4,
        onChange:v=>{this.kernel[a][b]=v;this.previewDesign(img,refMap,next);}});
    }
    this._designOK=false;
    this.previewDesign(img,refMap,next);
  }
  previewDesign(img,refMap,next){
    const out=this.conv(img,this.kernel);
    this.paintFmap(out,refMap);
    const sim=this.cosSim(out,refMap);
    document.getElementById('simv').textContent=sim.toFixed(3);
    document.getElementById('simbar').style.width=Math.max(0,sim*100)+'%';
    this.lastSim=sim;
    if(sim>=this.cfg.simThreshold&&!this._designOK){
      this._designOK=true;
      this.record({type:'kernel_pass',correct:true,value:+sim.toFixed(3),task:img===this.imgA?'A':'B'});
      this.right(document.getElementById('simPanel'));
      this.hudApi.setSteps((img===this.imgA?'设计核 A':'设计核 B')+' ✓');
      setTimeout(next,1100);
    }
  }

  /* ---------- 幕三：逆向推断 ---------- */
  act4(){
    this.phase='reverse';
    document.getElementById('simPanel').style.display='none';
    this.drawImg(this.imgC);
    this.imgLabel.textContent='图像 C：上亮下暗';
    this.fLabel.textContent='未知核 K? 的响应图';
    const out=this.conv(this.imgC,SOBEL_Y);
    this.clearFmap();this.paintFmap(out,out);
    this.setWinBox(2,2,'#CE82FF');
    this.setGoal('幕三 · 逆向推断：未知核 K? 在图 C（上亮下暗）上产出右边这张响应图。它是四个候选中的哪一个？');
    this.hudApi.setSteps('幕三 · 逆向推断');
    this.ask('未知核 K? 最可能是：',[
      {v:'横向 Sobel（上下差异：[1 2 1; 0 0 0; −1 −2 −1]）',ok:true,
       why:'响应集中在上下明暗交界——只有"行间差异"核能点亮水平带。'},
      {v:'竖向 Sobel（左右差异，Sobel-x 的转置方向）',mId:'M-CV-06',
       why:'竖向核点亮的应该是竖直带（图 A 那种）。方向转置，响应方向也跟着转。'},
      {v:'符号翻转的横向 Sobel（[−1 −2 −1; 0 0 0; 1 2 1]）',mId:'M-CV-07',
       why:'翻转只把响应亮暗对调（蓝红互换），带的亮度模式不同——看清楚响应图的主色。'},
      {v:'全 1 核（求和平均）',mId:'M-CV-01',
       why:'全 1 核做的是局部求和：整图均匀偏亮，显不出边界。'}
    ],()=>{
      // 揭示：四个候选的真实响应并排小图
      const rev=document.getElementById('askFb');
      rev.innerHTML=`<p class="readout small" style="margin-top:8px">验证：横向 Sobel 的响应与未知响应一致 ✓ —— 核的<b>方向</b>决定响应的<b>方向</b>，核的<b>符号</b>决定亮暗。</p>
        <button class="btn primary" id="finBtn" style="margin-top:10px">完成核工坊 🎓</button>`;
      document.getElementById('finBtn').onclick=()=>{
        this.finish({simA:undefined,simB:+(this.lastSim||0).toFixed(3)});
      };
    },true);
  }

  /* ---------- 通用预测问答 ---------- */
  ask(q,options,onDone,keepPanel){
    const panel=document.getElementById('askPanel');
    panel.style.display='';
    document.getElementById('askTitle').textContent='🔮 先预测';
    document.getElementById('askQ').textContent=q;
    const box=document.getElementById('askOpts');box.innerHTML='';
    document.getElementById('askFb').innerHTML='';
    let wrongN=0;
    options.slice().sort(()=>Math.random()-0.5).forEach((o,i)=>{
      const b=this.el('button',{class:'btn sm',style:'justify-content:flex-start;text-align:left;font-size:13px',
        html:`<b>${String.fromCharCode(65+i)}.</b> ${o.v}`},box);
      b.onclick=()=>{
        if(b.disabled)return;
        const ok=!!o.ok;
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,26),mId:ok?null:(o.mId||'M-CV-01')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          const fb=document.getElementById('askFb');
          fb.innerHTML=`<p style="font-size:13px;line-height:1.8;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`;
          if(!keepPanel)setTimeout(()=>{panel.style.display='none';onDone&&onDone();},2400);
          else onDone&&onDone();
        }else{
          this.wrong(b,o.mId);
          wrongN++;
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;line-height:1.7;color:var(--err);margin-top:4px;text-align:left';
          why.innerHTML=`✗ ${o.why}`;
          b.after(why);
        }
      };
    });
  }

  setGoal(html){document.getElementById('goalTxt').innerHTML=html;}
  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l4',0);}
}
