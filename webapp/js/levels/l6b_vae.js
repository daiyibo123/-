// L6-B 会做梦的潜空间（6-2）：VAE——KL 约束让潜空间连续，滑杆采样看平滑过渡（真实插值计算）
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeLever } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

function moons(){
  const A=[],B=[];
  for(let i=0;i<24;i++){
    const t=i/23*Math.PI;
    A.push([Math.cos(t)*1.1+0.55, Math.sin(t)*0.9-0.25]);
    B.push([Math.cos(t+Math.PI)*1.1-0.55, Math.sin(t+Math.PI)*0.9+0.25]);
  }
  return {A,B};
}

export default class L6B_VAE extends LevelBase{
  static id='l6b'; static title='会做梦的潜空间（VAE）';

  mount(){
    const cfg=this.cfg=LEVELS.l6b;
    const {A,B}=moons();
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
          <div class="tool-panel" id="sldPanel" style="display:none"><h4>🎚 潜空间采样滑杆</h4>
            <div id="sld"></div>
            <div class="dim2 small" style="margin-top:6px">α=0 取蓝侧样本，α=1 取红侧；中间=从连续潜空间采出的"梦"</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'会做梦的潜空间',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('会做梦的潜空间',`<p>VAE 给潜空间加了 KL 约束（压向标准正态）——潜码之间的区域变得"有意义"。滑动 α，看输出从蓝月牙平滑变到红月牙。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l6b'}),
      quick:['KL 项在管什么？','重参数化为什么必要？','VAE 为什么输出偏糊？']
    });
    this.buildPlot();
    this.setGoal('幕一 · 预测：同样是潜码连线取中点——这次在 VAE 的潜空间里。输出会是什么？');
    this.ask('VAE 潜空间里，两样本连线中点解码，输出是？',[
      {v:'平滑的中间过渡样本——潜空间被 KL 压成了连续"梦乡"',ok:true,
       why:'对。KL 把各簇压成相互重叠的正态，中间区域也被数据"住满"——采样即生成。'},
      {v:'还是鬼影——和 AE 一样',mId:'M-GE-02',
       why:'那正是 AE 的问题；VAE 的 KL 就是为了治它。'},
      {v:'报错——中间点没有定义',mId:'M-GE-02',
       why:'潜空间是连续向量空间，处处可解码。'}
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
    this.svg('path',{d:'M20 150 L 420 150 M220 10 L 220 290',stroke:'rgba(111,103,90,.25)','stroke-width':1},this.svgEl);
    this.data.A.forEach(p=>this.svg('circle',{cx:p[0]*100+220,cy:-p[1]*100+150,r:3,fill:'#1CB0F6',opacity:.45},this.svgEl));
    this.data.B.forEach(p=>this.svg('circle',{cx:p[0]*100+220,cy:-p[1]*100+150,r:3,fill:'#C2543C',opacity:.45},this.svgEl));
    this.sampleG=this.svg('g',{},this.svgEl);
    this.trailG=this.svg('g',{},this.svgEl);
    this.legend=this.el('div',{class:'dim2 small'},box);
    this.legend.textContent='紫点 = 当前采样解码的输出';
  }
  // VAE 输出：α 混合两侧对应参数点（真实插值计算，展示连续过渡）
  sampleAt(alpha){
    const tA=6/23*Math.PI, tB=16/23*Math.PI;
    const pA=[Math.cos(tA)*1.1+0.55, Math.sin(tA)*0.9-0.25];
    const pB=[Math.cos(tB+Math.PI)*1.1-0.55, Math.sin(tB+Math.PI)*0.9+0.25];
    return [pA[0]*(1-alpha)+pB[0]*alpha, pA[1]*(1-alpha)+pB[1]*alpha];
  }
  paintSample(alpha,keepTrail){
    const p=this.sampleAt(alpha);
    if(keepTrail)this.svg('circle',{cx:p[0]*100+220,cy:-p[1]*100+150,r:2,fill:'#CE82FF',opacity:.5},this.trailG);
    [...this.sampleG.children].forEach(c=>c.remove());
    this.svg('circle',{cx:p[0]*100+220,cy:-p[1]*100+150,r:8,fill:'none',stroke:'#CE82FF','stroke-width':2.5},this.sampleG);
  }

  act2(){
    this.phase='slide';
    this.hudApi.setSteps('幕二 · 滑动采样');
    this.setGoal('幕二 · 滑动采样：拖 α 滑杆从蓝到红——输出沿一条平滑轨迹过渡（紫色轨迹 = 潜空间里的"梦"）。');
    document.getElementById('sldPanel').style.display='';
    makeLever(document.getElementById('sld'),{
      label:'α（潜空间位置）',
      gears:[{label:'0',v:0},{label:'0.25',v:0.25},{label:'0.5',v:0.5},{label:'0.75',v:0.75},{label:'1',v:1}],
      value:0,
      onChange:g=>{this.paintSample(g.v,true);this.record({type:'sample',correct:null,value:g.v});}
    });
    this.paintSample(0,true);
    setTimeout(()=>this.act3(),400);
  }

  act3(){
    this.phase='concept';
    this.hudApi.setSteps('幕三 · 两问');
    this.ask('重参数化 z = μ + σ⊙ε 解决什么问题？',[
      {v:'把"采样"拆成确定部分+外部噪声，让随机节点可以反向传播',ok:true,
       why:'对。梯度走 μ、σ 这条确定路，ε 只当常量——VAE 才能端到端训练。'},
      {v:'让 z 更大',mId:'M-GE-02',why:'与幅值无关，是可导性问题。'},
      {v:'防止过拟合',mId:'M-GE-02',why:'与正则无关。'}
    ],()=>{
      this.ask('AE vs VAE 的本质区别？',[
        {v:'VAE 对潜空间加分布约束（KL），支持采样生成',ok:true,
         why:'对。代价：重构略糊（KL 与重构的折中）。'},
        {v:'VAE 层数更深',mId:'M-GE-01',why:'与深度无关。'},
        {v:'VAE 用了更好的优化器',mId:'M-GE-01',why:'与优化器无关。'}
      ],()=>this.finish({}),true);
      const w=setInterval(()=>{if(document.getElementById('finBtn9'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-GE-02')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn9" style="margin-top:10px">完成潜空间之旅 🎓</button>`:'');
          if(keep)document.getElementById('finBtn9').onclick=()=>this.finish({});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l6b',0);}
}
