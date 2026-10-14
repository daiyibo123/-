// 《手搓神经网络》服务端：静态托管 + AI 助教代理 + 匿名学情统计 + 教师看板
// 运行： npm i && npm start        建库： node index.js --init-db
// AI 配置（.env 或环境变量）：
//   TUTOR_API_BASE（默认智谱 bigmodel OpenAI 兼容端点）
//   TUTOR_API_KEY  TUTOR_MODEL（默认 glm-4-flash）
const http=require('http');
const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');

const ROOT=path.join(__dirname,'..','webapp');
const DATA_DIR=process.env.DATA_DIR||__dirname;
fs.mkdirSync(DATA_DIR,{recursive:true});
const DB_PATH=process.env.DB_PATH||path.join(DATA_DIR,'db.sqlite');
const PORT=process.env.PORT||8800;
const API_BASE=process.env.TUTOR_API_BASE||'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY=process.env.TUTOR_API_KEY||'';
const MODEL=process.env.TUTOR_MODEL||'glm-4-flash';

/* ---------- DB ---------- */
const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
const db=new Database(DB_PATH);
db.exec(schema);
if(process.argv.includes('--init-db')){console.log('✓ 数据库已初始化:',DB_PATH);process.exit(0);}

/* ---------- 苏格拉底助教 prompt ---------- */
const SYSTEM=`你是深度学习闯关游戏《手搓神经网络》的 AI 助教"突触"，面向刚学深度学习的本科生。
规则：1) 苏格拉底式，绝不直接给出数值答案或告诉学生该选哪张卡；2) 每次只给一个提示或反问一个问题，≤120字；3) 提示按三级阶梯升级（指出矛盾→提示方向→给出类比），学生重复犯错才升级；4) 全程中文。`;

/* ---------- 工具 ---------- */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
  '.png':'image/png','.ico':'image/x-icon'};
const send=(res,code,body,type='application/json; charset=utf-8')=>{
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});
  res.end(typeof body==='string'?body:JSON.stringify(body));
};
const readBody=req=>new Promise(r=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>{try{r(JSON.parse(d||'{}'))}catch{r({})}});});
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- AI 助教 ---------- */
const rateMap=new Map(); // sid -> {n, day}
function rateOK(sid){
  const day=new Date().toISOString().slice(0,10);
  const r=rateMap.get(sid);
  if(!r||r.day!==day){rateMap.set(sid,{n:1,day});return true;}
  if(r.n>=30)return false;
  r.n++;return true;
}
async function tutorAnswer({sid,levelId,mId,question,escalation=1},misText,chapter){
  if(!API_KEY)throw new Error('no-key');
  if(!rateOK(sid))throw new Error('rate-limited');
  const user=misText
    ?`关卡:${levelId} 学生刚做错一步，常见误区:${misText}（课件${chapter||''}）。学生问：${question||'我为什么错了？'}（第${escalation}次追问）`
    :`关卡:${levelId} 学生问：${question}`;
  const res=await fetch(API_BASE,{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${API_KEY}`},
    body:JSON.stringify({model:MODEL,messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],
      temperature:0.7,max_tokens:220})});
  if(!res.ok)throw new Error('api '+res.status);
  const j=await res.json();
  return (j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||'';
}

/* ---------- 教师看板（服务端渲染，无前端依赖） ---------- */
function dashboard(){
  const mis=db.prepare(`SELECT m_id, COUNT(*) n FROM events WHERE correct=0 AND m_id IS NOT NULL
    GROUP BY m_id ORDER BY n DESC LIMIT 12`).all();
  const lvl=db.prepare(`SELECT level_id, COUNT(*) plays, AVG(stars) stars, AVG(score) score
    FROM level_results GROUP BY level_id ORDER BY level_id`).all();
  const sids=db.prepare(`SELECT COUNT(DISTINCT sid) n FROM level_results`).get();
  return `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>班级看板 · 手搓神经网络</title>
  <style>body{font-family:system-ui,'Microsoft YaHei';background:#0B1220;color:#E5EDF8;margin:0;padding:32px}
  h1{color:#22D3EE}h2{color:#8FA3BF;font-size:15px;margin-top:28px}
  table{border-collapse:collapse;margin-top:10px;width:100%;max-width:900px}
  td,th{border:1px solid #22304A;padding:8px 14px;font-size:14px;text-align:left}
  th{color:#8FA3BF;font-weight:600}td:first-child{font-family:monospace;color:#22D3EE}
  .n{color:#F471B5;font-weight:700}</style></head><body>
  <h1>📊 班级匿名学情看板</h1>
  <p class="dim">聚合匿名数据 · 不可回溯个人 · 数据来自学生游玩动作</p>
  <h2>全班易错误区排行（教学重点依据）</h2>
  ${mis.length?`<table><tr><th>误区 id</th><th>次数</th></tr>${mis.map(m=>`<tr><td>${esc(m.m_id)}</td><td class="n">${m.n}</td></tr>`).join('')}</table>`:'<p>暂无数据</p>'}
  <h2>各关通过情况（${sids.n} 个会话）</h2>
  ${lvl.length?`<table><tr><th>关卡</th><th>游玩次数</th><th>平均星级</th><th>平均分</th></tr>${lvl.map(l=>`<tr><td>${esc(l.level_id)}</td><td>${l.plays}</td><td>${(l.stars||0).toFixed(1)}</td><td>${(l.score||0).toFixed(0)}</td></tr>`).join('')}</table>`:'<p>暂无数据</p>'}
  </body></html>`;
}

/* ---------- HTTP ---------- */
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x');
  try{
    if(u.pathname==='/api/tutor'&&req.method==='POST'){
      const b=await readBody(req);
      // 误区上下文（与前端 knowledge.js 保持同步的最小副本）
      const MIS={'M-LC-01':'认为决策边界必须过原点','M-LC-02':'认为单层感知机能分开任何数据',
        'M-GD-01':'学习率越小越安全','M-GD-02':'局部极小恐惧症','M-GD-03':'不理解动量惯性',
        'M-GD-05':'以为全批最准所以最快','M-GD-06':'以为批越小越好',
        'M-BP-01':'把损失值当梯度','M-BP-02':'链式法则断链','M-BP-03':'把激活值当导数','M-BP-04':'梯度方向弄反',
        'M-CV-01':'步长/遍历错误','M-CV-02':'输出尺寸错位','M-CV-06':'核方向与响应方向混淆','M-CV-07':'忽略核符号意义','M-OF-01':'欠拟合误开正则化','M-OF-02':'验证抖动误判为过拟合',
        'M-OF-03':'混淆欠拟合/过拟合曲线签名','M-OF-04':'混淆抖动与容量问题签名','M-TR-01':'以为测试集也画曲线','M-TR-02':'验证集当测试集用',
        'M-SZ-01':'输出尺寸公式漏+1','M-SZ-02':'填充只加一边','M-SZ-03':'取整方向错','M-SZ-04':'堆叠漏算一层',
        'M-PR-01':'参数量漏偏置','M-PR-02':'参数量漏乘通道','M-PR-03':'参数量漏乘核数',
        'M-AT-01':'把注意力当词义相似度','M-AT-02':'忽略 softmax 归一化','M-AT-06':'温度方向弄反','M-AT-09':'以为多头分布相同','M-AT-07':'位置编码必要性不清','M-AT-08':'Transformer并行性误解','M-SQ-01':'RNN参数随步数增长','M-SQ-02':'梯度连乘误解','M-SQ-03':'LSTM门控结构误解','M-SQ-04':'Teacher Forcing误解','M-SQ-05':'困惑度误解','M-GE-01':'AE/VAE区别不清','M-GE-02':'重参数化误解','M-GE-03':'GAN动力学误解','M-GE-04':'扩散过程误解','M-GE-05':'范式选型错'};
      try{
        const answer=await tutorAnswer(b,MIS[b.mId],null);
        db.prepare('INSERT INTO ai_logs(sid,level_id,m_id,question,answer,model,fallback) VALUES(?,?,?,?,?,?,0)')
          .run(b.sid||'',b.levelId||'',b.mId||'',b.question||'',answer,MODEL);
        send(res,200,{answer,model:MODEL});
      }catch(e){
        db.prepare('INSERT INTO ai_logs(sid,level_id,m_id,question,answer,model,fallback) VALUES(?,?,?,?,?,?,1)')
          .run(b.sid||'',b.levelId||'',b.mId||'',b.question||'',e.message,'none');
        send(res,503,{error:e.message});   // 前端将降级到本地提示
      }
      return;
    }
    if(u.pathname==='/api/events'&&req.method==='POST'){
      const b=await readBody(req);
      if(!b.sid){send(res,400,{error:'no sid'});return;}
      db.prepare('INSERT OR IGNORE INTO sessions(sid,ua) VALUES(?,?)').run(b.sid,req.headers['user-agent']||'');
      const ins=db.prepare(`INSERT INTO events(sid,level_id,seq,t_ms,type,payload,correct,m_id)
        VALUES(?,?,?,?,?,?,?,?)`);
      const tx=db.transaction((evs)=>{for(const e of evs)ins.run(b.sid,e.level_id,e.seq,e.t_ms,e.type,e.payload,e.correct,e.m_id);});
      if(Array.isArray(b.events)&&b.events.length<=2000)tx(b.events);
      if(b.result)db.prepare(`INSERT INTO level_results(sid,level_id,stars,score,duration_s,hint_used)
        VALUES(?,?,?,?,?,?)`).run(b.sid,b.result.levelId,b.result.stars,b.result.score,b.result.durationS,b.result.hintUsed?1:0);
      send(res,200,{ok:true});
      return;
    }
    if(u.pathname==='/api/stats'&&req.method==='GET'){
      send(res,200,{
        misconceptions:db.prepare(`SELECT m_id,COUNT(*) n FROM events WHERE correct=0 AND m_id IS NOT NULL GROUP BY m_id ORDER BY n DESC`).all(),
        levels:db.prepare(`SELECT level_id,COUNT(*) plays,AVG(stars) stars FROM level_results GROUP BY level_id`).all()});
      return;
    }
    if(u.pathname==='/dashboard'){send(res,200,dashboard(),'text/html; charset=utf-8');return;}
    if(u.pathname==='/api/health'){send(res,200,{ok:true,model:MODEL,ai:!!API_KEY});return;}
    // 静态
    let p=decodeURIComponent(u.pathname);
    if(p==='/')p='/index.html';
    const file=path.normalize(path.join(ROOT,p));
    if(!file.startsWith(ROOT)){send(res,403,{error:'forbidden'});return;}
    const data=fs.readFileSync(file);
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  }catch{
    send(res,404,{error:'not found'});
  }
}).listen(PORT,()=>console.log(`服务已启动: http://127.0.0.1:${PORT}  （看板: /dashboard, AI: ${API_KEY?'已配置':'未配置→前端降级'}）`));
