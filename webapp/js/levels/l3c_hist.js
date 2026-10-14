// L3-C 结构进化史（3-4）：LeNet→AlexNet→VGG→ResNet 时间线排序 + 残差梯度实验
// 设计文档：docs/案例总设计_v3_第2-6章.md 3-4 节
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const ERAS=[
  {id:'lenet',year:1998,name:'LeNet',key:'卷积开山：卷积+池化+全连接的雏形',params:'6万'},
  {id:'alexnet',year:2012,name:'AlexNet',key:'深+ReLU+Dropout+GPU，ImageNet 夺冠',params:'6000万'},
  {id:'vgg',year:2014,name:'VGG',key:'小核(3×3)堆深：两个 3×3 感受野=一个 5×5',params:'1.4亿'},
  {id:'resnet',year:2015,name:'ResNet',key:'残差连接 F(x)+x：梯度有捷径，深网络训得动',params:'2500万'}
];

export default class L3CHist extends LevelBase{
  static id='l3c'; static title='结构进化史';

  mount(){
    const cfg=this.cfg=LEVELS.l3c;
    this.placed={};
    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:420px"></div>
        <div class="side">
          <div class="target-card"><h4>当前目标</h4><p id="goalTxt"></p></div>
          <div class="tool-panel" id="askPanel" style="display:none"><h4>🔮 预测</h4>
            <p id="askQ" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <div id="askOpts" style="display:flex;flex-direction:column;gap:8px"></div>
            <div id="askFb"></div>
          </div>
          <div class="tool-panel" id="cardPanel"><h4>🗂 结构卡（拖到时间线）</h4>
            <div id="cards" style="display:flex;flex-direction:column;gap:6px"></div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'结构进化史',steps:'幕一 · 排时间线',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('结构进化史',`<p>① 把四张结构卡按时间线与关键改进拖放到正确年代；② 看残差连接如何救梯度（有/无捷径对比）。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l3c'}),
      quick:['为什么小核堆深更好？','残差连接怎么救梯度？','VGG 参数为什么这么大？']
    });
    this.buildTimeline();
    this.setGoal('幕一 · 排时间线：把结构卡拖到对应年代槽（每张卡的关键改进写在卡上）。');
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildTimeline(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:12px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 700 90',width:'100%',style:'max-width:700px'},box);
    this.svg('path',{d:'M30 45 L 670 45',stroke:'#D9E0E8','stroke-width':3},this.svgEl);
    this.slots=[];
    ERAS.forEach((e,i)=>{
      const x=110+i*160;
      this.svg('circle',{cx:x,cy:45,r:7,fill:'#FFFFFF',stroke:'#C7CFD8','stroke-width':2},this.svgEl);
      this.svg('text',{x,y:72,'text-anchor':'middle','font-size':16,fill:'#5A6774'},this.svgEl).textContent=e.year;
      const s=document.createElement('div');s.className='slot';
      s.style.cssText='min-width:150px;min-height:44px;margin:0 4px';
      s.innerHTML=`<span style="font-size:11px">${e.year} 年 · ？</span>`;
      box.appendChild(s);this.slots.push(s);
    });
    const row=document.createElement('div');
    row.style.cssText='display:flex;gap:10px;flex-wrap:wrap;justify-content:center';
    box.appendChild(row);
    const zones=this.slots.map((el,idx)=>({el,accept:()=>!this.placed[idx],onDrop:card=>this.place(idx,card)}));
    ERAS.slice().sort(()=>Math.random()-0.5).forEach(e=>{
      const c=document.createElement('div');c.className='tcard';c.style.width='150px';c.dataset.era=e.id;
      c.innerHTML=`<span class="v">${e.name}</span><span class="m" style="font-size:10.5px;line-height:1.5">${e.key}</span>`;
      row.appendChild(c);this.makeDraggable(c,zones);
    });
    this.timelineRow=row;
  }
  place(idx,card){
    const era=ERAS[idx];
    const ok=card.dataset.era===era.id;
    this.record({type:'timeline_drop',correct:ok,target:era.id,value:card.dataset.era,mId:ok?null:'M-CV-05'});
    if(ok){
      this.placed[idx]=true;
      const s=this.slots[idx];
      s.classList.add('filled');
      s.innerHTML=`<span class="slot-v">${era.name} ✓（${era.params} 参数）</span>`;
      this.right(s);
      if(Object.keys(this.placed).length===4){
        toast('时间线排对！三十年进化：每一步都被上一步的痛点逼出来。','ok',3200);
        setTimeout(()=>this.act2(),1600);
      }
    }else{
      this.wrong(this.slots[idx],'M-CV-05');
      toast('年代对不上——想想谁先谁后：卷积开山→深+ReLU→小核堆深→残差救深。','err');
    }
  }

  act2(){
    this.phase='residual';
    document.getElementById('cardPanel').style.display='none';
    this.timelineRow.style.display='none';
    this.hudApi.setSteps('幕二 · 残差实验');
    this.setGoal('幕二 · 残差实验：同样 20 层，有/无捷径（F(x)+x）时梯度传到浅层还剩多少？先预测再看。');
    this.ask('20 层网络，无残差每层梯度 ×0.75，有残差时梯度可走捷径 ×0.98。浅层梯度谁剩得多？',[
      {v:'有残差：0.98²⁰≈67% vs 无残差 0.75²⁰≈0.3%',ok:true,
       why:'对。F(x)+x 的加法让梯度直通——这就是"深了反而训得动"的秘密。'},
      {v:'无残差剩得多，路径更直接',mId:'M-CV-05',
       why:'0.75 连乘 20 次只剩 0.3%——深而无效。'},
      {v:'一样多',mId:'M-CV-05',
       why:'捷径改变了连乘结构，差距是 200 倍量级。'}
    ],()=>this.act3());
  }
  act3(){
    // 可视化对比
    const stage=document.getElementById('stage');
    const box=document.createElement('div');
    box.style.cssText='display:flex;gap:20px;justify-content:center;margin-top:8px';
    stage.appendChild(box);
    const mkBar=(label,pct,color)=>{
      const d=document.createElement('div');d.style.textAlign='center';
      d.innerHTML=`<div class="dim2 small">${label}</div>
        <div style="width:220px;height:16px;border-radius:8px;background:#E8EDF2;overflow:hidden;margin:4px 0">
          <div style="height:100%;width:0;background:${color};transition:width 1.2s"></div></div>
        <div class="mono small" style="color:${color}">…</div>`;
      box.appendChild(d);
      setTimeout(()=>{d.querySelector('div>div').style.width=(pct*100)+'%';d.querySelector('.mono').textContent=(pct*100).toFixed(1)+'%';},300);
    };
    mkBar('无残差 ×0.75/层 ×20',Math.pow(0.75,20),'#C2543C');
    mkBar('有残差 ×0.98/层 ×20',Math.pow(0.98,20),'#3E8A5E');
    this.record({type:'residual_demo',correct:true,value:{plain:+Math.pow(0.75,20).toFixed(5),res:+Math.pow(0.98,20).toFixed(3)}});
    this.ask('ResNet 的残差连接救的是什么？',[
      {v:'梯度沿捷径直通——深网络的梯度消失',ok:true,
       why:'对。参数量并不减少，救的是"可训练性"。'},
      {v:'减少参数量',mId:'M-CV-05',why:'残差块反而略增参数。'},
      {v:'提高准确率靠加深就行',mId:'M-CV-05',why:'没有残差时加深到几十层训练误差反而上升。'}
    ],()=>this.finish({}),true);
    const w=setInterval(()=>{if(document.getElementById('finBtn7'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-CV-05')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn7" style="margin-top:10px">完成进化史 🎓</button>`:'');
          if(keep)document.getElementById('finBtn7').onclick=()=>this.finish({});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l3c',0);}
}
