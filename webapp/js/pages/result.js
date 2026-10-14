import { LEVELS, ORDER } from '../data/levels.js';
import { KNOW } from '../data/knowledge.js';
import { toast } from '../ui/toast.js';

export function renderResult(app,levelId){
  const raw=sessionStorage.getItem('nn_lastResult');
  if(!raw||!levelId){location.hash='#/map';return;}
  const {result,newAch=[],oldStar=0}=JSON.parse(raw);
  if(result.levelId!==levelId){location.hash='#/map';return;}
  const cfg=LEVELS[levelId];
  const next=ORDER[ORDER.indexOf(levelId)+1];
  const mis=Object.entries(result.mCounts||{}).sort((a,b)=>b[1]-a[1]);
  const starGain=result.stars>oldStar;
  app.innerHTML=`
  <div class="result-wrap fade-in">
    <div class="result-stars">
      ${[1,2,3].map(i=>`<span class="${i<=result.stars?'on':'off'}">★</span>`).join('')}
    </div>
    <h2 style="font-size:22px">「${cfg.title}」${result.stars>=3?'完美通关！':'通关'}</h2>
    <div class="result-score">${result.score} <span style="font-size:14px;color:var(--text2)">分</span></div>
    ${starGain&&newAch.length?`<div class="chip warn">🏆 新成就：${newAch.map(a=>a.name).join('、')}</div>`:''}
    <div class="result-grid">
      <div class="mcard">
        <h4>数据面板</h4>
        <ul>
          <li class="good">有效操作 ${result.steps} 步（参考 ${result.minSteps} 步）</li>
          <li class="${result.errs?'':'good'}">失误 ${result.errs} 次</li>
          <li class="${result.hintUsed?'':'good'}">AI 提示 ${result.hintUsed?'使用过':'未使用'}</li>
          <li class="good">用时 ${result.durationS}s</li>
        </ul>
      </div>
      <div class="mcard">
        <h4>错误归因 → 课件定位</h4>
        ${mis.length?`<ul>${mis.map(([m,c])=>{
          const mm=KNOW.misconceptions[m];
          return `<li>${mm?mm.text:m} ×${c} <span class="dim2">（${mm?mm.chapter:''}）</span></li>`;
        }).join('')}</ul>`:'<ul><li class="good">零失误，链路完美</li></ul>'}
      </div>
      <div class="mcard">
        <h4>图鉴解锁</h4>
        <ul>${KNOW.codex.filter(c=>c.level===levelId).map(c=>
          `<li class="good">${c.name} <span class="dim2">${c.formula}</span></li>`).join('')}</ul>
      </div>
    </div>
    <div class="result-actions">
      ${next&&!LEVELS[next].ext?`<button class="btn primary" id="next">下一关：${LEVELS[next].title} ⚡</button>`:''}
      <button class="btn" id="replay">↻ 再来一次</button>
      <button class="btn ghost" id="map">🗺 返回地图</button>
    </div>
  </div>`;
  const n=app.querySelector('#next'); if(n)n.onclick=()=>location.hash='#/level/'+next;
  app.querySelector('#replay').onclick=()=>location.hash='#/level/'+levelId;
  app.querySelector('#map').onclick=()=>location.hash='#/map';
  newAch.forEach((a,i)=>setTimeout(()=>toast(`🏆 成就解锁：${a.name} —— ${a.desc}`,'warn',3200),600+i*900));
}
