// L6-C 猫鼠大战（6-3）：页内真实交替梯度训练的 1D GAN + 模式崩溃模拟
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

export default class L6C_GAN extends LevelBase{
  static id='l6c'; static title='猫鼠大战（GAN）';

  mount(){
    const cfg=this.cfg=LEVELS.l6c;
    this.g=1.9;this.d=0.2;      // G 输出均值、D 斜率（sigmoid 打分）
    this.realMu=4;
    this.hist=[];this.runs=0;this.collapsed=false;
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
          <div class="tool-panel" id="trainPanel" style="display:none"><h4>⚔ 对抗训练台</h4>
            <button class="btn primary" id="trainBtn" style="width:100%">开始交替训练 ▶</button>
            <button class="btn ghost" id="genBtn" style="width:100%;margin-top:6px">让 G 生成 8 个样本 🎲</button>
            <button class="btn ghost" id="cxBtn" style="width:100%;margin-top:6px">灾难开关：G 学习率 ×10 💥</button>
            <div class="readout small" style="margin-top:8px">G 输出均值 <b id="gv">–</b>（目标 ≈ 4）</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'猫鼠大战',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('猫鼠大战',`<p>真实数据在 4 附近。G 造假（当前只会产 ${this.g.toFixed(1)}），D 鉴别。交替梯度训练，看两条损失曲线。灾难开关模拟模式崩溃。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l6c'}),
      quick:['GAN 为什么难训？','模式崩溃怎么办？','纳什均衡和 GAN 什么关系？']
    });
    this.buildChart();
    this.setGoal('本案例作用：亲眼跑一遍对抗训练，学会读 GAN 的训练曲线——振荡不是失败（博弈常态），样本坍缩成同一个是模式崩溃。幕一 · 预测：G 与 D 交替训练，两条损失曲线会是什么形态？');
    this.ask('对抗训练中 D/G 损失的典型形态？',[
      {v:'此消彼长的振荡——博弈是动态的',ok:true,
       why:'对。G 变强 D 损失升，D 变强 G 损失升——平衡点在动态中逼近，不是双双下降。'},
      {v:'双双单调下降',mId:'M-GE-03',
       why:'GAN 没有单一联合目标——双双下降是监督学习的形态。'},
      {v:'恒为 0',mId:'M-GE-03',
       why:'那是理想平衡的瞬间，训练中不停扰动。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  dScore(x){return 1/(1+Math.exp(-this.d*(x-this.realMu)));}
  losses(){
    const fg=0.5,dg=0.6;
    const fd=this.dScore(this.g);
    const LD=-(Math.log(this.dScore(this.realMu)+1e-9)+Math.log(1-fd+1e-9))/2;
    const LG=-Math.log(fd+1e-9)*fg;
    return {LD,LG};
  }
  trainStep(lrG,lrD){
    // 解析梯度：D 沿分辨方向加强，G 向 realMu 逼近（经 D 的 sigmoid 斜率加权）
    const fd=this.dScore(this.g),fr=this.dScore(this.realMu);
    this.d+=lrD*((fr*(1-fr))-(fd*(1-fd)))*2;         // D：拉开真假打分差
    this.g+=lrG*(fr-fd)*3;                            // G：向"像真"方向挪
    if(this.g<0.2)this.g=0.2;if(this.g>6.5)this.g=6.5;
    if(this.d<-2)this.d=-2;if(this.d>2)this.d=2;
  }

  buildChart(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:8px;align-items:center;padding:10px';
    stage.appendChild(box);
    this.svgEl=this.svg('svg',{viewBox:'0 0 640 220',width:'100%',style:'max-width:640px;min-height:288px'},box);
    this.svg('text',{x:12,y:16,'font-size':16,fill:'#C2543C','font-weight':700},this.svgEl).textContent='D 损失（判别器）';
    this.svg('text',{x:12,y:110,'font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl).textContent='G 损失（生成器）';
    this.dPath=this.svg('path',{stroke:'#C2543C','stroke-width':2,fill:'none'},this.svgEl);
    this.gPath=this.svg('path',{stroke:'#1CB0F6','stroke-width':2,fill:'none'},this.svgEl);
    this.genRow=this.el('div',{style:'display:flex;gap:6px;justify-content:center;flex-wrap:wrap'},box);
    this.legend=this.el('div',{class:'dim2 small'},box);
    this.legend.textContent='真实数据分布中心 = 4.0';
  }
  redraw(){
    const n=Math.max(this.hist.length,2);
    const X=i=>50+i/(Math.max(n-1,30))*(580);
    const dD=v=>30+Math.max(0,Math.min(1,v/2))*60;      // D 损失区 30-90
    const dG=v=>120+Math.max(0,Math.min(1,v/3))*60;     // G 损失区 120-180
    let pd='',pg='';
    this.hist.forEach((h,i)=>{
      pd+=(i?'L':'M')+X(i)+' '+dD(h.LD)+' ';
      pg+=(i?'L':'M')+X(i)+' '+dG(h.LG)+' ';
    });
    this.dPath.setAttribute('d',pd);this.gPath.setAttribute('d',pg);
    document.getElementById('gv').textContent=this.g.toFixed(2);
  }
  showGen(){
    [...this.genRow.children].forEach(c=>c.remove());
    for(let i=0;i<8;i++){
      const v=this.collapsed?this.g+((i===0?0:0))+(Math.random()-0.5)*0.15
                             :this.g+(Math.random()-0.5)*0.9;
      const s=this.el('span',{class:'mono',style:'font-size:12px;padding:3px 8px;border-radius:8px;border:1px solid '+(Math.abs(v-this.realMu)<0.8?'#3E8A5E':'#C98A2D')},this.genRow);
      s.textContent=v.toFixed(1);
    }
    this.record({type:'generate',correct:null,value:{g:+this.g.toFixed(2),collapsed:this.collapsed}});
  }

  act2(){
    this.phase='train';
    this.hudApi.setSteps('幕二 · 观战');
    this.setGoal('幕二 · 观战：点「开始交替训练」——真实交替梯度下降（页内计算）。中途可让 G 生成样本；最后试灾难开关。');
    document.getElementById('trainPanel').style.display='';
    document.getElementById('genBtn').onclick=()=>this.showGen();
    document.getElementById('cxBtn').onclick=()=>{
      this.collapsed=!this.collapsed;
      toast(this.collapsed?'💥 崩溃模式：G 学习率×10——看生成样本坍缩成几乎同一个值':'恢复正常学习率','err',2600);
      this.record({type:'collapse_toggle',correct:null,value:this.collapsed});
    };
    document.getElementById('trainBtn').onclick=()=>{
      document.getElementById('trainBtn').disabled=true;
      this.runs++;
      this.record({type:'train_run',correct:true,value:this.runs});
      // 交替训练 240 轮（时间补偿，~7s）
      const t0=performance.now(),dur=7000,total=240;
      const lrG=this.collapsed?0.09:0.018;
      const tick=()=>{
        if(this.phase!=='train')return;
        const n=Math.min(total,Math.ceil((performance.now()-t0)/dur*total));
        while(this.hist.length<n){
          this.trainStep(this.collapsed?0.09:0.018,0.02);
          const l=this.losses();this.hist.push(l);
        }
        this.redraw();
        if(n>=total){
          toast(`训练完成：G 输出均值 → ${this.g.toFixed(2)}（真实 4.0）。注意曲线全程振荡——这是博弈，不是失败。`,'ok',3600);
          setTimeout(()=>this.act3(),1800);
          return;
        }
        setTimeout(tick,120);
      };
      setTimeout(tick,300);
    };
  }

  act3(){
    this.phase='concept';
    this.hudApi.setSteps('幕三 · 两问');
    this.ask('D/G 损失一直振荡，训练失败了吗？',[
      {v:'不一定——对抗训练本来就是动态博弈，看样本质量趋势',ok:true,
       why:'对。GAN 没有"损失降到 0"的收敛定义，平衡在动态中维持。'},
      {v:'失败了，正常训练损失都应该下降',mId:'M-GE-03',
       why:'那是监督学习的直觉；GAN 的两人博弈不适用。'},
      {v:'只要加长训练就好',mId:'M-GE-03',
       why:'不稳是结构性的，需要技巧（如谱归一化、TTUR）。'}
    ],()=>{
      this.ask('生成器输出几乎全是一样的值，这叫？',[
        {v:'模式崩溃——多样性坍缩到少数模式',ok:true,
         why:'对。灾难开关演示的就是它：G 找到一个能骗过 D 的点就躺平。'},
        {v:'收敛——找到最优解',mId:'M-GE-03',
         why:'最优生成应覆盖整个真实分布，不是单点。'},
        {v:'过拟合',mId:'M-GE-03',
         why:'过拟合是训练/验证差距，不是多样性坍缩。'}
      ],()=>this.finish({finalG:+this.g.toFixed(2)}),true);
      const w=setInterval(()=>{if(document.getElementById('finBtn10'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-GE-03')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn10" style="margin-top:10px">完成猫鼠大战 🎓</button>`:'');
          if(keep)document.getElementById('finBtn10').onclick=()=>this.finish({finalG:+this.g.toFixed(2)});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l6c',0);}
}
