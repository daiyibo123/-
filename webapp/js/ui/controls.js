// 物理控件库：旋钮 / 摇杆 / 换挡拨杆 / 拨片开关 / 步进拨轮
// 全部基于 Pointer Events，鼠标与触摸统一；触控目标 ≥44px
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ---------- 旋钮：拖动旋转，angle∈[min,max] 度，回调返回归一化值 ---------- */
export function makeKnob(parent,{label,min=-90,max=90,value=0,size=76,onInput}){
  const wrap=document.createElement('div'); wrap.className='ctl-knob';
  const knob=document.createElement('div'); knob.className='knob-dial'; knob.style.width=knob.style.height=size+'px';
  const mark=document.createElement('div'); mark.className='knob-mark';
  knob.appendChild(mark);
  const lab=document.createElement('div'); lab.className='ctl-label'; lab.textContent=label;
  const read=document.createElement('div'); read.className='ctl-read mono';
  wrap.append(knob,read,lab); parent.appendChild(wrap);
  let ang=clamp(value,min,max);
  const render=()=>{ knob.style.transform=`rotate(${ang}deg)`; read.textContent=Math.round(ang)+'°'; onInput&&onInput(ang); };
  render();
  knob.style.touchAction='none';
  knob.addEventListener('pointerdown',ev=>{
    ev.preventDefault(); try{knob.setPointerCapture(ev.pointerId)}catch(_){}
    const move=e=>{
      const r=knob.getBoundingClientRect();
      const dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
      let a=Math.atan2(dx,-dy)*180/Math.PI; a=clamp(a,min,max); ang=a; render();
    };
    const up=()=>{knob.removeEventListener('pointermove',move);knob.removeEventListener('pointerup',up);};
    knob.addEventListener('pointermove',move); knob.addEventListener('pointerup',up);
  });
  return {set(a){ang=clamp(a,min,max);render();},get:()=>ang,el:wrap};
}

/* ---------- 摇杆：8 向，松手触发 onChange(dir) dir∈{x,y} 单位向量化 ---------- */
export function makeJoystick(parent,{label='方向',onChange,onRelease}){
  const wrap=document.createElement('div'); wrap.className='ctl-joy';
  const base=document.createElement('div'); base.className='joy-base';
  const stick=document.createElement('div'); stick.className='joy-stick';
  base.appendChild(stick);
  const lab=document.createElement('div'); lab.className='ctl-label'; lab.textContent=label;
  wrap.append(base,lab); parent.appendChild(wrap);
  base.style.touchAction='none';
  const R=44;
  base.addEventListener('pointerdown',ev=>{
    ev.preventDefault(); try{base.setPointerCapture(ev.pointerId)}catch(_){}
    const move=e=>{
      const r=base.getBoundingClientRect();
      let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
      const len=Math.hypot(dx,dy)||1, cl=Math.min(len,R);
      dx=dx/len*cl; dy=dy/len*cl;
      stick.style.transform=`translate(${dx}px,${dy}px)`;
      base.classList.add('joy-live');
      onChange&&onChange({dx:dx/R,dy:dy/R});
    };
    const up=()=>{
      const tr=stick.style.transform.match(/(-?[\d.]+)px,\s*(-?[\d.]+)px/);
      let dx=0,dy=0;
      if(tr){dx=+tr[1]/R;dy=+tr[2]/R;}
      stick.style.transform='translate(0,0)'; base.classList.remove('joy-live');
      onRelease&&onRelease({dx,dy});
      base.removeEventListener('pointermove',move); base.removeEventListener('pointerup',up);
    };
    base.addEventListener('pointermove',move); base.addEventListener('pointerup',up);
  });
  return {el:wrap};
}

/* ---------- 换挡拨杆：离散档位 ---------- */
export function makeLever(parent,{label,gears,value=0,onChange}){
  const wrap=document.createElement('div'); wrap.className='ctl-lever';
  const track=document.createElement('div'); track.className='lever-track';
  const fill=document.createElement('div'); fill.className='lever-fill';
  const handle=document.createElement('div'); handle.className='lever-handle';
  track.append(fill,handle);
  const scale=document.createElement('div'); scale.className='lever-scale';
  gears.forEach(g=>{const t=document.createElement('span');t.textContent=g.label;scale.appendChild(t);});
  const lab=document.createElement('div'); lab.className='ctl-label'; lab.textContent=label;
  wrap.append(track,scale,lab); parent.appendChild(wrap);
  let idx=value;
  const render=()=>{ const p=idx/(gears.length-1)*100;
    fill.style.width=`calc(${p}% )`; handle.style.left=`calc(${p}% - 14px)`;
    onChange&&onChange(gears[idx],idx);
  }; render();
  track.style.touchAction='none';
  const setFromX=(clientX)=>{
    const r=track.getBoundingClientRect();
    const p=clamp((clientX-r.left)/r.width,0,1);
    idx=Math.round(p*(gears.length-1)); render();
  };
  track.addEventListener('pointerdown',ev=>{ev.preventDefault();try{track.setPointerCapture(ev.pointerId)}catch(_){}setFromX(ev.clientX);
    const mv=e=>setFromX(e.clientX);
    const up=()=>{track.removeEventListener('pointermove',mv);track.removeEventListener('pointerup',up);};
    track.addEventListener('pointermove',mv);track.addEventListener('pointerup',up);
  });
  return {get:()=>gears[idx],set(i){idx=i;render();},el:wrap};
}

/* ---------- 拨片开关 ---------- */
export function makeToggle(parent,{label,on=false,onChange}){
  const wrap=document.createElement('div'); wrap.className='ctl-toggle';
  const t=document.createElement('div'); t.className='toggle-paddle'+(on?' on':'');
  const knobEl=document.createElement('div'); knobEl.className='toggle-knob';
  t.appendChild(knobEl);
  const lab=document.createElement('div'); lab.className='ctl-label'; lab.textContent=label;
  wrap.append(t,lab); parent.appendChild(wrap);
  let state=on;
  t.addEventListener('pointerdown',ev=>{ev.preventDefault();state=!state;t.classList.toggle('on',state);onChange&&onChange(state);});
  return {get:()=>state,set(v){state=v;t.classList.toggle('on',v);},el:wrap};
}

/* ---------- 步进拨轮（数值单元格，−2..2） ---------- */
export function makeStepper(parent,{value=0,min=-2,max=2,onChange}){
  const wrap=document.createElement('div'); wrap.className='ctl-stepper mono';
  const dec=document.createElement('button'); dec.className='step-btn'; dec.textContent='−';
  const val=document.createElement('span'); val.className='step-val'; val.textContent=value;
  const inc=document.createElement('button'); inc.className='step-btn'; inc.textContent='+';
  wrap.append(dec,val,inc); parent.appendChild(wrap);
  let v=value;
  const set=n=>{v=clamp(n,min,max);val.textContent=v;onChange&&onChange(v);};
  dec.addEventListener('click',()=>set(v-1));
  inc.addEventListener('click',()=>set(v+1));
  wrap._setValue=set;   // 程序化设值（测试/无障碍辅助用）
  return {get:()=>v,set,setEl:wrap};
}
