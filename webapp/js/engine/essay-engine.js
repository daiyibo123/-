// 论述题引擎：自由文本 + AI 判卷（调大模型 API，离线降级到关键词匹配）
// 设计文档：docs/案例重构_v4_深度思考版.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

export class EssayEngine extends LevelBase {
  constructor(root, ctx) { super(root, ctx); }

  /* item: {q, rubric: [关键点], minLength, hint} */
  startEssay(item) {
    this.item = item;
    const stage = document.getElementById('stage') || this.root;
    stage.innerHTML = `
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div style="max-width:760px;margin:0 auto;padding:8px 4px 40px">
        <div class="panel" style="padding:22px">
          <h4 style="color:#1CB0F6;font-size:15px">✍️ 论述题</h4>
          <p style="font-size:16.5px;font-weight:700;line-height:1.8;color:#16324A;margin:10px 0">${item.q}</p>
          <textarea id="essayInput" style="
            width:100%;min-height:200px;border:2px solid #E5E5E5;border-radius:12px;padding:14px;
            font-size:14.5px;line-height:1.8;font-family:inherit;resize:vertical;background:#FAFAFA"
            placeholder="在这里写下你的完整分析和思考…&#10;&#10;要求：逻辑清晰，论据充分，用你自己的语言（不是背诵教材）"></textarea>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <span class="dim2 small" id="wordCount">已写 0 字</span>
            <button class="btn primary" id="submitEssay" style="margin-left:auto;padding:10px 28px">
              提交 · AI 批改 🤖
            </button>
          </div>
        </div>
        <div id="gradeResult" style="margin-top:14px"></div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi = mountHUD(document.getElementById('hudhost'), {
      title: '论述题',
      steps: '不限时',
      canUndo: false, onUndo: null,
      onRestart: () => this.startEssay(item),
      onHelp: () => infoModal('答题指南',
        `<p>${item.hint || '不限时，鼓励深度思考。AI 助教将根据以下要点批改你的回答：'}</p>
         <ul style="margin:10px 0 0 18px;line-height:2">${item.rubric.map(r => `<li>${r}</li>`).join('')}</ul>`),
      onHome: () => location.hash = '#/map'
    });
    this.drawer = mountDrawer(document.getElementById('aihost'), {
      onAsk: q => this.ctx.tutor.ask(q, { levelId: this.constructor.id }),
      quick: ['这道题的思考框架是什么？', '给我一个切入角度']
    });

    const ta = document.getElementById('essayInput');
    const wc = document.getElementById('wordCount');
    ta.addEventListener('input', () => {
      wc.textContent = `已写 ${ta.value.trim().length} 字`;
      document.getElementById('submitEssay').disabled = ta.value.trim().length < (item.minLength || 50);
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); }
    });

    document.getElementById('submitEssay').onclick = () => this.grade(ta.value.trim());
  }

  async grade(text) {
    if (text.length < (this.item.minLength || 50)) {
      toast(`至少写 ${(this.item.minLength || 50)} 字才能提交`, 'warn');
      return;
    }
    const btn = document.getElementById('submitEssay');
    btn.disabled = true;
    btn.textContent = 'AI 批改中… 🤔';
    const result = document.getElementById('gradeResult');
    result.innerHTML = `<div style="text-align:center;padding:20px;color:#8FA5BC">
      <div style="font-size:32px">🤖</div>
      <p>AI 助教正在阅读你的回答…</p></div>`;

    this.record({ type: 'essay_submit', correct: null, value: text.length, qHash: this.item.q.slice(0, 30) });

    // 尝试调 API
    const grade = await this.callLLM(text);

    result.innerHTML = '';
    if (grade && grade.score != null) {
      this.displayGrade(result, grade);
      this.record({ type: 'essay_grade', correct: grade.score >= 60, value: grade.score });
    } else {
      // 离线降级：关键词匹配
      const offline = this.offlineGrade(text);
      this.displayGrade(result, offline);
      result.insertAdjacentHTML('afterbegin',
        `<div class="dim2 small" style="text-align:center;padding:6px">⚠ AI 服务不可用，以下为离线关键词匹配结果</div>`);
      this.record({ type: 'essay_grade_offline', correct: null, value: offline.score });
    }
  }

  async callLLM(text) {
    try {
      const resp = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: this.buildGradingPrompt(text),
          levelId: this.constructor.id,
          mode: 'grade'
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      // 期望 LLM 返回 JSON {score, feedback, strengths[], improvements[]}
      const match = data.answer.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return null;
    } catch (_) { return null; }
  }

  buildGradingPrompt(text) {
    const rubric = this.item.rubric.map((r, i) => `${i + 1}. ${r}`).join('\n');
    return `你是一位深度学习课程的教学助手。请根据以下评分标准批改学生的论述题答案。

题目：${this.item.q}

评分标准（每点满分同等权重）：
${rubric}

学生答案：
${text}

请以 JSON 格式输出（不要有其他文字）：
{"score": 0-100的整数, "feedback": "总体评价一句话", "strengths": ["做对的要点1", ...], "improvements": ["遗漏或需要改进的要点1", ...]}`;
  }

  offlineGrade(text) {
    const lower = text.toLowerCase();
    let hits = 0;
    this.item.rubric.forEach(r => {
      const kws = r.split(/[，。；、（）/]/).filter(w => w.length >= 2);
      const matched = kws.some(kw => lower.includes(kw.toLowerCase()) || lower.includes(kw.slice(0, 2).toLowerCase()));
      if (matched) hits++;
    });
    const score = Math.round(hits / this.item.rubric.length * 100);
    return {
      score,
      feedback: score >= 80 ? '要点覆盖较好' : score >= 50 ? '部分要点已覆盖，但有遗漏' : '多个关键要点未涉及',
      strengths: this.item.rubric.filter((_, i) => i < hits).map(r => r.slice(0, 20)),
      improvements: this.item.rubric.filter((_, i) => i >= hits).map(r => r.slice(0, 20))
    };
  }

  displayGrade(container, g) {
    const color = g.score >= 80 ? '#58CC02' : g.score >= 50 ? '#FF9600' : '#FF4B4B';
    const stars = g.score >= 80 ? '★★★' : g.score >= 50 ? '★★☆' : '★☆☆';
    container.innerHTML = `
    <div class="panel" style="padding:20px;border:2px solid ${color};border-radius:16px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:48px;font-weight:900;color:${color}">${g.score}</div>
        <div>
          <div style="font-size:18px;color:${color}">${stars}</div>
          <p style="font-size:13.5px;color:#4B4B4B;margin-top:4px">${g.feedback || ''}</p>
        </div>
      </div>
      ${g.strengths && g.strengths.length ? `
      <div style="margin-top:14px">
        <b style="color:#58CC02;font-size:13px">✓ 做得好的</b>
        <ul style="margin:6px 0 0 18px;font-size:13px;line-height:1.8">${g.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>` : ''}
      ${g.improvements && g.improvements.length ? `
      <div style="margin-top:10px">
        <b style="color:#FF9600;font-size:13px">⚠ 可以改进的</b>
        <ul style="margin:6px 0 0 18px;font-size:13px;line-height:1.8">${g.improvements.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>` : ''}
      <button class="btn primary" id="essayDone" style="margin-top:16px">完成本题 ✓</button>
    </div>`;
    document.getElementById('essayDone').onclick = () => {
      this.finish({ essayScore: g.score });
    };
  }
}
