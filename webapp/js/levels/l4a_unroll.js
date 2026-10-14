// L4-A 展开时间轴（4-1）：RNN 计算图展开 + 权重共享拍卡 + 隐状态接力
// 设计文档：docs/案例设计/4A4B-序列模型展开与梯度-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const WORDS=['我','昨天','在','机房','跑','模型'];   // 6 个时间步

export default class L4AUnroll extends LevelBase{
  static id='l4a'; static title='展开时间轴';

  mount(){
    const cfg=this.cfg=LEVELS.l4a;
    this.slots=6;this.placed=0;this.hStep=0;
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
          <div class="tool-panel" id="cardPanel"><h4>权重卡托盘</h4>
            <div id="cards" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"></div>
            <div class="dim2 small" style="margin-top:6px">把「共享 W·U 卡」拖到展开图的时间步槽上</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'展开时间轴',steps:'幕一 · 看展开',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('展开时间轴',`<p>① 看带自环的 RNN 如何沿时间轴展开；② 把同一张「共享 W·U 卡」拍到每个时间步上；③ 看隐状态 h 如何接力压缩整句信息。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l4a'}),
      quick:['为什么参数不随序列长度增长？','隐状态 h 里存的是什么？','展开后和深层网络像吗？']
    });
    this.buildUnroll();
    this.setGoal('幕一 · 看展开：左边是带自环的 RNN 单元，点击「展开」看它沿时间轴铺开。');
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildUnroll(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;align-items:center;gap:14px;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 720 300',width:'100%',style:'max-width:720px'},box);
    // 左：自环单元
    this.svg('rect',{x:20,y:110,width:110,height:70,rx:10,fill:'#FFFFFF',stroke:'#1CB0F6','stroke-width':2},this.svgEl);
    this.svg('text',{x:75,y:150,'text-anchor':'middle','font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl).textContent='RNN 单元';
    const lp=this.svg('path',{d:'M130 120 q50 -60 0 -40',fill:'none',stroke:'#C98A2D','stroke-width':2},this.svgEl);
    lp.setAttribute('d','M125 118 C 190 70, 190 60, 128 112');
    this.svg('text',{x:178,y:66,'font-size':16,fill:'#C98A2D'},this.svgEl).textContent='自环 h';
    this.unrollBtn=this.el('button',{class:'btn primary',style:'margin:0 auto'},box);
    this.unrollBtn.textContent='⏩ 沿时间轴展开';
    this.unrollBtn.onclick=()=>this.animateUnroll();
  }
  animateUnroll(){
    this.unrollBtn.style.display='none';
    const g=this.svgEl;
    let n=0;
    this.stepSlots=[];
    const drawStep=(k)=>{
      const x=270+k*72;
      this.svg('rect',{x,y:100,width:58,height:70,rx:8,fill:'#FFFFFF',stroke:'#1CB0F6','stroke-width':1.6},g);
      this.svg('text',{x:x+29,y:140,'text-anchor':'middle','font-size':16,fill:'#1CB0F6'},g).textContent='h'+(k+1);
      if(k>0)this.svg('path',{d:`M${x-14} 135 L ${x} 135`,stroke:'#C98A2D','stroke-width':2.2,fill:'none','marker-end':'url(#arw)'},g);
      this.svg('text',{x:x+29,y:192,'text-anchor':'middle','font-size':16,fill:'#5A6774'},g).textContent=WORDS[k];
      this.svg('path',{d:`M${x+29} 178 L ${x+29} 172`,stroke:'#5A6774','stroke-width':1.6},g);
      // 槽位（放卡）
      const slot=this.el('div',{class:'slot',style:'min-width:56px;justify-content:center'},document.createElement('div'));
      // 槽画在 SVG 下方一条 HTML 行
      this.stepSlots.push(k);
    };
    const defs=this.svg('defs',{},g);
    const mk=this.svg('marker',{id:'arw',markerWidth:'7',markerHeight:'7',refX:'6',refY:'3',orient:'auto'},defs);
    this.svg('path',{d:'M0 0 L6 3 L0 6 z',fill:'#C98A2D'},mk);
    const timer=()=>{
      drawStep(n);n++;
      if(n<6)setTimeout(timer,420);
      else{this.buildSlotRow();this.act2();}
    };
    setTimeout(timer,300);
  }
  buildSlotRow(){
    const stage=document.getElementById('stage');
    const row=document.createElement('div');
    row.id='slotRow';
    row.style.cssText='display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px';
    stage.appendChild(row);
    this.slotEls=[];
    for(let k=0;k<6;k++){
      const host=document.createElement('div');host.style.textAlign='center';
      const s=document.createElement('div');s.className='slot';s.style.minWidth='64px';
      s.innerHTML='<span style="font-size:11px">t='+(k+1)+' 槽</span>';
      host.appendChild(s);row.appendChild(host);
      this.slotEls.push(s);
    }
  }

  act2(){
    this.phase='stamp';
    this.hudApi.setSteps('幕二 · 共享拍卡');
    this.setGoal('幕二 · 共享拍卡：把托盘里的<b>同一张</b>「共享 W·U 卡」拖到每个时间步槽上（6 个槽）。注意：托盘里只有 1 张共享卡——它可以无限复用。');
    document.getElementById('cardPanel').style.display='';
    const cards=document.getElementById('cards');cards.innerHTML='';
    const zones=this.slotEls.map((el,idx)=>({
      el,accept:()=>!el.classList.contains('filled'),
      onDrop:card=>this.placeCard(idx,card)
    }));
    // 共享卡 + 干扰卡
    this.mkCard(cards,'W·U（共享）','share',zones);
    this.mkCard(cards,'W₁','ind',zones);
    this.mkCard(cards,'W₃','ind',zones);
  }
  mkCard(parent,label,kind,zones){
    const c=document.createElement('div');c.className='tcard';c.style.width='92px';c.dataset.kind=kind;
    c.innerHTML=`<span class="v" style="font-size:13px">${label}</span><span class="m">${kind==='share'?'共享卡':'独立卡'}</span>`;
    parent.appendChild(c);this.makeDraggable(c,zones);
  }
  placeCard(idx,card){
    const share=card.dataset.kind==='share';
    const ok=share;
    this.record({type:'stamp',target:'t'+(idx+1),correct:ok,mId:ok?null:'M-SQ-01',value:card.dataset.kind});
    if(!ok){
      this.wrong(this.slotEls[idx],'M-SQ-01');
      toast('独立卡用错了——展开后每一步用的是同一组权重。','err');
      return;
    }
    const s=this.slotEls[idx];
    s.classList.add('filled');
    s.innerHTML=`<span class="slot-v" style="font-size:11px">W·U ✓</span>`;
    this.right(s);
    this.placed++;
    this.hudApi.setSteps(`幕二 · 共享拍卡 ${this.placed}/6`);
    if(this.placed===2)this.askShare();
    if(this.placed>=6)setTimeout(()=>this.act3(),900);
  }

  askShare(){
    this.ask('第 5 个时间步需要一张新的权重卡吗？',[
      {v:'不用——同一组 W·U 沿时间共享，参数不随序列长度增长',ok:true,
       why:'对。展开的是计算图不是参数表：序列 100 词，参数还是那一套。'},
      {v:'要——每个时间步一套新权重',mId:'M-SQ-01',
       why:'那样参数会随序列长度爆炸，而且学不到"同样规律处处适用"。'},
      {v:'看序列长短决定',mId:'M-SQ-01',
       why:'无论长短都共享——这正是 RNN 处理变长序列的根本设计。'}
    ]);
  }

  act3(){
    this.phase='relay';
    this.hudApi.setSteps('幕三 · 隐状态接力');
    this.setGoal('幕三 · 隐状态接力：逐词读入句子，看 h 如何压缩整句信息（hₜ = tanh(W·hₜ₋₁ + U·xₜ)）。');
    const row=document.getElementById('slotRow');
    const hRow=document.createElement('div');
    hRow.id='hRow';hRow.style.cssText='display:flex;gap:12px;justify-content:center;margin-top:10px;flex-wrap:wrap';
    row.parentElement.appendChild(hRow);
    this.hBars=[];
    for(let k=0;k<6;k++){
      const d=document.createElement('div');d.style.cssText='text-align:center;width:64px';
      d.innerHTML=`<div style="height:10px;border-radius:5px;background:#E8EDF2;overflow:hidden"><div style="height:100%;width:0;background:#1CB0F6;transition:width .4s"></div></div><div class="dim2 small" style="margin-top:2px">h${k+1}</div>`;
      hRow.appendChild(d);this.hBars.push(d.querySelector('div>div'));
    }
    const nextBtn=this.el('button',{class:'btn primary',style:'display:block;margin:14px auto 0'},row.parentElement);
    nextBtn.textContent='读入下一个词 ▶';
    const H=[0.35,0.5,0.42,0.62,0.7,0.85];
    nextBtn.onclick=()=>{
      if(this.hStep>=6)return;
      this.hBars[this.hStep].style.width=(H[this.hStep]*100)+'%';
      this.record({type:'relay',correct:null,value:this.hStep+1});
      this.hStep++;
      this.hudApi.setSteps(`幕三 · 隐状态接力 ${this.hStep}/6`);
      if(this.hStep>=6){
        nextBtn.style.display='none';
        setTimeout(()=>this.askFinal(),700);
      }
    };
  }
  askFinal(){
    this.ask('h₃ 里装着什么？',[
      {v:'前 3 个词的信息压缩（"我昨天在"的摘要）',ok:true,
       why:'对——hₜ 是"到此刻为止的记忆"，随时间不断被改写。'},
      {v:'只有第 3 个词的信息',mId:'M-SQ-01',
       why:'h 是接力棒不是快递盒——每一步都吸收了前面的内容，只是越早的信息被稀释。'},
      {v:'整句话的信息',mId:'M-SQ-01',
       why:'还差 3 个词没读——那是 h₆ 的事（而且前面信息会被部分覆盖）。'}
    ],()=>this.finish({}),true);
    const fin=document.getElementById('askFb');
    const waitFin=setInterval(()=>{
      if(document.getElementById('finBtn')){clearInterval(waitFin);return;}
    },300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-SQ-01')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn" style="margin-top:10px">完成展开时间轴 ✓</button>`:'');
          if(keep)document.getElementById('finBtn').onclick=()=>this.finish({});
          else if(onDone)setTimeout(()=>{panel.style.display='none';onDone&&onDone();},2400);
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l4a',0);}
}
