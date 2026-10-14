// 单元个人报告：大纲对照 + 误区榜 + 行为分析 + 建议（规则引擎，可追溯）
import { profile, attemptsOf } from '../store/idb.js';
import { LEVELS } from '../data/levels.js';
import { UNITS } from '../data/units.js';
import { KNOW } from '../data/knowledge.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export async function renderUnitReport(app, uid) {
  const u = UNITS.find(x => x.id === uid);
  if (!u) { location.hash = '#/map'; return; }
  const p = profile();
  const up = p.units || {};
  const st = up[uid] || { lesson: false, agent: [], quiz: null };

  // ---- 证据采集（全部可追溯：星级档 / 测评档 / 知识路档 / 行为档）----
  const caseStats = [];
  for (const id of u.cases) {
    const atts = await attemptsOf(id).catch(() => []);
    const stars = p.stars[id] || 0;
    const last = atts[atts.length - 1];
    caseStats.push({
      id, title: (LEVELS[id] && LEVELS[id].title) || id, stars,
      tries: atts.length, dur: last ? last.duration_s : null, hint: last ? !!last.hint_used : false
    });
  }
  const avgStars = caseStats.reduce((s, c) => s + c.stars, 0) / (u.cases.length || 1);
  const quizPct = st.quiz ? st.quiz.score / st.quiz.total : null;
  const agentPct = st.agent.length / (u.agentNodes.length || 1);
  const totalTries = caseStats.reduce((s, c) => s + c.tries, 0);
  const durs = caseStats.filter(c => c.dur).map(c => c.dur);
  const avgDur = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null;
  const hintDep = caseStats.filter(c => c.hint).length;

  // 误区榜：测评 mCounts 为主，最近两次尝试记录里的错误 mId 汇总为辅
  const mRank = {};
  const addM = (m, n) => { if (m) mRank[m] = (mRank[m] || 0) + n; };
  if (st.quiz) for (const [m, n] of Object.entries(st.quiz.mCounts)) addM(m, n);
  for (const c of caseStats) {
    const atts = await attemptsOf(c.id).catch(() => []);
    for (const a of atts.slice(-2)) {
      for (const act of (a.actions || [])) {
        if (act.mId && act.correct === false) addM(act.mId, 0.5);
      }
    }
  }
  const topM = Object.entries(mRank).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // ---- 大纲对照（聚合口径：案例 40% / 测评 40% / 知识路 20%）----
  const parts = [];
  const weights = [];
  parts.push(avgStars / 3); weights.push(0.4);
  if (quizPct != null) { parts.push(quizPct); weights.push(0.4); }
  parts.push(agentPct); weights.push(0.2);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const overall = parts.reduce((a, v, i) => a + v * weights[i], 0) / wsum;   // 加权平均，≤1
  const grade = v => v >= .8 ? '✓' : (v >= .5 ? '△' : '✗');
  const gCls = v => v >= .8 ? 'ok' : (v >= .5 ? 'warn' : 'err');
  const quizLabel = st.quiz ? (st.quiz.score + '/' + st.quiz.total) : '未测';

  // ---- 建议（规则模板，3 条）----
  const sug = [];
  if (!st.lesson) sug.push('还没看本章精讲——先花 2 分钟翻一遍重点卡，案例里会少踩一半坑。');
  const weak = caseStats.filter(c => c.stars > 0 && c.stars < 2).map(c => c.title);
  if (weak.length) sug.push('「' + weak.join('」「') + '」星级偏低——重玩一次，重点看错题讲解（错在哪一步、对应哪个误区）。');
  if (quizPct != null && quizPct < 0.8) sug.push('测评首答正确率不足 80%——把错题对应的精讲卡再翻一遍，然后带着疑问去问 AI 助教（或课堂上问老师）。');
  if (agentPct < 1) sug.push('知识路还有 ' + (u.agentNodes.length - st.agent.length) + ' 盏灯没亮——让智能体再问你几个"为什么"，点亮它们。');
  if (topM.length) {
    const d = KNOW.misconceptions[topM[0][0]];
    if (d) sug.push('你最突出的误区是「' + d.text + '」——建议复习对应精讲卡，并在下次案例中主动避免。');
  }
  if (!sug.length) sug.push('本章各环节都达标了——保持节奏进入下一章；有余力可以读知识图鉴里的延伸卡。');
  while (sug.length < 3) sug.push('带着一个自己的疑问去问 AI 助教（或老师）——能提出好问题，说明真的懂了。');

  // ---- 渲染（分层拼接，避免深层模板嵌套）----
  const rowsOutcome = u.outcomes.map(o => {
    return '<tr><td>' + esc(o) + '</td><td class="' + gCls(overall) + '"><b>' + grade(overall) + '</b></td></tr>';
  }).join('');
  const rowsCase = caseStats.map(c => {
    const stars = '★'.repeat(c.stars) + '☆'.repeat(3 - c.stars);
    return '<tr><td>' + esc(c.title) + '</td><td>' + stars + '</td><td>' + (c.tries || '–') +
      '</td><td>' + (c.dur ? c.dur + 's' : '–') + '</td><td>' + (c.hint ? '用过' : '–') + '</td></tr>';
  }).join('');
  const misBlock = topM.length
    ? '<table class="rtable"><tr><th>误区</th><th>频次</th><th>章节</th></tr>' +
      topM.map(([m, n]) => {
        const d = KNOW.misconceptions[m];
        return '<tr><td>' + esc(d ? d.text : m) + '</td><td>×' + n + '</td><td class="dim2">' + (d ? d.chapter : '') + '</td></tr>';
      }).join('') + '</table>'
    : '<p class="dim2 small">暂无误区记录——要么很稳，要么练得还不够多。</p>';
  const sugList = sug.slice(0, 3).map(s => '<li>' + esc(s) + '</li>').join('');

  app.innerHTML = `
  <div class="fade-in" style="max-width:760px;margin:0 auto;padding:8px 4px 40px">
    <div class="topbar">
      <a class="btn sm ghost" href="#/map">← 路径</a>
      <h1 class="grad-text" style="font-size:20px">📄 第 ${u.no} 章个人分析报告</h1>
    </div>
    <div class="panel" style="padding:16px">
      <h4>① 大纲基本要求对照</h4>
      <table class="rtable"><tr><th>大纲要求（原文）</th><th>状态</th></tr>${rowsOutcome}</table>
      <p class="dim2 small" style="margin-top:8px">口径：案例平均星级 ${avgStars.toFixed(1)}（40%）· 测评首答 ${quizLabel}（40%）· 知识路 ${st.agent.length}/${u.agentNodes.length}（20%）→ 综合 ${Math.round(overall * 100)} 分。</p>
    </div>
    <div class="panel" style="padding:16px;margin-top:12px">
      <h4>② 案例明细</h4>
      <table class="rtable"><tr><th>案例</th><th>星级</th><th>次数</th><th>最近用时</th><th>提示</th></tr>${rowsCase}</table>
    </div>
    <div class="panel" style="padding:16px;margin-top:12px">
      <h4>③ 误区暴露榜</h4>
      ${misBlock}
      ${hintDep ? `<p class="dim2 small" style="margin-top:6px">提示依赖：${hintDep} 个案例用过提示。</p>` : ''}
      ${avgDur ? `<p class="dim2 small">平均单次用时 ${avgDur}s · 累计 ${totalTries} 次尝试。</p>` : ''}
    </div>
    <div class="panel" style="padding:16px;margin-top:12px">
      <h4>④ 给你的建议</h4>
      <ol style="margin:8px 0 0 18px;line-height:2">${sugList}</ol>
    </div>
    <div style="text-align:center;margin-top:14px">
      <a class="btn ghost" href="#/agent/${uid}">🧠 再点亮几盏灯</a>
      <a class="btn primary" href="#/map">返回课程路径 →</a>
    </div>
  </div>`;
}
