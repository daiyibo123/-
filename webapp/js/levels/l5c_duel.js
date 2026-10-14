// L5-C 王座之争（5-4）：Transformer vs RNN——长依赖赛跑 + 三轴三问
// 设计文档：docs/案例设计/5B5C-因果之幕与王座之争-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const N=30, R=0.97;

export default class L5CDuel extends LevelBase{
  static id='l5c'; static title='王座之争';

  mount(){
    const cfg=this.cfg=LEVELS.l5c;
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
          <div class="tool-panel" id="racePanel" style="display:none"><h4>🏁 赛跑</h4>
            <button class="btn primary" id="raceBtn" style="width:100%">开始传递 30 站 ▶</button>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'王座之争',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('王座之争',`<p>句子 30 词，句尾要用上句首 "The key" 的信息。RNN 沿时间轴一站站传（每站 ×0.97）；注意力一步直连。看完赛跑，答三轴对比。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l5c'}),
      quick:['注意力 O(n²) 指什么？','为什么说 RNN 也能并行就赢了？','什么时候还用 RNN？']
    });
    this.buildRace();
    this.setGoal('幕一 · 预测：句尾要用上 29 词之前的信息。RNN 逐步传递（×0.97/站），注意力一步直连——谁的信号到达得更完整？');
    this.ask('30 词后，谁把句首信息送到了句尾？',[
      {v:'注意力——query 与远处 key 一步直连，信号 100% 到达',ok:true,
       why:'对。注意力没有"传话游戏"：任意两词之间都是一跳。'},
      {v:'RNN——0.97 的衰减很小，传得到',mId:'M-AT-08',
       why:'0.97²⁹≈40%：不是到不到的问题，是被稀释了多少。序列再长些就归零（第 4 章的教训）。'},
      {v:'一样——两者都能完美传到',mId:'M-AT-08',
       why:'RNN 的逐步传递是硬约束，长距离必然衰减。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildRace(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 700 300',width:'100%',style:'max-width:700px'},box);
    const defs=this.svg('defs',{},this.svgEl);
    const mk=this.svg('marker',{id:'ar4',markerWidth:'7',markerHeight:'7',refX:'6',refY:'3',orient:'auto'},defs);
    this.svg('path',{d:'M0 0 L6 3 L0 6 z',fill:'#5A6774'},mk);
    // 句子（首尾高亮）
    const words='the key was found after a long search behind the old bookshelf in the quiet room at the end'.split(' ');
    words.forEach((w,i)=>{
      const x=30+i*(640/N);
      if(i<2||i>=N-1){
        this.svg('rect',{x:x-10,y:110,width:32,height:22,rx:5,fill:i<2?'rgba(28,176,246,.15)':'rgba(194,84,60,.15)'},this.svgEl);
      }
      this.svg('text',{x:x+6,y:125,'text-anchor':'middle','font-size':16,fill:i<2?'#1CB0F6':(i>=N-1?'#C2543C':'#B4A98F')},this.svgEl).textContent=w;
    });
    // RNN 泳道（上）
    this.svg('text',{x:24,y:170,'font-size':16,fill:'#C98A2D','font-weight':700},this.svgEl).textContent='RNN 传递';
    this.rnnBar=this.svg('rect',{x:110,y:160,width:0,height:14,rx:5,fill:'#C98A2D'},this.svgEl);
    this.rnnPct=this.svg('text',{x:640,y:172,'font-size':16,fill:'#C98A2D'},this.svgEl);
    this.rnnPct.textContent='100%';
    // 注意力泳道（下）
    this.svg('text',{x:24,y:210,'font-size':16,fill:'#3E8A5E','font-weight':700},this.svgEl).textContent='注意力直连';
    this.attnArc=this.svg('path',{d:`M36 118 C 250 40, 450 40, 664 118`,stroke:'rgba(62,138,94,.5)','stroke-width':0,fill:'none'},this.svgEl);
    this.attnPct=this.svg('text',{x:640,y:212,'font-size':16,fill:'#3E8A5E'},this.svgEl);
    this.attnPct.textContent='';
    // 结论行
    this.concl=this.svg('text',{x:350,y:262,'text-anchor':'middle','font-size':16,fill:'#1F2933','font-weight':700},this.svgEl);
    this.concl.textContent='';
  }

  act2(){
    this.phase='race';
    this.hudApi.setSteps('幕二 · 赛跑');
    this.setGoal('幕二 · 赛跑：点「开始传递」，看两条泳道——RNN 逐站衰减 vs 注意力一步直达。');
    document.getElementById('racePanel').style.display='';
    document.getElementById('raceBtn').onclick=()=>{
      document.getElementById('raceBtn').disabled=true;
      this.record({type:'race_start',correct:null,value:30});
      // 注意力：一步直连（弧线亮起）
      setTimeout(()=>{
        this.attnArc.setAttribute('stroke-width',3);
        this.attnArc.setAttribute('stroke','rgba(62,138,94,.85)');
        this.attnPct.textContent='100%（一步）';
        this.right(this.attnPct);
      },600);
      // RNN：逐站推进（时间补偿，总时长 ~6s）
      const t0=performance.now(), dur=6000, total=N-1;
      const tick=()=>{
        if(this.phase!=='race')return;
        const n=Math.min(total,Math.ceil((performance.now()-t0)/dur*total));
        const pct=Math.pow(R,n);
        this.rnnBar.setAttribute('width',n/N*520);
        this.rnnPct.textContent=(pct*100).toFixed(0)+'%';
        if(n>=total){
          this.concl.textContent=`RNN 只剩 ${(pct*100).toFixed(0)}%（0.97²⁹），注意力 100% 直达——长依赖之王易主。`;
          this.record({type:'race_done',correct:true,value:+pct.toFixed(3)});
          setTimeout(()=>this.act3(),1600);
          return;
        }
        setTimeout(tick,200);
      };
      setTimeout(tick,300);
    };
  }

  act3(){
    this.phase='axes';
    this.hudApi.setSteps('幕三 · 三轴三问');
    this.setGoal('幕三 · 三轴三问：长依赖 / 并行 / 代价——王座之争的完整账本。');
    const qs=[
      {q:'轴① 长距离依赖：两者的路径长度？',options:[
        {v:'注意力任意两词一跳（O(1)），RNN 要走 n 步（O(n)）',ok:true,why:'对——直连 vs 传话游戏。'},
        {v:'都是 O(n)',mId:'M-AT-08',why:'注意力矩阵里任意 (i,j) 都是直接计算的。'},
        {v:'RNN 更短',mId:'M-AT-08',why:'RNN 恰恰是被"逐步"卡死的那个。'}]},
      {q:'轴② 训练并行性？',options:[
        {v:'Transformer 全位置并行计算；RNN 必须按时间步串行',ok:true,why:'对——这是大数据时代注意力胜出的工程理由。'},
        {v:'两者都能并行',mId:'M-AT-08',why:'RNN 的 hₜ 依赖 hₜ₋₁，天然串行。'},
        {v:'都能并行，只是 RNN 慢一点',mId:'M-AT-08',why:'不是"慢一点"，是依赖链锁死。'}]},
      {q:'轴③ 代价与适用？',options:[
        {v:'注意力 O(n²)：序列越长算力显存越炸——短序列低算力场景 RNN 仍有优势',ok:true,why:'对。工程没有银弹：n² 是注意力的账单。'},
        {v:'Transformer 全面碾压，RNN 已无价值',mId:'M-AT-08',why:'端侧/超长流式场景，轻量 RNN 仍是选择。'},
        {v:'注意力是 O(n)',mId:'M-AT-08',why:'每对词都要算 score：n² 个格子。'}]}
    ];
    let qi=0;
    const panel=document.getElementById('askPanel');
    const askNext=()=>{
      const it=qs[qi];
      panel.style.display='';
      document.getElementById('askQ').textContent=it.q;
      const box=document.getElementById('askOpts');box.innerHTML='';
      document.getElementById('askFb').innerHTML='';
      let wrongN=0;
      it.options.slice().sort(()=>Math.random()-0.5).forEach((o,i)=>{
        const b=this.el('button',{class:'btn sm',style:'justify-content:flex-start;text-align:left;font-size:13px',
          html:`<b>${String.fromCharCode(65+i)}.</b> ${o.v}`},box);
        b.onclick=()=>{
          if(b.disabled)return;
          const ok=!!o.ok;
          this.record({type:'predict',correct:ok,firstTry:wrongN===0,step:qi+1,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-AT-08')});
          if(ok){
            this.right(b);b.style.borderColor='var(--ok)';
            box.querySelectorAll('button').forEach(x=>x.disabled=true);
            document.getElementById('askFb').innerHTML=`<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`;
            qi++;
            if(qi>=qs.length){
              toast('三轴账本算清——王座之争结案 ⚖','ok',2600);
              setTimeout(()=>this.finish({}),1400);
            }else setTimeout(askNext,2600);
          }else{
            this.wrong(b,o.mId);wrongN++;
            b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
            const why=document.createElement('p');
            why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
            why.textContent=`✗ ${o.why}`;b.after(why);
          }
        };
      });
    };
    askNext();
  }

  ask(q,options,onDone){
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-AT-08')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=`<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`;
          setTimeout(()=>{panel.style.display='none';onDone&&onDone();},2600);
        }else{
          this.wrong(b,o.mId);wrongN++;
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
          why.textContent=`✗ ${o.why}`;b.after(why);
        }
      };
    });
  }

  setGoal(html){document.getElementById('goalTxt').innerHTML=html;}
  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l5c',0);}
}
