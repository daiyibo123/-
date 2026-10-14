// 关卡基类：统一生命周期 + 通用拖放 + 撤销快照 + 演出反馈
import { Recorder } from './recorder.js';

export class LevelBase{
  static id='?'; static title='?';

  constructor(root,ctx){
    this.root=root; this.ctx=ctx;                 // ctx:{finish,tutor,know,data,sid,settings}
    this.cfg=(ctx.data&&ctx.data[this.constructor.id])||{};
    this.recorder=new Recorder(this.constructor.id,this.cfg.seed||1);
    this._drops=[]; this._undoStack=[]; this._teardown=[];
  }

  /* ---- DOM 辅助 ---- */
  el(tag,attrs={},parent){
    const e=document.createElement(tag);
    for(const[k,v]of Object.entries(attrs)){
      if(k==='style')e.style.cssText=v;
      else if(k==='class')e.className=v;
      else if(k==='html')e.innerHTML=v;
      else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
      else e.setAttribute(k,v);
    }
    if(parent)parent.appendChild(e);
    return e;
  }
  svg(tag,attrs={},parent){
    const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);
    if(parent)parent.appendChild(e);
    return e;
  }
  on(target,ev,fn,opt){ target.addEventListener(ev,fn,opt); this._teardown.push(()=>target.removeEventListener(ev,fn,opt)); }

  /* ---- 动作记录 ---- */
  record(a){ return this.recorder.push(a); }

  /* ---- 撤销快照 ---- */
  pushSnap(s){ this._undoStack.push(JSON.stringify(s)); if(this._undoStack.length>60)this._undoStack.shift(); }
  undo(){ const s=this._undoStack.pop(); return s?JSON.parse(s):null; }

  /* ---- 演出反馈（粒子 + 宠物反应事件） ---- */
  wrong(targetEl,mId,tip){
    this.record({type:'wrong',mId,correct:false});
    if(targetEl){ targetEl.classList.add('shake'); setTimeout(()=>targetEl.classList.remove('shake'),500); }
    this.ctx.feedback&&this.ctx.feedback.wrong(targetEl);
    document.dispatchEvent(new CustomEvent('nn-react',{detail:{kind:'wrong',el:targetEl}}));
    if(mId&&tip!==false) this.ctx.tutor.maybeTrigger(mId,this);
  }
  right(targetEl){
    this.ctx.feedback&&this.ctx.feedback.right(targetEl);
    document.dispatchEvent(new CustomEvent('nn-react',{detail:{kind:'right',el:targetEl}}));
  }

  /* ---- 通用拖放（Pointer Events，鼠标/触摸统一） ---- */
  // cardEl: 可拖元素；zones: [{el, accept(cardEl)->bool, onDrop(cardEl,zone)}]
  makeDraggable(cardEl,zones){
    cardEl.style.touchAction='none';
    const onDown=(ev)=>{
      if(ev.button!==undefined&&ev.button!==0)return;
      ev.preventDefault();
      const ghost=cardEl.cloneNode(true);
      ghost.classList.add('drag-ghost');
      const r=cardEl.getBoundingClientRect();
      const ox=ev.clientX-(r.left+r.width/2), oy=ev.clientY-(r.top+r.height/2);
      ghost.style.cssText+=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;z-index:9999;pointer-events:none;transform:scale(1.05);`;
      document.body.appendChild(ghost);
      cardEl.classList.add('dragging');
      let hovered=null;
      const move=(e)=>{
        ghost.style.left=(e.clientX-ghost.offsetWidth/2)+'px';
        ghost.style.top=(e.clientY-ghost.offsetHeight/2)+'px';
        const hit=this.hitZone(e.clientX,e.clientY,zones);
        zones.forEach(z=>z.el.classList.toggle('drop-hot',z.el===hit));
        hovered=hit;
      };
      const up=(e)=>{
        document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
        ghost.remove(); cardEl.classList.remove('dragging');
        zones.forEach(z=>z.el.classList.remove('drop-hot'));
        const hit=this.hitZone(e.clientX,e.clientY,zones);
        if(hit&&hit.accept(cardEl)){ hit.onDrop(cardEl,hit); }
        else{
          ghostAnimBack();
          if(hit)this.ctx.feedback&&this.ctx.feedback.reject(cardEl);
        }
      };
      const ghostAnimBack=()=>{ /* 卡回原位由 CSS transition 表达，简化处理 */ };
      document.addEventListener('pointermove',move,{passive:false});
      document.addEventListener('pointerup',up);
    };
    this.on(cardEl,'pointerdown',onDown);
  }
  hitZone(x,y,zones){
    for(const z of zones){
      if(z.el.classList.contains('zone-locked'))continue;
      if(z.el.classList.contains('filled')&&!z.allowFilled)continue;   // L5 药槽 allowFilled=true 支持覆盖换药
      const r=z.el.getBoundingClientRect();
      if(x>=r.left-6&&x<=r.right+6&&y>=r.top-6&&y<=r.bottom+6)return z;
    }
    return null;
  }

  /* ---- 结束 ---- */
  finish(extra={}){
    this.recorder&&this.ctx.finish({
      levelId:this.constructor.id,
      seed:this.cfg.seed,
      durationS:Math.round((performance.now()-this.recorder.t0)/1000),
      recorder:this.recorder,
      extra
    });
  }
  unmount(){ this._teardown.forEach(f=>{try{f()}catch(_){}}); }
}
