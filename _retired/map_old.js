import { profile } from '../store/idb.js';
import { LEVELS, ORDER } from '../data/levels.js';
import { infoModal, modal } from '../ui/modal.js';

export function renderMap(app){
  const p=profile();
  const W=980,H=560;
  // 电路板走线坐标（蛇形）
  const pos={};
  const rows=[[160,120],[500,120],[840,120],[840,300],[500,300],[160,300],[160,480],[500,480]];
  ORDER.forEach((id,i)=>pos[id]=rows[i]);
  app.innerHTML=`
  <div class="fade-in">
    <div class="topbar">
      <h1 class="grad-text" style="font-size:24px">🗺 炼丹房 · 试炼地图</h1>
      <div style="display:flex;gap:8px">
        <a class="btn sm ghost" href="#/codex">📖 知识图鉴</a>
        <a class="btn sm ghost" href="#/report">📊 学情报告</a>
        <a class="btn sm ghost" href="#/settings">⚙ 设置</a>
      </div>
    </div>
    <div class="panel map-wrap">
      <svg class="map-svg" viewBox="0 0 ${W} ${H}">
        ${ORDER.slice(0,-1).map((id,i)=>{
          const a=pos[id],b=pos[ORDER[i+1]];
          const mx=(a[0]+b[0])/2;
          return `<path d="M${a[0]} ${a[1]} C ${mx} ${a[1]}, ${mx} ${b[1]}, ${b[0]} ${b[1]}" fill="none" stroke="#D8CCB4" stroke-width="3" stroke-dasharray="7 6"/>`;
        }).join('')}
        ${ORDER.map(id=>{
          const [x,y]=pos[id];const cfg=LEVELS[id];
          const unlocked=p.unlocked.includes(id)||!cfg.unlock.length;
          const done=(p.stars[id]||0)>0;const stars=p.stars[id]||0;
          const col=cfg.ext?'#8C6FD4':(done?'#3E8A5E':(unlocked?'#33658A':'#C2B498'));
          return `<g class="map-node ${unlocked?'available':'locked'} ${done?'done':''}" data-id="${id}" transform="translate(${x},${y})">
            <circle r="34" fill="#F1EAD9" stroke="${col}" stroke-width="2.5"/>
            <circle class="node-core" r="26" fill="${col}" opacity=".18"/>
            <text y="7" text-anchor="middle" font-size="20" fill="${col}">${cfg.ext?'🔒':'⚡'}</text>
            <text class="map-label" y="58" text-anchor="middle">${cfg.title}</text>
            <text class="map-sub" y="74" text-anchor="middle">${cfg.topic}</text>
            ${done?`<text class="map-stars" y="-44" text-anchor="middle">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</text>`:''}
          </g>`;
        }).join('')}
      </svg>
      <div class="map-legend">
        <span><span class="dot" style="background:#33658A"></span>可挑战</span>
        <span><span class="dot" style="background:#3E8A5E"></span>已通关</span>
        <span><span class="dot" style="background:#8C6FD4"></span>扩展关卡（后续版本）</span>
        <span><span class="dot" style="background:#C2B498"></span>未解锁</span>
      </div>
    </div>
  </div>`;
  app.querySelectorAll('.map-node').forEach(n=>{
    n.addEventListener('click',()=>{
      const id=n.dataset.id,cfg=LEVELS[id];
      if(cfg.ext){infoModal(cfg.title,`<b>${cfg.topic}</b><br>${cfg.story}<br><span class="dim2">扩展关卡将在主线完成后开放。</span>`);return;}
      if(!p.unlocked.includes(id)&&cfg.unlock.length){infoModal('🔒 尚未解锁',`先完成「${LEVELS[cfg.unlock[0]].title}」再来。`);return;}
      modal({
        title:`${cfg.title} · ${cfg.topic}`,
        html:`<p style="margin-bottom:10px">${cfg.story}</p>
          <p><span class="chip ok">目标</span> ${cfg.goal}</p>
          <p class="dim2 small" style="margin-top:10px">对应课件：${cfg.chapter}</p>`,
        okText:'进入关卡 ⚡',
        onOk:()=>{ location.hash='#/level/'+id; }
      });
    });
  });
}
