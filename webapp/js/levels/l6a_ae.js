// L6-A 压缩工坊（6-1）：AE 潜码插值出鬼影——只会复印不会创造（真实线性 AE 计算）
// 设计文档：docs/案例设计/6A-生成模型四部曲-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

// 双月牙数据（确定性）
function moons(){
  const A=[],B=[];
  for(let i=0;i<24;i++){
    const t=i/23*Math.PI;
    A.push([Math.cos(t)*1.1+0.55, Math.sin(t)*0.9-0.25]);
    B.push([Math.cos(t+Math.PI)*1.1-0.55, Math.sin(t+Math.PI)*0.9+0.25]);
  }
  return {A,B};
}
// 线性 AE：z = x·w1 + y·w2（w 取数据主方向），解码 x̂ = z·w1, ŷ = z·w2
const W=[0.83,0.56];   // 近似主方向（单位向量）
const enc=p=>p[0]*W[0]+p[1]*W[1];
const dec=z=>[z*W[0],z*W[1]];

export default class L6A_AE extends LevelBase{
  static id='l6a'; static title='压缩工坊（AE）';

  mount(){
    const cfg=this.cfg=LEVELS.l6a;
    const {A,B}=moons();
    this.pA=A[6];this.pB=B[16];           // 两个真实样本
    this.zA=enc(this.pA);this.zB=enc(this.pB);this.zMid=(this.zA+this.zB)/2;
    this.data={A,B};
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
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'压缩工坊',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('压缩工坊',`<p>自编码器：编码器把样本压成潜码 z，解码器再还原。两张真实样本的潜码取中点，解码出来的是什么？</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l6a'}),
      quick:['AE 有什么用？','为什么插值会出鬼影？','去噪自编码器是什么？']
    });
    this.buildPlot();
    this.setGoal('幕一 · 预测：两张真实样本（蓝点/红点）的潜码分别是 '+this.zA.toFixed(2)+' 和 '+this.zB.toFixed(2)+'。取中点解码，输出是？');
    this.ask('潜码中点解码，输出会是？',[
      {v:'两张的模糊重叠——落在两簇之间的"鬼影"',ok:true,
       why:'对。AE 的潜空间没有结构：两簇数据之间的区域从没见过数据，解码出来自然不是合理样本——它只会复印，不会创造。'},
      {v:'一张清晰的"中间样本"',mId:'M-GE-01',
       why:'那需要潜空间连续——这正是 VAE 要解决的问题（下一关）。'},
      {v:'其中一张原图',mId:'M-GE-01',
       why:'解码是确定性的线性映射：中点不会跳到端点。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildPlot(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'-2.2 -1.8 4.4 3.4',width:'100%',style:'max-width:520px'},box);
    const X=x=>x*100+220,Y=y=>-y*100+150;
    // 坐标
    this.svg('path',{d:`M20 150 L 420 150 M220 10 L 220 290`,stroke:'rgba(111,103,90,.25)','stroke-width':1},this.svgEl);
    const dots=[];
    this.data.A.forEach(p=>dots.push([X(p[0]),Y(p[1]),'#1CB0F6']));
    this.data.B.forEach(p=>dots.push([X(p[0]),Y(p[1]),'#C2543C']));
    dots.forEach(([x,y,c])=>this.svg('circle',{cx:x,cy:y,r:3,fill:c,opacity:.45},this.svgEl));
    this.marks={};
    const mk=(key,color)=>{this.marks[key]=this.svg('g',{},this.svgEl);this.marks[key].setAttribute('opacity',0);return this.marks[key];};
    mk('A','#1CB0F6');mk('B','#C2543C');mk('M','#CE82FF');
    this.legend=this.el('div',{class:'dim2 small'},box);
    this.legend.textContent='蓝/红=两簇真实样本（双月牙）';
  }
  mark(key,p,label){
    const g=this.marks[key];
    [...g.children].forEach(c=>c.remove());
    const x=p[0]*100+220,y=-p[1]*100+150;
    this.svg('circle',{cx:x,cy:y,r:8,fill:'none',stroke:g===this.marks.M?'#CE82FF':(key==='A'?'#1CB0F6':'#C2543C'),'stroke-width':2.5},g);
    this.svg('text',{x:x+12,y:y+4,'font-size':16,fill:'#1F2933'},g).textContent=label;
    g.setAttribute('opacity',1);
  }

  act2(){
    this.phase='reveal';
    this.hudApi.setSteps('幕二 · 揭示');
    this.setGoal('幕二 · 揭示（真实线性 AE 计算）：三张解码结果——真码 A、真码 B、插值中点。');
    this.mark('A',this.pA,'A 原样本');
    setTimeout(()=>this.mark('B',this.pB,'B 原样本'),700);
    setTimeout(()=>{
      const out=dec(this.zMid);
      this.mark('M',out,'中点解码=鬼影 ✗');
      // 中点解码落在两簇之间
      this.record({type:'reveal',correct:true,value:{zA:+this.zA.toFixed(3),zB:+this.zB.toFixed(3),zMid:+this.zMid.toFixed(3)}});
      this.legend.innerHTML='中点解码点落在<b>两簇之间的空隙</b>——不是任何合理样本。这就是"AE 不能生成"。';
      setTimeout(()=>this.act3(),1600);
    },1500);
  }

  act3(){
    this.phase='concept';
    this.hudApi.setSteps('幕三 · 概念');
    this.ask('AE 为什么不能用来生成新样本？',[
      {v:'潜空间没有结构——随机采样/插值出的点解码后不是合理样本',ok:true,
       why:'对。生成模型的门槛是"从分布里采样"，AE 只学了重构。'},
      {v:'参数太少，加宽就能生成',mId:'M-GE-01',
       why:'加宽只改善重构；潜空间无结构的问题依旧。'},
      {v:'因为它用了 MSE 损失',mId:'M-GE-01',
       why:'损失函数不是关键，潜空间约束才是。'}
    ],()=>this.finish({}),true);
    const w=setInterval(()=>{if(document.getElementById('finBtn8'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-GE-01')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn8" style="margin-top:10px">完成压缩工坊 🎓</button>`:'');
          if(keep)document.getElementById('finBtn8').onclick=()=>this.finish({});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l6a',0);}
}
