// L2 梯度下山：8 向摇杆 + 学习率换挡拨杆；发散演出；动量滑雪板
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeJoystick, makeLever } from '../ui/controls.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { burstXY } from '../ui/particles.js';
import { LEVELS } from '../data/levels.js';

const S=640,T=480,D=2.5;   // 画布 / 世界域 [-D,D]²
const wx=x=>(x+D)/(2*D)*S, wy=y=>(D-y)/(2*D)*T;

const TERRAINS=[
  {name:'圆碗 · 热身',sub:'标准凸函数，随便怎么下都到谷底',
   f:(x,y)=>x*x+2*y*y, g:(x,y)=>[2*x,4*y], start:[1.7,1.5], budget:10},
  {name:'双井 · 局部极小',sub:'两个谷，只有一个有火种（x>0 侧）',
   f:(x,y)=>Math.pow(x*x-1,2)+0.5*y*y, g:(x,y)=>[4*x*(x*x-1),y], start:[-0.35,1.7], budget:20,
   win:(x,y,f)=>f<0.05&&x>0.25, momentum:true},
  {name:'峡谷 · 学习率困境',sub:'x 向极缓、y 向极陡——大步爆、小步慢',
   f:(x,y)=>0.04*x*x+2.5*y*y, g:(x,y)=>[0.08*x,5*y], start:[2.25,0.06], budget:14},
  // 2-D 新增：算力竞速（SGD mini-batch）。禁地墙 60·exp(−(x+0.4)²/0.12)（y<0.9 全高，顶部留缺口），
  // f>5 判"闯禁地"发散；算力预算 2.0：全批 1.0/步（2 步，数学上走不完 ~4 单位绕行路）
  // 小批16 0.1/步（20 步，噪声 ±14°）；单样本 0.03/步（66 步，噪声 ±38°）
  {name:'考场 · 算力竞速',sub:'算力预算 2.0：全批 1.0/步、小批16 0.1/步、单样本 0.03/步——绕过禁地墙，先到火种',
   f:(x,y)=>0.35*(x-1.4)*(x-1.4)+1.6*y*y+(y<0.9?60*Math.exp(-Math.pow(x+0.4,2)/0.12):0),
   g:(x,y)=>[0.7*(x-1.4),3.2*y],
   danger:(x,y)=>y<0.9&&Math.abs(x+0.4)<0.55,   // 禁地带（wall 值>5 的区域，与红雾可视化一致）
   start:[-1.8,0.3],budget:2.0,compute:true,quiz:true,goal:[1.4,0],wall:true}
];

export default class L2Descent extends LevelBase{
  static id='l2'; static title='梯度下山';

  mount(){
    const cfg=this.cfg=LEVELS.l2;
    this.ti=0; this.steps=0; this.diverged=0; this.momentumOn=false; this.v=[0,0];
    this.momentumSteps=0; this.bestF=Infinity; this.stall=0; this.combo=0; this.busy=false;
    this.terr=TERRAINS[0]; this.pos=this.terr.start.slice();

    this.root.innerHTML=`
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="level-body">
        <div class="stage"><canvas id="cv" width="${S}" height="${T}"></canvas></div>
        <div class="side">
          <div class="target-card"><h4>当前地形</h4><p id="terrName"></p><p class="dim2 small" id="terrSub"></p></div>
          <div class="tool-panel"><h4>你的操控台</h4><div id="joybox" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center"></div></div>
          <div class="tool-panel" id="sgdPanel" style="display:none"><h4>🔮 先预测：算力竞速</h4>
            <p id="sgdAsk" style="font-size:13px;line-height:1.7;text-align:left"></p>
            <div id="sgdOpts" style="display:flex;flex-direction:column;gap:8px"></div>
            <div id="sgdReveal" style="display:none"></div>
          </div>
          <div class="tool-panel" id="batchPanel" style="display:none"><h4>批大小换挡（算力成本/步）</h4>
            <div id="batchbox" style="display:flex;justify-content:center"></div>
            <div class="dim2 small" style="margin-top:6px;line-height:1.7">全批=1.0 · 小批16=0.1 · 单样本=0.03<br>蓝箭头＝<b>实际方向</b>（含批次噪声，批越小抖得越厉害）</div>
          </div>
          <div class="tool-panel"><h4>loss 仪表</h4>
            <div class="readout" style="font-size:15px">f(x,y) = <b id="fv">–</b></div>
            <div style="height:15px;border-radius:8px;background:#E8EDF2;border:1.5px solid #B9C4CE;overflow:hidden;margin-top:6px">
              <div id="fbar" style="height:100%;width:0%;background:linear-gradient(90deg,#3E8A5E,#C98A2D,#C2543C);transition:width .3s"></div>
            </div>
            <div class="readout" style="margin-top:8px">剩余<span id="budgetLabel">步数</span> <b id="budget">–</b></div>
            <div class="readout" style="line-height:1.7">粗箭头＝<b>你的方向</b>（拖摇杆实时旋转）<br>虚线圆＝这一步的落点（随档位变）</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi=mountHUD(document.getElementById('hudhost'),{
      title:'梯度下山',steps:'步数 0',
      canUndo:false,onUndo:null,onRestart:()=>this.restart(),
      onHelp:()=>infoModal('规则',`<p>${cfg.goal}</p><p class="dim2 small" style="margin-top:8px">松开摇杆 = 走一步：方向取 8 向量化，步长 = 当前档位。loss 超限会"发散"（飞出山谷，退回原地）。第四座山：先答预测题，再换批大小——每步的算力成本由批大小决定。</p>`),
      onHome:()=>location.hash='#/map'
    });
    this.drawer=mountDrawer(document.getElementById('aihost'),{
      onAsk:q=>this.ctx.tutor.ask(q,{levelId:'l2'}),
      quick:['学习率是什么？','为什么我总被弹飞？','为什么大家都用 mini-batch？']
    });

    this.cv=document.getElementById('cv');this.ctx2d=this.cv.getContext('2d');
    makeJoystick(document.getElementById('joybox'),{label:'方向摇杆（松手执行）',
      onChange:d=>this.setAim(d),
      onRelease:d=>{this.aimDir=null;this.step(d);}});
    this.lever=makeLever(document.getElementById('joybox'),{label:'学习率换挡',
      gears:cfg.gears,value:1,
      onChange:g=>{toast(`学习率 η = ${g.label}`,'info',1200);}});
    this.batch='full';   // 批大小（第四座山）：'full' | 16 | 1
    makeLever(document.getElementById('batchbox'),{label:'批大小',
      gears:[{label:'全批',v:'full'},{label:'B=16',v:16},{label:'B=1',v:1}],value:0,
      onChange:g=>{this.batch=g.v;
        toast(g.v==='full'?'全批 GD：方向精准，1.0 算力/步':`SGD B=${g.v}：${g.v===16?'0.1':'0.03'} 算力/步，方向带噪声`,'info',1500);}});
    this.loadTerrain(0);
    setTimeout(()=>this.drawer.pushSystem(cfg.story),600);
  }

  loadTerrain(i){
    this.ti=i;this.terr=TERRAINS[i];this.pos=this.terr.start.slice();
    this.steps=0;this.momentumOn=false;this.v=[0,0];this.bestF=this.terr.f(...this.pos);this.stall=0;
    this.compute=0;
    if(this.jitT){clearInterval(this.jitT);this.jitT=null;}
    this.noiseSample=0;this.aimDir=null;
    document.getElementById('terrName').innerHTML=`<b>${this.terr.name}</b>`;
    document.getElementById('terrSub').textContent=this.terr.sub;
    document.getElementById('budgetLabel').textContent=this.terr.compute?'算力':'步数';
    this.hudApi.setSteps(this.terr.compute?`算力 ${this.terr.budget.toFixed(1)}`:'步数 0');
    const sp=document.getElementById('sgdPanel'),bp=document.getElementById('batchPanel');
    if(this.terr.quiz){
      if(this.quizDoneT4){this.quizDone=true;sp.style.display='none';bp.style.display='';}   // 预算耗尽重来时不重弹预测题
      else{this.quizDone=false;sp.style.display='';bp.style.display='none';this.buildSgdQuiz();}
    }
    else{sp.style.display='none';bp.style.display='none';}
    this.renderBase();this.draw();
  }
  /* 批大小 → 方向噪声 σ（rad）；仅第四座山非全批时 >0 */
  sigma(){ if(!this.terr||!this.terr.compute||this.batch==='full')return 0;
    return this.batch===16?0.24:0.66; }
  costOf(){ return this.batch==='full'?1:(this.batch===16?0.1:0.03); }
  gauss(s){ let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*s; }

  /* 摇杆拖动时的实时意图方向（8 向量化，与执行逻辑一致）；
     SGD 模式下瞄准箭头按当前批的噪声抖动（interval 重采样），松手按当前采样方向走 */
  setAim(d){
    if(!d||Math.hypot(d.dx,d.dy)<0.15){this.aimDir=null;}
    else{
      const ang=Math.atan2(-d.dy,d.dx);
      const oct=Math.round(ang/(Math.PI/4))*(Math.PI/4);
      this.aimDir=[Math.cos(oct),Math.sin(oct)];
    }
    const sig=this.sigma();
    if(sig>0){
      this.noiseSample=this.gauss(sig);
      if(!this.jitT)this.jitT=setInterval(()=>{this.noiseSample=this.gauss(this.sigma());this.draw();},340);
    }
    this.draw();
  }

  winCheck(){ const f=this.terr.f(...this.pos);
    return this.terr.win?this.terr.win(this.pos[0],this.pos[1],f):f<this.cfg.eps; }

  renderBase(){
    const g=this.ctx2d;
    // 等高线地形（离屏缓存）
    this.base=document.createElement('canvas');this.base.width=S;this.base.height=T;
    const b=this.base.getContext('2d');
    const N=90,fs=[];
    let fmin=1e9,fmax=-1e9;
    for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
      const x=-D+i/N*2*D,y=D-j/N*2*D;const f=this.terr.f(x,y);
      fs.push(f);if(f<fmin)fmin=f;if(f>fmax)fmax=f;}
    // 层级分布用 92 分位截断：禁地墙（f 极高）否则会把等高线层级全部吸走
    const fs2=fs.slice().sort((a,b)=>a-b);
    const fmaxL=fs2[Math.floor(fs2.length*0.92)];
    // 极简纸面：不铺色带。仅极淡铅笔等高线作地形暗示——
    // 本关练习焦点是方向与学习率，视觉主角是球/目标/梯度箭头/loss 仪表
    b.strokeStyle='rgba(120,132,148,.18)';b.lineWidth=1;
    for(let k=1;k<=6;k++){
      const lv=fmin+(fmaxL-fmin)*k/7;
      b.beginPath();
      for(let i=0;i<=N;i++){
        for(let j=0;j<=N;j++){
          const f=fs[i*(N+1)+j];
          if(Math.abs(f-lv)<(fmaxL-fmin)/N*1.5){const px=i/N*S,py=j/N*T;b.lineTo(px,py);}
        }
      }
      b.stroke();
    }
    // 第四座山：禁地墙（高 loss 红雾带，y<0.9 全高，顶部缺口）
    if(this.terr.wall){
      const xL=wx(-0.95),xR=wx(0.15),yTop=wy(0.9);
      b.fillStyle='rgba(194,84,60,.10)';
      b.fillRect(xL,yTop,xR-xL,T-yTop);
      b.strokeStyle='rgba(194,84,60,.55)';b.setLineDash([6,4]);b.lineWidth=1.5;
      b.strokeRect(xL,yTop,xR-xL,T-yTop);b.setLineDash([]);
      b.fillStyle='#C2543C';b.font='bold 12px sans-serif';b.textAlign='center';
      b.fillText('🚫 禁地 · loss 爆炸（上方有缺口）',(xL+xR)/2,yTop+22);
    }
    // 目标火种：朱砂虚线光圈 + 大号火焰 + 深色标签
    const goalP=this.terr.goal||(this.terr.win?[1,0]:[0,0]);
    b.strokeStyle='#C2543C';b.lineWidth=2.6;b.setLineDash([7,5]);
    b.beginPath();b.arc(wx(goalP[0]),wy(goalP[1]),27,0,7);b.stroke();b.setLineDash([]);
    b.fillStyle='#C98A2D';b.font='31px sans-serif';b.textAlign='center';
    b.fillText('🔥',wx(goalP[0]),wy(goalP[1])+8);
    b.font='bold 12px sans-serif';b.fillStyle='#6E4030';
    b.fillText('全局最优',wx(goalP[0]),wy(goalP[1])+44);
  }

  draw(ballScale=1){
    const g=this.ctx2d;
    g.clearRect(0,0,S,T);
    g.drawImage(this.base,0,0);
    // 小球
    const bx=wx(this.pos[0]),by=wy(this.pos[1]);
    g.beginPath();g.arc(bx,by,9*ballScale,0,7);
    g.fillStyle=this.momentumOn?'#C2543C':'#1CB0F6';
    g.shadowColor=g.fillStyle;g.shadowBlur=16;g.fill();g.shadowBlur=0;
    // 动量模式：赭黄惯性箭头（速度方向实时可见，摇杆意图与运动关联直观化）
    if(this.momentumOn){
      const sp=Math.hypot(this.v[0],this.v[1]);
      if(sp>0.02){
        const ax=this.v[0]/sp, ay=this.v[1]/sp, ex=bx+ax*34, ey=by-ay*34;
        g.strokeStyle='#C98A2D';g.lineWidth=3.5;g.lineCap='round';
        g.beginPath();g.moveTo(bx+ax*12,by-ay*12);g.lineTo(ex,ey);g.stroke();
        const aA=Math.atan2(ey-by,ex-bx);
        g.beginPath();
        g.moveTo(ex,ey);
        g.lineTo(ex-9*Math.cos(aA-0.45),ey-9*Math.sin(aA-0.45));
        g.lineTo(ex-9*Math.cos(aA+0.45),ey-9*Math.sin(aA+0.45));
        g.closePath();g.fillStyle='#C98A2D';g.fill();
      }
    }
    // 摇杆意图箭头：实时跟随摇杆旋转（粗实线）+ 该档位下的落点虚线圆
    // SGD 模式：实际方向 = 意图方向 + 当前噪声采样（瞄准时可见地抖动）
    if(this.aimDir){
      const effA=Math.atan2(this.aimDir[1],this.aimDir[0])+this.noiseSample;
      const ax=Math.cos(effA),ay=Math.sin(effA);
      const lr=this.lever?this.lever.get().v:0.2;
      const ex=bx+ax*46, ey=by-ay*46;
      g.strokeStyle='#1CB0F6';g.lineWidth=4;g.lineCap='round';
      g.beginPath();g.moveTo(bx+ax*13,by-ay*13);g.lineTo(ex,ey);g.stroke();
      const aA=Math.atan2(ey-by,ex-bx);
      g.beginPath();g.moveTo(ex,ey);
      g.lineTo(ex-11*Math.cos(aA-0.44),ey-11*Math.sin(aA-0.44));
      g.lineTo(ex-11*Math.cos(aA+0.44),ey-11*Math.sin(aA+0.44));
      g.closePath();g.fillStyle='#1CB0F6';g.fill();
      const gx2=wx(this.pos[0]+ax*lr), gy2=wy(this.pos[1]+ay*lr);
      g.setLineDash([5,4]);g.strokeStyle='rgba(28,176,246,.6)';g.lineWidth=1.6;
      g.beginPath();g.moveTo(bx+ax*11,by-ay*11);g.lineTo(gx2-ax*11,gy2+ay*11);g.stroke();
      g.beginPath();g.arc(gx2,gy2,9,0,7);g.stroke();g.setLineDash([]);
    }
    // loss 仪表
    const f=this.terr.f(...this.pos);
    this.cv.dataset.pos=this.pos[0].toFixed(3)+','+this.pos[1].toFixed(3);   // 测试与调试锚点
    document.getElementById('fv').textContent=f.toFixed(3);
    document.getElementById('fbar').style.width=Math.min(100,Math.log10(1+f*9)/Math.log10(1+22)*100)+'%';
    document.getElementById('budget').textContent=this.terr.compute
      ?Math.max(0,this.terr.budget-this.compute).toFixed(1)
      :(this.terr.budget-this.steps);
  }

  step(d){
    if(this.busy)return;
    if(this.terr.quiz&&!this.quizDone){toast('先答右侧的预测题，再换挡上山。','warn');return;}
    if(Math.hypot(d.dx,d.dy)<0.18){toast('摇杆没推起来——再用力点','info',1200);return;}
    if(this.jitT){clearInterval(this.jitT);this.jitT=null;}   // 松手定格当前噪声采样（所见即所走）
    const lr=this.lever.get().v;
    // 8 向量化（SGD 模式叠加当前噪声采样）
    const ang=Math.atan2(-d.dy,d.dx);
    const oct=Math.round(ang/(Math.PI/4))*(Math.PI/4);
    const effA=oct+(this.sigma()>0?this.noiseSample:0);
    const dirx=Math.cos(effA),diry=Math.sin(effA);
    if(this.momentumOn){this.momentumKick(dirx,diry,lr);return;}
    const nx=this.pos[0]+dirx*lr, ny=this.pos[1]+diry*lr;
    const fNew=this.terr.f(nx,ny), fOld=this.terr.f(...this.pos);
    this.steps++;
    if(this.terr.compute){
      this.compute+=this.costOf();
      this.hudApi.setSteps(`算力 ${Math.max(0,this.terr.budget-this.compute).toFixed(1)}`);
    }else this.hudApi.setSteps(`步数 ${this.steps}`);
    const wallHit=!!(this.terr.danger&&this.terr.danger(nx,ny));   // 落点在禁地带内=闯禁地（陡上坡不算）
    if(fNew>fOld*3+1.6||wallHit||Math.abs(nx)>D+0.15||Math.abs(ny)>D+0.15){
      this.diverge(nx,ny,lr,wallHit);return;
    }
    this.animateTo(nx,ny,()=>this.afterStep());
    this.record({type:'step',correct:null,value:{dir:[+dirx.toFixed(2),+diry.toFixed(2)],lr,batch:this.batch,f:+fNew.toFixed(3)}});
  }

  /* 一步落定后的判定（必须等动画结束——球到达后再查胜负，否则到点停手就永不判胜） */
  afterStep(){
    // 卡坑检测（双井）
    if(this.terr.momentum&&!this.momentumOn){
      const f=this.terr.f(...this.pos);
      if(f<this.bestF-1e-4){this.bestF=f;this.stall=0;}else this.stall++;
      if(this.stall>=5||(this.pos[0]<-0.5&&f<0.25&&this.stall>=3))this.offerMomentum();
    }
    if(this.winCheck())this.win();
    else if(this.terr.compute?this.compute>=this.terr.budget-1e-9:this.steps>=this.terr.budget)this.budgetOut();
  }

  diverge(nx,ny,lr,wall){
    this.diverged++;
    this.record({type:'diverge',correct:lr>=1,mId:lr>=1?'M-GD-01':null,value:{lr,f:'NaN',batch:this.batch}});
    const r=this.cv.getBoundingClientRect();
    burstXY(r.left+wx(this.pos[0])/S*r.width,r.top+wy(this.pos[1])/T*r.height,
      {n:60,color:'#C2543C',spread:10});
    toast(wall
      ?'💥 闯进禁地！这一批样本的噪声把你直接推向了高 loss 区——算力白花了，退回重走。'
      :'💥 发散！loss = NaN —— 步子太大，直接飞过谷底撞上了对坡。退回重走。','err',3600);
    this.stageShake();
    this.combo=0;this.hudApi.setCombo(0);
    if(lr>=1)this.ctx.tutor.maybeTrigger('M-GD-01',this);
    // 发散步也扣了预算/步数：最后一步若发散同样要判"耗尽"（全批两步全撞墙也得触发算力耗尽）
    if(!this.terr.compute?this.steps>=this.terr.budget:this.compute>=this.terr.budget-1e-9)this.budgetOut();
  }
  stageShake(){
    const st=this.cv.parentElement;st.classList.add('shake');setTimeout(()=>st.classList.remove('shake'),500);
  }

  animateTo(nx,ny,then){
    this.busy=true;
    const sx=this.pos[0],sy=this.pos[1],t0=performance.now(),dur=230;
    const tick=()=>{
      const t=Math.min(1,(performance.now()-t0)/dur),e=1-Math.pow(1-t,2);
      this.pos[0]=sx+(nx-sx)*e;this.pos[1]=sy+(ny-sy)*e;
      this.draw();
      if(t<1)setTimeout(tick,16);   // setTimeout 驱动：rAF 在部分被遮挡 webview 中会冻结，导致胜负判定卡死
      else{this.busy=false;this.draw();then&&then();}
    };
    setTimeout(tick,16);
  }

  offerMomentum(){
    if(this.momentumOn||this.momentumOffered)return;
    this.momentumOffered=true;
    this.record({type:'stuck_local_min',correct:null,mId:'M-GD-02'});
    infoModal('🎿 解锁：动量滑雪板',
      `<p>你卡在一个<b>局部极小</b>里——四周都比这里高，但山脚的火种更低。</p>
       <p>普通走法出不去。现在给你一块滑雪板：<b>松开摇杆 = 踹一脚</b>，之后小球带着惯性
       （速度 v 按 β=0.9 衰减，同时受真实梯度 −∇f 拉拽）自动滚动，直到慢下来。</p>
       <p class="dim2 small">要领：朝右下坡方向连续踹两三脚，蓄够速度冲过坑壁。</p>`);
    const mask=document.querySelector('.modal-mask:last-child');
    if(mask){mask.querySelector('.btn.primary').onclick=()=>{mask.remove();this.momentumOn=true;
      toast('动量模式开启：小球现在有惯性了','ok');};}
  }
  momentumKick(dirx,diry,lr){
    this.steps++;this.momentumSteps++;
    this.hudApi.setSteps(`步数 ${this.steps}（踢 ${this.momentumSteps}）`);
    // 踹一脚：力度取 min(lr,0.35)——意图为主；滚动时梯度耦合降到 0.10，方向关联清晰
    const k=Math.min(lr,0.35);
    this.v[0]+=dirx*k;this.v[1]+=diry*k;
    this.record({type:'kick',correct:null,value:{dir:[+dirx.toFixed(2),+diry.toFixed(2)],lr}});
    // 定步长物理 + 真实时间补偿：后台标签 setTimeout 被节流到 1s/次时，按流逝时间补跑子步
    let last=performance.now();
    const roll=()=>{
      const now=performance.now();
      const n=Math.max(1,Math.min(40,Math.round((now-last)/16)));
      last=now;
      let stopped=false;
      for(let s=0;s<n;s++){
        const [gx,gy]=this.terr.g(this.pos[0],this.pos[1]);
        this.v[0]=0.9*this.v[0]-lr*0.10*gx;
        this.v[1]=0.9*this.v[1]-lr*0.10*gy;
        this.pos[0]+=this.v[0];this.pos[1]+=this.v[1];
        if(Math.abs(this.pos[0])>D||Math.abs(this.pos[1])>D){this.pos[0]=Math.max(-D,Math.min(D,this.pos[0]));this.pos[1]=Math.max(-D,Math.min(D,this.pos[1]));this.v=[0,0];}
        if(Math.hypot(...this.v)<=0.012){stopped=true;break;}
      }
      this.draw();
      if(!stopped){setTimeout(roll,16);}
      else{
        this.v=[0,0];this.draw();
        this.combo++;this.hudApi.setCombo(this.combo);
        if(this.winCheck())this.win();
        else if(this.steps>=this.terr.budget)this.budgetOut();
      }
    };
    setTimeout(roll,16);
  }

  win(){
    if(this.won)return;this.won=true;
    this.right(this.cv);
    this.record({type:'terrain_clear',correct:true,value:{terrain:this.ti,steps:this.steps,compute:+this.compute.toFixed(2),batch:this.batch}});
    if(this.ti<TERRAINS.length-1){
      toast(this.terr.compute
        ?`算力竞速通关！只花了 ${this.compute.toFixed(1)}/${this.terr.budget} 算力`
        :`地形通过！用了 ${this.steps} 步`,'ok');
      setTimeout(()=>{this.won=false;this.loadTerrain(this.ti+1);},1400);
    }else{
      toast('🏔 四座山全部拿下——优化毕业！','ok',3000);
      setTimeout(()=>this.finish({diverged:this.diverged>0,momentumSteps:this.momentumSteps,divergeCount:this.diverged}),1400);
    }
  }
  budgetOut(){
    toast(this.terr.compute
      ?'算力耗尽——全批一步 1.0 太贵。用批大小换挡切到小批，把算力换成步数。'
      :'天黑了（步数耗尽）——本地形重来。','warn',4200);
    this.record({type:'budget_out',correct:false,
      mId:this.terr.compute?(this.batch==='full'?'M-GD-05':'M-GD-06'):'M-GD-01'});
    setTimeout(()=>this.loadTerrain(this.ti),1200);
  }

  /* ---------- 第四座山：先预测再体验（预测-验证） ---------- */
  buildSgdQuiz(){
    const Q={ask:'算力预算 2.0，到火种要绕约 4 个单位：全批每步花 1.0 算力（方向精准）；小批16 每步 0.1（方向带噪）；单样本每步 0.03（方向很抖）。谁最可能先到火种？',
     options:[
      {v:'小批 SGD（B=16）：每步便宜 10 倍，能走 20 步——噪声平均后仍指向谷底',ok:true,
       why:'对。方向噪声是无偏的：抖着抖着，平均方向还是下坡；省下的算力全换成了步数。这就是 mini-batch 成为深度学习默认选择的原因。'},
      {v:'全批 GD：方向最准，肯定最快',mId:'M-GD-05',
       why:'方向是准，但每步太贵：2 步预算走不完约 4 个单位的绕行路。训练比的是"单位算力下降最快"，不是"单步方向最准"。'},
      {v:'单样本 SGD（B=1）：噪声最大、步数最多，一定赢',mId:'M-GD-06',
       why:'噪声大也有代价：抖太狠要走冤枉路，还可能一头闯进禁地白花算力。B=16 在"省算力"和"少抖动"之间折中——所以叫 mini-batch。'}
     ]};
    document.getElementById('sgdAsk').textContent=Q.ask;
    const box=document.getElementById('sgdOpts');box.innerHTML='';
    const rev=document.getElementById('sgdReveal');rev.style.display='none';rev.innerHTML='';
    let wrongN=0;
    Q.options.slice().sort(()=>Math.random()-0.5).forEach((o,i)=>{
      const b=this.el('button',{class:'btn sm',style:'justify-content:flex-start;text-align:left;font-size:13px',
        html:`<b>${String.fromCharCode(65+i)}.</b> ${o.v}`},box);
      b.onclick=()=>{
        if(b.disabled)return;
        const ok=!!o.ok;
        this.record({type:'sgd_quiz',correct:ok,firstTry:wrongN===0,value:o.v.slice(0,28),mId:ok?null:(o.mId||'M-GD-05')});
        if(ok){
          this.right(b);b.style.borderColor='var(--ok)';
          box.querySelectorAll('button').forEach(x=>x.disabled=true);
          rev.style.display='';
          rev.innerHTML=`<p style="font-size:13px;line-height:1.8;text-align:left"><b style="color:var(--ok)">✓ ${o.why}</b></p>
            <p class="readout" style="font-size:12.5px;margin-top:6px">亲自验证它：切到不同批大小，把火种拿下。</p>
            <button class="btn primary" id="sgdGoBtn" style="margin-top:10px">换挡上阵 →</button>`;
          document.getElementById('sgdGoBtn').onclick=()=>{
            this.quizDone=true;this.quizDoneT4=true;
            document.getElementById('sgdPanel').style.display='none';
            document.getElementById('batchPanel').style.display='';
            toast('批大小换挡已开放——SGD 模式下蓝箭头会抖。','info',2600);
          };
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

  onTutorHint(){}
  showTutorMessage(a){this.drawer.pushSystem(a);}
  restart(){location.hash='#/map';setTimeout(()=>location.hash='#/level/l2',0);}
  unmount(){if(this.jitT)clearInterval(this.jitT);super.unmount();}
}
