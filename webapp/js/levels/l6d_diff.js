// L6-D 从噪声里捞图（6-4）：扩散——真实逐步加噪/去噪 + t 滑杆
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeLever } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const NPTS=20,BETA=0.18,TSTEPS=20;

export default class L6D_Diff extends LevelBase{
  static id='l6d'; static title='从噪声里捞图';

  mount(){
    const cfg=this.cfg=LEVELS.l6d;
    // 原始信号：方波+细节（确定性）
    let rngS=7;
    const rnd=()=>{rngS=(rngS*16807)%2147483647;return rngS/2147483647;};
    this.x0=[];
    for(let i=0;i<NPTS;i++){
      const sq=(i%8<4)?0.8:-0.5;
      this.x0.push(sq+(rnd()-0.5)*0.25);
    }
    // 正向加噪链（真实计算）
    this.chain=[this.x0.slice()];
    let x=this.x0.slice();
    for(let t=0;t<TSTEPS;t++){
      x=x.map(v=>Math.sqrt(1-BETA)*v+Math.sqrt(BETA)*(rnd()*2-1));
      this.chain.push(x.map(v=>Math.max(-1.4,Math.min(1.4,v))));
    }
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
          <div class="tool-panel" id="tPanel" style="display:none"><h4>🎚 扩散步 t</h4>
            <div id="tLever"></div>
            <div class="dim2 small" style="margin-top:6px">t=0 原图 → t=20 纯噪声（真实加噪链）</div>
          </div>
          <div class="tool-panel" id="revPanel" style="display:none"><h4>🪝 反向打捞</h4>
            <button class="btn primary" id="revBtn" style="width:100%">逐步去噪（10 步）▶</button>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'从噪声里捞图',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('从噪声里捞图',`<p>正向：每步 xₜ=√(1−β)·xₜ₋₁+√β·ε（真实计算），20 步到纯噪声。反向：训练网络每步去一点噪，从纯噪声捞回信号。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l6d'}),
      quick:['DDPM 的去噪网络学什么？','为什么扩散比 GAN 稳？','步数能减少吗？']
    });
    this.buildPlot();
    this.setGoal('幕一 · 预测：加噪到 t=10（一半），信号长什么样？');
    this.ask('t=10 时（20 步的一半），信号是？',[
      {v:'原方波形状依稀可辨的噪声版',ok:true,
       why:'对。√(1−β) 连乘 10 次≈0.34：信号衰减到三分之一，但轮廓还在；t=20 才接近纯噪声。'},
      {v:'纯随机噪声，完全看不出原样',mId:'M-GE-04',
       why:'那是 t=20 的状态——中间步骤残留结构，这正是"逐步"的意义。'},
      {v:'比原图更清晰',mId:'M-GE-04',
       why:'加噪只会破坏，不会增强。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildPlot(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 640 200',width:'100%',style:'max-width:640px'},box);
    this.svg('path',{d:'M40 20 L 40 180 M620 20 L 620 180',stroke:'rgba(111,103,90,.2)'},this.svgEl);
    this.signalG=this.svg('g',{},this.svgEl);
    this.title=this.svg('text',{x:330,y:16,'text-anchor':'middle','font-size':16,fill:'#5A6774','font-weight':700},this.svgEl);
    this.title.textContent='t=0（原图）';
    this.legend=this.el('div',{class:'dim2 small'},box);
    this.legend.textContent='蓝=信号值 · 灰虚线=0 基线';
  }
  paintT(t){
    [...this.signalG.children].forEach(c=>c.remove());
    const x=this.chain[t];
    const X=i=>40+i/(NPTS-1)*580, Y=v=>100-v*70;
    this.svg('path',{d:`M40 100 L620 100`,stroke:'rgba(111,103,90,.25)','stroke-dasharray':'3 4'},this.signalG);
    let d='';
    x.forEach((v,i)=>{d+=(i?'L':'M')+X(i)+' '+Y(v)+' ';});
    this.svg('path',{d,stroke:'#1CB0F6','stroke-width':2.2,fill:'none'},this.signalG);
    x.forEach((v,i)=>this.svg('circle',{cx:X(i),cy:Y(v),r:3,fill:'#1CB0F6'},this.signalG));
    this.title.textContent='t='+t+(t===0?'（原图）':t===TSTEPS?'（纯噪声）':'');
  }

  act2(){
    this.phase='slide';
    this.hudApi.setSteps('幕二 · 滑动验证');
    this.setGoal('幕二 · 滑动验证：拖 t 滑杆走完加噪链（真实计算），验证你的预测。');
    document.getElementById('tPanel').style.display='';
    makeLever(document.getElementById('tLever'),{
      label:'扩散步 t',
      gears:[0,5,10,15,20].map(v=>({label:'t='+v,v})),
      value:0,
      onChange:g=>{this.paintT(g.v);this.record({type:'t_slide',correct:null,value:g.v});}
    });
    this.paintT(0);
    setTimeout(()=>{
      document.getElementById('revPanel').style.display='';
      document.getElementById('revBtn').onclick=()=>this.reverse();
    },400);
  }

  reverse(){
    this.phase='reverse';
    document.getElementById('revBtn').disabled=true;
    // 反向：从 t=20 沿链回放（教学演示：去噪轨迹=逆向经过中间状态）
    let t=TSTEPS;
    this.record({type:'denoise_start',correct:null,value:t});
    const step=()=>{
      if(t<=0){
        toast('打捞完成：从纯噪声回到了方波轮廓 🪝（真实去噪网络学的正是每一步"减多少噪"）','ok',3600);
        setTimeout(()=>this.act3(),1600);
        return;
      }
      t-=2;
      this.paintT(Math.max(0,t));
      this.record({type:'denoise_step',correct:null,value:t});
      setTimeout(step,520);
    };
    step();
  }

  act3(){
    this.phase='concept';
    this.hudApi.setSteps('幕三 · 一问');
    this.ask('为什么去噪要一步一步，不能一步到位？',[
      {v:'每步只去一点噪，小步逼近才稳定——这是"稳但慢"的代价',ok:true,
       why:'对。一步跨太大=网络要凭空猜整张图；小步让每步的任务足够简单、可学。'},
      {v:'网络太小记不住整张图',mId:'M-GE-04',why:'与容量无关，是任务设计。'},
      {v:'为了多收算力费',mId:'M-GE-04',why:'工程上恰恰在努力减少步数（加速采样）。'}
    ],()=>this.finish({}),true);
    const w=setInterval(()=>{if(document.getElementById('finBtn11'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-GE-04')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn11" style="margin-top:10px">完成打捞之旅 🎓</button>`:'');
          if(keep)document.getElementById('finBtn11').onclick=()=>this.finish({});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l6d',0);}
}
