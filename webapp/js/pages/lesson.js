// 精讲页：重点卡翻卡流（先讲重点，后进案例）
import { profile, saveProfile } from '../store/idb.js';
import { UNITS } from '../data/units.js';
import { toast } from '../ui/toast.js';

export function renderLesson(app,uid){
  const u=UNITS.find(x=>x.id===uid);
  if(!u){location.hash='#/map';return;}
  const p=profile();
  const up=p.units||(p.units={});
  const st=up[uid]||(up[uid]={lesson:false,agent:[],quiz:null});
  let i=0,flipped=false;
  app.innerHTML=`
  <div class="fade-in" style="max-width:760px;margin:0 auto;padding:8px 4px 40px">
    <div class="topbar">
      <a class="btn sm ghost" href="#/map">← 路径</a>
      <h1 class="grad-text" style="font-size:20px">📘 第 ${u.no} 章精讲 · ${u.name}</h1>
    </div>
    <p class="dim2 small" style="margin:2px 4px 12px">🧭 ${u.arc}　·　翻完 ${u.lessons.length} 张重点卡，案例入口开放</p>
    <div class="dots" id="ldots">${u.lessons.map((_,k)=>`<span class="dot-i ${k===0?'on':''}"></span>`).join('')}</div>
    <div id="card" class="lesson-card"></div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
      <button class="btn ghost" id="lprev">← 上一张</button>
      <button class="btn primary" id="lnext">下一张 →</button>
    </div>
  </div>`;
  const card=document.getElementById('card');
  const render=()=>{
    flipped=false;
    const l=u.lessons[i];
    card.className='lesson-card';
    card.innerHTML=`
      <div class="lesson-front">
        <div class="lesson-num">重点 ${i+1}/${u.lessons.length}</div>
        <div class="lesson-title">${l.t}</div>
        <div class="dim2 small">点击卡片翻开 📖</div>
      </div>
      <div class="lesson-back">
        <div class="lesson-title sm">${l.t}</div>
        <p class="lesson-body">${l.body}</p>
        <div class="lesson-hard"><b>⚠ 难点预告</b>：${l.hard}</div>
      </div>`;
    card.onclick=()=>{flipped=!flipped;card.classList.toggle('flip',flipped);};
    document.getElementById('ldots').querySelectorAll('.dot-i').forEach((d,k)=>d.classList.toggle('on',k===i));
    document.getElementById('lprev').style.visibility=i===0?'hidden':'';
    document.getElementById('lnext').textContent=i===u.lessons.length-1?'完成精讲 ✓':'下一张 →';
  };
  document.getElementById('lprev').onclick=()=>{if(i>0){i--;render();}};
  document.getElementById('lnext').onclick=async()=>{
    if(i<u.lessons.length-1){i++;render();return;}
    st.lesson=true;await saveProfile();
    toast('精讲完成——案例入口已开放 ⚡','ok',2200);
    setTimeout(()=>location.hash='#/map',900);
  };
  render();
}
