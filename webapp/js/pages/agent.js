// 知识路智能体：本章知识图谱节点逐个点亮（苏格拉底式提问 + AI 讲评，三级降级）
import { profile, saveProfile } from '../store/idb.js';
import { UNITS } from '../data/units.js';
import { KNOW } from '../data/knowledge.js';
import { tutor } from '../ai/tutor.js';
import { toast } from '../ui/toast.js';

export function renderAgent(app,uid){
  const u=UNITS.find(x=>x.id===uid);
  if(!u){location.hash='#/map';return;}
  const p=profile();
  const up=p.units||(p.units={});
  const st=up[uid]||(up[uid]={lesson:false,agent:[],quiz:null});
  app.innerHTML=`
  <div class="fade-in" style="max-width:760px;margin:0 auto;padding:8px 4px 40px">
    <div class="topbar">
      <a class="btn sm ghost" href="#/map">← 路径</a>
      <h1 class="grad-text" style="font-size:20px">🧠 第 ${u.no} 章知识路 · 复盘智能体</h1>
    </div>
    <p class="dim2 small" style="margin:2px 4px 12px">智能体沿本章知识图谱提问，答对点亮一盏灯；答错给线索并指出对应误区。全亮 = 本章知识路通关。</p>
    <div class="panel" style="padding:16px">
      <svg id="kpath" viewBox="0 0 700 90" style="width:100%"></svg>
      <div class="dim2 small" id="ksum" style="text-align:center"></div>
    </div>
    <div class="panel" id="kq" style="padding:18px;margin-top:12px"></div>
  </div>`;
  const svg=document.getElementById('kpath');
  const draw=()=>{
    const n=u.agentNodes.length,W=700;
    const xs=u.agentNodes.map((_,k)=>40+k*(W-80)/(n-1||1));
    let h='';
    if(n>1)h+=`<path d="M${xs[0]} 40 ${xs.slice(1).map(x=>`L${x} 40`).join(' ')}" stroke="#D9E0E8" stroke-width="3" stroke-dasharray="6 5" fill="none"/>`;
    u.agentNodes.forEach((nd,k)=>{
      const lit=st.agent.includes(nd.kp+k);
      h+=`<g class="knode ${lit?'lit':''}" data-k="${k}" transform="translate(${xs[k]},40)" style="cursor:pointer">
        <circle r="15" fill="${lit?'#3E8A5E':'#FFFFFF'}" stroke="${lit?'#3E8A5E':'#C7CFD8'}" stroke-width="2"/>
        <text y="5" text-anchor="middle" font-size="14">${lit?'💡':'❓'}</text>
        <text y="34" text-anchor="middle" font-size="9.5" fill="#5A6774">${(KNOW.knowledgePoints[nd.kp]?.name||nd.kp).slice(0,8)}</text>
      </g>`;});
    svg.innerHTML=h;
    document.getElementById('ksum').textContent=`已点亮 ${st.agent.length}/${u.agentNodes.length} 盏`;
    svg.querySelectorAll('.knode').forEach(g=>g.addEventListener('click',()=>ask(+g.dataset.k)));
  };
  const ask=async(k)=>{
    const nd=u.agentNodes[k];
    const box=document.getElementById('kq');
    box.innerHTML=`<div class="quiz-prog">知识节点 ${k+1} · ${KNOW.knowledgePoints[nd.kp]?.name||''}</div>
      <p class="quiz-q">🧑‍🏫 ${nd.q}</p>
      <div id="aopts" style="display:flex;flex-direction:column;gap:8px"></div>
      <div id="afb" style="margin-top:10px"></div>`;
    nd.options.slice().sort(()=>Math.random()-0.5).forEach(o=>{
      const b=document.createElement('button');
      b.className='btn sm';b.style.cssText='justify-content:flex-start;text-align:left;font-size:13.5px';
      b.textContent=o.v;
      b.onclick=async()=>{
        if(b.disabled)return;
        if(o.ok){
          b.style.borderColor='var(--ok)';
          box.querySelectorAll('#aopts button').forEach(x=>x.disabled=true);
          if(!st.agent.includes(nd.kp+k)){st.agent.push(nd.kp+k);await saveProfile();}
          draw();
          const fb=document.getElementById('afb');
          fb.innerHTML=`<p style="color:var(--ok);font-size:13px">✓ ${o.fb}</p><div id="aiexp" class="readout small" style="margin-top:8px">🤖 正在请 AI 助教补充讲解…</div>`;
          try{  // AI 讲评（API → 缓存 → 内置，三级降级在 tutor 内部）
            const ans=await tutor.ask(nd.q+'（学生刚答对：'+o.v+'，请用两三句话加深理解）',{levelId:uid,mId:o.ok?null:undefined});
            const el=document.getElementById('aiexp');
            if(el)el.innerHTML='🤖 <b>AI 助教</b>：'+ans;
          }catch(_){const el=document.getElementById('aiexp');if(el)el.textContent='';}
          if(st.agent.length>=u.agentNodes.length){
            toast('本章知识路全亮！💡','ok',2400);
          }
        }else{
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
          why.textContent=`✗ ${o.fb}`;
          b.after(why);
        }
      };
      box.querySelector('#aopts').appendChild(b);
    });
  };
  draw();
  const nextUnlit=u.agentNodes.findIndex((_,k)=>!st.agent.includes(u.agentNodes[k].kp+k));
  if(nextUnlit>=0)ask(nextUnlit);
  else document.getElementById('kq').innerHTML=`<p style="text-align:center;color:var(--ok)">💡 本章知识路已全亮——去做单元测评，生成个人报告吧。</p>
    <div style="text-align:center;margin-top:10px"><a class="btn primary" href="#/quiz/${uid}">📝 去测评</a></div>`;
}
