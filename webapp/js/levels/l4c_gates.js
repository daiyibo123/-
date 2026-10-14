// L4-C 三扇门（4-3）：LSTM 遗忘/输入/输出门——拖门开度让密码存活或遗忘
// 设计文档：docs/案例设计/4C4D-三扇门与生成-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeKnob } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const STEPS=['密码7','猫','在','窗','台','睡','觉','报告!'];

export default class L4CGates extends LevelBase{
  static id='l4c'; static title='三扇门';

  mount(){
    const cfg=this.cfg=LEVELS.l4c;
    this.step=0;this.C=0;this.mission=null;
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
          <div class="tool-panel" id="gatePanel" style="display:none"><h4>🚪 三扇门（本步）</h4>
            <div id="gates" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"></div>
            <div class="dim2 small" style="margin-top:6px">遗忘 f：保多少旧记忆 ｜ 输入 i：写多少新信息 ｜ 输出 o：读多少到 h</div>
            <button class="btn primary" id="stepBtn" style="width:100%;margin-top:10px">走这一步 ▶</button>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'三扇门',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('三扇门',`<p>细胞状态 C 是长期记忆库（加法更新 Cₜ = f·Cₜ₋₁ + i·c̃）；隐状态 h 是经输出门读出的显状态。任务 A：让句首密码 7 活到句尾；任务 B：让句尾读出 0（中途清空）。</p><p class="dim2 small">提示：f=0.5 就是上一关 RNN 的连乘衰减；f≈1 才是高速公路。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l4c'}),
      quick:['遗忘门和输出门有什么区别？','为什么 C 是梯度高速公路？','GRU 和 LSTM 什么关系？']
    });
    this.buildStage();
    this.setGoal('幕一 · 预测：句首写入密码 7，中间 6 步都是无关词。要让密码活到句尾，这 6 步的<b>遗忘门</b>该开多大？');
    this.ask('中间步骤的遗忘门开度应该是？',[
      {v:'接近 1——保住细胞状态里的密码',ok:true,
       why:'对。Cₜ = f·Cₜ₋₁ + i·c̃：f≈1 时旧记忆几乎原样保留（梯度也直通——高速公路）。'},
      {v:'接近 0——定期清空记忆',mId:'M-SQ-03',
       why:'f≈0 会把密码一步步清掉——到句尾 C 归零，什么都报告不出来。'},
      {v:'无所谓，门只是装饰',mId:'M-SQ-03',
       why:'门是 0~1 的信息阀门，直接决定记忆存亡——上一关 RNN 就是"没有门"的悲剧。'}
    ],()=>this.startMission('A'));
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildStage(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:10px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 700 240',width:'100%',style:'max-width:700px'},box);
    // 时间轴
    this.svg('path',{d:'M40 120 L 660 120',stroke:'#D9E0E8','stroke-width':2},this.svgEl);
    this.stepEls=[];
    for(let k=0;k<8;k++){
      const x=70+k*80;
      const c=this.svg('circle',{cx:x,cy:120,r:13,fill:'#FFFFFF',stroke:'#C7CFD8','stroke-width':2},this.svgEl);
      const t=this.svg('text',{x,y:158,'text-anchor':'middle','font-size':16,fill:'#5A6774'},this.svgEl);
      t.textContent=STEPS[k];
      this.stepEls.push({c,x});
    }
    // C 状态条
    this.svg('text',{x:40,y:60,'font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl).textContent='细胞状态 C（长期记忆）';
    this.cBar=this.svg('rect',{x:40,y:70,width:0,height:16,rx:5,fill:'#1CB0F6'},this.svgEl);
    this.cBg=this.svg('rect',{x:40,y:70,width:620,height:16,rx:5,fill:'#E8EDF2'},this.svgEl);
    this.svgEl.insertBefore(this.cBg,this.cBar);
    this.cText=this.svg('text',{x:672,y:83,'font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl);
    // 刻度线（0.5^n 对照）
    this.svg('text',{x:40,y:104,'font-size':16,fill:'#C7CFD8'},this.svgEl).textContent='刻度：满条=7.0（密码完好）';
    // h 输出
    this.hText=this.svg('text',{x:350,y:210,'text-anchor':'middle','font-size':20,fill:'#3E8A5E','font-weight':700},this.svgEl);
    this.hText.textContent='';
    this.cursor=this.svg('circle',{cx:70,cy:120,r:19,fill:'none',stroke:'#C98A2D','stroke-width':2.5,'stroke-dasharray':'4 3'},this.svgEl);
  }
  renderC(){
    const pct=Math.max(0,Math.min(1,this.C/7));
    this.cBar.setAttribute('width',620*pct);
    this.cText.textContent=this.C.toFixed(2);
  }

  startMission(m){
    this.mission=m;
    this.step=0;this.C=0;
    this.hudApi.setSteps(m==='A'?'任务 A · 让密码活到句尾':'任务 B · 让句尾读出 0');
    this.setGoal(m==='A'
      ?'任务 A · 让密码活到句尾：t=1 时开输入门写入 7；中间各步把<b>遗忘门拉到接近 1</b>保住它；t=8 开输出门读出。'
      :'任务 B · 让句尾读出 0：先照常写入密码，然后在中间某几步把<b>遗忘门拉到接近 0</b>清空 C。');
    document.getElementById('gatePanel').style.display='';
    const g=document.getElementById('gates');g.innerHTML='';
    this.gates={};
    [['f','遗忘 f',0.5],['i','输入 i',0],['o','输出 o',0]].forEach(([k,lab,v])=>{
      const host=document.createElement('div');host.style.textAlign='center';
      g.appendChild(host);
      // makeKnob 构造时立即回调 onInput——此时 g 尚未赋值，需守卫
      let kn;
      kn=makeKnob(host,{label:lab,min:0,max:100,value:v*100,size:64,
        onInput:a=>{kn&&(kn.val=a/100);}});
      kn.val=v;
      this.gates[k]=kn;
    });
    document.getElementById('stepBtn').onclick=()=>this.doStep();
    this.renderC();
    this.cursor.setAttribute('cx',70);
  }
  doStep(){
    if(this.step>=8)return;
    const k=this.step;
    const f=this.gates.f.val,i=this.gates.i.val,o=this.gates.o.val;
    let cTilde=0;
    if(k===0){cTilde=7*i;}                       // 句首：写入密码×输入门
    this.C=f*this.C+cTilde;                       // Cₜ = f·Cₜ₋₁ + i·c̃
    this.record({type:'gate_step',correct:null,value:{step:k+1,f:+f.toFixed(2),i:+i.toFixed(2),o:+o.toFixed(2),C:+this.C.toFixed(3)}});
    this.renderC();
    this.stepEls[k].c.setAttribute('fill',k===0?'rgba(201,138,45,.3)':'rgba(28,176,246,.15)');
    this.step++;
    this.cursor.setAttribute('cx',70+this.step*80);
    this.hudApi.setSteps((this.mission==='A'?'任务 A':'任务 B')+` · ${this.step}/8 步`);
    if(this.step===8){
      const readOut=o*this.C;
      this.hText.textContent='句尾读出 h = '+readOut.toFixed(2);
      const okA=this.mission==='A'&&readOut>=6.0;
      const okB=this.mission==='B'&&readOut<=0.5;
      this.record({type:'mission_pass',correct:okA||okB,mission:this.mission,value:+readOut.toFixed(2)});
      if(okA){
        toast(`任务 A 达成：密码 ${readOut.toFixed(1)} 存活！现在试试反向任务 B。`,'ok');
        setTimeout(()=>this.startMission('B'),1600);
      }else if(okB){
        toast('任务 B 达成：记忆被你亲手清空——这就是"选择性遗忘"。','ok');
        setTimeout(()=>this.act3(),1600);
      }else{
        this.wrong(this.hText,null,false);
        toast(this.mission==='A'
          ?`密码只剩 ${readOut.toFixed(2)}（需 ≥6.0）——遗忘门开太小，被中间步骤稀释了。重试：t=1 开输入门，其余步 f≈1。`
          :`读出 ${readOut.toFixed(2)}（需 ≤0.5）——还没清干净。把中间步的 f 拉到 0 再走。`,'err',3600);
        setTimeout(()=>this.startMission(this.mission),2200);
      }
    }
  }

  act3(){
    this.phase='concept';
    document.getElementById('gatePanel').style.display='none';
    this.hudApi.setSteps('幕三 · 概念两问');
    this.setGoal('幕三 · 概念两问：把三扇门和两条通路说清楚。');
    this.ask('细胞状态 C 和隐状态 h 的关系是？',[
      {v:'C 是长期记忆库（加法更新），h 是经输出门读出的显状态',ok:true,
       why:'对。门控决定"存什么/读什么"，C 与 h 是两条不同通路。'},
      {v:'同一个东西的两个名字',mId:'M-SQ-03',why:'LSTM 有两条通路：C 走长期，h 走当前输出。'},
      {v:'h 是输入，C 是输出',mId:'M-SQ-03',why:'两者都是内部状态，与输入 x 不同。'}
    ],()=>{
      this.ask('为什么说细胞状态 C 是"梯度高速公路"？',[
        {v:'加法更新让反向梯度近似直通（×f≈1），不像 RNN 连乘 tanh 导数',ok:true,
         why:'对——上一关 0.98/站 vs 0.5/站的差距就来自这里。'},
        {v:'因为 LSTM 参数更多',mId:'M-SQ-03',why:'参数多≠梯度稳，是结构给的通道。'},
        {v:'因为用了 ReLU',mId:'M-SQ-03',why:'LSTM 内部主要是 sigmoid/tanh。'}
      ],()=>this.finish({}),true);
      const w=setInterval(()=>{if(document.getElementById('finBtn3'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-SQ-03')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn3" style="margin-top:10px">完成三扇门 🎓</button>`:'');
          if(keep)document.getElementById('finBtn3').onclick=()=>this.finish({});
          else if(onDone)setTimeout(()=>{panel.style.display='none';onDone&&onDone();},2500);
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l4c',0);}
}
