// 应用入口：hash 路由 + 全局上下文（finish 回调 / 反馈演出 / 事件上报）
import { loadProfile, profile, saveProfile, recordAttempt, ensureSid } from './store/idb.js';
import { LEVELS, ORDER } from './data/levels.js';
import { KNOW } from './data/knowledge.js';
import { computeScore } from './engine/scorer.js';
import { levelClass } from './engine/registry.js';
import { tutor } from './ai/tutor.js';
import { toast } from './ui/toast.js';
import { burstAt, explodeAt } from './ui/particles.js';
import { renderIntro } from './pages/intro.js';
import { renderUnits } from './pages/units.js';
import { renderLesson } from './pages/lesson.js';
import { renderQuiz } from './pages/unitquiz.js';
import { renderUnitReport } from './pages/ureport.js';
import { renderAgent } from './pages/agent.js';
import { renderResult } from './pages/result.js';
import { renderCodex } from './pages/codex.js';
import { renderReport } from './pages/report.js';
import { renderSettings } from './pages/settings.js';

const app=document.getElementById('app');
let currentLevel=null;

/* ---------- 反馈演出 ---------- */
const feedback={
  right(el){ burstAt(el,'#1CB0F6'); },
  wrong(el){ explodeAt(el); },
  reject(el){ if(el){el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),450);} }
};

/* ---------- 通关结算 ---------- */
async function handleFinish(pack){
  const {levelId,seed,durationS,recorder,extra={}}=pack;
  const cfg=LEVELS[levelId];
  const sc=computeScore(cfg,recorder);
  const result={levelId,seed,durationS,extra,...sc,date:new Date().toISOString()};

  // 档案更新：解锁下一关 / 星级 / 成就 / 图鉴
  const p=profile();
  const idx=ORDER.indexOf(levelId);
  const next=ORDER[idx+1];
  if(next&&!LEVELS[next].ext&&!p.unlocked.includes(next)){p.unlocked.push(next);}
  const oldStar=p.stars[levelId]||0;
  if(sc.stars>oldStar)p.stars[levelId]=sc.stars;
  const newAch=[];
  for(const a of KNOW.achievements){
    if(!p.achievements.includes(a.id)&&a.cond(result)){p.achievements.push(a.id);newAch.push(a);}
  }
  for(const c of KNOW.codex){ if(c.level===levelId&&!p.codex.includes(c.id))p.codex.push(c.id); }
  await saveProfile();
  await recordAttempt(levelId,result,recorder.snapshot().actions);

  // 匿名事件上报（失败静默——离线可玩）
  try{
    fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sid:ensureSid(),result,
        events:recorder.actions.map(a=>({level_id:levelId,seq:a.seq,t_ms:a.t,type:a.type,
          payload:JSON.stringify({target:a.target,value:a.value,cardId:a.cardId}),correct:a.correct===undefined?null:(a.correct?1:0),m_id:a.mId||null}))})
    }).catch(()=>{});
  }catch(_){}

  sessionStorage.setItem('nn_lastResult',JSON.stringify({result,newAch,oldStar}));
  location.hash='#/result/'+levelId;
}

/* ---------- 关卡挂载 ---------- */
function mountLevel(id){
  const Cls=levelClass(id); if(!Cls){location.hash='#/map';return;}
  if(currentLevel){try{currentLevel.unmount()}catch(_){}}
  app.innerHTML='';
  const ctx={
    data:LEVELS,know:KNOW,tutor,feedback,
    settings:profile().settings,
    finish:handleFinish
  };
  tutor.settings.aiAuto=profile().settings.aiAuto!==false;
  const lv=new Cls(app,ctx);
  currentLevel=lv;
  window.__lvl=lv;   // 调试/自动化测试锚点
  try{lv.mount(app);}catch(e){
    console.error(e);
    app.innerHTML=`<div class="panel" style="margin-top:40px">关卡加载失败：${e.message}<br><a href="#/map">返回地图</a></div>`;
  }
}

/* ---------- 路由 ---------- */
function route(){
  const h=location.hash||'#/intro';
  const parts=h.slice(2).split('/');
  if(currentLevel){try{currentLevel.unmount()}catch(_){}currentLevel=null;}
  app.innerHTML='';
  window.scrollTo(0,0);
  if(parts[0]==='intro'||parts.length===0)renderIntro(app);
  else if(parts[0]==='map')renderUnits(app);
  else if(parts[0]==='level'&&parts[1])mountLevel(parts[1]);
  else if(parts[0]==='lesson'&&parts[1])renderLesson(app,parts[1]);
  else if(parts[0]==='quiz'&&parts[1])renderQuiz(app,parts[1]);
  else if(parts[0]==='ureport'&&parts[1])renderUnitReport(app,parts[1]);
  else if(parts[0]==='agent'&&parts[1])renderAgent(app,parts[1]);
  else if(parts[0]==='result'&&parts[1])renderResult(app,parts[1]);
  else if(parts[0]==='codex')renderCodex(app);
  else if(parts[0]==='report')renderReport(app);
  else if(parts[0]==='settings')renderSettings(app);
  else renderIntro(app);
}
addEventListener('hashchange',route);

(async()=>{
  await loadProfile();
  if(!location.hash)location.hash='#/intro';
  route();
})().catch(e=>{           // 启动兜底：任何异常显性呈现，绝不白屏
  console.error('boot failed:',e);
  const app=document.getElementById('app');
  if(app&&!app.childNodes.length)
    app.innerHTML='<div class="panel" style="margin-top:40px">应用启动失败：'+((e&&e.message)||e)+'<br><button class="btn sm" onclick="location.reload()">重试</button></div>';
});
