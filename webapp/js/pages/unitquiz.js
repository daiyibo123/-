// 单元测评页：预测-验证式快测 → 结算进个人报告
import { profile, saveProfile } from '../store/idb.js';
import { UNITS } from '../data/units.js';
import { toast } from '../ui/toast.js';
import { burstAt } from '../ui/particles.js';

export function renderQuiz(app,uid){
  const u=UNITS.find(x=>x.id===uid);
  if(!u){location.hash='#/map';return;}
  const p=profile();
  const up=p.units||(p.units={});
  const st=up[uid]||(up[uid]={lesson:false,agent:[],quiz:null});
  let i=0,wrongN=0;const firstTry=[],mCounts={};
  app.innerHTML=`
  <div class="fade-in" style="max-width:720px;margin:0 auto;padding:8px 4px 40px">
    <div class="topbar">
      <a class="btn sm ghost" href="#/map">← 路径</a>
      <h1 class="grad-text" style="font-size:20px">📝 第 ${u.no} 章单元测评</h1>
    </div>
    <p class="dim2 small" style="margin:2px 4px 12px">对照大纲基本要求的 ${u.quiz.length} 道快测；答错可重选（首答计入报告）。</p>
    <div class="panel" id="qbox" style="padding:18px"></div>
    <div class="dots" id="qdots">${u.quiz.map((_,k)=>`<span class="dot-i ${k===0?'on':''}"></span>`).join('')}</div>
  </div>`;
  const box=document.getElementById('qbox');
  const render=()=>{
    const q=u.quiz[i];
    box.innerHTML=`<div class="quiz-prog">第 ${i+1}/${u.quiz.length} 题</div>
      <p class="quiz-q">${q.q}</p>
      <div class="quiz-opts" id="opts"></div>
      <div id="qfb"></div>`;
    const opts=q.options.slice().sort(()=>Math.random()-0.5);
    opts.forEach((o)=>{
      const b=document.createElement('button');
      b.className='btn sm quiz-opt';b.style.cssText='justify-content:flex-start;text-align:left;font-size:13.5px';
      b.textContent=o.v;
      b.onclick=()=>{
        if(b.disabled)return;
        if(o.ok){
          if(wrongN===0)firstTry.push(q.kp);
          if(wrongN>0){const m=lastM; if(m)mCounts[m]=(mCounts[m]||0)+0;}   // 错误已在选错时记
          burstAt(b,'#1CB0F6');
          b.style.borderColor='var(--ok)';
          document.querySelectorAll('#opts button').forEach(x=>x.disabled=true);
          document.getElementById('qfb').innerHTML=`<p style="color:var(--ok);font-size:13px;margin-top:10px">✓ ${o.fb}</p>
            <button class="btn primary" id="qnext" style="margin-top:8px">${i===u.quiz.length-1?'交卷，看个人报告 →':'下一题 →'}</button>`;
          document.getElementById('qnext').onclick=next;
        }else{
          wrongN++;lastM=o.mId||null;
          if(lastM)mCounts[lastM]=(mCounts[lastM]||0)+1;
          b.disabled=true;b.style.opacity=.45;b.style.textDecoration='line-through';
          const why=document.createElement('p');
          why.style.cssText='font-size:12.5px;color:var(--err);margin-top:4px;text-align:left';
          why.textContent=`✗ ${o.fb}`;
          b.after(why);
        }
      };
      document.getElementById('opts').appendChild(b);
    });
    document.getElementById('qdots').querySelectorAll('.dot-i').forEach((d,k)=>d.classList.toggle('on',k===i));
  };
  let lastM=null;
  const next=async()=>{
    wrongN=0;lastM=null;
    if(i<u.quiz.length-1){i++;render();return;}
    st.quiz={score:firstTry.length,total:u.quiz.length,mCounts,date:new Date().toISOString()};
    await saveProfile();
    toast(`测评完成：首答 ${firstTry.length}/${u.quiz.length}`,'ok',2200);
    setTimeout(()=>location.hash='#/ureport/'+uid,1000);
  };
  render();
}
