// L5-B 因果之幕（5-3）：因果 Mask 热图交互 + 词序打乱实验（位置编码）+ 并行概念
// 设计文档：docs/案例设计/5B5C-因果之幕与王座之争-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeLever } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const TOKS=['the','cat','sat','on','the'];

export default class L5BMask extends LevelBase{
  static id='l5b'; static title='因果之幕';

  mount(){
    const cfg=this.cfg=LEVELS.l5b;
    this.maskPos=5;   // 幕布位置：5=全可见，0=全因果(仅自身)
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
          <div class="tool-panel" id="maskPanel" style="display:none"><h4>🎭 因果幕布</h4>
            <div id="maskLever"></div>
            <div class="dim2 small" style="margin-top:6px">右=未来全可见（作弊）；左=因果（只见过去）</div>
          </div>
          <div class="tool-panel" id="shufflePanel" style="display:none"><h4>🔀 词序实验</h4>
            <button class="btn primary" id="shuffleBtn" style="width:100%">交换 cat ↔ sat</button>
            <div class="dim2 small" style="margin-top:6px">观察热图/输出是否变化</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'因果之幕',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('因果之幕',`<p>生成第 t 个词只能看前 t−1 个词——因果 Mask 把未来位置的 score 置 −∞（softmax 后权重 0）。训练时全句并行、各自带 Mask；生成时逐词自回归。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l5b'}),
      quick:['Mask 为什么置 −∞ 不是 0？','位置编码有哪几种？','训练并行生成串行为什么不矛盾？']
    });
    this.buildHeat();
    this.setGoal('幕一 · 预测：右图是完整注意力热图（行=查询词，列=被看词）。把"未来格子"的 score 设为 −∞ 后，"on" 那一行的权重会怎么变？');
    this.ask('因果 Mask 后，"on" 行的权重分布？',[
      {v:'未来格归零，剩下的词重新归一化（行和仍是 1）',ok:true,
       why:'对。−∞ 经 e^ 后是 0，分母只剩过去项——这是"硬"遮挡，不是软衰减。'},
      {v:'未来格变小但不为 0',mId:'M-AT-06',
       why:'Mask 是硬置零（−∞→e^−∞=0），不是打折。'},
      {v:'完全不变',mId:'M-AT-06',
       why:'去掉一半候选后分布必然重新洗牌。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  /* 分数矩阵（教学构造：近邻+同词偏好） */
  scores(){
    const S=[];
    for(let i=0;i<5;i++){const row=[];
      for(let j=0;j<5;j++){
        let s=TOKS[i]===TOKS[j]?2.0:0;
        s+=Math.max(0,1.6-Math.abs(i-j)*0.55);
        row.push(s);
      } S.push(row);}
    return S;
  }
  maskedW(){
    const S=this.scores();
    const W=S.map((row,i)=>row.map((s,j)=>(j>i? -Infinity : s)));
    return W.map(row=>{
      const ex=row.map(v=>v===-Infinity?0:Math.exp(v));
      const Z=ex.reduce((a,b)=>a+b,0)||1;
      return ex.map(v=>v/Z);
    });
  }
  fullW(){
    const S=this.scores();
    return S.map(row=>{
      const ex=row.map(v=>Math.exp(v));
      const Z=ex.reduce((a,b)=>a+b,0);
      return ex.map(v=>v/Z);
    });
  }

  buildHeat(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 460 380',width:'100%',style:'max-width:440px'},box);
    this.heatG=this.svg('g',{},this.svgEl);
    this.legend=this.el('div',{class:'dim2 small'},box);
    this.legend.textContent='行=查询（谁在看），列=键（看谁）。颜色越深权重越大。';
    this.paint(this.fullW(),null);
  }
  paint(W,maskLine){
    [...this.heatG.children].forEach(c=>c.remove());
    const C=64,SZ=58;
    TOKS.forEach((t,j)=>{
      const tx=this.svg('text',{x:C+j*SZ+SZ/2,y:C-8,'text-anchor':'middle','font-size':16,fill:'#C2543C'},this.heatG);
      tx.textContent=t;
    });
    TOKS.forEach((t,i)=>{
      const ty=this.svg('text',{x:C-10,y:C+i*SZ+SZ/2+4,'text-anchor':'end','font-size':16,fill:'#1CB0F6','font-weight':700},this.heatG);
      ty.textContent=t;
    });
    W.forEach((row,i)=>row.forEach((v,j)=>{
      const fut=j>i&&maskLine!==null&&j>maskLine+i;   // 幕布判定：j > i + 允许的未来量
      const masked=maskLine!==null&&j>i+maskLine;
      const alpha=(maskLine!==null&&masked)?0:v;
      this.svg('rect',{x:C+j*SZ+2,y:C+i*SZ+2,width:SZ-4,height:SZ-4,rx:5,
        fill:`rgba(28,176,246,${(0.06+alpha*0.85).toFixed(3)})`,
        stroke:masked?'#C7CFD8':'#D9E0E8','stroke-width':masked?1:1.2,
        'stroke-dasharray':masked?'4 3':'none'},this.heatG);
      if(maskLine===null||!masked){
        const tx=this.svg('text',{x:C+j*SZ+SZ/2,y:C+i*SZ+SZ/2+4,'text-anchor':'middle','font-size':16,
          fill:alpha>0.5?'#fff':'#3A4450'},this.heatG);
        tx.textContent=(v*100).toFixed(0);
      }
    }));
  }

  act2(){
    this.phase='mask';
    this.hudApi.setSteps('幕二 · 盖幕');
    this.setGoal('幕二 · 盖幕：拖动滑杆把幕布拉到最左（因果）——上半三角熄灭，每行在剩余词上重新归一化（行和仍是 1）。');
    document.getElementById('maskPanel').style.display='';
    const lv=makeLever(document.getElementById('maskLever'),{
      label:'幕布位置（右=未来全可见）',
      gears:[{label:'因果',v:0},{label:'看1词',v:1},{label:'看2词',v:2},{label:'看3词',v:3},{label:'全开',v:4}],
      value:4,
      onChange:g=>{
        const allow=g.v;   // 每行允许的未来词数
        this.maskPos=allow;
        const S=this.scores();
        const W=S.map((row,i)=>row.map((s,j)=>(j<=i+allow? s : -Infinity))
          ).map(row=>{
            const ex=row.map(v=>v===-Infinity?0:Math.exp(v));
            const Z=ex.reduce((a,b)=>a+b,0)||1;
            return ex.map(v=>v/Z);
          });
        this.paint(W,allow);
        this.record({type:'mask_drag',correct:null,value:allow});
      }});
    // 初始全开
    setTimeout(()=>{
      document.getElementById('shufflePanel').style.display='';
      document.getElementById('shuffleBtn').onclick=()=>this.act3();
    },400);
  }

  act3(){
    this.phase='shuffle';
    this.hudApi.setSteps('幕三 · 词序实验');
    this.setGoal('幕三 · 词序实验：把 cat 和 sat 交换。先预测：注意力热图/输出会变吗？');
    this.ask('交换 cat ↔ sat 后，注意力会怎样？',[
      {v:'基本一样——自注意力对"顺序"本身不敏感（词袋）',ok:true,
       why:'对！注意力只看内容相似度，不看谁先谁后——"猫坐"和"坐猫"在它眼里一样。这就是需要位置编码的原因。'},
      {v:'完全不同，顺序是天生编码在注意力里的',mId:'M-AT-07',
       why:'自注意力是置换等变的：打乱输入顺序，输出跟着同样打乱——相对关系不变。'},
      {v:'会崩溃报错',mId:'M-AT-07',why:'维度不变，只是内容换位。'}
    ],()=>{
      // 执行交换：TOKS[1]<->TOKS[2]，重画全图验证
      const t=TOKS[1];TOKS[1]=TOKS[2];TOKS[2]=t;
      this.paint(this.fullW(),null);
      this.record({type:'shuffle_done',correct:true,value:TOKS.join(' ')});
      this.ask('加上位置编码（给第 i 个词加位置向量）解决什么？',[
        {v:'让注意力能区分词序——"猫坐"≠"坐猫"',ok:true,
         why:'对。位置编码把顺序信息注入词向量，弥补置换等变性的"失明"。'},
        {v:'防止过拟合',mId:'M-AT-07',why:'那是正则化的职责。'},
        {v:'加快计算',mId:'M-AT-07',why:'位置编码只是加法注入，与速度无关。'}
      ],()=>{
        this.ask('Transformer 训练能全并行，根本原因？',[
          {v:'每个位置各自带因果 Mask 独立计算，不需要等前一步算完',ok:true,
           why:'对——对比 RNN 的逐步递归。生成时仍是逐词自回归（串行）。'},
          {v:'因为 GPU 够快',mId:'M-AT-08',
           why:'硬件是放大器不是原因；RNN 的逐步依赖才是它并不了的根源。'},
          {v:'因为用了残差连接',mId:'M-AT-08',
           why:'残差帮助深层训练，与并行无关。'}
        ],()=>this.finish({}),true);
        const w=setInterval(()=>{if(document.getElementById('finBtn5'))clearInterval(w);},300);
      });
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-AT-06')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn5" style="margin-top:10px">完成因果之幕 🎓</button>`:'');
          if(keep)document.getElementById('finBtn5').onclick=()=>this.finish({});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l5b',0);}
}
