import { profile } from '../store/idb.js';
import { KNOW } from '../data/knowledge.js';
export function renderCodex(app){
  const p=profile();
  const got=p.codex||[];
  app.innerHTML=`
  <div class="fade-in">
    <div class="topbar">
      <h1 class="grad-text" style="font-size:24px">📖 知识图鉴</h1>
      <div class="chip">${got.length} / ${KNOW.codex.length} 已收集</div>
      <a class="btn sm ghost" href="#/map" style="margin-left:auto">← 地图</a>
    </div>
    <div class="codex-grid">
      ${KNOW.codex.map(c=>{
        const on=got.includes(c.id)||c.level==='base';   // 先修基础卡（数学/机器学习）默认开放
        return `<div class="codex-card ${on?'':'locked'}">
          <div class="cname">${on?c.name:'？？？'}</div>
          <div class="cformula">${on?c.formula:'—— —— ——'}</div>
          <div class="cdesc">${on?c.desc:'通关对应关卡后解锁'}</div>
          <div class="cchap">${on?c.chapter:''}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
