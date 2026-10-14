// AI 宠物数字人「突触」2.0：胖圆吉祥物 + 纸条气泡 + 对话面板
// 对外接口与旧版一致：mountDrawer(host,{onAsk,quick}) → {open,close,pushSystem}
// 行为：待机浮动眨眼挥手 / 说话嘴动 / 答对跳跳 / 答错摇头并走到出错处 / 拖卡时闪避
export function mountDrawer(host,{onAsk,quick=[]}){
  host.innerHTML='';

  /* ---------- 宠物本体（Q 版神经元吉祥物） ---------- */
  const pet=document.createElement('div');
  pet.className='nn-pet';
  pet.title='AI 助教 · 突触（点我对话）';
  pet.innerHTML=`
  <svg viewBox="0 0 100 100" aria-label="AI 宠物突触">
    <defs>
      <radialGradient id="petBodyG" cx="35%" cy="28%" r="80%">
        <stop offset="0%" stop-color="#8FB9D8"/>
        <stop offset="100%" stop-color="#1CB0F6"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="93" rx="20" ry="4" fill="rgba(51,48,42,.16)"/>
    <line x1="50" y1="24" x2="50" y2="31" stroke="#2B70C9" stroke-width="2.4" stroke-linecap="round"/>
    <circle class="spark" cx="50" cy="19" r="4" fill="#E8A93C" stroke="#C98A2D" stroke-width="1.2"/>
    <g class="pet-float">
      <g class="arm arm-l"><path d="M25 55 Q14 50 11 41" stroke="#1CB0F6" stroke-width="7.5" fill="none" stroke-linecap="round"/></g>
      <g class="arm arm-r"><path d="M75 55 Q86 50 89 41" stroke="#1CB0F6" stroke-width="7.5" fill="none" stroke-linecap="round"/></g>
      <path d="M50 27 C69 27 81 39 81 57 C81 75 68 84 50 84 C32 84 19 75 19 57 C19 39 31 27 50 27 Z"
        fill="url(#petBodyG)" stroke="#2B70C9" stroke-width="2.6"/>
      <ellipse cx="50" cy="68" rx="17" ry="12" fill="#EDF1F5" opacity=".92"/>
      <g class="eye">
        <ellipse cx="38.5" cy="53" rx="6.6" ry="7.6" fill="#22303F"/>
        <circle cx="40.8" cy="50.4" r="2.3" fill="#FFFFFF"/>
        <circle cx="36.8" cy="56" r="1" fill="#FFFFFF" opacity=".75"/>
      </g>
      <g class="eye">
        <ellipse cx="61.5" cy="53" rx="6.6" ry="7.6" fill="#22303F"/>
        <circle cx="63.8" cy="50.4" r="2.3" fill="#FFFFFF"/>
        <circle cx="59.8" cy="56" r="1" fill="#FFFFFF" opacity=".75"/>
      </g>
      <ellipse cx="29.5" cy="61" rx="4.4" ry="2.7" fill="#E5907E" opacity=".55"/>
      <ellipse cx="70.5" cy="61" rx="4.4" ry="2.7" fill="#E5907E" opacity=".55"/>
      <path class="mouth" d="M43.5 63.5 Q46.7 67 50 63.8 Q53.3 67 56.5 63.5" stroke="#22303F" stroke-width="2.3" fill="none" stroke-linecap="round"/>
    </g>
    <span class="pet-badge">!</span>
  </svg>`;
  const badge=pet.querySelector('.pet-badge');

  /* ---------- 纸条气泡（打字机，不挡操作） ---------- */
  const bubble=document.createElement('div');
  bubble.className='nn-bubble hidden';

  /* ---------- 对话面板 ---------- */
  const panel=document.createElement('div');
  panel.className='nn-pet-panel';
  panel.innerHTML=`
    <div class="ai-head">
      <span class="ai-name">🎓 突触 · AI 助教</span>
      <span class="chip small">AI 生成 · 教学辅助</span>
      <button class="btn sm ghost ai-close" style="margin-left:auto;padding:4px 10px;font-size:15px;line-height:1" title="收起（点面板外也可关闭）">✕</button>
    </div>
    <div class="ai-msgs"></div>
    <div class="ai-quick"></div>
    <div class="ai-input-row">
      <input class="ai-input" placeholder="问我这一步为什么错…" maxlength="120">
      <button class="btn sm primary ai-send">提问</button>
    </div>`;
  const msgs=panel.querySelector('.ai-msgs'),quickBox=panel.querySelector('.ai-quick');
  const input=panel.querySelector('.ai-input'),send=panel.querySelector('.ai-send');
  host.append(pet,bubble,panel);

  /* ---------- 状态与行为 ---------- */
  let moodTimer,twTimer,bubbleTimer,backTimer;

  function setMood(m,ms=1700){
    pet.classList.remove('pet-happy','pet-sad','pet-thinking');
    void pet.offsetWidth;
    pet.classList.add('pet-'+m);
    clearTimeout(moodTimer);
    moodTimer=setTimeout(()=>pet.classList.remove('pet-'+m),ms);
  }
  function talking(on){ pet.classList.toggle('pet-talking',on); }

  function say(text,{from='突触',sticky=false}={}){
    bubble.classList.remove('hidden');
    bubble.style.right='20px';bubble.style.bottom='108px';bubble.style.left='auto';bubble.style.top='auto';
    bubble.innerHTML=`<div class="bb-from">🎓 ${from}</div><span class="tw-body"></span>`;
    const body=bubble.querySelector('.tw-body');
    clearTimeout(twTimer);
    talking(true);
    let i=0;
    const step=()=>{
      if(i<=text.length){
        body.innerHTML=text.slice(0,i)+(i<text.length?'<span class="tw-cursor"></span>':'');
        i++;twTimer=setTimeout(step,18);
      }else talking(false);
    };
    step();
    if(!sticky){ clearTimeout(bubbleTimer);
      bubbleTimer=setTimeout(()=>bubble.classList.add('hidden'),7000+text.length*65); }
    pet.classList.remove('has-news');
  }

  function addMsg(text,who){
    const m=document.createElement('div');m.className=`ai-msg ai-msg-${who}`;
    const b=document.createElement('div');b.className=`ai-bubble${who==='user'?' user':''}`;
    b.textContent=text;m.appendChild(b);
    msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;return m;
  }
  function typing(){
    const m=document.createElement('div');m.className='ai-msg ai-msg-ai';
    m.innerHTML='<div class="ai-bubble typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(m);msgs.scrollTop=msgs.scrollHeight;return m;
  }
  async function ask(q){
    open();addMsg(q,'user');input.value='';
    setMood('thinking',2500);
    const t=typing();
    try{ const ans=await onAsk(q); t.remove(); addMsg(ans,'ai'); say(ans); }
    catch(e){ t.remove(); addMsg('（助教暂时离线，已给出本地提示）','ai'); }
  }

  function open(){ panel.classList.add('open'); }
  function close(){ panel.classList.remove('open'); }
  pet.addEventListener('click',()=>{ panel.classList.contains('open')?close():open(); });
  panel.querySelector('.ai-close').onclick=close;
  quick.forEach(q=>{const b=document.createElement('button');b.className='chip ai-qchip';b.textContent=q;
    b.onclick=()=>ask(q);quickBox.appendChild(b);});
  send.onclick=()=>{const v=input.value.trim();if(v)ask(v);};
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=input.value.trim();if(v)ask(v);}});

  /* ---------- 走位：答错时跳到出错元素旁 ---------- */
  function pointTo(el){
    if(!el||!el.getBoundingClientRect)return;
    const r=el.getBoundingClientRect();
    const vw=innerWidth,vh=innerHeight;
    let x=r.left-86,y=r.top-96;
    if(x<8)x=Math.min(r.right+10,vw-78);
    if(y<8)y=Math.min(r.bottom+10,vh-88);
    x=Math.max(8,Math.min(x,vw-78));y=Math.max(8,Math.min(y,vh-88));
    pet.classList.remove('dodge');
    pet.style.right='auto';pet.style.bottom='auto';
    pet.style.left=x+'px';pet.style.top=y+'px';
    bubble.style.right='auto';bubble.style.bottom='auto';
    bubble.style.left=Math.max(8,Math.min(x-30,vw-286))+'px';
    bubble.style.top=Math.max(8,y-104)+'px';
    clearTimeout(backTimer);
    backTimer=setTimeout(()=>{
      pet.style.left='auto';pet.style.top='auto';pet.style.right='18px';pet.style.bottom='16px';
      bubble.style.left='auto';bubble.style.top='auto';
      bubble.style.right='20px';bubble.style.bottom='108px';
    },6000);
  }

  /* ---------- 全局监听：情绪反应 / 闪避 / 点外关闭 ---------- */
  const onReact=e=>{
    const {kind,el}=e.detail||{};
    if(kind==='right'){ setMood('happy'); }
    else if(kind==='wrong'){ setMood('sad'); if(el)pointTo(el); pet.classList.add('has-news'); }
    else if(kind==='thinking'){ setMood('thinking'); }
  };
  const onDocDown=e=>{
    // 拖卡片时闪到左边，不挡托盘
    if(e.target.closest&&e.target.closest('.tcard')) pet.classList.add('dodge');
    // 点面板与宠物以外任意处 → 关闭面板
    if(panel.classList.contains('open')&&!panel.contains(e.target)&&!pet.contains(e.target)) close();
  };
  const onDocUp=()=>setTimeout(()=>pet.classList.remove('dodge'),1200);
  document.addEventListener('nn-react',onReact);
  document.addEventListener('pointerdown',onDocDown);
  document.addEventListener('pointerup',onDocUp);

  return {
    open,close,
    pushSystem:(t)=>{ say(t); },
    // 引导：宠物走到目标元素旁，气泡讲解
    guideTo(el,text){
      pointTo(el);
      if(text)say(text,{sticky:false});
    },
    destroy(){
      document.removeEventListener('nn-react',onReact);
      document.removeEventListener('pointerdown',onDocDown);
      document.removeEventListener('pointerup',onDocUp);
    }
  };
}
