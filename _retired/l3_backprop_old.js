// L3 误差快递站（旗舰）：反向传播卡片接力。学生只做回传——每个动作 = 链式法则一步
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { rngOf } from '../engine/rng.js';
import { LEVELS } from '../data/levels.js';

// 站点布局（百分比中心坐标）；σ′/偏置槽嵌入站台内部，权重槽落在连线上
const NODES={
  x1:[7,22],x2:[7,62],
  h1:[40,22],h2:[40,62],
  o:[66,42],L:[90,42]
};
// 连线：[槽id, 起站, 终站, 槽在线上的参数位置 t∈(0,1)]——坐标按实测站点中心计算，保证对齐
const WIRES=[
  ['w1_11','x1','h1',.5],['w1_12','x2','h1',.25],['w1_21','x1','h2',.55],['w1_22','x2','h2',.5],
  ['w2_1','h1','o',.45],['w2_2','h2','o',.5]
];
const PHASE_GOAL=[
  '第 1 步 · 在<b>损失站</b>内装填误差包裹 δᴼ（BCE×sigmoid 的化简：δᴼ = ŷ − y）',
  '第 2 步 · 给 <b>W² 层</b>的连线与输出站投递梯度：δᴼ × 本地输入',
  '第 3 步 · 在两个<b>隐藏站</b>内部分拣 σ′(z) = σ(1−σ)',
  '第 4 步 · 给 <b>W¹ 层</b>的连线和隐藏站投递梯度：δ_h × 本地输入(x)'
];

export default class L3Backprop extends LevelBase{
  static id='l3'; static title='误差快递站';

  mount(){
    const cfg=this.cfg=LEVELS.l3;const A=cfg.answer,F=cfg.net.forward;
    this.placed=0;this.combo=0;this.phase=0;
    // 槽位目标值表
    this.targets={
      dout:A.delta_o,
      w2_1:A.gradW2[0],w2_2:A.gradW2[1],b2e:A.gradb2,
      s1:A.dsig1,s2:A.dsig2,
      w1_11:A.gradW1[0][0],w1_12:A.gradW1[0][1],w1_21:A.gradW1[1][0],w1_22:A.gradW1[1][1],
      b1e:A.gradb1[0],b1e2:A.gradb1[1]
    };
    this.slotPhase={dout:0,w2_1:1,w2_2:1,b2e:1,s1:2,s2:2,
      w1_11:3,w1_12:3,w1_21:3,w1_22:3,b1e:3,b1e2:3};

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="target-card" style="margin-bottom:10px"><h4>当前任务</h4><p id="goalTxt"></p></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:520px">
          <div class="l3-flow" id="flow"></div>
        </div>
        <div class="side">
          <div class="target-card"><h4>网络档案（前向已算好）</h4>
            <div class="readout" style="line-height:2">
              x=(1.2, 0.5) · y=1<br>
              z₁=<b>0.62</b> h₁=σ(z₁)=<b>${F.h1}</b><br>
              z₂=<b>0.74</b> h₂=σ(z₂)=<b>${F.h2}</b><br>
              z=<b>${F.z_o}</b> ŷ=σ(z)=<b>${F.yhat}</b><br>
              L=BCE=<b>${F.L}</b>
            </div>
          </div>
          <div class="tool-panel"><h4>投递进度</h4>
            <div class="readout">已投递 <b id="prog">0</b> / 12</div>
            <button class="btn" id="explainBtn">📖 查看讲解</button>
            <button class="btn primary" id="checkBtn" style="display:none">⚡ 梯度检查</button>
          </div>
        </div>
      </div>
      <div class="tray" id="tray"></div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'误差快递站',steps:'0/12',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>this.explain(),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l3'}),
      quick:['为什么 δᴼ = ŷ − y？','σ′(z) 怎么算？','这条边的梯度是什么乘什么？']
    });

    this.buildFlow();
    this.buildTray();
    document.getElementById('checkBtn').onclick=()=>this.gradientCheck();
    document.getElementById('explainBtn').onclick=()=>this.explain();
    this.setPhase(0);
    setTimeout(()=>this.explain(),450);
    setTimeout(()=>this.drawer.pushSystem('看完讲解就开始吧：亮着虚线框的槽位就是现在能投的。先去损失站装填 δᴼ。'),800);
  }

  /* ---- 关卡讲解（开局自动弹出，可随时再看） ---- */
  explain(){
    infoModal('误差快递站 · 讲解',
      `<h4 style="margin:6px 0 4px;color:var(--sig)">① 这个网络发生了什么（前向传播，已算好）</h4>
       <p style="line-height:1.9">输入 <span class="mono">x=(1.2, 0.5)</span>，真实标签 <span class="mono">y=1</span>。
       两个隐藏站各自加权求和再过 σ，得到 <span class="mono">h₁=0.6502、h₂=0.6770</span>；
       输出站再把它们加权求和过 σ，得到预测 <span class="mono">ŷ=0.7004</span>。
       但正确答案是 1，于是产生误差 <span class="mono">L = −ln ŷ = 0.3558</span>。<b>网络要"学习"，就必须知道每个权重该往哪调、调多少——这就是梯度，算它的过程叫反向传播。</b></p>
       <h4 style="margin:12px 0 4px;color:var(--sig)">② 你的任务：把误差送回去（共 12 次投递）</h4>
       <p style="line-height:1.9">按链式法则的顺序：
       <br>第 1 步 · 在<b>损失站</b>装填 <span class="mono">δᴼ = ŷ − y</span>（BCE 配 sigmoid 有这个漂亮化简）
       <br>第 2 步 · 给 <b>W² 层</b>投递：每条边的梯度 = <span class="mono">δᴼ × 本地输入(h)</span>（输出站的 b₂ 梯度就是 δᴼ 本身）
       <br>第 3 步 · 在<b>隐藏站内部</b>分拣 <span class="mono">σ′(z) = σ(1−σ)</span>
       <br>第 4 步 · 给 <b>W¹ 层</b>投递：每条边的梯度 = <span class="mono">δ_h × 本地输入(x)</span></p>
       <h4 style="margin:12px 0 4px;color:var(--sig)">③ 怎么操作</h4>
       <p style="line-height:1.9">底部托盘是<b>数值卡</b>（混有干扰卡）。把正确的卡<b>拖到当前闪烁的槽位</b>：
       <br>· 连线上的槽位标着边的名字（如 W₁₁₁ = 边 x₁→h₁ 的权重梯度）
       <br>· σ′、偏置 b 的槽位就在各自<b>站台内部</b>
       <br>· 投对亮绿点亮连线；投错弹回，宠物会来讲解你踩了哪个误区
       <br>· 12 格全部投递后做<b>梯度检查</b>（工程上验证反向传播的标准手段）</p>
       <p class="dim2 small" style="margin-top:10px">对应课件：第4章 神经网络与反向传播 · 卡片托盘可左右滑动</p>`,
      );
  }

  buildFlow(){
    const flow=document.getElementById('flow');
    // 导线层（先创建，保证在节点下方）
    const svg=this.svg('svg',{},flow);
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible';
    this.wires=svg;
    // 站点
    this.nodeEls={};
    const mk=(key,cls,html)=>{
      const [x,y]=NODES[key];
      const n=document.createElement('div');
      n.className='bp-node '+cls;n.style.left=x+'%';n.style.top=y+'%';
      n.innerHTML=html;flow.appendChild(n);this.nodeEls[key]=n;return n;
    };
    const F=this.cfg.net.forward;
    // 槽位工厂（嵌入式：静态排列在站台内部；线上式：绝对定位在连线参数点）
    this.slotEls={};
    const addSlotInto=(row,id,main,sub)=>{
      const s=document.createElement('div');
      s.className='slot bp-slot embedded zone-locked';
      s.innerHTML=`<span>${main}</span>${sub?`<span class="slot-sub">${sub}</span>`:''}`;
      row.appendChild(s);this.slotEls[id]=s;return s;
    };
    const h1=mk('x1','',`<div class="bp-name">输入 x₁</div><div class="bp-val mono">1.2</div>`);
    mk('x2','',`<div class="bp-name">输入 x₂</div><div class="bp-val mono">0.5</div>`);
    mk('h1','station',`
      <div class="bp-name">隐藏站 σ · h₁</div>
      <div class="bp-val mono">z₁=0.62 → h₁=${F.h1}</div>
      <div class="bp-subslots" id="row_h1"></div>`);
    mk('h2','station',`
      <div class="bp-name">隐藏站 σ · h₂</div>
      <div class="bp-val mono">z₂=0.74 → h₂=${F.h2}</div>
      <div class="bp-subslots" id="row_h2"></div>`);
    mk('o','station',`
      <div class="bp-name">输出站 σ</div>
      <div class="bp-val mono">z=${F.z_o} → ŷ=${F.yhat}</div>
      <div class="bp-subslots" id="row_o"></div>`);
    mk('L','loss',`
      <div class="bp-name">损失站</div>
      <div class="bp-val mono">L=${F.L}（y=1）</div>
      <div class="bp-subslots" id="row_L"></div>`);
    addSlotInto(document.getElementById('row_h1'),'s1','σ′(z₁)','= σ(1−σ)');
    addSlotInto(document.getElementById('row_h1'),'b1e','b₁ 梯度','');
    addSlotInto(document.getElementById('row_h2'),'s2','σ′(z₂)','= σ(1−σ)');
    addSlotInto(document.getElementById('row_h2'),'b1e2','b₁′ 梯度','');
    addSlotInto(document.getElementById('row_o'),'b2e','b₂ 梯度','');
    addSlotInto(document.getElementById('row_L'),'dout','装填 δᴼ','= ŷ−y');
    // 连线槽（位置在 drawWires 里按实测中心 + 参数 t 精确落到线上）
    const wireSlot=(id,main,sub)=>{
      const s=document.createElement('div');
      s.className='slot bp-slot zone-locked';
      s.innerHTML=`<span>${main}</span>${sub?`<span class="slot-sub">${sub}</span>`:''}`;
      flow.appendChild(s);this.slotEls[id]=s;return s;
    };
    const slotOf={w1_11:wireSlot('w1_11','W₁₁₁','边 x₁→h₁'),w1_12:wireSlot('w1_12','W₁₁₂','边 x₂→h₁'),
      w1_21:wireSlot('w1_21','W₁₂₁','边 x₁→h₂'),w1_22:wireSlot('w1_22','W₁₂₂','边 x₂→h₂'),
      w2_1:wireSlot('w2_1','W₂₁','边 h₁→o'),w2_2:wireSlot('w2_2','W₂₂','边 h₂→o')};
    // 实测布线：站点中心对中心连线（像素级对齐），槽位放到参数点
    const drawWires=()=>{
      const fa=flow.getBoundingClientRect();
      svg.setAttribute('viewBox',`0 0 ${fa.width} ${fa.height}`);
      while(svg.firstChild)svg.firstChild.remove();
      for(const [id,a,b,t] of WIRES){
        const ra=this.nodeEls[a].getBoundingClientRect(), rb=this.nodeEls[b].getBoundingClientRect();
        const x1=ra.left+ra.width/2-fa.left, y1=ra.top+ra.height/2-fa.top;
        const x2=rb.left+rb.width/2-fa.left, y2=rb.top+rb.height/2-fa.top;
        this.svg('line',{x1,y1,x2,y2,stroke:'#C9BCA4','stroke-width':2,'data-edge':id},svg);
        const s=slotOf[id];
        s.style.left=((x1+t*(x2-x1))/fa.width*100)+'%';
        s.style.top=((y1+t*(y2-y1))/fa.height*100)+'%';
      }
    };
    drawWires();                                  // 同步布线（不依赖 rAF，后台标签也能正确布局）
    setTimeout(drawWires,350);                    // 字体加载/布局稳定后复算一次
    this.on(window,'resize',drawWires);
    this._drawWires=drawWires;
  }

  buildTray(){
    const tray=document.getElementById('tray');
    const cards=this.cfg.cards.slice();
    const rng=rngOf(this.cfg.seed);
    for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    this.zones=Object.entries(this.slotEls).map(([id,el])=>({
      el,
      accept:()=>true,   // 对错由 place() 判定并归因
      onDrop:(card)=>this.place(id,card)
    }));
    cards.forEach(c=>{
      const el=document.createElement('div');
      el.className='tcard';el._v=c.v;el._id=c.id;el._mId=c.mId;
      el.innerHTML=`<span class="v">${c.v>0?'+':''}${c.v.toFixed(4)}</span><span class="m">${c.mean}</span>`;
      tray.appendChild(el);
      this.makeDraggable(el,this.zones);
    });
  }

  setPhase(p){
    this.phase=p;
    document.getElementById('goalTxt').innerHTML=PHASE_GOAL[p]||'全部投递完成';
    Object.entries(this.slotEls).forEach(([id,el])=>{
      el.classList.toggle('zone-locked',this.slotPhase[id]>p&&!el.classList.contains('filled'));
      el.classList.toggle('pulse-target',this.slotPhase[id]===p&&!el.classList.contains('filled'));
    });
  }
  place(id,card){
    const el=this.slotEls[id];
    const correct=Math.abs(card._v-this.targets[id])<6e-4;
    this.record({type:'place_card',target:id,cardId:card._id,correct,
      mId:correct?null:(card._mId||'M-BP-02'),value:card._v});
    if(!correct){
      this.combo=0;this.hudApi.setCombo(0);
      const mId=card._mId||'M-BP-02';
      this.wrong(el,mId);
      return;
    }
    // 正确投放
    card.remove();
    el.classList.add('filled');el.classList.remove('zone-locked','pulse-target');
    el.innerHTML=`<span class="slot-v">${card._v>0?'+':''}${card._v.toFixed(4)}</span>`;
    this.right(el);
    this.placed++;this.combo++;
    this.hudApi.setSteps(`${this.placed}/12`);this.hudApi.setCombo(this.combo);
    document.getElementById('prog').textContent=this.placed;
    // 边线点亮
    const wire=this.wires.querySelector(`[data-edge="${id}"]`);
    if(wire){wire.setAttribute('stroke','#C2543C');wire.setAttribute('stroke-width',1.1);}
    if(this.placed===12){
      document.getElementById('checkBtn').style.display='';
      this.setPhase(4);
      toast('12 个包裹全部投递成功！最后一步：梯度检查 ⚡','ok');
    }else{
      // 推进阶段
      const donePh=[...Object.entries(this.slotEls)].filter(([sid,e])=>this.slotPhase[sid]<=this.phase&&!e.classList.contains('filled'));
      if(!donePh.length&&this.phase<3)this.setPhase(this.phase+1);
    }
  }

  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l3',0);}

  /* ---- 梯度检查：运行时真实计算有限差分，与投递值逐项比对 ---- */
  forwardLoss(x1,x2,W1,b1,W2,b2){
    const sig=z=>1/(1+Math.exp(-z));
    const z1=W1[0][0]*x1+W1[0][1]*x2+b1[0], h1=sig(z1);
    const z2=W1[1][0]*x1+W1[1][1]*x2+b1[1], h2=sig(z2);
    const zo=W2[0]*h1+W2[1]*h2+b2, yhat=sig(zo);
    return -Math.log(yhat);   // y=1
  }
  gradientCheck(){
    const {x,W1,b1,W2,b2}=this.cfg.net;
    const eps=1e-5;
    const lossAt=(path,i,j,sign)=>{
      const C1=W1.map(r=>r.slice()),Cb1=b1.slice(),C2=W2.slice();
      let cb2=b2;
      if(path==='W1')C1[i][j]+=sign*eps;
      else if(path==='b1')Cb1[i]+=sign*eps;
      else if(path==='W2')C2[i]+=sign*eps;
      else cb2+=sign*eps;
      return this.forwardLoss(x[0],x[1],C1,Cb1,C2,cb2);
    };
    const fdG=(p,i,j)=>(lossAt(p,i,j,1)-lossAt(p,i,j,-1))/(2*eps);
    const FD={
      'W₂₁':fdG('W2',0),'W₂₂':fdG('W2',1),'b₂':fdG('b2',0),
      'W₁₁₁':fdG('W1',0,0),'W₁₁₂':fdG('W1',0,1),'W₁₂₁':fdG('W1',1,0),'W₁₂₂':fdG('W1',1,1),
      'b₁':fdG('b1',0),'b₁′':fdG('b1',1)
    };
    const A=this.cfg.answer;
    const placed={
      'W₂₁':A.gradW2[0],'W₂₂':A.gradW2[1],'b₂':A.gradb2,
      'W₁₁₁':A.gradW1[0][0],'W₁₁₂':A.gradW1[0][1],'W₁₂₁':A.gradW1[1][0],'W₁₂₂':A.gradW1[1][1],
      'b₁':A.gradb1[0],'b₁′':A.gradb1[1]
    };
    let allOk=true;
    const table=Object.keys(FD).map(k=>{
      const d=Math.abs(FD[k]-placed[k]);const ok=d<1e-4;if(!ok)allOk=false;
      return `<tr><td class="mono">${k}</td><td class="mono">${FD[k].toFixed(6)}</td><td class="mono">${placed[k].toFixed(4)}</td>
        <td class="mono" style="color:${ok?'var(--ok)':'var(--err)'}">${ok?'✓':'✗'} ${d.toExponential(1)}</td></tr>`;
    }).join('');
    infoModal('⚡ 梯度检查（数值梯度 vs 你的投递）',
      `<p class="dim2 small">有限差分：(L(θ+ε)−L(θ−ε))/2ε，ε=1e-5。这是工程上验证反向传播实现的标准手段——你刚才手工完成了它。</p>
       <table class="mono" style="width:100%;font-size:13px;border-collapse:collapse;margin-top:10px">
       <tr style="color:var(--text2)"><th align="left">参数</th><th align="left">数值梯度</th><th align="left">你的投递</th><th align="left">偏差</th></tr>
       ${table}</table>
       ${allOk?'<p style="margin-top:12px;color:var(--ok)">✔ 全部一致——反向传播无误，网络重新通电！</p>'
              :'<p style="margin-top:12px;color:var(--err)">存在偏差，请核对（理论上应 < 1e-4）。</p>'}`);
    const mask=document.querySelector('.modal-mask:last-child');
    if(mask){const ok=mask.querySelector('.btn.primary');ok.textContent='完成通电 ⚡';
      ok.onclick=()=>{mask.remove();this.finish({});};}
    this.record({type:'gradient_check',correct:true,value:{allOk}});
  }
}
