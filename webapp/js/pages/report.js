import { profile, attemptsOf } from '../store/idb.js';
import { LEVELS, ORDER } from '../data/levels.js';
import { KNOW } from '../data/knowledge.js';
import { drawRadar } from '../ui/radar.js';
import { toast } from '../ui/toast.js';

export async function renderReport(app){
  const p=profile();
  const dims=[['基础',0],['优化',0],['反传',0],['卷积',0],['正则',0],['注意',0]];
  const dimMap={l1:0,l2:1,l3:2,l4:3,l5:4,l6:5};
  const mAgg={};
  for(const id of ['l1','l2','l3','l4','l5','l6']){
    const att=await attemptsOf(id);
    const best=att.reduce((m,a)=>Math.max(m,a.stars||0),0);
    if(dimMap[id]!==undefined&&best>0)dims[dimMap[id]][1]=best/3;
    for(const a of att){ if(a.actions) for(const act of a.actions){ if(act.correct===false&&act.mId)mAgg[act.mId]=(mAgg[act.mId]||0)+1; } }
  }
  const top=Object.entries(mAgg).sort((a,b)=>b[1]-a[1]).slice(0,5);
  app.innerHTML=`
  <div class="fade-in">
    <div class="topbar">
      <h1 class="grad-text" style="font-size:24px">📊 学情报告</h1>
      <a class="btn sm ghost" href="#/map" style="margin-left:auto">← 地图</a>
    </div>
    <div class="report-grid">
      <div class="report-side">
        <div class="panel" style="display:flex;justify-content:center"><canvas id="radar"></canvas></div>
        <button class="btn primary" id="exp" style="width:100%">⬇ 导出报告图片</button>
        <div class="dim2 small">教师可在服务端 /dashboard 查看班级匿名聚合看板</div>
      </div>
      <div class="panel">
        <h4 style="margin-bottom:10px;color:var(--sig)">六维掌握度（按最好成绩）</h4>
        <div class="small dim" style="line-height:2;margin-bottom:16px">
          ${dims.map(([n,v])=>`${n} ${(v*100).toFixed(0)}%`).join(' · ')}
        </div>
        <h4 style="margin-bottom:10px;color:var(--err)">易错点 TOP（附课件定位）</h4>
        ${top.length?`<div style="display:flex;flex-direction:column;gap:8px">${top.map(([m,c])=>{
          const mm=KNOW.misconceptions[m];
          return `<div style="display:flex;gap:10px;align-items:center">
            <span class="chip err">${c} 次</span>
            <span style="font-size:13.5px">${mm?mm.text:m} <span class="dim2">· ${mm?mm.chapter:''}</span></span>
          </div>`;
        }).join('')}</div>`:'<div class="dim2 small">暂无错误记录——要么你很强，要么你还没开始 😏</div>'}
      </div>
    </div>
  </div>`;
  drawRadar(document.getElementById('radar'),dims.map(d=>d[0]),dims.map(d=>d[1]));
  document.getElementById('exp').onclick=()=>{
    // 导出：雷达 + 文本重绘到一张画布
    const W=760,H=520;const c=document.createElement('canvas');
    c.width=W;c.height=H;const g=c.getContext('2d');
    g.fillStyle='#FFFFFF';g.fillRect(0,0,W,H);
    g.fillStyle='#1F2933';g.font='bold 26px sans-serif';g.fillText('手搓神经网络 · 学情报告',30,48);
    g.font='25px sans-serif';g.fillStyle='#5A6774';
    g.fillText(new Date().toLocaleString()+' · 匿名会话',30,74);
    const r=document.getElementById('radar');g.drawImage(r,20,100);
    g.fillStyle='#1F2933';g.font='bold 16px sans-serif';g.fillText('易错点 TOP',360,130);
    g.font='25px sans-serif';g.fillStyle='#5A6774';
    if(!top.length)g.fillText('暂无错误记录',360,158);
    top.forEach(([m,cc],i)=>{
      const mm=KNOW.misconceptions[m];const y=160+i*44;
      g.fillStyle='#C2543C';g.fillText(`×${cc}`,360,y);
      g.fillStyle='#1F2933';g.fillText((mm?mm.text:m).slice(0,22),400,y);
      g.fillStyle='#98A1AC';g.fillText((mm?mm.chapter:''),400,y+18);
    });
    const a=document.createElement('a');a.download='手搓神经网络_学情报告.png';
    a.href=c.toDataURL('image/png');a.click();
    toast('报告已导出 📄','ok');
  };
}
