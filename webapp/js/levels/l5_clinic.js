// L5 网络诊室：先预测配置 → 诊断牌拖挂 + 药架处方（早停标尺），真实训练曲线病历
// 设计文档：docs/案例设计/2C-网络诊室升级-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';
import { CURVES } from '../data/curves.js';

const CASES=[
  {id:'case1',data:CURVES.case1,name:'病历 #001 · 「背答案的大网」',
   symptom:'学员用 64×64 双隐层、batch=2 训练了 2500 轮。训练损失一路降到 0.006；验证损失先降到 0.012，随后掉头向上。',
   dx:'overfit',golds:['dropout','l2','early','aug'],taboo:['bigger'],
   treatOf:{dropout:'dropout',l2:'l2',early:'early',aug:'dropout'}},
  {id:'case2',data:CURVES.case2,name:'病历 #002 · 「学不会的小脑」',
   symptom:'学员为省算力用了 2 个隐藏单元。训练 1000 轮后，训练/验证损失双双停在 0.10 附近，纹丝不动。',
   dx:'underfit',golds:['bigger'],taboo:['dropout','l2','early'],
   treatOf:{bigger:'bigger'}},
  {id:'case3',data:CURVES.case3,name:'病历 #003 · 「喝醉的验证曲线」',
   symptom:'学员把 batch 设为 4 且学习率偏大。训练勉强下降，验证曲线在 0.11–0.21 之间剧烈抖动。',
   dx:'unstable',golds:['lrfix'],taboo:['l2','dropout'],
   treatOf:{lrfix:'lrfix'}}
];
const MEDS=[
  {id:'early',name:'早停标尺',desc:'拖到曲线上选停止轮次'},
  {id:'dropout',name:'Dropout 旋钮',desc:'随机失忆 45%'},
  {id:'l2',name:'L2 正则',desc:'权重衰减 λ=0.008'},
  {id:'aug',name:'数据增强',desc:'翻转/拉伸训练样本'},
  {id:'bigger',name:'加大模型',desc:'扩充隐藏层容量'},
  {id:'lrfix',name:'降学习率',desc:'η 下调一个数量级'}
];
const DX_CARDS=[{id:'overfit',name:'过拟合'},{id:'underfit',name:'欠拟合'},{id:'unstable',name:'训练不稳'}];

// 预测配置幕：只读曲线 → 猜哪种配置练出来的（症状文字此时隐藏，它含答案）
const PRED=[
  {ask:'先不看病历详情，只读曲线：训练损失一路降到 0.006，验证损失先降到 0.012 后掉头向上。这位学员最可能用了哪种配置？',
   sig:'曲线签名：训练线还在降、验证线掉头向上 = 过拟合（开始背答案）',
   options:[
     {v:'64×64 双隐层、无任何正则化、训练 2500 轮',ok:true,
      why:'容量大又没有约束：先把规律学会（两线同降），随后开始"背"训练集里的噪声——训练线继续降、验证线掉头向上。'},
     {v:'只有 2 个隐藏单元的小网',mId:'M-OF-03',
      why:'小网学不动，两条线会一起卡在高位——可这条训练损失都到 0.006 了，模型明明学得"很好"。'},
     {v:'学习率设得偏大',mId:'M-OF-04',
      why:'学习率过大的标志是曲线剧烈抖动、上下乱跳——这两条线走得很平滑，不是步子的问题。'}
   ]},
  {ask:'两条曲线双双停在 0.10 附近、纹丝不动。最可能用了哪种配置？',
   sig:'曲线签名：两条线一起卡在高位 = 欠拟合（根本没学会）',
   options:[
     {v:'只用了 2 个隐藏单元，容量太小',ok:true,
      why:'容量不足，模型连训练集的规律都装不下——训练损失都降不动，验证自然也降不动。'},
     {v:'64×64 大网、无正则化、训练很久',mId:'M-OF-03',
      why:'大网无正则会先把两线降到很低、再出现验证掉头的"钩子"——不会一起卡死在高位。'},
     {v:'学习率设得偏大',mId:'M-OF-04',
      why:'学习率过大是"上蹿下跳"，不是"纹丝不动"。这条线平稳得像睡着了。'}
   ]},
  {ask:'训练勉强下降，验证在 0.11–0.21 之间剧烈抖动。最可能用了哪种配置？',
   sig:'曲线签名：高频抖动、上下乱跳 = 训练不稳（步子太大 / 批量太小）',
   options:[
     {v:'batch=4 且学习率偏大',ok:true,
      why:'批量太小 + 步子太大：每步的梯度噪声大、一跨又远，损失曲线就"喝醉"了。'},
     {v:'只有 2 个隐藏单元的小网',mId:'M-OF-04',
      why:'容量不足是"学不会"（稳在高位），不是"喝醉"（抖动）。'},
     {v:'64×64 大网无正则、训练太久',mId:'M-OF-02',
      why:'过拟合的验证线是平滑地先降后升，不是高频振荡。'}
   ]}
];
// 毕业考核：三集划分（大纲"解读训练/验证/测试三集指标"）
const TESTQ={ask:'病历图上画了训练损失和验证损失两条曲线——测试集的曲线在哪？',
 options:[
   {v:'测试集不画曲线：模型定型后，它只用一次、打个最终分',ok:true,
    why:'对。训练/验证是"日常作业/周测"（可以反复看、用来调参选模型）；测试集是期末大考——只考一次。考前偷看试题，考分就会虚高（数据泄漏）。'},
   {v:'应该还有第三条曲线，只是这份病历忘了画',mId:'M-TR-01',
    why:'不是忘了画——测试集不参与逐轮训练，根本没有"随轮次变化的曲线"可言。'},
   {v:'验证集就是测试集，只是名字不同',mId:'M-TR-02',
    why:'验证集用来反复调超参、选早停点；测试集只在最后用一次。混用它们，报告的成绩就不可信。'}
 ]};

export default class L5Clinic extends LevelBase{
  static id='l5'; static title='网络诊室';

  mount(){
    const cfg=this.cfg=LEVELS.l5;
    this.ci=0;this.combo=0;this.caseDone=0;

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage" id="stage" style="padding:16px"></div>
        <div class="side">
          <div class="target-card"><h4>当前病历</h4><p id="caseName" style="font-weight:700"></p><p class="dim small" id="caseSym" style="margin-top:6px;line-height:1.7"></p></div>
          <div class="tool-panel" id="predPanel" style="display:none"><h4>🔮 先预测：这是什么配置练出来的？</h4>
            <p id="predAsk" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <div id="predOpts" style="display:flex;flex-direction:column;gap:8px"></div>
            <div id="predReveal" style="display:none"></div>
          </div>
          <div class="tool-panel" id="medPanel"><h4>💊 药架（拖 1–2 味到处方单）</h4>
            <div id="medshelf" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center"></div>
          </div>
          <div class="tool-panel" id="rxPanel"><h4>处方单</h4>
            <div id="rx" style="display:flex;gap:8px;justify-content:center"></div>
            <button class="btn primary" id="treatBtn" style="margin-top:8px">💊 服药（复诊）</button>
            <div class="dim2 small" style="margin-top:6px">含早停时：先拖标尺到验证曲线最佳处</div>
          </div>
        </div>
      </div>
      <div class="tray" id="dxTray"></div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'网络诊室',steps:'病历 1/3',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('规则',`<p>${cfg.goal}</p><p class="dim2 small" style="margin-top:8px">流程：①只看曲线，先猜训练配置 ②揭示后挂诊断牌 ③从药架拖药 ④调参数（早停要拖标尺）⑤点服药看复诊曲线。药不对症会加重病情。全部治愈后还有一道毕业考核。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l5'}),
      quick:['过拟合和欠拟合怎么区分？','早停应该停在哪里？','测试集和验证集有什么区别？']
    });
    this.loadCase(0);
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  loadCase(i){
    this.ci=i;const c=this.cs=CASES[i];
    this.rx=[];this.dx=null;this.earlyEpoch=null;this.phase='predict';this.predWrong=0;
    document.getElementById('caseName').textContent=c.name;
    document.getElementById('caseSym').textContent='某学员提交了一份训练记录（蓝=训练损失，红=验证损失）。先读曲线猜配置——猜完才开放病历详情。';
    this.hudApi.setSteps(`病历 ${i+1}/3 · 预测配置`);
    const stage=document.getElementById('stage');
    stage.innerHTML='';
    const head=document.createElement('div');
    head.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px';
    head.innerHTML=`<div style="font-weight:700">${c.name}</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span class="dim2 small" id="phaseHint">🔮 第一步：先猜这份曲线是什么配置练出来的</span>
        <div class="slot" id="dxSlot" style="min-height:44px;display:none"><span>挂诊断牌 →</span></div>
      </div>`;
    stage.appendChild(head);
    const cv=document.createElement('canvas');
    cv.width=760;cv.height=380;cv.style.cssText='width:100%;max-width:760px;border-radius:10px;border:1px solid var(--line);touch-action:none';
    stage.appendChild(cv);
    this.cv=cv;this.g=cv.getContext('2d');
    this.ruler=document.createElement('div');
    this.ruler.className='ruler-line';
    this.ruler.style.cssText='position:absolute;display:none;width:2px;background:#C98A2D;cursor:ew-resize;box-shadow:0 0 8px #C98A2D;top:0;bottom:0';
    cv.parentElement.style.position='relative';
    cv.parentElement.appendChild(this.ruler);
    this.bindRuler();
    this.drawCase();
    // 预测幕：右侧只开预测面板，诊断牌/药架/处方单全部收起
    document.getElementById('dxTray').style.display='none';
    document.getElementById('medPanel').style.display='none';
    document.getElementById('rxPanel').style.display='none';
    document.getElementById('predPanel').style.display='';
    this.buildPred();
  }

  /* ---------- 幕一：预测配置 ---------- */
  buildPred(){
    const p=PRED[this.ci];
    document.getElementById('predAsk').textContent=p.ask;
    const box=document.getElementById('predOpts');box.innerHTML='';
    const rev=document.getElementById('predReveal');rev.style.display='none';rev.innerHTML='';
    const opts=p.options.slice().sort(()=>Math.random()-0.5);
    opts.forEach((o,i)=>{
      const b=this.el('button',{class:'btn sm',style:'justify-content:flex-start;text-align:left;font-size:13.5px',
        html:`<b>${String.fromCharCode(65+i)}.</b> ${o.v}`},box);
      b.onclick=()=>this.predChoose(o,b);
    });
  }
  predChoose(o,b){
    if(b.disabled)return;
    const ok=!!o.ok;
    this.record({type:'predict_config',correct:ok,firstTry:this.predWrong===0,
      value:o.v.slice(0,30),mId:ok?null:(o.mId||'M-OF-01'),caseNo:this.ci+1});
    if(ok){
      this.right(b);
      b.style.borderColor='var(--ok)';
      document.querySelectorAll('#predOpts button').forEach(x=>x.disabled=true);
      const rev=document.getElementById('predReveal');
      rev.style.display='';
      rev.innerHTML=`<p style="font-size:13px;line-height:1.8;text-align:left"><b style="color:var(--ok)">✓ ${o.why}</b></p>
        <p class="readout" style="font-size:12.5px;margin-top:8px">${PRED[this.ci].sig}</p>
        <button class="btn primary" id="beginDxBtn" style="margin-top:10px">开始诊断 →</button>`;
      document.getElementById('beginDxBtn').onclick=()=>this.beginDiagnose();
    }else{
      this.wrong(b,o.mId);
      this.predWrong++;
      b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
      const why=document.createElement('p');
      why.style.cssText='font-size:12.5px;line-height:1.7;color:var(--err);margin-top:4px;text-align:left';
      why.innerHTML=`✗ ${o.why}`;
      b.after(why);
    }
  }
  beginDiagnose(){
    this.phase='diagnose';
    const c=this.cs;
    document.getElementById('caseSym').textContent=c.symptom;
    document.getElementById('phaseHint').style.display='none';
    document.getElementById('dxSlot').style.display='';
    document.getElementById('predPanel').style.display='none';
    document.getElementById('medPanel').style.display='';
    document.getElementById('rxPanel').style.display='';
    this.hudApi.setSteps(`病历 ${this.ci+1}/3 · 诊断开方`);
    toast('病历详情已开放——挂诊断牌，开处方。','info');
    // 诊断牌托盘
    const tray=document.getElementById('dxTray');
    tray.style.display='';tray.innerHTML='<span class="dim2 small" style="flex:0 0 auto">诊断牌 →</span>';
    const zone={el:document.getElementById('dxSlot'),accept:()=>true,
      onDrop:card=>this.dropDx(card)};
    DX_CARDS.forEach(d=>{
      const c2=document.createElement('div');c2.className='tcard';c2.style.width='96px';c2.dataset.dx=d.id;
      c2.innerHTML=`<span class="v" style="font-size:14px">${d.name}</span><span class="m">诊断</span>`;
      tray.appendChild(c2);this.makeDraggable(c2,[zone]);
    });
    // 处方槽 + 药架（每病历重建，绑定当次的投放区）
    const rx=document.getElementById('rx');rx.innerHTML='';
    this.rxSlots=[0,1].map(()=>{
      const s=document.createElement('div');s.className='slot';s.style.minWidth='110px';
      s.innerHTML='<span>药味槽</span>';rx.appendChild(s);return s;
    });
    const shelf=document.getElementById('medshelf');shelf.innerHTML='';
    const zones=this.rxSlots.map((slot,idx)=>({
      el:slot,accept:()=>true,allowFilled:true,   // 允许覆盖：拖新药直接替换选错的药
      onDrop:(card)=>this.placeMed(idx,card)
    }));
    MEDS.forEach(m=>{
      const c2=document.createElement('div');c2.className='tcard';c2.style.width='104px';c2.dataset.med=m.id;
      c2.innerHTML=`<span class="v" style="font-size:13px">${m.name}</span><span class="m">${m.desc}</span>`;
      shelf.appendChild(c2);this.makeDraggable(c2,zones);
    });
    document.getElementById('treatBtn').onclick=()=>this.treat();
  }

  placeMed(idx,card){
    const med=card.dataset.med;
    if(this.rx[idx]==='early')this.ruler.style.display='none';   // 换药时收起旧标尺
    this.rx[idx]=med;
    const slot=this.rxSlots[idx];
    slot.classList.add('filled');
    slot.innerHTML=`<span class="slot-v">${MEDS.find(m=>m.id===med).name}</span><button class="slot-x" title="取回这味药">✕</button>`;
    slot.querySelector('.slot-x').onclick=e=>{e.stopPropagation();this.removeMed(idx);};
    this.record({type:'prescribe',correct:null,value:med});
    if(med==='early'){this.showRuler();toast('把黄色标尺拖到验证曲线（朱红色）的最低点附近','warn',3000);}
    this.right(slot);
  }
  removeMed(idx){
    if(this.busyTreat)return;
    if(this.rx[idx]==='early')this.ruler.style.display='none';
    this.rx[idx]=null;
    const slot=this.rxSlots[idx];
    slot.classList.remove('filled');
    slot.innerHTML='<span>药味槽</span>';
  }

  drawCase(treat){
    const g=this.g,c=this.cs,W=this.cv.width,H=this.cv.height;
    const tr=c.data.train,va=c.data.val;
    const n=Math.max(tr.length,va.length);
    const maxL=Math.max(...va,...tr)*1.08;
    g.clearRect(0,0,W,H);
    g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H);
    const X=e=>40+e/(n-1)*(W-70), Y=v=>H-30-v/maxL*(H-60);
    g.strokeStyle='rgba(111,103,90,.2)';g.fillStyle='#5A6774';g.font='23px sans-serif';
    for(let k=0;k<=4;k++){const v=maxL*k/4;
      g.beginPath();g.moveTo(40,Y(v));g.lineTo(W-30,Y(v));g.stroke();
      g.fillText(v.toFixed(2),6,Y(v)+4);}
    g.fillText('epoch →',W-80,H-10);
    const line=(arr,color,w)=>{g.strokeStyle=color;g.lineWidth=w;g.beginPath();
      arr.forEach((v,i)=>{i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v));});g.stroke();};
    line(tr,'rgba(28,176,246,.9)',2);
    line(va,'rgba(194,84,60,.95)',2.4);
    g.font='24px sans-serif';
    g.fillStyle='#1CB0F6';g.fillText('— 训练损失',46,20);
    g.fillStyle='#C2543C';g.fillText('— 验证损失',150,20);
    if(treat){
      let tv;
      if(treat==='early'){tv=c.data.val.slice(0,c.data.bestValEpoch);}
      else tv=c.data.treat[treat].val;
      line(tv,'#3E8A5E',2.4);
      g.fillStyle='#3E8A5E';g.fillText('— 复诊（服药后验证）',260,20);
      if(treat==='early'){const bx=X(tv.length-1);
        g.strokeStyle='#C98A2D';g.setLineDash([6,5]);g.beginPath();g.moveTo(bx,25);g.lineTo(bx,H-30);g.stroke();g.setLineDash([]);
        g.fillStyle='#C98A2D';g.fillText('早停 @'+tv.length,Math.min(bx+6,W-110),40);}
    }else if(this.earlyEpoch!=null){
      const bx=X(this.earlyEpoch);
      g.strokeStyle='#C98A2D';g.setLineDash([6,5]);g.lineWidth=1.5;
      g.beginPath();g.moveTo(bx,25);g.lineTo(bx,H-30);g.stroke();g.setLineDash([]);
    }
  }

  bindRuler(){
    let drag=false;
    this.ruler.addEventListener('pointerdown',e=>{drag=true;try{this.ruler.setPointerCapture(e.pointerId)}catch(_){}});
    this.ruler.addEventListener('pointermove',e=>{
      if(!drag)return;
      const r=this.cv.getBoundingClientRect();
      const stageR=this.cv.parentElement.getBoundingClientRect();
      const x=Math.max(40,Math.min(r.width-30,e.clientX-r.left));   // 画布内 x（epoch 映射）
      this.ruler.style.left=(e.clientX-stageR.left)+'px';           // 标尺定位相对 stage
      const n=Math.max(this.cs.data.train.length,this.cs.data.val.length);
      this.earlyEpoch=Math.round((x-40)/(r.width-70)*(n-1));
      this.drawCase();
    });
    this.ruler.addEventListener('pointerup',()=>{drag=false;
      this.record({type:'set_early_epoch',correct:null,value:this.earlyEpoch});});
  }
  showRuler(){
    this.ruler.style.display='block';
    this.ruler.style.left=(this.cv.offsetLeft+this.cv.clientWidth*0.3)+'px';
  }

  dropDx(card){
    const ok=card.dataset.dx===this.cs.dx;
    this.dx=card.dataset.dx;
    this.record({type:'diagnose',correct:ok,target:'dx',value:this.dx,
      mId:ok?null:(this.cs.dx==='unstable'?'M-OF-02':'M-OF-01')});
    const slot=document.getElementById('dxSlot');
    if(ok){slot.classList.add('filled');
      slot.innerHTML=`<span class="slot-v">${DX_CARDS.find(d=>d.id===this.dx).name} ✓</span>`;
      this.right(slot);}
    else{ // 挂错：清空槽位并提示可重挂
      slot.classList.remove('filled');
      slot.innerHTML='<span>挂诊断牌 →</span>';
      this.wrong(slot,this.cs.dx==='unstable'?'M-OF-02':'M-OF-01');
      toast('这个诊断不对——再读一遍症状（两条曲线各自什么走势？），换一张牌重新挂即可。','err');}
  }

  treat(){
    if(this.busyTreat)return;
    if(!this.dx){toast('先挂诊断牌，再开药。','warn');return;}
    if(!this.rx.filter(Boolean).length){toast('处方单是空的——从药架拖 1–2 味药。','warn');return;}
    this.busyTreat=true;setTimeout(()=>this.busyTreat=false,2200);
    const c=this.cs;
    const hasGold=this.rx.some(m=>c.golds.includes(m));
    const taboo=this.rx.find(m=>c.taboo.includes(m));
    const dxOk=this.dx===c.dx;
    // 早停参数校验（仅 case1）
    let earlyOk=true;
    if(this.rx.includes('early')&&c.id==='case1'){
      earlyOk=this.earlyEpoch!=null&&Math.abs(this.earlyEpoch-c.data.bestValEpoch)<220;
    }
    const ok=dxOk&&hasGold&&!taboo&&earlyOk;
    let mId=null;
    if(!dxOk)mId=c.dx==='unstable'?'M-OF-02':'M-OF-01';
    else if(taboo)mId=c.dx==='underfit'?'M-OF-01':'M-OF-02';
    else if(!earlyOk)mId='M-OF-02';
    this.record({type:'treat',correct:ok,value:{dx:this.dx,rx:this.rx,early:this.earlyEpoch},mId});
    if(ok){
      const treatKey=this.rx.map(m=>c.treatOf[m]).find(t=>t&&t!=='early')||this.rx.map(m=>c.treatOf[m]).find(Boolean);
      this.drawCase(this.rx.includes('early')?'early':treatKey);
      this.caseDone++;
      toast('✅ 复诊：验证损失稳住并回落——药对症了！','ok',3200);
      setTimeout(()=>{
        if(this.ci<CASES.length-1){this.loadCase(this.ci+1);toast('下一位病人 🩺','info');}
        else{toast('三位病人全部痊愈！🏥 还有一道毕业考核。','ok');setTimeout(()=>this.showTestQ(),1600);}
      },2000);
    }else{
      if(taboo){
        this.stageShake();this.combo=0;this.hudApi.setCombo(0);
        toast(`💊 病情加重！「${MEDS.find(m=>m.id===taboo).name}」用反了方向——${c.dx==='underfit'?'模型根本没学会，再抑制它就更学不会了':'这不是容量问题，正则化治不了这个病'}`,'err',4200);
      }else if(!earlyOk){
        toast('早停位置不对——应停在验证损失最低点附近，不是训练损失最低点。','err');
      }else{
        toast('药不对症，复诊无改善。点药上的 ✕ 取回（或直接拖新药覆盖），重新开方。','err',4200);
      }
    }
  }

  /* ---------- 幕二：毕业考核（三集划分） ---------- */
  showTestQ(){
    this.phase='testq';
    this.hudApi.setSteps('毕业考核');
    const stage=document.getElementById('stage');
    const card=this.el('div',{style:'margin-top:12px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:#FFFFFF;text-align:center'},stage);
    this.el('h4',{},card).textContent='🎓 毕业考核 · 三集划分';
    this.el('p',{style:'font-size:13.5px;line-height:1.8;text-align:left'},card).innerHTML=`<b>${TESTQ.ask}</b>`;
    const box=this.el('div',{style:'display:flex;flex-direction:column;gap:8px;margin-top:8px'},card);
    let wrongN=0;
    TESTQ.options.slice().sort(()=>Math.random()-0.5).forEach((o,i)=>{
      const b=this.el('button',{class:'btn sm',style:'justify-content:flex-start;text-align:left;font-size:13px',
        html:`<b>${String.fromCharCode(65+i)}.</b> ${o.v}`},box);
      b.onclick=()=>{
        if(b.disabled)return;
        const ok=!!o.ok;
        this.record({type:'testset_q',correct:ok,firstTry:wrongN===0,
          value:o.v.slice(0,30),mId:ok?null:(o.mId||'M-TR-01')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          const rev=this.el('div',{},card);
          rev.innerHTML=`<p style="font-size:13px;line-height:1.8;text-align:left;margin-top:10px"><b style="color:var(--ok)">✓ ${o.why}</b></p>
            <p class="readout" style="font-size:12.5px;margin-top:6px">训练集=日常作业 · 验证集=周测（调参用） · 测试集=期末大考（只用一次）</p>
            <button class="btn primary" id="gradBtn" style="margin-top:10px">领取毕业证书 →</button>`;
          document.getElementById('gradBtn').onclick=()=>this.finish({});
        }else{
          this.wrong(b,o.mId);
          wrongN++;
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;line-height:1.7;color:var(--err);margin-top:4px;text-align:left';
          why.innerHTML=`✗ ${o.why}`;
          b.after(why);
        }
      };
    });
  }

  stageShake(){const st=this.cv.closest('.stage');st.classList.add('shake');setTimeout(()=>st.classList.remove('shake'),500);}

  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l5',0);}
}
