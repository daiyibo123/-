// L3-A 尺寸车间：CNN 输出尺寸与参数量计算（预测→可视化验证→错误归因）
// 设计文档：docs/案例设计/3A-尺寸车间-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { makeStepper } from '../ui/controls.js';
import { rngOf } from '../engine/rng.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

const W0 = 7, CELL = 34;            // 第一幕演示网格
const outSize = (w, f, s, p) => Math.floor((w + 2 * p - f) / s) + 1;
const convParams = (k, f, c) => k * (f * f * c + 1);

/* ---------- 出题器：五种题型，各带误区干扰值 ---------- */
const QTYPES = ['same', 'nopad', 'floor', 'params', 'stack'];
function genQuestion(type, seed) {
  const r = rngOf(seed);
  const pick = a => a[Math.floor(r.next() * a.length)];
  const q = { type, fields: {}, answers: {}, distractors: {} };
  if (type === 'same') {
    const W = pick([5, 7, 9]), F = pick([3, 5]), P = (F - 1) / 2, S = 1;
    Object.assign(q, {
      config: { W, F, S, P, C: 1, K: 1 },
      prompt: `输入 ${W}×${W} 图像，卷积核 ${F}×${F}，步长 ${S}，零填充 ${P}（课件原题类型：保持尺寸）`,
    });
    q.fields = { size: '输出尺寸' };
    q.answers = { size: outSize(W, F, S, P) };
    q.distractors = { size: { [q.answers.size - 1]: 'M-SZ-01', [q.answers.size + 1]: 'M-SZ-03' } };
  } else if (type === 'nopad') {
    const W = pick([26, 28, 32]), F = pick([3, 5]), S = 1, P = 0;
    Object.assign(q, {
      config: { W, F, S, P, C: 1, K: 1 },
      prompt: `输入 ${W}×${W} 图像（MNIST 风格），卷积核 ${F}×${F}，步长 ${S}，不填充`,
    });
    q.fields = { size: '输出尺寸' };
    q.answers = { size: outSize(W, F, S, P) };
    q.distractors = { size: { [W - F]: 'M-SZ-01', [W - F + 2]: 'M-SZ-03' } };
  } else if (type === 'floor') {
    const W = pick([8, 9, 10]), F = 3, S = 2, P = 0;
    Object.assign(q, {
      config: { W, F, S, P, C: 1, K: 1 },
      prompt: `输入宽度 ${W}，卷积核 ${F}×${F}，步长 ${S}，不填充（注意：除不尽）`,
    });
    q.fields = { size: '输出尺寸' };
    q.answers = { size: outSize(W, F, S, P) };
    q.distractors = { size: { [Math.ceil((W + 2 * P - F) / S) + 1]: 'M-SZ-03', [outSize(W, F, S, P) - 1]: 'M-SZ-01' } };
  } else if (type === 'params') {
    const style = r.next() < 0.5;
    const W = pick([24, 28]), F = style ? 5 : 3, C = style ? 1 : 3, K = style ? pick([6, 12]) : pick([16, 32]);
    const S = 1, P = 0;
    Object.assign(q, {
      config: { W, F, S, P, C, K },
      prompt: `${style ? `LeNet 风格第一层：输入 ${W}×${W}×1，${K} 个 ${F}×${F} 卷积核` : `VGG 风格：输入 ${W}×${W}×${C}（${C} 通道），${K} 个 ${F}×${F} 卷积核`}，步长 ${S}，不填充`,
    });
    q.fields = { size: '输出尺寸（宽）', params: '参数量' };
    q.answers = { size: outSize(W, F, S, P), params: convParams(K, F, C) };
    q.distractors = {
      size: { [W - F]: 'M-SZ-01' },
      params: { [K * F * F * C]: 'M-PR-01', [F * F * C + 1]: 'M-PR-03', ...(C > 1 ? { [K * (F * F + 1)]: 'M-PR-02' } : {}) },
    };
  } else { // stack
    const W = pick([28, 32]), F = 5, S = 1, P = 0, PF = 2, PS = 2;
    const mid = outSize(W, F, S, P), fin = outSize(mid, PF, PS, 0);
    Object.assign(q, {
      config: { W, F, S, P, PF, PS, mid },
      prompt: `输入 ${W}×${W}：先卷积 ${F}×${F}、步长 ${S}、不填充；再最大池化 ${PF}×${PF}、步长 ${PS}。最终输出尺寸？`,
    });
    q.fields = { size: '最终输出尺寸' };
    q.answers = { size: fin };
    q.distractors = { size: { [mid]: 'M-SZ-04', [mid - 1]: 'M-SZ-01', [fin + 1]: 'M-SZ-03' } };
  }
  return q;
}

export default class L3AShape extends LevelBase {
  static id = 'l3a'; static title = '尺寸车间';
  qi = 0; streak = 0; asked = 0;

  mount() {
    const cfg = this.cfg = LEVELS.l3a;
    this.qi = 0; this.streak = 0; this.asked = 0;

    this.root.innerHTML = `
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="target-card" style="margin-bottom:10px"><h4>当前任务</h4><p id="goalTxt"></p></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:400px;padding:14px"></div>
        <div class="side">
          <div class="target-card" id="qCard"><h4>题目</h4><p id="qPrompt" class="dim2 small">先在左侧把公式玩明白</p></div>
          <div class="tool-panel" id="answerPanel"><h4>作答</h4>
            <div id="answerBody" class="dim2 small">进入闯关后在此作答</div>
          </div>
          <div class="tool-panel"><h4>公式卡</h4>
            <div class="readout" style="line-height:1.9">输出尺寸 O = ⌊(W−F+2P)/S⌋+1<br>卷积参数量 = K×(F·F·C+1)</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi = mountHUD(document.getElementById('hudhost'), {
      title: '尺寸车间', steps: '看懂公式',
      canUndo: false, onUndo: null, onRestart: () => this.restart(),
      onHelp: () => this.explain(), onHome: () => location.hash = '#/map'
    });
    this.drawer = mountDrawer(document.getElementById('aihost'), {
      onAsk: q => this.ctx.tutor.ask(q, { levelId: 'l3a' }),
      quick: ['输出尺寸公式每项是什么意思？', '参数量怎么算？', '什么时候需要取整？']
    });

    this.buildDemo();
    setTimeout(() => this.explain(), 400);
    setTimeout(() => this.drawer.pushSystem('先把左侧的拨轮玩两分钟：看核变大、步长跳格、填充补边各发生什么，再开始闯关。'), 1200);
  }

  explain() {
    infoModal('尺寸车间 · 讲解',
      `<p style="line-height:1.9">卷积层的两个必考计算：
      <br><b>输出尺寸</b>：O = ⌊(W−F+2P)/S⌋+1 —— 核 F 吃掉边长、填充 P 每边各补、步长 S 跳格、<b>+1 是窗口起点的这一个</b>、除不尽向下取整。
      <br><b>参数量</b>：K 个核 × (F·F·C 权重 + 1 个偏置) —— 别漏输入通道 C 和每个核自己的偏置。
      </p>
      <p class="dim2 small" style="margin-top:8px">玩法：第一幕拖拨轮看公式怎么来（可跳过）；第二幕连对 5 题通关。每题答完都有滑窗动画/参数卡片验证——答错会指出你漏了哪一项。</p>`);
  }

  /* ================= 第一幕：看懂公式 ================= */
  buildDemo() {
    this.phase = 'demo';
    this.demo = { F: 3, S: 1, P: 1 };
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    const wrap = this.el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center' }, stage);
    this.demoSvg = this.svg('svg', { viewBox: '0 0 430 330', width: '100%', style: 'max-width:430px' }, wrap);
    this.demoCtl = this.el('div', { style: 'display:flex;gap:18px;flex-wrap:wrap;justify-content:center' }, wrap);
    this.demoFormula = this.el('div', { class: 'readout', style: 'font-size:15px' }, wrap);
    const btns = this.el('div', { style: 'display:flex;gap:10px' }, wrap);
    this.el('button', { class: 'btn', html: '▶ 滑一遍', onclick: () => this.slideDemo() }, btns);
    this.el('button', { class: 'btn primary', html: '开始闯关 ⚡', onclick: () => this.startQuiz() }, btns);

    const mk = (label, key, values, idx) => makeStepper(this.demoCtl, {
      value: values[idx], min: values[0], max: values[values.length - 1],
      onChange: v => { if (values.includes(v)) { this.demo[key] = v; this.renderDemo(); } }
    });
    // 用拨轮离散值：F/S/P 用三组 makeStepper（min/max 取值域，中间任意值也允许但会吸附最近合法值）
    this.demoCtl.innerHTML = `<div class="ctl-label" style="width:100%;text-align:center">核 F ｜ 步长 S ｜ 填充 P（拨到非法值会吸附）</div>`;
    this.demoSteppers = {
      F: makeStepper(this.demoCtl, { value: 3, min: 1, max: 7, onChange: v => { this.demo.F = [1, 3, 5, 7].reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); this.renderDemo(); } }),
      S: makeStepper(this.demoCtl, { value: 1, min: 1, max: 3, onChange: v => { this.demo.S = Math.max(1, Math.min(3, v)); this.renderDemo(); } }),
      P: makeStepper(this.demoCtl, { value: 1, min: 0, max: 2, onChange: v => { this.demo.P = Math.max(0, Math.min(2, v)); this.renderDemo(); } }),
    };
    this.renderDemo();
  }

  renderDemo() {
    const { F, S, P } = this.demo, W = W0, O = outSize(W, F, S, P);
    const g = this.demoSvg;
    g.innerHTML = '';
    const ox = 70 + (2 - P) * 0, oy = 60;                    // 网格原点
    const gx = 70, gy = 60;
    const gp = this.svg('g', {}, g);
    // 网格单元（实线=图像，虚线=填充环）
    for (let i = -P; i < W + P; i++) {
      for (let j = -P; j < W + P; j++) {
        const inside = i >= 0 && i < W && j >= 0 && j < W;
        this.svg('rect', {
          x: gx + j * CELL, y: gy + i * CELL, width: CELL - 2, height: CELL - 2, rx: 3,
          fill: inside ? 'hsl(210,25%,88%)' : 'rgba(201,138,45,.10)',
          stroke: inside ? '#B9C4CE' : '#C98A2D', 'stroke-dasharray': inside ? '' : '4 3', 'stroke-width': 1
        }, gp);
      }
    }
    this.svg('text', { x: gx + (W * CELL) / 2, y: gy - 34, 'text-anchor': 'middle', 'font-size': 16, fill: '#98A1AC' }, g)
      .textContent = `输入 ${W}×${W}` + (P ? `（外圈虚线 = 填充 P=${P}，每边各 ${P}）` : '');
    // 核窗口（置于第一行第 0 个合法起点）
    this.kernelRect = this.svg('rect', {
      x: gx + (-P) * CELL, y: gy, width: F * CELL, height: F * CELL,
      fill: 'rgba(28,176,246,.12)', stroke: '#C2543C', 'stroke-width': 2.5, rx: 4
    }, g);
    this.svg('text', { x: gx + (-P) * CELL + F * CELL / 2, y: gy + F * CELL / 2 + 5, 'text-anchor': 'middle', 'font-size': 16, fill: '#C2543C', 'font-weight': 700 }, g)
      .textContent = `核 ${F}×${F}`;
    // 公式
    this.demoFormula.innerHTML =
      `O = ⌊(W − <b style="color:#C2543C">${F}</b> + 2×<b style="color:#C98A2D">${P}</b>) / <b style="color:#1CB0F6">${S}</b>⌋ + 1 = ⌊(${W}−${F}+${2 * P})/${S}⌋+1 = <b>${O}</b>`;
    this.demoO = O;
  }

  slideDemo() {
    const { F, S, P } = this.demo, W = W0;
    const starts = []; for (let s = -P; s + F <= W + P; s += S) starts.push(s);
    const gx = 70, gy = 60;
    if (this._slideTimer) clearInterval(this._slideTimer);
    // 清除旧标号
    [...this.demoSvg.querySelectorAll('.slide-num')].forEach(n => n.remove());
    let i = 0;
    this._slideTimer = setInterval(() => {
      if (i >= starts.length) { clearInterval(this._slideTimer); this._slideTimer = null; return; }
      this.kernelRect.setAttribute('x', gx + starts[i] * CELL);
      const t = this.svg('text', {
        x: gx + (starts[i] + F / 2) * CELL, y: gy - 12, 'text-anchor': 'middle',
        'font-size': 16, fill: '#1CB0F6', 'font-weight': 700, class: 'slide-num'
      }, this.demoSvg);
      t.textContent = i + 1;
      i++;
    }, 420);
  }

  /* ================= 第二幕：闯关 ================= */
  startQuiz() {
    if (this._slideTimer) clearInterval(this._slideTimer);
    this.phase = 'quiz';
    this.setGoal('连对 5 题通关。每题先作答，再看滑窗动画 / 参数卡片验证；答错会指出漏了哪一项，并换一道同类题。');
    this.nextQuestion();
  }

  nextQuestion() {
    this.asked++;
    const type = QTYPES[this.qi];
    this.q = genQuestion(type, (this.cfg.seed || 1) * 1000 + this.asked * 17 + Date.now() % 9973);
    document.getElementById('qPrompt').innerHTML = `<b>第 ${this.asked} 题（${{ same: '经典填充', nopad: '无填充', floor: '取整陷阱', params: '参数量', stack: '两层堆叠' }[type]}）</b><br>${this.q.prompt}`;
    // 作答区
    const body = document.getElementById('answerBody');
    body.innerHTML = '';
    this.qSteppers = {};
    for (const [key, label] of Object.entries(this.q.fields)) {
      const row = this.el('div', { style: 'display:flex;align-items:center;gap:10px;justify-content:center' }, body);
      this.el('span', { class: 'dim small', html: label }, row);
      this.qSteppers[key] = makeStepper(row, { value: 0, min: 0, max: 999, onChange: () => {} });
    }
    this.el('button', { class: 'btn primary', html: '提交答案', style: 'margin-top:8px', onclick: () => this.judge() }, body);
    // 题目配置的示意进入 stage（简版：文字配置卡 + 提示看验证）
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    this.el('div', {
      class: 'dim2 small', style: 'text-align:center;padding-top:120px;line-height:2',
      html: `作答后这里会出现验证动画<br>（滑窗数格 / 参数卡片分解）`
    }, stage);
    this.hudApi.setSteps(`连对 ${this.streak}/5`);
  }

  judge() {
    if (this.phase !== 'quiz' || this.judging) return;
    this.judging = true;
    const wrongFields = [];
    let mId = null;
    for (const key of Object.keys(this.q.fields)) {
      const given = this.qSteppers[key].get();
      const ans = this.q.answers[key];
      if (given !== ans) {
        const d = this.q.distractors[key] && this.q.distractors[key][given];
        wrongFields.push({ key, given, ans, mId: d || null });
        if (d && !mId) mId = d;
      }
    }
    const ok = wrongFields.length === 0;
    this.record({ type: 'answer', correct: ok, value: Object.fromEntries(Object.keys(this.q.fields).map(k => [k, this.qSteppers[k].get()])), mId: ok ? null : (mId || 'M-SZ-00') });
    if (ok) {
      this.streak++;
      this.right(document.getElementById('answerPanel'));
      this.hudApi.setSteps(`连对 ${this.streak}/5`);
      this.showVerification(null);
      if (this.streak >= 5) {
        toast('五连对！尺寸车间出师 📐', 'ok');
        setTimeout(() => this.finish({}), 2200);
      } else {
        this.qi++;
        setTimeout(() => { this.judging = false; this.nextQuestion(); }, 2400);
      }
    } else {
      this.streak = 0;
      this.hudApi.setSteps(`连对 0/5`);
      this.wrong(document.getElementById('answerPanel'), mId);
      this.showVerification(wrongFields, mId);
    }
  }

  /* ---------- 验证动画 / 讲解 ---------- */
  showVerification(wrongFields, mId) {
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    const wrap = this.el('div', { style: 'display:flex;flex-direction:column;gap:12px;align-items:center;padding:8px' }, stage);
    const { W, F, S, P, C, K, PF, PS, mid } = this.q.config;
    const O = outSize(W, F, S, P);

    if (this.q.type !== 'params' || wrongFields) {
      // 尺寸滑窗条（1D 宽度示意）
      const total = W + 2 * P;
      const cw = Math.max(8, Math.min(34, Math.floor(560 / total)));
      const svgW = total * cw + 40, row = this.svg('svg', { viewBox: `0 0 ${svgW} 96`, width: '100%', style: `max-width:${svgW}px` }, wrap);
      const ox = 20, oy = 26;
      for (let j = -P; j < W + P; j++) {
        const inside = j >= 0 && j < W;
        this.svg('rect', {
          x: ox + (j + P) * cw, y: oy, width: cw - 2, height: 30, rx: 2,
          fill: inside ? 'hsl(210,25%,88%)' : 'rgba(201,138,45,.10)',
          stroke: inside ? '#B9C4CE' : '#C98A2D', 'stroke-dasharray': inside ? '' : '3 2'
        }, row);
      }
      const kern = this.svg('rect', { x: ox, y: oy - 3, width: F * cw, height: 36, fill: 'rgba(194,84,60,.15)', stroke: '#C2543C', 'stroke-width': 2, rx: 3 }, row);
      const starts = []; for (let s = -P; s + F <= W + P; s += S) starts.push(s);
      let i = 0;
      const iv = setInterval(() => {
        if (i >= starts.length) { clearInterval(iv); return; }
        kern.setAttribute('x', ox + (starts[i] + P) * cw);
        const t = this.svg('text', { x: ox + (starts[i] + P + F / 2) * cw, y: oy + 24 + 34, 'text-anchor': 'middle', 'font-size': 16, fill: '#1CB0F6', 'font-weight': 700 }, row);
        t.textContent = i + 1;
        i++;
      }, 300);
      this.el('div', { class: 'readout', style: 'font-size:15px', html: this.sizeFormulaHTML(W, F, S, P, O) }, wrap);
    }

    if (this.q.type === 'params') {
      // 参数卡片分解
      const chips = this.el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center' }, wrap);
      const mkChip = (html, cls = '') => this.el('span', { class: 'chip', style: 'font-size:14px;padding:6px 12px;' + cls, html }, chips);
      mkChip(`K=${K} 个核`, 'background:#EEF2F6;');
      this.el('span', { html: '×', style: 'font-size:16px;font-weight:700' }, chips);
      mkChip(`F·F·C = ${F}×${F}×${C} = ${F * F * C} 权重`);
      mkChip(`+1 偏置/核`, '');
      this.el('span', { html: '=', style: 'font-size:16px;font-weight:700' }, chips);
      mkChip(`<b>${convParams(K, F, C)}</b>`, 'border-color:var(--ok);color:var(--ok);');
    }

    if (this.q.type === 'stack') {
      this.el('div', { class: 'readout', style: 'font-size:15px', html: `${W} →(卷积 ${F}×${F},s${S}) <b>${mid}</b> →(池化 ${PF}×${PF},s${PS}) <b>${this.q.answers.size}</b>` }, wrap);
    }

    // 讲解文案
    if (wrongFields && wrongFields.length) {
      const MIS = {
        'M-SZ-01': '+1 是"窗口起点"这一个落点——看动画里标 1 的位置：窗口从起点出发，S 跳一次算一个新落点。',
        'M-SZ-02': '填充是每边各加 P，公式里是 2P——虚线格在两边各补了一环。',
        'M-SZ-03': '除不尽时向下取整（最后凑不满一个完整窗口的余数直接丢弃）。',
        'M-SZ-04': '两层要逐层算：先卷积得到中间尺寸，再池化——漏掉任何一层都会错。',
        'M-PR-01': '每个核都有自己的 1 个偏置 b：K 个核就差 K。',
        'M-PR-02': '核要覆盖输入的全部深度 C——每个核的权重是 F·F·C，不是 F·F。',
        'M-PR-03': '这层有 K 个核并行，每个核参数独立，要乘 K。',
        'M-SZ-00': '对照公式逐项检查：W、F、2P、S、+1，看动画数一遍落点。'
      };
      const hit = wrongFields.find(f => f.mId);
      this.el('div', {
        class: 'target-card', style: 'border-color:var(--err);max-width:560px',
        html: `<h4 style="color:var(--err)">差一点</h4><p style="font-size:13.5px;line-height:1.8">${wrongFields.map(f =>
          `${this.q.fields[f.key]}：你答 <b>${f.given}</b>，正确 <b>${f.ans}</b>`).join('；')}。</p>
          <p style="font-size:13.5px;margin-top:6px">${hit ? MIS[hit.mId] : MIS['M-SZ-00']}</p>`
      }, wrap);
      this.el('button', { class: 'btn primary', html: '换一道同类题再试 →', onclick: () => { this.judging = false; this.nextQuestion(); } }, wrap);
    } else if (!wrongFields) {
      this.el('div', { class: 'target-card', style: 'border-color:var(--ok);max-width:560px', html: `<h4 style="color:var(--ok)">✓ 正确</h4><p style="font-size:13.5px">看动画核对一遍：落点数 = 公式值。${this.streak >= 5 ? '' : '下一题…'}</p>` }, wrap);
    }
  }

  sizeFormulaHTML(W, F, S, P, O) {
    return `O = ⌊(${W} − <b style="color:#C2543C">${F}</b> + 2×<b style="color:#C98A2D">${P}</b>) / <b style="color:#1CB0F6">${S}</b>⌋ + 1 = <b>${O}</b>`;
  }

  setGoal(html) { document.getElementById('goalTxt').innerHTML = html; }
  onTutorHint() { }
  showTutorMessage(a) { this.drawer.pushSystem(a); }
  restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/l3a', 0); }
}
