// IndexedDB 封装：本地优先存档（进度/动作日志/AI缓存），失败时内存兜底
const DB_NAME='handcraft-nn', DB_VER=1;
const STORES={profile:'key',attempts:'auto',ai_cache:'keyPath'};
let dbp=null, mem={profile:new Map(),attempts:[],ai_cache:new Map()};

function open(){
  if(dbp) return dbp;
  dbp=new Promise((res)=>{
    if(!('indexedDB' in window)) return res(null);
    const req=indexedDB.open(DB_NAME,DB_VER);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('profile')){
        const s=db.createObjectStore('profile',{keyPath:'key'}); s.createIndex('by_level','levelId');
      }
      if(!db.objectStoreNames.contains('attempts')){
        const s=db.createObjectStore('attempts',{keyPath:'id',autoIncrement:true});
        s.createIndex('by_level','level_id'); s.createIndex('by_ts','ts');
      }
      if(!db.objectStoreNames.contains('ai_cache')) db.createObjectStore('ai_cache',{keyPath:'cacheKey'});
    };
    req.onsuccess=()=>res(req.result);
    req.onerror=()=>res(null);
  });
  return dbp;
}
function tx(store,mode,fn){
  return open().then(db=>{
    if(!db) return null;
    return new Promise((res,rej)=>{
      const t=db.transaction(store,mode), s=t.objectStore(store);
      let out;
      try{ out=fn(s); }catch(e){ rej(e); return; }
      t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);
      t.onerror=()=>rej(t.error);
    });
  });
}

export async function idbGet(store,key){
  const db=await open(); if(!db) return mem[store].get?mem[store].get(key):undefined;
  return tx(store,'readonly',s=>s.get(key));
}
export async function idbPut(store,val){
  const db=await open();
  if(!db){ if(mem[store].set) mem[store].set(val.cacheKey||val.key||val.id,val); return; }
  return tx(store,'readwrite',s=>s.put(val));
}
export async function idbAllByIndex(store,index,key){
  const db=await open(); if(!db) return [];
  return tx(store,'readonly',s=>s.index(index).getAll(key));
}

/* ---------- 匿名会话 ---------- */
export function ensureSid(){
  let sid=localStorage.getItem('nn_sid');
  if(!sid){ sid=(crypto.randomUUID?crypto.randomUUID():('s-'+Date.now()+'-'+Math.random().toString(36).slice(2))); localStorage.setItem('nn_sid',sid); }
  return sid;
}

/* ---------- 玩家档案 ---------- */
const DEFAULT_PROFILE={key:'main',unlocked:['l1'],stars:{},achievements:[],codex:[],settings:{sound:false,report:true,aiAuto:true}};
let _profile=null;
export async function loadProfile(){
  if(_profile) return _profile;
  const saved=await idbGet('profile','main');
  _profile=Object.assign(JSON.parse(JSON.stringify(DEFAULT_PROFILE)),saved||{});
  _profile.settings=Object.assign({},DEFAULT_PROFILE.settings,(_profile&&_profile.settings)||{});
  return _profile;
}
export async function saveProfile(){ if(_profile) await idbPut('profile',_profile); return _profile; }
export function profile(){ return _profile; }

export async function recordAttempt(levelId,result,actions){
  await idbPut('attempts',{level_id:levelId,ts:Date.now(),seed:result.seed,
    stars:result.stars,score:result.score,duration_s:result.durationS,hint_used:result.hintUsed?1:0,actions});
}
export async function attemptsOf(levelId){ return idbAllByIndex('attempts','by_level',levelId); }
