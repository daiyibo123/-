// L1 划一刀：拖拽直线 / 旋钮 / 偏置滑块 → 线性分类；XOR 逼出多层动机
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeKnob } from '../ui/controls.js';
import { rngOf } from '../engine/rng.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const S=640,T=480;                    // SVG 尺寸
const w2sx=x=>(x+3)/6*S, w2sy=y=>(3-y)/6*T, s2wx=sx=>sx/S*6-3, s2wy=sy=>3-sy/T*6;

export default class L1Line extends LevelBase{
  static id='l1'; static title='划一刀';

  mount(){
    const cfg=this.cfg=LEVELS.l1;
    this.theta=35; this.c=0; this.moves=0; this.phase='A'; this.bZeroMoves=0;
    this.combo=0;

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage" id="stage"></div>
        <div class="side">
          <div class="target-card"><h4>当前目标</h4><p id="goalTxt"></p></div>
          <div class="tool-panel" id="knobbox"><h4>法向角度 θ</h4></div>
          <div class="tool-panel"><h4>偏置 b（截距）</h4>
            <input type="range" id="bslider" min="-3" max="3" step="0.05" value="0" style="width:200px">
            <div class="readout">b = <b id="bval">0.00</b></div>
            <label class="dim2 small"><input type="checkbox" id="lockb"> 锁定 b=0（体会没有偏置的世界）</label>
          </div>
          <div class="tool-panel"><h4>实时读数</h4>
            <div class="readout">误分类 <b id="wrongN">–</b> / <span id="totalN">–</span></div>
            <div class="readout">准确率 <b id="acc">–</b></div>
          </div>
        </div>
      </div>
      <div class="tray" id="tray" style="display:none"></div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'划一刀',steps:'拖动 0',
      canUndo:true,onUndo:()=>this.doUndo(),onRestart:()=>this.restart(),
      onHelp:()=>infoModal('规则',`<p>${cfg.goal}</p><p class="dim2 small" style="margin-top:8px">拖动直线两端的圆点=旋转；拖动直线中点或拉滑块=平移；旋钮微调角度。误分类的点会红色闪烁。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l1'}),
      quick:['决策边界由什么决定？','b 的作用是什么？','为什么这条线怎么拖都差 4 个点？']
    });

    // 点数据（种子固定；两簇同侧偏移原点：最优边界 θ≈35°、b≈1.2，b=0 无法分开）
    const rng=rngOf(cfg.seed);
    const gauss=()=> (rng.next()+rng.next()+rng.next()-1.5)*0.8;
    this.ptsA=[];
    for(let i=0;i<9;i++)this.ptsA.push({x:1.8+gauss()*0.42,y:1.4+gauss()*0.42,l:1});
    for(let i=0;i<9;i++)this.ptsA.push({x:0.6+gauss()*0.42,y:-0.6+gauss()*0.42,l:-1});
    this.ptsB=[];
    const cc=[[-1.25,1.25,1],[1.25,-1.25,1],[-1.25,-1.25,-1],[1.25,1.25,-1]];
    cc.forEach(([cx,cy,l])=>{for(let i=0;i<4;i++)this.ptsB.push({x:cx+gauss()*0.4,y:cy+gauss()*0.4,l});});

    this.buildSVG();
    this.knob=makeKnob(document.getElementById('knobbox'),{label:'旋转法向',min:-90,max:90,value:this.theta,
      onInput:a=>{this.theta=a;this.pushSnap({t:this.theta,c:this.c});this.renderLine();}});
    document.getElementById('bslider').addEventListener('input',e=>{
      if(document.getElementById('lockb').checked){e.target.value=0;return;}
      this.c=+e.target.value;document.getElementById('bval').textContent=this.c.toFixed(2);
      this.pushSnap({t:this.theta,c:this.c});this.renderLine();});
    document.getElementById('lockb').addEventListener('change',e=>{
      if(e.target.checked){document.getElementById('bslider').value=0;this.c=0;
        document.getElementById('bval').textContent='0.00';this.renderLine();
        toast('b 已锁死为 0 —— 试试现在还能分开它们吗？','warn');}});

    this.setPhase('A');
    setTimeout(()=>this.drawer.pushSystem('课程原例：横轴=上课次数 X₁，纵轴=交作业次数 X₂。蓝点=通过课程，橙点=挂科——拖动直线，画出及格线。'),800);
  }

  buildSVG(){
    const stage=document.getElementById('stage');
    this.svgEl=this.svg('svg',{viewBox:`0 0 ${S} ${T}`,preserveAspectRatio:'xMidYMid meet'},stage);
    this.svgEl.style.cssText='width:100%;height:100%;touch-action:none';
    this.region=this.svg('rect',{fill:'rgba(28,176,246,.08)','stroke':'none'},this.svgEl);
    this.refLines=this.svg('g',{opacity:0},this.svgEl);
    this.gPts=this.svg('g',{},this.svgEl);
    this.gLine=this.svg('g',{},this.svgEl);
    this.lineEl=this.svg('line',{stroke:'#1CB0F6','stroke-width':3,'stroke-linecap':'round'},this.gLine);
    this.midHandle=this.svg('circle',{r:9,fill:'#1CB0F6',opacity:.85,cursor:'move'},this.gLine);
    this.h1=this.svg('circle',{r:7,fill:'#FFFFFF',stroke:'#1CB0F6','stroke-width':2,cursor:'grab'},this.gLine);
    this.h2=this.svg('circle',{r:7,fill:'#FFFFFF',stroke:'#1CB0F6','stroke-width':2,cursor:'grab'},this.gLine);
    // 两条参考虚线（XOR 阶段）
    this.svg('line',{x1:w2sx(0),y1:0,x2:w2sx(0),y2:T,stroke:'#C2543C','stroke-dasharray':'8 7','stroke-width':2},this.refLines);
    this.svg('line',{x1:0,y1:w2sy(0),x2:S,y2:w2sy(0),stroke:'#C98A2D','stroke-dasharray':'8 7','stroke-width':2},this.refLines);
    // XOR 蓝色区域（异号象限）——答对后展示
    this.xorRegion=this.svg('g',{opacity:0},this.svgEl);
    [[-3,0,0,3],[0,-3,3,0]].forEach(([x1,y1,x2,y2])=>{
      this.svg('rect',{x:w2sx(x1),y:w2sy(y2),width:(w2sx(x2)-w2sx(x1)),height:(w2sy(y1)-w2sy(y2)),fill:'rgba(28,176,246,.16)'},this.xorRegion);
    });
    this.bindLineDrag();
    this.renderPoints(this.ptsA);
  }

  renderPoints(pts){
    this.gPts.innerHTML='';
    pts.forEach(p=>{
      this.svg('circle',{cx:w2sx(p.x),cy:w2sy(p.y),r:7,
        fill:p.l===1?'#1CB0F6':'#D97B29',stroke:'rgba(0,0,0,.4)','data-l':p.l},this.gPts);
    });
    document.getElementById('totalN').textContent=pts.length;
  }

  lineGeom(){
    const th=this.theta*Math.PI/180;
    const nx=Math.cos(th),ny=Math.sin(th);          // 法向
    const dx=-Math.sin(th),dy=Math.cos(th);         // 方向
    const mx=nx*this.c,my=ny*this.c;                // 直线中点
    const L=12;
    return {nx,ny,dx,dy,mx,my,
      x1:w2sx(mx-dx*L),y1:w2sy(my-dy*L),x2:w2sx(mx+dx*L),y2:w2sy(my+dy*L)};
  }
  renderLine(){
    const g=this.lineGeom();
    this.lineEl.setAttribute('x1',g.x1);this.lineEl.setAttribute('y1',g.y1);
    this.lineEl.setAttribute('x2',g.x2);this.lineEl.setAttribute('y2',g.y2);
    this.midHandle.setAttribute('cx',w2sx(g.mx));this.midHandle.setAttribute('cy',w2sy(g.my));
    this.h1.setAttribute('cx',g.x1);this.h1.setAttribute('cy',g.y1);
    this.h2.setAttribute('cx',g.x2);this.h2.setAttribute('cy',g.y2);
    // +侧区域着色：沿法向上移 2.5 的粗矩形
    const cx=w2sx(g.mx+g.nx*2.6),cy=w2sy(g.my+g.ny*2.6);
    const ang=-this.theta;
    this.region.setAttribute('x',cx-800);this.region.setAttribute('y',cy-120);
    this.region.setAttribute('width',1600);this.region.setAttribute('height',240);
    this.region.setAttribute('transform',`rotate(${ang} ${cx} ${cy})`);
    // 误分类闪烁
    const pts=this.phase==='A'?this.ptsA:this.ptsB;
    let wrong=0;
    [...this.gPts.children].forEach((el,i)=>{
      const p=pts[i];
      const s=Math.sign(g.nx*p.x+g.ny*p.y-this.c)||1;
      const bad=s!==p.l;
      if(bad)wrong++;
      el.setAttribute('stroke',bad?'#C2543C':'rgba(0,0,0,.4)');
      el.setAttribute('stroke-width',bad?3:1);
    });
    document.getElementById('wrongN').textContent=wrong;
    document.getElementById('acc').textContent=((pts.length-wrong)/pts.length*100).toFixed(0)+'%';
    this.lastWrong=wrong;
    if(this.phase==='A'&&wrong===0)this.winPhaseA();
    if(this.phase==='B')this.checkStruggle();
  }

  bindLineDrag(){
    let drag=null;
    const stageSvg=this.svgEl;
    this.on(stageSvg,'pointerdown',ev=>{
      const t=ev.target;
      if(this.phase==='gate')return;
      if(t===this.h1||t===this.h2)drag={mode:'rot'};
      else if(t===this.midHandle)drag={mode:'move'};
      else return;
      ev.preventDefault();
      try{stageSvg.setPointerCapture(ev.pointerId)}catch(_){}
    });
    this.on(stageSvg,'pointermove',ev=>{
      if(!drag)return;
      const g=this.lineGeom();
      if(drag.mode==='move'){
        const px=s2wx(ev.offsetX*(S/this.svgEl.clientWidth||1)),py=s2wy(ev.offsetY*(T/this.svgEl.clientHeight||1));
        this.c=g.nx*px+g.ny*py;
      }else{
        const r=this.svgEl.getBoundingClientRect();
        const px=s2wx((ev.clientX-r.left)/r.width*S),py=s2wy((ev.clientY-r.top)/r.height*T);
        const ang=Math.atan2(py-g.my,px-g.mx)*180/Math.PI;
        this.theta=Math.max(-90,Math.min(90,ang));
      }
      if(document.getElementById('lockb')&&document.getElementById('lockb').checked)this.c=0;
      this.c=Math.max(-3,Math.min(3,this.c));
      const bs=document.getElementById('bslider');if(bs){bs.value=this.c;document.getElementById('bval').textContent=this.c.toFixed(2);}
      this.knob&&this.knob.set(this.theta);
      this.renderLine();
    });
    const end=()=>{ if(drag){drag=null;this.countMove();} };
    this.on(stageSvg,'pointerup',end);this.on(stageSvg,'pointercancel',end);
  }

  countMove(){
    this.moves++;this.hudApi.setSteps(`拖动 ${this.moves}`);
    this.record({type:'move_line',correct:null,target:'line',value:{t:+this.theta.toFixed(1),c:+this.c.toFixed(2)}});
    if(this.phase==='A'&&Math.abs(this.c)<0.01&&this.lastWrong>0){
      this.bZeroMoves++;
      if(this.bZeroMoves===6)this.ctx.tutor.maybeTrigger('M-LC-01',this);
    }
  }

  setPhase(p){
    this.phase=p;
    const goal=document.getElementById('goalTxt');
    if(p==='A'){goal.textContent='挑战 A：拖动及格线（横=上课次数，纵=交作业次数），让 18 名学员 100% 判对。';this.renderPoints(this.ptsA);this.renderLine();}
    if(p==='B'){
      goal.innerHTML=`挑战 B：新的一批点来了。<b style="color:var(--err)">无论怎么拖，至少错 4 个。</b><br><span class="dim2 small">别放弃太快，也别恋战——想想为什么。</span>`;
      this.renderPoints(this.ptsB);this.renderLine();
      this.struggleMoves=0;this.struggleT0=performance.now();
      toast('注意：这批数据不太一样……','warn');
    }
  }
  winPhaseA(){
    if(this.phase!=='A')return;
    this.phase='A-won';
    this.right(document.getElementById('stage'));
    this.record({type:'phaseA_clear',correct:true});
    toast('100% 分类！感知机通电成功 ⚡','ok');
    setTimeout(()=>this.setPhase('B'),1200);
  }
  checkStruggle(){
    this.struggleMoves++;
    const t=(performance.now()-this.struggleT0)/1000;
    if((this.struggleMoves>=8||t>40)&&this.phase==='B'){
      this.phase='gate';
      this.ctx.tutor.ask('为什么一条线怎么拖都差 4 个点？',{levelId:'l1',mId:'M-LC-02'}).then(a=>this.drawer.pushSystem(a));
      setTimeout(()=>{
        this.drawer.pushSystem('给你两条参考线（品红/黄色虚线）：每条都能分开一半。剩下的任务是——选对把它们组合起来的<b>逻辑门</b>。');
        this.refLines.setAttribute('opacity',1);
        this.gLine.setAttribute('opacity',.25);
        this.showGateCards();
      },2600);
    }
  }
  showGateCards(){
    const tray=document.getElementById('tray');tray.style.display='';
    tray.innerHTML='';
    // 醒目的大投放框放最前（脉动闪烁 + 明确文案），杜绝"不知道拖到哪"
    const slotHost=document.createElement('div');
    slotHost.className='slot gate-slot';
    slotHost.innerHTML='<span>⬇ 把选中的门卡<br>拖进这个框 ⬇</span>';
    tray.appendChild(slotHost);
    this.gateZone={el:slotHost,accept:()=>true,onDrop:(card)=>{
      const ok=card.dataset.gate==='xor';
      this.record({type:'gate_drop',correct:ok,target:'gate',value:card.dataset.gate,
        mId:ok?null:'M-LC-02'});
      if(ok){
        slotHost.classList.add('filled');slotHost.innerHTML=`<span class="slot-v">异或门 ✓</span>`;
        this.right(slotHost);
        this.xorRegion.setAttribute('opacity',1);
        toast('两层感知机诞生了——这就是深度学习的"深度"的起点。','ok',4200);
        setTimeout(()=>this.finish({}),1600);
      }else{
        this.wrong(slotHost,'M-LC-02');
        toast(ok?'':'想想蓝色点分布在哪两个象限——交集(与门)还是并集(或门)都不对。','err');
      }
    }};
    [['and','与门 AND'],['or','或门 OR'],['xor','异或门 XOR']].forEach(([k,name])=>{
      const c=document.createElement('div');c.className='tcard';c.dataset.gate=k;
      c.innerHTML=`<span class="v" style="font-size:15px">${name.split(' ')[1]}</span><span class="m">${name.split(' ')[0]}</span>`;
      tray.appendChild(c);this.makeDraggable(c,[this.gateZone]);
    });
    // 宠物走到槽位旁，指给玩家看
    setTimeout(()=>this.drawer.guideTo(slotHost,
      '看蓝色点落在哪两个象限——想好了，就把对应的门卡拖进左边这个闪烁的框里。'),1200);
  }

  doUndo(){
    const s=this.undo();
    if(s){this.theta=s.t;this.c=s.c;this.knob.set(s.t);this.renderLine();toast('已撤销','ok',1200);}
  }
  onTutorHint(mId,mis){ this.drawer.open(); }
  showTutorMessage(a){ this.drawer.pushSystem(a); }
  restart(){ location.hash='#/map';setTimeout(()=>location.hash='#/level/l1',0); }
  unmount(){ super.unmount(); }
}
