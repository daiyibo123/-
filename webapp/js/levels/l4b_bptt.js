// L4-B 梯度的长途旅行（4-2）：BPTT 连乘消失——预测 → 逐站传递 → 三线判读
// 设计文档：docs/案例设计/4A4B-序列模型展开与梯度-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const STATIONS=10, RNN=0.5, LSTM=0.98;

export default class L4BTravel extends LevelBase{
  static id='l4b'; static title='梯度的长途旅行';

  mount(){
    const cfg=this.cfg=LEVELS.l4b;
    this.cur=STATIONS;this.amp=1.0;this.passed=0;
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
          <div class="tool-panel" id="passPanel" style="display:none"><h4>误差包裹 · 传递台</h4>
            <div class="readout">当前幅值 δ = <b id="ampv">1.000</b></div>
            <div style="height:12px;border-radius:6px;background:#E8EDF2;overflow:hidden;margin:6px 0">
              <div id="ampbar" style="height:100%;width:100%;background:#1CB0F6;transition:width .4s"></div></div>
            <button class="btn primary" id="passBtn" style="width:100%">传一站（×0.5）→</button>
            <div class="dim2 small" style="margin-top:6px">从句尾（第 10 站）逐站传回首站</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'梯度的长途旅行',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('梯度的长途旅行',`<p>句尾的误差要沿时间轴一站站倒传回句首（BPTT）。普通 RNN 每过一站梯度 ×0.5——10 站之后还剩多少？先预测，再亲手传递，最后判读三条曲线。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l4b'}),
      quick:['为什么梯度会消失？','梯度爆炸是怎么回事？','LSTM 为什么能记住长依赖？']
    });
    this.buildTimeline();
    this.setGoal('幕一 · 预测：句尾误差 δ=1.0，普通 RNN 每传一站梯度 ×0.5。从第 10 站传回首站，还剩多少？');
    this.ask('0.5¹⁰ 大约是多少？',[
      {v:'≈ 0.1%（千分之一）——远处的词几乎学不到',ok:true,
       why:'对：0.5¹⁰=1/1024。连乘是指数衰减，10 站就几乎归零——这就是梯度消失。'},
      {v:'约一半（0.5 左右）',mId:'M-SQ-02',
       why:'那是线性衰减的直觉。连乘：0.5→0.25→0.125……第二站就只剩 1/4 了。'},
      {v:'不变——梯度大小守恒',mId:'M-SQ-02',
       why:'反向传播不守恒：每过一个可导模块都要乘它的局部导数。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildTimeline(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:10px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 700 150',width:'100%',style:'max-width:700px'},box);
    const defs=this.svg('defs',{},this.svgEl);
    const mk=this.svg('marker',{id:'arw2',markerWidth:'7',markerHeight:'7',refX:'6',refY:'3',orient:'auto'},defs);
    this.svg('path',{d:'M0 0 L6 3 L0 6 z',fill:'#C2543C'},mk);
    this.svg('path',{d:'M640 60 L 60 60',stroke:'#C2543C','stroke-width':2,'marker-end':'url(#arw2)'},this.svgEl);
    this.svg('text',{x:350,y:44,'text-anchor':'middle','font-size':16,fill:'#C2543C'},this.svgEl).textContent='误差倒传方向（BPTT）';
    this.stTexts=[];this.stDots=[];
    for(let k=0;k<STATIONS;k++){
      const x=640-k*(580/(STATIONS-1));
      const dot=this.svg('circle',{cx:x,cy:60,r:9,fill:'#FFFFFF',stroke:'#C7CFD8','stroke-width':2},this.svgEl);
      const t=this.svg('text',{x,y:92,'text-anchor':'middle','font-size':16,fill:'#5A6774'},this.svgEl);
      t.textContent='t='+(STATIONS-k);
      this.stDots.push(dot);this.stTexts.push(t);
    }
    // 幅值标签（跟随包裹）
    this.ampText=this.svg('text',{x:640,y:26,'text-anchor':'middle','font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl);
    this.ampText.textContent='δ=1.000';
    // 三线图占位（幕三）
    this.chartBox=document.createElement('div');
    box.appendChild(this.chartBox);
  }

  act2(){
    this.phase='pass';
    this.hudApi.setSteps('幕二 · 逐站传递');
    this.setGoal('幕二 · 逐站传递：点击「传一站」，亲手把误差包裹从 t=10 传回 t=1，看着 δ 每站减半。');
    document.getElementById('passPanel').style.display='';
    this.updateDots();
    document.getElementById('passBtn').onclick=()=>{
      if(this.cur<=1)return;
      this.cur--;this.amp*=RNN;this.passed++;
      this.record({type:'pass_station',correct:null,value:{station:this.cur,amp:+this.amp.toFixed(5)}});
      this.updateDots();
      this.hudApi.setSteps(`幕二 · 逐站传递 ${this.passed}/9`);
      if(this.cur===1){
        document.getElementById('passBtn').disabled=true;
        toast(`到达首站：δ = ${this.amp.toFixed(4)}（剩 ${(this.amp*100).toFixed(2)}%）`,'warn',3000);
        setTimeout(()=>this.act3(),1400);
      }
    };
  }
  updateDots(){
    const x=640-this.cur*(580/(STATIONS-1));
    this.ampText.setAttribute('x',x);
    this.ampText.textContent='δ='+this.amp.toFixed(3);
    this.stDots.forEach((d,k)=>{
      const st=STATIONS-k;
      d.setAttribute('fill',st>=this.cur?'rgba(194,84,60,.25)':'#FFFFFF');
      d.setAttribute('stroke',st>=this.cur?'#C2543C':'#C7CFD8');
    });
    document.getElementById('ampv').textContent=this.amp.toFixed(4);
    document.getElementById('ampbar').style.width=Math.max(0.5,this.amp*100)+'%';
  }

  act3(){
    this.phase='chart';
    this.hudApi.setSteps('幕三 · 三线判读');
    this.setGoal('幕三 · 三线判读：普通 RNN（×0.5/站）、LSTM（×0.98/站）、无衰减（×1.0）三条梯度存活曲线放在一起——50 站后谁还活着？');
    // SVG 折线：x=站数 0..50，y=幅值（线性比例，贴近 0 看不清——用下半区放大）
    const W=700,H=180;
    this.chartBox.innerHTML='';
    const sv=this.svg('svg',{viewBox:`0 0 ${W} ${H}`,width:'100%',style:'max-width:700px'},this.chartBox);
    const X=n=>40+n/50*(W-60), Y=v=>H-24-v*(H-50);
    // 网格与刻度
    for(let v=0;v<=1;v+=0.25){
      this.svg('path',{d:`M40 ${Y(v)} L ${W-20} ${Y(v)}`,stroke:'rgba(111,103,90,.15)'},sv);
      this.svg('text',{x:34,y:Y(v)+4,'text-anchor':'end','font-size':16,fill:'#5A6774'},sv).textContent=v.toFixed(2);
    }
    const mkLine=(r,color,label)=>{
      let d='';
      for(let n=0;n<=50;n++){const v=Math.pow(r,n);d+=(n?'L':'M')+X(n)+' '+Y(v)+' ';}
      this.svg('path',{d,stroke:color,'stroke-width':2.4,fill:'none'},sv);
      this.svg('text',{x:X(50)-4,y:Y(Math.pow(r,50))+(r===1?-6:12),'text-anchor':'end','font-size':16,fill:color,'font-weight':700},sv).textContent=label;
    };
    mkLine(1.0,'#C98A2D','无衰减 ×1.0（理想）');
    mkLine(LSTM,'#3E8A5E','LSTM ×0.98 → 50 站剩 36%');
    mkLine(RNN,'#C2543C','RNN ×0.5 → 10 站剩 0.1%');
    this.svg('text',{x:W/2,y:H-4,'text-anchor':'middle','font-size':16,fill:'#5A6774'},sv).textContent='传递站数 →';
    this.ask('同样传 50 站，哪条线的"远距离依赖"还学得到？',[
      {v:'LSTM（×0.98）——50 站后仍有约 36% 存活',ok:true,
       why:'对。细胞状态的加法更新让梯度近似只乘 0.98/站——这就是"高速公路"，4-3 三扇门会拆开看它。'},
      {v:'RNN 也能学到，只是慢一点',mId:'M-SQ-02',
       why:'不是慢，是信号指数级死亡：0.1% 的梯度在数值上几乎等于没学到。'},
      {v:'三条线都一样，只要训练够久',mId:'M-SQ-02',
       why:'梯度消失是结构问题，不是训练时长问题——练再久也救不回 0.1% 的信号。'}
    ],null,true);
    const waitFor=setInterval(()=>{
      if(document.getElementById('finBtn2')){clearInterval(waitFor);return;}
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-SQ-02')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn2" style="margin-top:10px">完成长途旅行 🎓</button>`:'');
          if(keep)document.getElementById('finBtn2').onclick=()=>this.finish({passed:this.passed});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l4b',0);}
}
