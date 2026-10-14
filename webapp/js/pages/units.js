// 章节路径页（多邻国式）：每章 📘精讲 → ⚡4案例 → 🧠智能体 → 📝测评 四段节点链
import { profile, saveProfile } from '../store/idb.js';
import { LEVELS } from '../data/levels.js';
import { UNITS } from '../data/units.js';

// 多邻国式分区分色：每章一个主题色
const UNIT_COLORS={u2:'#1CB0F6',u3:'#58CC02',u4:'#FF9600',u5:'#CE82FF',u6:'#FF4B4B'};
// 测试模式：URL 带 ?test=1 或 localStorage 有 nn_test_mode 时全部解锁
const TEST_MODE=new URLSearchParams(location.search).has('test')||localStorage.getItem('nn_test_mode')==='1';
if(TEST_MODE)localStorage.setItem('nn_test_mode','1');
import { levelClass } from '../engine/registry.js';
import { infoModal, modal } from '../ui/modal.js';

export function unitState(p,u){
  const up=p.units||(p.units={});
  return up[u.id]||(up[u.id]={lesson:false,agent:[],quiz:null});
}
function caseDone(p,id){ return (p.stars[id]||0)>0; }

export function renderUnits(app){
  const p=profile();
  app.innerHTML=`
  <div class="fade-in">
    <div class="topbar">
      <h1 class="grad-text" style="font-size:24px">🗺 手搓神经网络 · 课程路径</h1>
      <div style="display:flex;gap:8px">
        <a class="btn sm ghost" href="#/codex">📖 知识图鉴</a>
        <a class="btn sm ghost" href="#/report">📊 学情报告</a>
        <a class="btn sm ghost" href="#/settings">⚙ 设置</a>
      </div>
    </div>
    <p class="dim2 small" style="margin:0 4px 14px">每章四步走：<b>📘 精讲</b>（先讲重点）→ <b>⚡ 互动案例</b>（针对本章难点）→ <b>🧠 知识路智能体</b>（苏格拉底复盘）→ <b>📝 单元测评</b>（个人分析报告）。按序点亮。</p>
    ${UNITS.map((u,ui)=>{
      const st=unitState(p,u);
      const prevDone=TEST_MODE||ui===0||(UNITS[ui-1]&&unitState(p,UNITS[ui-1]).quiz);
      const unitOpen=prevDone;
      const caseStars=u.cases.map(id=>p.stars[id]||0);
      const casesDone=caseStars.filter(s=>s>0).length;
      return `
      <div class="panel unit-sec ${unitOpen?'':'unit-locked'}">
        <div class="unit-head">
          <span class="unit-no" style="background:${UNIT_COLORS[u.id]}">第 ${u.no} 章</span>
          <span class="unit-name">${u.name}</span>
          <span class="unit-hours">${u.hours} 学时</span>
          <div class="unit-soul">🧭 ${u.soul}<br><span class="dim2">弧线：${u.arc}</span></div>
        </div>
        <div class="unit-path">
          ${unitNodes(p,u,st,unitOpen).join('')}
        </div>
        <div class="unit-foot dim2 small">${unitOpen
          ?(st.quiz?'✅ 本章完成':'进度：精讲 '+(st.lesson?'✓':'–')+' · 案例 '+casesDone+'/'+u.cases.length+' · 知识路 '+st.agent.length+'/'+u.agentNodes.length+(st.quiz?' · 测评 '+st.quiz.score+'/'+st.quiz.total:''))
          :'🔒 完成上一章的单元测评后解锁'}</div>
      </div>`;
    }).join('')}
  </div>`;
  bindUnits(app,p);
}

function unitNodes(p,u,st,unitOpen){
  const nodes=[];
  // 精讲
  nodes.push(nodeHtml({
    icon:'📘',label:'精讲',sub:st.lesson?'已完成':(unitOpen?'先讲重点':'未解锁'),
    state:st.lesson?'done':(unitOpen?'current':'locked'),data:{t:'lesson',u:u.id},color:UNIT_COLORS[u.id]}));
  // 案例（顺序解锁；首案例需精讲）
  u.cases.forEach((id,i)=>{
    const cfg=LEVELS[id]||{};
    const dev=!levelClass(id);
    const prevOk=TEST_MODE||(i===0?st.lesson:caseDone(p,u.cases[i-1]));
    const stars=p.stars[id]||0;
    const state=dev?'dev':(stars>0?'done':(unitOpen&&prevOk?'current':'locked'));
    nodes.push(nodeHtml({icon:dev?'🚧':'⚡',label:cfg.title||id,sub:dev?'开发中':(stars>0?'★'.repeat(stars)+'☆'.repeat(3-stars):(prevOk&&unitOpen?'可挑战':'未解锁')),color:UNIT_COLORS[u.id],
      state,data:{t:'case',u:u.id,id}}));
  });
  // 智能体
  const anyCase=u.cases.some(id=>caseDone(p,id));
  const allLit=st.agent.length>=u.agentNodes.length;
  nodes.push(nodeHtml({icon:'🧠',label:'知识路',sub:allLit?'全亮 ✓':(unitOpen&&anyCase?st.agent.length+'/'+u.agentNodes.length:'未解锁'),
    state:allLit?'done':((unitOpen&&anyCase)||TEST_MODE?'current':'locked'),data:{t:'agent',u:u.id},color:UNIT_COLORS[u.id]}));
  // 测评
  const allCases=u.cases.every(id=>caseDone(p,id));
  nodes.push(nodeHtml({icon:'📝',label:'单元测评',sub:st.quiz?st.quiz.score+'/'+st.quiz.total+' 分':(unitOpen&&allCases?'生成个人报告':'需 4 案例全通'),
    state:st.quiz?'done':((unitOpen&&allCases)||TEST_MODE?'current':'locked'),data:{t:'quiz',u:u.id},color:UNIT_COLORS[u.id]}));
  return nodes;
}
function nodeHtml({icon,label,sub,state,data,color}){
  return `<div class="unode ${state}" data-t="${data.t}" data-u="${data.u}" ${data.id?`data-id="${data.id}"`:''} style="${(state==='done'||state==='current')&&color?('--uc:'+color):''}">
    <div class="unode-core"><span>${icon}</span></div>
    <div class="unode-label">${label}</div>
    <div class="unode-sub">${sub}</div>
  </div>`;
}

function bindUnits(app,p){
  app.querySelectorAll('.unode').forEach(n=>{
    n.addEventListener('click',async()=>{
      const {t,u,id}=n.dataset;
      const un=UNITS.find(x=>x.id===u);
      const st=unitState(p,un);
      if(n.classList.contains('locked')&&!TEST_MODE){infoModal('🔒 尚未解锁','按路径顺序点亮：先精讲 → 逐个案例 → 知识路 → 测评。<br><span class="dim2 small">测试模式：URL 加 ?test=1 全部解锁</span>');return;}
      if(t==='lesson'){location.hash='#/lesson/'+u;return;}
      if(t==='agent'){location.hash='#/agent/'+u;return;}
      if(t==='quiz'){location.hash='#/quiz/'+u;return;}
      if(t==='case'){
        if(n.classList.contains('dev')){infoModal('🚧 开发中','该案例正在按规格开发，稍后开放。');return;}
        const cfg=LEVELS[id];
        modal({
          title:`${cfg.title} · ${cfg.topic}`,
          html:`<p style="margin-bottom:10px">${cfg.story}</p>
            <p><span class="chip ok">目标</span> ${cfg.goal}</p>
            <p class="dim2 small" style="margin-top:10px">${cfg.chapter}</p>`,
          okText:'进入案例 ⚡',
          onOk:()=>{ location.hash='#/level/'+id; }
        });
      }
    });
  });
}
