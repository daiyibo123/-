// L6 注意力连线：拖线调强度 → softmax 法阵 → 与真实分布比对；Q/K/V 身份配对
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeLever } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const W=940,H=400,TY=290;   // 画布 / 词行 y
const zh={The:'这',animal:'动物',"didn't":'没',cross:'穿过',the:'这',street:'街道',because:'因为',it:'它',was:'是',too:'太',tired:'累'};

export default class L6Attention extends LevelBase{
  static id='l6'; static title='注意力连线';

  mount(){
    const cfg=this.cfg=LEVELS.l6;
    this.toks=cfg.tokens;this.n=this.toks.length;this.focus=cfg.focus;
    this.s=new Array(this.n).fill(1);   // 原始强度 0..5
    this.s[this.focus]=0;
    this.xs=this.toks.map((_,i)=>60+i*(W-120)/(this.n-1));
    this.phase='draw';this.attempts=0;this.combo=0;

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="target-card" style="margin-bottom:10px"><h4>当前目标</h4><p id="goalTxt"></p></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:460px"></div>
        <div class="side">
          <div class="target-card"><h4>句子</h4>
            <p class="dim small" style="line-height:1.8">The animal didn't cross the street because <b style="color:var(--warn)">it</b> was too tired.<br><span class="dim2">（这只动物没有过街，因为它太累了。）</span></p>
          </div>
          <div class="tool-panel"><h4>法阵</h4>
            <button class="btn primary" id="softmaxBtn">✨ softmax 归一化</button>
            <div class="dim2 small" style="margin-top:6px">拖动每条线中点的圆点上下移动调节强度；越高越强。调完施法。</div>
          </div>
        </div>
      </div>
      <div class="tray" id="tray" style="display:none"></div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'注意力连线',steps:'读心 0/2',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('规则',`<p>${cfg.goal}</p><p class="dim2 small" style="margin-top:8px">按住连线中点圆点上下拖动调强度（0–5 档）→ 点 softmax 归一化 → 与真实模型注意力比对 → 相似度达标后进入 Q/K/V 配对。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l6'}),
      quick:['注意力权重是什么意思？','softmax 做了什么？','Q/K/V 分别是什么角色？']
    });
    this.buildSVG();
    document.getElementById('softmaxBtn').onclick=()=>this.softmax();
    this.setGoal('阶段 1 · 从 <b style="color:var(--warn)">it</b> 向每个词牵线：按住线中点的圆点<b>上下拖动</b>调节念力强度。凭语感分配——你觉得 "it" 在看谁？');
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildSVG(){
    const stage=document.getElementById('stage');
    this.svgEl=this.svg('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'xMidYMid meet'},stage);
    this.svgEl.style.cssText='width:100%;height:100%;touch-action:none';
    this.gLines=this.svg('g',{},this.svgEl);
    this.gHandles=this.svg('g',{},this.svgEl);
    this.gToks=this.svg('g',{},this.svgEl);
    this.gBars=this.svg('g',{},this.svgEl);
    this.lines=[];this.handles=[];
    for(let i=0;i<this.n;i++){
      const x=this.xs[i],f=this.xs[this.focus];
      const path=this.svg('path',{fill:'none',stroke:i===this.focus?'rgba(201,138,45,.15)':'#1CB0F6',
        'stroke-width':1.5,opacity:i===this.focus?.3:.85},this.gLines);
      this.lines.push(path);
      if(i!==this.focus){
        const h=this.svg('circle',{r:8,fill:'#FFFFFF',stroke:'#1CB0F6','stroke-width':2,cursor:'ns-resize'},this.gHandles);
        this.bindHandle(h,i);
        this.handles.push(h);
      }
      // 词
      const g=this.svg('g',{},this.gToks);
      const r=this.svg('rect',{x:x-30,y:TY-4,width:60,height:34,rx:8,
        fill:i===this.focus?'rgba(201,138,45,.15)':'rgba(255,253,247,.8)',
        stroke:i===this.focus?'#C98A2D':'#D9E0E8'},g);
      const t=this.svg('text',{x:x,y:TY+18,'text-anchor':'middle',fill:i===this.focus?'#8A6414':'#1F2933','font-size':16},g);
      t.textContent=this.toks[i];
      const z=this.svg('text',{x:x,y:TY+40,'text-anchor':'middle',fill:'#98A1AC','font-size':16},g);
      z.textContent=zh[this.toks[i]]||'';
      const pv=this.svg('text',{x:x,y:TY+64,'text-anchor':'middle',fill:'#1CB0F6','font-size':16,
        'font-family':'var(--mono)',opacity:0},g);
      this.pVals=this.pVals||[];this.pVals.push(pv);
    }
    this.renderLines();
  }
  apexY(i){ return TY-30-this.s[i]*22; }
  renderLines(){
    const f=this.xs[this.focus];
    for(let i=0;i<this.n;i++){
      const x=this.xs[i];
      if(i===this.focus)continue;
      const ay=this.apexY(i);
      this.lines[i].setAttribute('d',`M ${f} ${TY-8} Q ${(f+x)/2} ${ay} ${x} ${TY-8}`);
      const hx=(f+2*((f+x)/2)+x)/4, hy=((TY-8)+2*ay+(TY-8))/4;
      const h=this.handles.find(hh=>+hh.dataset.i===i);
      if(h){h.setAttribute('cx',hx);h.setAttribute('cy',hy);}
    }
  }
  bindHandle(h,i){
    h.dataset.i=i;
    h.addEventListener('pointerdown',e=>{
      e.preventDefault();try{h.setPointerCapture(e.pointerId)}catch(_){}
      const move=ev=>{
        const r=this.svgEl.getBoundingClientRect();
        const y=(ev.clientY-r.top)/r.height*H;
        this.s[i]=Math.max(0,Math.min(5,(TY-30-y)/22));
        this.renderLines();
      };
      const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);
        this.record({type:'set_strength',correct:null,target:i,value:+this.s[i].toFixed(1)});};
      h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);
    });
  }

  softmax(){
    if(this.phase!=='draw')return;
    this.phase='softmax';
    const ex=this.s.map(v=>Math.exp(v/1.5));
    const sum=ex.reduce((a,b)=>a+b,0);
    this.p=ex.map(e=>e/sum);
    // 动画：线宽过渡 + 显示概率
    this.gToks.querySelectorAll('text').forEach(()=>{});
    for(let i=0;i<this.n;i++){
      if(i===this.focus)continue;
      const line=this.lines[i];
      line.style.transition='stroke-width .8s cubic-bezier(.2,.9,.3,1)';
      line.style.strokeWidth=1+this.p[i]*22;
      this.pVals[i].setAttribute('opacity',1);
      this.pVals[i].textContent=this.p[i].toFixed(2);
      this.handles.filter(h=>h.dataset.i==i).forEach(h=>h.style.display='none');
    }
    this.record({type:'softmax',correct:null,value:this.p.map(v=>+v.toFixed(3))});
    toast('法阵生效：e^s / Σe^s —— 强线指数级放大，弱线被压扁，总和恰为 1','ok',3500);
    setTimeout(()=>this.reveal(),1200);
  }

  reveal(){
    const cfg=this.cfg;
    let dot=0,n1=0,n2=0;
    for(let i=0;i<this.n;i++){dot+=this.p[i]*cfg.ref[i];n1+=this.p[i]*this.p[i];n2+=cfg.ref[i]*cfg.ref[i];}
    const sim=dot/Math.sqrt(n1*n2);
    this.sim=sim;
    // 参考分布条形
    const bars=[];const maxR=Math.max(...cfg.ref);
    for(let i=0;i<this.n;i++){
      const x=this.xs[i],h=cfg.ref[i]/maxR*70;
      this.svg('rect',{x:x-14,y:H-30-h,width:28,height:h,rx:3,fill:'rgba(140,111,212,.55)'},this.gBars);
      const t=this.svg('text',{x:x,y:H-8,'text-anchor':'middle',fill:'#CE82FF','font-size':16,'font-family':'var(--mono)'},this.gBars);
      t.textContent=cfg.ref[i].toFixed(2);
    }
    this.gBars.insertBefore(document.createElementNS('http://www.w3.org/2000/svg','text'),this.gBars.firstChild);
    this.setGoal(`相似度（余弦）= <b>${sim.toFixed(3)}</b>　紫条 = 真实模型注意力（GPT 类模型在该句上的典型分布）　${sim>=cfg.simThreshold?'<b style="color:var(--ok)">✔ 达标！进入下一阶段</b>':'<b style="color:var(--err)">未达标（≥'+cfg.simThreshold+'）——点击某条线可重新调整再施法</b>'}`);
    this.attempts++;
    this.record({type:'reveal',correct:sim>=cfg.simThreshold,mId:sim>=cfg.simThreshold?null:'M-AT-01',value:+sim.toFixed(3)});
    if(sim>=cfg.simThreshold){
      this.right(this.svgEl);
      this.hudApi.setSteps('读心 1/2');
      setTimeout(()=>this.part2(),1400);
    }else{
      this.wrong(this.svgEl,'M-AT-01');
      // 允许重调：恢复把手
      this.phase='draw';
      setTimeout(()=>{
        for(let i=0;i<this.n;i++){
          if(i===this.focus)continue;
          this.lines[i].setAttribute('stroke-width',1.5);
          this.pVals[i].setAttribute('opacity',0);
          this.handles.filter(h=>h.dataset.i==i).forEach(h=>h.style.display='');
        }
        this.gBars.innerHTML='';
      },2600);
      document.getElementById('softmaxBtn').onclick=()=>this.softmax();
    }
  }

  part2(){
    // 5-2 升级：温度实验室 + 多头小问（预测-验证），取代原 Q/K/V 身份配对
    this.phase='temp';
    document.getElementById('softmaxBtn').style.display='none';
    this.gBars.innerHTML='';
    this.setGoal('阶段 2 · 温度实验室：拉动温度滑杆，看 "it" 的注意力分布如何被熨平/削尖。先预测，再亲手验证。');
    const tray=document.getElementById('tray');tray.style.display='';
    tray.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='flex:1;display:flex;flex-direction:column;gap:8px;min-width:300px';
    tray.appendChild(box);
    // 温度滑杆 + 分布条
    const leverBox=document.createElement('div');box.appendChild(leverBox);
    const barsBox=document.createElement('div');
    barsBox.style.cssText='display:flex;flex-direction:column;gap:3px';
    box.appendChild(barsBox);
    const TEMPS=[{label:'T=0.3',v:0.3},{label:'T=0.7',v:0.7},{label:'T=1.0',v:1.0},{label:'T=1.5',v:1.5},{label:'T=3.0',v:3.0}];
    const ref=this.cfg.ref;  // 真实注意力分布
    const tempW=T=>{
      const s=ref.map(p=>Math.pow(p,1/T));
      const Z=s.reduce((a,b)=>a+b,0);
      return s.map(v=>v/Z);
    };
    const lever=makeLever(leverBox,{label:'温度 T（作用在注意力分数上）',gears:TEMPS,value:2,
      onChange:g=>this.paintTemp(barsBox,tempW(g.v),g.v)});
    this.paintTemp(barsBox,tempW(1.0),1.0);
    // 三问（预测-验证）
    const qs=[
      {q:'哪个温度会让分布最接近"只看 animal"（one-hot 化）？',
       options:[
        {v:'T=0.3（低温）',ok:true,why:'低温把分数差距指数放大——强的更强、弱的几乎归零，分布变得锋利。'},
        {v:'T=3.0（高温）',mId:'M-AT-06',
         why:'反了：高温把差距熨平，分布更接近均匀——每个词都分到一些。'},
        {v:'温度只影响速度，不改变分布形状',mId:'M-AT-02',
         why:'温度直接作用在 softmax 前的分数上（除以 T），形状随之改变。'}]},
      {q:'文本生成时把温度调得很高（如 2.0+），输出会怎样？',
       options:[
        {v:'更多样、更有创意，但也更容易语无伦次',ok:true,why:'对——采样更随机：低概率词也有机会被选中。这是"多样性 vs 连贯性"的旋钮。'},
        {v:'更准确，模型会挑最确定的词',mId:'M-AT-06',why:'挑最确定的词是低温的行为（接近贪心）。'},
        {v:'没有任何影响',mId:'M-AT-02',why:'温度是采样分布的形状参数，影响显著。'}]},
      {q:'Multi-Head：第二只头（另一个注意力头）可能在看什么？',
       options:[
        {v:'别的依赖关系——比如 it 与 was 的主谓一致（句法）',ok:true,why:'对：多头=多组 Q/K/V 各学各的关系，一只看指代、一只看句法、一只看邻近词。'},
        {v:'和第一只头完全相同的分布',mId:'M-AT-09',
         why:'如果完全相同，这只头就没有存在价值——冗余的头在训练中会被逐步分化。'},
        {v:'纯随机噪声',mId:'M-AT-09',why:'随机分布学不到稳定关系，梯度会把它推向有用的模式。'}]}
    ];
    let qi=0;
    const qBox=document.createElement('div');box.appendChild(qBox);
    const askQ=()=>{
      const item=qs[qi];
      qBox.innerHTML=`<p style="font-size:13.5px;line-height:1.7;font-weight:700;text-align:left;margin:6px 0 0">🔮 ${item.q}</p>
        <div style="display:flex;flex-direction:column;gap:6px" id="tOpts"></div><div id="tFb"></div>`;
      item.options.slice().sort(()=>Math.random()-0.5).forEach(o=>{
        const b=document.createElement('button');
        b.className='btn sm';b.style.cssText='justify-content:flex-start;text-align:left;font-size:13px';
        b.textContent=o.v;
        b.onclick=()=>{
          if(b.disabled)return;
          const ok=!!o.ok;
          this.record({type:'temp_quiz',correct:ok,step:qi+1,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-AT-06')});
          if(ok){
            this.right(b);b.style.borderColor='var(--ok)';
            qBox.querySelectorAll('button').forEach(x=>x.disabled=true);
            document.getElementById('tFb').innerHTML=`<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:4px">✓ ${o.why}</p>`;
            qi++;
            if(qi>=qs.length){
              this.hudApi.setSteps('读心 2/2');
              toast('分布·温度·多头——读心试炼完成 🔮','ok',3000);
              setTimeout(()=>this.finish({sim:this.sim}),1600);
            }else setTimeout(askQ,2400);
          }else{
            this.wrong(b,o.mId);
            b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
            const why=document.createElement('p');
            why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
            why.textContent=`✗ ${o.why}`;
            b.after(why);
          }
        };
        qBox.querySelector('#tOpts').appendChild(b);
      });
    };
    askQ();
  }
  paintTemp(barsBox,w,T){
    const toks=this.cfg.tokens,focus=this.cfg.focus;
    barsBox.innerHTML=w.map((p,i)=>{
      if(i===focus)return '';
      const pct=Math.max(1.5,p*100);
      const hot=T<0.6?'#1CB0F6':(T>1.2?'#CE82FF':'#C98A2D');
      return `<div style="display:flex;align-items:center;gap:6px;font-size:11.5px">
        <span style="width:44px;text-align:right;color:#5A6774">${toks[i]}</span>
        <div style="flex:1;height:13px;border-radius:4px;background:#E8EDF2;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${hot};transition:width .3s"></div></div>
        <span class="mono" style="width:38px">${(p*100).toFixed(0)}%</span></div>`;
    }).join('');
  }

  setGoal(html){document.getElementById('goalTxt').innerHTML=html;}
  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l6',0);}
}
