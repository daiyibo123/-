// L3-B 平移的阴谋（3-3）：目标平移 2 格 → 预测卷积/池化响应变化 → 层级抽象
// 设计文档：docs/案例总设计_v3_第2-6章.md 3-3 节
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const N=10,K=3,OUT=N-K+1,PO=4;   // 10×10 图，3×3 核，8×8 特征图，4×4 池化后
const SOBEL_X=[[1,0,-1],[2,0,-2],[1,0,-1]];

function conv(img,kern){const o=[];for(let i=0;i<OUT;i++){const r=[];for(let j=0;j<OUT;j++){let s=0;
  for(let a=0;a<K;a++)for(let b=0;b<K;b++)s+=img[i+a][j+b]*kern[a][b];r.push(s);}o.push(r);}return o;}
function maxpool(f){const o=[];for(let i=0;i<PO;i++){const r=[];for(let j=0;j<PO;j++){
  r.push(Math.max(f[2*i][2*j],f[2*i][2*j+1],f[2*i+1][2*j],f[2*i+1][2*j+1]));}o.push(r);}return o;}

export default class L3BShift extends LevelBase{
  static id='l3b'; static title='平移的阴谋';

  mount(){
    const cfg=this.cfg=LEVELS.l3b;
    // 图像：底 0.4，一条竖亮带在 col 2-3（目标）
    this.makeImg=offset=>{
      const img=[];
      for(let i=0;i<N;i++){const row=[];
        for(let j=0;j<N;j++){let v=0.4+((i*7+j*13)%5)*0.008;
          const c=j+offset; if(c===2||c===3)v=0.9;
          row.push(Math.max(0,Math.min(1,v)));}img.push(row);}
      return img;
    };
    this.imgA=this.makeImg(0);this.imgB=this.makeImg(2);
    this.fA=conv(this.imgA,SOBEL_X);this.fB=conv(this.imgB,SOBEL_X);
    this.pA=maxpool(this.fA);this.pB=maxpool(this.fB);
    this.maxF=Math.max(...this.fA.flat().map(Math.abs),...this.fB.flat().map(Math.abs));
    this.maxP=Math.max(...this.pA.flat());

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:420px"></div>
        <div class="side">
          <div class="target-card"><h4>当前目标</h4><p id="goalTxt"></p></div>
          <div class="tool-panel" id="askPanel" style="display:none"><h4>🔮 先预测</h4>
            <p id="askQ" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <div id="askOpts" style="display:flex;flex-direction:column;gap:8px"></div>
            <div id="askFb"></div>
          </div>
          <div class="tool-panel" id="shiftPanel" style="display:none"><h4>🎭 平移开关</h4>
            <button class="btn primary" id="shiftBtn" style="width:100%">目标向右平移 2 格 ▶</button>
            <div class="dim2 small" style="margin-top:6px">观察四张图的变化</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'平移的阴谋',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('平移的阴谋',`<p>目标（竖亮带）平移 2 格：卷积响应会怎样？池化后的最强响应呢？最后看浅层/深层特征分别"看"到什么。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l3b'}),
      quick:['池化为什么带来不变性？','不变性的代价是什么？','感受野是什么？']
    });
    this.buildGrids();
    this.setGoal('幕一 · 预测：竖亮带目标将向右平移 2 格。四张图（原图/卷积响应/池化响应）会怎么变？');
    this.ask('平移 2 格后，卷积响应与池化最强响应分别？',[
      {v:'卷积响应位置跟着挪；池化后的最强响应几乎不变（平移不变性）',ok:true,
       why:'对。卷积忠实记录位置；max-pool 只留窗口最强信号——挪一点，最强还是那条带（代价：位置信息丢了）。'},
      {v:'两者都完全不变',mId:'M-CV-01',
       why:'卷积是位置敏感的：目标挪，响应跟着挪。'},
      {v:'两者都彻底改变，无法辨认',mId:'M-CV-01',
       why:'小平移下结构完好——这正是 CNN 对小幅位置扰动鲁棒的原因。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildGrids(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;gap:18px;align-items:flex-start;justify-content:center;flex-wrap:wrap;padding:10px';
    stage.appendChild(box);
    const mk=(title,cb)=>{
      const col=document.createElement('div');col.style.textAlign='center';
      const lab=document.createElement('div');lab.className='dim2 small';lab.textContent=title;
      const sv=this.svg('svg',{viewBox:'0 0 120 120',width:120,height:120},col);
      sv.style.cssText='border-radius:8px;border:1px solid var(--line)';
      box.appendChild(col);cb(sv);return sv;
    };
    this.svImg=mk('原图 10×10',()=>{});
    this.svConv=mk('卷积响应 8×8',()=>{});
    this.svPool=mk('池化后 4×4',()=>{});
    this.svLayer=mk('浅/深层特征',()=>{});
    this.paintAll(this.imgA,this.fA,this.pA);
  }
  paintAll(img,f,p){
    const cell=(sv,n,vals,mx,blue)=>{[...sv.children].forEach(c=>c.remove());
      const sz=120/n;
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){
        const v=vals[i][j]/mx;
        const fill=blue?(v>0?`rgba(28,176,246,${0.06+v*0.85})`:'rgba(255,253,247,.5)')
          :`hsl(210,${18+v*40}%,${94-v*62}%)`;
        this.svg('rect',{x:j*sz+1,y:i*sz+1,width:sz-2,height:sz-2,rx:2,fill},sv);
      }};
    cell(this.svImg,N,img,1,false);
    cell(this.svConv,OUT,f.map(r=>r.map(Math.abs)),this.maxF,true);
    cell(this.svPool,PO,p.map(r=>r.map(v=>v/this.maxP)),1,true);
    // 层级抽象：浅层=边（横条示意），深层=部件（块示意）
    [...this.svLayer.children].forEach(c=>c.remove());
    this.svg('text',{x:60,y:30,'text-anchor':'middle','font-size':16,fill:'#1CB0F6'},this.svLayer).textContent='浅层：看到边';
    for(let j=0;j<6;j++)this.svg('rect',{x:14+j*16,y:36,width:10,height:10,rx:2,fill:'rgba(28,176,246,.5)'},this.svLayer);
    this.svg('text',{x:60,y:74,'text-anchor':'middle','font-size':16,fill:'#3E8A5E'},this.svLayer).textContent='深层：拼成部件';
    this.svg('rect',{x:30,y:80,width:24,height:24,rx:4,fill:'rgba(62,138,94,.45)'},this.svLayer);
    this.svg('rect',{x:66,y:80,width:24,height:24,rx:4,fill:'rgba(62,138,94,.45)'},this.svLayer);
  }

  act2(){
    this.phase='shift';
    this.hudApi.setSteps('幕二 · 平移验证');
    this.setGoal('幕二 · 平移验证：点按钮让目标右移 2 格，亲眼验证你的预测。');
    document.getElementById('shiftPanel').style.display='';
    document.getElementById('shiftBtn').onclick=()=>{
      document.getElementById('shiftBtn').disabled=true;
      this.record({type:'shift_done',correct:true,value:2});
      this.paintAll(this.imgB,this.fB,this.pB);
      toast('看：卷积响应挪了位置，池化最强响应稳住了 ✓','ok',3000);
      setTimeout(()=>this.act3(),1800);
    };
  }

  act3(){
    this.phase='concept';
    this.hudApi.setSteps('幕三 · 两问');
    this.setGoal('幕三 · 两问：不变性的代价 + 层级抽象。');
    this.ask('max-pool 的"平移不变性"代价是什么？',[
      {v:'位置信息丢失——只知道"有、多强"，不知道"在哪"',ok:true,
       why:'对。这也是定位任务需要特殊设计（如跳跃连接）的原因。'},
      {v:'没有代价',mId:'M-CV-01',why:'天下没有免费的午餐——丢了位置分辨力。'},
      {v:'参数量暴增',mId:'M-CV-01',why:'池化反而把尺寸减半、后续参数更少。'}
    ],()=>{
      this.ask('深层的"一个神经元"对应原图的什么？',[
        {v:'一大片区域（感受野层层扩大）——所以它能看到"部件"而不只是边',ok:true,
         why:'对。3×3 核层层叠加，感受野按层扩张：边→角→部件→语义。'},
        {v:'还是一个像素',mId:'M-CV-01',why:'那是输入层；每往深一层感受野扩大。'},
        {v:'整张图的平均',mId:'M-CV-01',why:'不到全局平均那一步，是逐步扩大的局部。'}
      ],()=>this.finish({}),true);
      const w=setInterval(()=>{if(document.getElementById('finBtn6'))clearInterval(w);},300);
    });
  }

  ask(q,options,onDone,keep){
    const panel=document.getElementById('askPanel');
    panel.style.display='';
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-CV-01')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn6" style="margin-top:10px">完成平移的阴谋 🎓</button>`:'');
          if(keep)document.getElementById('finBtn6').onclick=()=>this.finish({});
          else if(onDone)setTimeout(()=>{panel.style.display='none';onDone&&onDone();},2600);
        }else{
          this.wrong(b,o.mId);wrongN++;
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
          why.innerHTML=`✗ ${o.why}`;b.after(why);
        }
      };
    });
  }

  setGoal(html){document.getElementById('goalTxt').innerHTML=html;}
  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l3b',0);}
}
