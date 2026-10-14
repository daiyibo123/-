// L4-D 一句一句生成（4-4）：Seq2Seq 编码→解码 + Teacher Forcing 对比 + 困惑度
// 设计文档：docs/案例设计/4C4D-三扇门与生成-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const SRC='hell', TGT='olleh';

export default class L4DSeq extends LevelBase{
  static id='l4d'; static title='一句一句生成';

  mount(){
    const cfg=this.cfg=LEVELS.l4d;
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
          <div class="tool-panel" id="genPanel" style="display:none"><h4>🎬 生成台</h4>
            <div class="readout small">任务：把 <b class="mono">hell</b> 翻译成 <b class="mono">olleh</b>（反转）</div>
            <button class="btn primary" id="genBtn" style="width:100%;margin-top:8px">自回归生成一次 ▶</button>
            <div id="genOut" class="mono" style="font-size:16px;margin-top:10px;min-height:28px;text-align:center"></div>
            <div class="dim2 small" style="margin-top:6px">训练曲线（教学构造，形状取自两种训练方式的典型 loss）见左图</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;
    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'一句一句生成',steps:'幕一 · 预测',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('一句一句生成',`<p>编码器把 hell 压成一个向量，解码器逐字生成 olleh。训练用 Teacher Forcing（喂真词）；生成时只能喂自己上一步的输出——落差叫"暴露偏差"。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l4d'}),
      quick:['Teacher Forcing 为什么收敛快？','暴露偏差怎么缓解？','困惑度怎么读？']
    });
    this.buildStage();
    this.setGoal('幕一 · 预测：Teacher Forcing 训练时，解码器第 3 步的输入是什么？');
    this.ask('Teacher Forcing 训练时，解码器第 3 步的输入是？',[
      {v:'真答案的前一个字（这里 是 l）',ok:true,
       why:'对。每步都从正确的上文出发，梯度信号干净——所以收敛飞快。'},
      {v:'模型自己第 2 步生成的字',mId:'M-SQ-04',
       why:'那是"关掉 TF"的自由运行训练——慢且不稳，但更接近生成时的真实条件。'},
      {v:'一个随机字',mId:'M-SQ-04',
       why:'随机输入学不到条件依赖。'}
    ],()=>this.act2());
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  buildStage(){
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const box=document.createElement('div');
    box.style.cssText='display:flex;flex-direction:column;gap:10px;align-items:center;padding:10px';
    stage.appendChild(box);
    // 编码器-解码器结构图
    this.svgEl=this.svg('svg',{viewBox:'0 0 700 120',width:'100%',style:'max-width:700px'},box);
    const defs=this.svg('defs',{},this.svgEl);
    const mk=this.svg('marker',{id:'ar3',markerWidth:'7',markerHeight:'7',refX:'6',refY:'3',orient:'auto'},defs);
    this.svg('path',{d:'M0 0 L6 3 L0 6 z',fill:'#5A6774'},mk);
    this.svg('text',{x:105,y:20,'text-anchor':'middle','font-size':16,fill:'#1CB0F6','font-weight':700},this.svgEl).textContent='编码器（读入 hell）';
    this.svg('text',{x:530,y:20,'text-anchor':'middle','font-size':16,fill:'#C2543C','font-weight':700},this.svgEl).textContent='解码器（逐字生成）';
    'hell'.split('').forEach((ch,i)=>{
      this.svg('rect',{x:20+i*46,y:34,width:40,height:30,rx:6,fill:'#E7EFF6',stroke:'#1CB0F6'},this.svgEl);
      this.svg('text',{x:40+i*46,y:54,'text-anchor':'middle','font-size':20,fill:'#2B70C9'},this.svgEl).textContent=ch;
      if(i<3)this.svg('path',{d:`M${60+i*46} 49 L ${66+i*46} 49`,stroke:'#5A6774','stroke-width':1.6,'marker-end':'url(#ar3)'},this.svgEl);
    });
    this.svg('path',{d:'M204 49 C 260 49, 260 49, 300 49',stroke:'#C98A2D','stroke-width':2.4,fill:'none','marker-end':'url(#ar3)'},this.svgEl);
    this.svg('text',{x:252,y:40,'text-anchor':'middle','font-size':16,fill:'#C98A2D'},this.svgEl).textContent='向量';
    this.svg('rect',{x:300,y:34,width:56,height:30,rx:6,fill:'#FBF3E4',stroke:'#C98A2D'},this.svgEl);
    this.svg('text',{x:328,y:54,'text-anchor':'middle','font-size':16,fill:'#7A5218'},this.svgEl).textContent='ctxt';
    'olleh'.split('').forEach((ch,i)=>{
      this.svg('rect',{x:392+i*46,y:34,width:40,height:30,rx:6,fill:'#FDECE8',stroke:'#C2543C'},this.svgEl);
      this.svg('text',{x:412+i*46,y:54,'text-anchor':'middle','font-size':20,fill:'#8F3A28'},this.svgEl).textContent=ch;
      if(i<4)this.svg('path',{d:`M${432+i*46} 49 L ${438+i*46} 49`,stroke:'#5A6774','stroke-width':1.6,'marker-end':'url(#ar3)'},this.svgEl);
    });
    this.svg('path',{d:'M600 70 C 600 96, 420 96, 420 70',stroke:'rgba(194,84,60,.5)','stroke-width':1.6,'stroke-dasharray':'4 3',fill:'none','marker-end':'url(#ar3)'},this.svgEl);
    this.svg('text',{x:510,y:104,'text-anchor':'middle','font-size':16,fill:'#C2543C'},this.svgEl).textContent='生成时：喂回自己上一步的输出';
    // 训练曲线对比
    this.chartBox=document.createElement('div');
    box.appendChild(this.chartBox);
  }

  act2(){
    this.phase='gen';
    this.hudApi.setSteps('幕二 · 训练曲线与生成');
    this.setGoal('幕二 · 对比两种训练：Teacher Forcing 开（蓝，降得快）vs 关（赭，慢但贴近生成条件）。然后点「自回归生成一次」看暴露偏差。');
    // 双曲线（教学构造形状）
    const W=700,H=170;
    this.chartBox.innerHTML='';
    const sv=this.svg('svg',{viewBox:`0 0 ${W} ${H}`,width:'100%',style:'max-width:700px'},this.chartBox);
    const X=e=>40+e/40*(W-60), Y=v=>H-22-v/2.2*(H-44);
    for(let v=0;v<=2.2;v+=0.55){
      this.svg('path',{d:`M40 ${Y(v)} L ${W-20} ${Y(v)}`,stroke:'rgba(111,103,90,.15)'},sv);
    }
    const line=(fn,color,label)=>{
      let d='';
      for(let e=0;e<=40;e++){d+=(e?'L':'M')+X(e)+' '+Y(fn(e))+' ';}
      this.svg('path',{d,stroke:color,'stroke-width':2.4,fill:'none'},sv);
      this.svg('text',{x:W-24,y:Y(fn(40))-6,'text-anchor':'end','font-size':16,fill:color,'font-weight':700},sv).textContent=label;
    };
    line(e=>2.0*Math.exp(-0.16*e),'#1CB0F6','TF 开：loss 快降');
    line(e=>1.9*Math.exp(-0.05*e)+0.15,'#C98A2D','TF 关：慢而稳');
    this.svg('text',{x:W/2,y:H-4,'text-anchor':'middle','font-size':16,fill:'#5A6774'},sv).textContent='epoch →（教学构造曲线）';
    document.getElementById('genPanel').style.display='';
    document.getElementById('genBtn').onclick=()=>this.generate();
  }
  generate(){
    const outEl=document.getElementById('genOut');
    outEl.textContent='';
    // 自回归演示：正常一次 + 一次"翻车"（暴露偏差）交替
    this.genCount=(this.genCount||0)+1;
    const flip=this.genCount%2===0;
    const seq=flip?['o','l','l','l','e','h']:[...TGT];   // 偶数次演示一步错步步错
    let i=0;
    this.record({type:'generate',correct:null,value:{flip,genCount:this.genCount}});
    const tick=()=>{
      if(i>=seq.length){
        outEl.innerHTML=flip
          ?'<span style="color:var(--err)">ollleh ✗</span> <span class="dim2 small">（第 3 步选错 → 后面跟着错——暴露偏差）</span>'
          :'<span style="color:var(--ok)">olleh ✓</span> <span class="dim2 small">（每步都对，一路顺到底）</span>';
        if(this.genCount>=2)this.act3();
        return;
      }
      outEl.innerHTML=seq.slice(0,i+1).join('')+'<span class="pulse">|</span>';
      i++;
      setTimeout(tick,480);
    };
    tick();
  }

  act3(){
    this.phase='ppl';
    this.hudApi.setSteps('幕三 · 困惑度两问');
    this.setGoal('幕三 · 困惑度两问：读懂数字，说清落差。');
    this.ask('模型 A 困惑度 12，模型 B 困惑度 90，说明什么？',[
      {v:'A 更好——每词平均分支数更接近真实分布',ok:true,
       why:'对。PPL = e^(平均交叉熵)：12 意味着平均在 12 个候选里挑对；越低越好。'},
      {v:'B 准确率更高',mId:'M-SQ-05',why:'困惑度不是准确率，且数值越低越好。'},
      {v:'A 过拟合了',mId:'M-SQ-05',why:'PPL 本身不指示过拟合——那要看训练/验证两组 PPL 的分叉。'}
    ],()=>{
      this.ask('训练用 Teacher Forcing、生成时没有——这个落差叫什么？',[
        {v:'暴露偏差（一步错步步错的连锁）',ok:true,
         why:'对。缓解办法：计划采样（按概率混喂真词/自词）、调度采样等。'},
        {v:'过拟合',mId:'M-SQ-04',why:'过拟合是训练/验证差距；这是训练条件与生成条件不一致。'},
        {v:'梯度消失',mId:'M-SQ-02',why:'那是长序列连乘问题，与 TF 无关。'}
      ],()=>this.finish({genCount:this.genCount}),true);
      const w=setInterval(()=>{if(document.getElementById('finBtn4'))clearInterval(w);},300);
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
        this.record({type:'predict',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,24),mId:ok?null:(o.mId||'M-SQ-04')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          document.getElementById('askFb').innerHTML=
            `<p style="font-size:13px;color:var(--ok);text-align:left;margin-top:6px">✓ ${o.why}</p>`+
            (keep?`<button class="btn primary" id="finBtn4" style="margin-top:10px">完成生成课 🎓</button>`:'');
          if(keep)document.getElementById('finBtn4').onclick=()=>this.finish({genCount:this.genCount});
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
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l4d',0);}
}
