// AI 助教客户端：三级降级链 /api/tutor → IndexedDB 缓存 → hints 预写阶梯
import { HINTS } from '../data/hints.js';
import { idbGet, idbPut, ensureSid } from '../store/idb.js';
import { KNOW } from '../data/knowledge.js';

const escCount={};   // mId -> 追问次数（提示阶梯升级依据）
let cooldownUntil=0;

export const tutor={
  settings:{aiAuto:true},

  maybeTrigger(mId,level){
    if(!this.settings.aiAuto)return;
    if(Date.now()<cooldownUntil)return;
    cooldownUntil=Date.now()+20000;
    const mis=KNOW.misconceptions[mId];
    if(mis&&level&&level.onTutorHint)level.onTutorHint(mId,mis);
    this.ask('我这一步为什么错了？',{levelId:level.constructor.id,mId}).then(a=>{
      if(level&&level.showTutorMessage)level.showTutorMessage(a);
    }).catch(()=>{});
  },

  async ask(question,{levelId,mId,action}={}){
    // 1) 在线代理
    try{
      const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9000);
      const res=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sid:ensureSid(),levelId,mId,question,escalation:(escCount[mId||'x']=(escCount[mId||'x']||0)+1),action}),
        signal:ctrl.signal});
      clearTimeout(timer);
      if(res.ok){const j=await res.json();
        if(j&&j.answer){await idbPut('ai_cache',{cacheKey:`${levelId||''}:${mId||''}`,answer:j.answer});return j.answer;}}
      throw new Error('bad');
    }catch(_){/* 降级 */}
    // 2) 本地缓存
    const c=await idbGet('ai_cache',`${levelId||''}:${mId||''}`);
    if(c&&c.answer)return c.answer;
    // 3) 预写提示阶梯（按追问次数升级）
    const mis=KNOW.misconceptions[mId];
    const key=(mis&&mis.hint)||((levelId&&KNOW.levels&&KNOW.levels[levelId]&&KNOW.levels[levelId].hints&&KNOW.levels[levelId].hints[0]));
    const h=key&&HINTS[key];
    if(h){const lv=Math.min(escCount[mId||'x']||1,h.escalate.length)-1;return h.escalate[lv];}
    if(mis)return `先停一下：这一步常见的问题是「${mis.text}」。回想一下课件${mis.chapter||''}这部分的推导顺序，再试一次。`;
    return '别急，把这一步对应的公式行写在纸上，对照你刚才的操作顺序检查一遍——顺序错了吗？还是用错了量？';
  }
};
