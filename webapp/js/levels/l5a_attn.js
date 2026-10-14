// L5-A 注意力手算台：Scaled Dot-Product Attention 三步手算（score→softmax→输出）+ √d 概念
// 设计文档：docs/案例设计/5A-注意力手算-设计文档.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

// 迷你例（数字可整除，聚焦规则本身）
const EX = {
  q: [2, 0], k1: [1, 0], k2: [0, 2], v1: [1, 2], v2: [3, 4], d: 4, sqd: 2,
  s1: 1, s2: 0,
  w1: 0.73, w2: 0.27,                 // e^1/(e^1+1)=0.731, 0.269
  o1: 1.46, o2: 2.46,                 // 0.73*[1,2]+0.27*[3,4]
};

const STEPS = [
  {
    name: '第 1 步 · score = q·k / √d',
    known: 'q = [2, 0]（查询）　k₁ = [1, 0]，k₂ = [0, 2]（键）　d = 4 → √d = 2',
    ask: 's₁ = q·k₁/√d = ？　s₂ = q·k₂/√d = ？',
    hint: '点积：对应位置相乘再相加；除以 √d = 2。',
    options: [
      { v: 's₁=1, s₂=0', ok: true, why: 'q·k₁ = 2×1+0×0 = 2，除以 √d=2 → s₁=1；q·k₂ = 0 → s₂=0。' },
      { v: 's₁=2, s₂=0', mId: 'M-AT-03', why: '忘了除以 √d：q·k₁=2 是原始点积，score 还要缩放。' },
      { v: 's₁=1, s₂=1', mId: 'M-AT-01', why: 'q 和 k₂ 是正交的（点积=0）——相似度是算出来的，不是默认相等。' },
      { v: 's₁=4, s₂=0', mId: 'M-AT-03', why: '除 √d 是除以 2（√4），不是除以 d=4，也不是乘。' },
    ],
    reveal: 's₁ = (2×1 + 0×0)/2 = <b>1</b>　s₂ = (2×0 + 0×2)/2 = <b>0</b>',
  },
  {
    name: '第 2 步 · softmax(score) → 注意力权重',
    known: 's₁ = 1，s₂ = 0　（softmax：wᵢ = e^{sᵢ} / Σe^{sⱼ}）',
    ask: 'w₁、w₂ 大约是多少？（e¹≈2.72，e⁰=1）',
    hint: '先指数化（2.72 和 1），再除以总和 3.72；两个权重加起来必须 = 1。',
    options: [
      { v: 'w₁≈0.73, w₂≈0.27', ok: true, why: '2.72/3.72 ≈ 0.73，1/3.72 ≈ 0.27。分数高的键分到大头，但另一个不归零。' },
      { v: 'w₁=0.5, w₂=0.5', mId: 'M-AT-01', why: 'softmax 不是平均分——它按 e^score 的比例分配，分数差 1 倍多就偏到 0.73。' },
      { v: 'w₁≈0.73, w₂≈0.73', mId: 'M-AT-04', why: '分母要加总所有项（e¹+e⁰=3.72）——每个权重的分母都是总和，所以权重和才恒为 1。' },
      { v: 'w₁=1, w₂=0', mId: 'M-AT-04', why: '那是不带指数的"赢家通吃"。softmax 用 e^s 放大差距但不赶尽杀绝：0.73 vs 0.27。' },
    ],
    reveal: 'e¹=2.72, e⁰=1，总和 3.72<br>w₁ = 2.72/3.72 ≈ <b>0.73</b>　w₂ = 1/3.72 ≈ <b>0.27</b>（和 = 1 ✓）',
  },
  {
    name: '第 3 步 · 输出 = Σ wᵢ·vᵢ',
    known: 'w₁≈0.73，w₂≈0.27　v₁ = [1, 2]，v₂ = [3, 4]（值向量）',
    ask: '输出向量 out = w₁·v₁ + w₂·v₂ = ？',
    hint: '两个 v 按 0.73 : 0.27 加权平均——逐维算。',
    options: [
      { v: 'out ≈ [1.46, 2.46]', ok: true, why: '第1维：0.73×1+0.27×3 ≈ 1.46；第2维：0.73×2+0.27×4 ≈ 2.46。输出是 v 的凸组合（权重和=1）。' },
      { v: 'out ≈ [2, 3]', mId: 'M-AT-05', why: '这是用原始 score（1 和 0）加权的——必须用 softmax 之后的权重。' },
      { v: 'out = [1, 2]', mId: 'M-AT-01', why: '只取了 v₁：注意力是"都看、但看的程度不同"，不是硬选择。' },
      { v: 'out ≈ [4, 6]', mId: 'M-AT-05', why: '这像 v₁+v₂ 相加——是加权平均（0.73/0.27），不是求和。' },
    ],
    reveal: '第1维：0.73×1 + 0.27×3 = <b>1.46</b>　第2维：0.73×2 + 0.27×4 = <b>2.46</b>',
  },
  {
    name: '第 4 步 · 为什么要除 √d？', concept: true,
    known: '真实模型 d=64 或更大，q·k 的点积是 64 项乘加的和。',
    ask: '不除 √d 会发生什么？',
    hint: '想想 d 很大时点积的量级，以及 softmax 对大分数的反应。',
    options: [
      { v: '分数量级随 d 增大 → softmax 越来越接近 one-hot → 梯度接近 0；除 √d 把分数拉回合理区间', ok: true, why: '点积方差随 d 线性增长，分数一大 softmax 就饱和成"赢家通吃"，训练梯度消失；除 √d 恰好把方差归一（这就是 Scaled 的含义）。' },
      { v: '为了把 score 归一化到 0~1 之间', mId: 'M-AT-01', why: '归一化到 0~1 的是 softmax 干的活；√d 缩放发生在 softmax 之前，处理的是量级问题。' },
      { v: '为了让 QKᵀ 矩阵可逆', mId: 'M-AT-01', why: '与可逆性无关——注意力里根本不需要求逆。' },
    ],
    reveal: 'Var(q·k) ∝ d　→　除 √d 使方差与 d 无关，softmax 不饱和',
  },
];

export default class L5AAttn extends LevelBase {
  static id = 'l5a'; static title = '注意力手算台';

  mount() {
    const cfg = this.cfg = LEVELS.l5a;
    this.si = 0;

    this.root.innerHTML = `
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="target-card" style="margin-bottom:10px"><h4 id="stepName">…</h4><p id="goalTxt"></p></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:420px"></div>
        <div class="side">
          <div class="target-card"><h4>已知</h4><p id="knownTxt" class="dim small" style="line-height:1.8"></p></div>
          <div class="tool-panel"><h4>你的预测</h4>
            <p id="askTxt" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <p class="dim2 small" id="hintTxt" style="text-align:left;line-height:1.6"></p>
            <div id="optBox" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>
          <div class="tool-panel"><h4>公式卡</h4>
            <div class="readout" style="line-height:1.9">Attention(Q,K,V)=<br>softmax(QKᵀ/√d)·V</div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi = mountHUD(document.getElementById('hudhost'), {
      title: '注意力手算台', steps: '第 1/4 步',
      canUndo: false, onUndo: null, onRestart: () => this.restart(),
      onHelp: () => this.explain(), onHome: () => location.hash = '#/map'
    });
    this.drawer = mountDrawer(document.getElementById('aihost'), {
      onAsk: q => this.ctx.tutor.ask(q, { levelId: 'l5a' }),
      quick: ['score 为什么要除 √d？', 'softmax 之后权重和一定是 1 吗？', '输出为什么是 v 的加权平均？']
    });

    this.buildVis();
    this.showStep();
    setTimeout(() => this.explain(), 400);
  }

  explain() {
    infoModal('注意力手算台 · 讲解',
      `<p style="line-height:1.9">大纲要求会手算 Scaled Dot-Product Attention，一共三步：
      <br><b>① score</b>：sᵢ = q·kᵢ / √d（查询和每个键的点积，除 √d 缩放）
      <br><b>② softmax</b>：wᵢ = e^{sᵢ}/Σe^{sⱼ}（分数 → 权重，和恒为 1）
      <br><b>③ 输出</b>：out = Σ wᵢ·vᵢ（值向量的加权平均）
      </p>
      <p class="dim2 small" style="margin-top:8px">四步预测：每步先选你的答案，再看矩阵/条形图揭示；答错归因重问。</p>`);
  }

  /* ---------- 可视化：q·k 矩阵 + softmax 条形 + 加权堆叠 ---------- */
  buildVis() {
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    this.vis = this.el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center' }, stage);
    // q·k 矩阵
    this.matBox = this.el('div', {}, this.vis);
    this.svgEl = this.svg('svg', { viewBox: '0 0 340 150', width: '100%', style: 'max-width:470px' }, this.matBox);
    const g = this.svgEl;
    const drawVec = (label, vec, x, y, color) => {
      this.svg('text', { x, y: y - 8, 'font-size': 16, fill: color, 'font-weight': 700, 'text-anchor': 'middle' }, g).textContent = label;
      vec.forEach((v, i) => {
        this.svg('rect', { x: x - 30, y: y + i * 30, width: 60, height: 26, rx: 5, fill: '#FFFFFF', stroke: color, 'stroke-width': 1.5 }, g);
        this.svg('text', { x, y: y + i * 30 + 18, 'font-size': 16, fill: '#1F2933', 'text-anchor': 'middle', 'font-family': 'var(--mono),monospace' }, g).textContent = v;
      });
    };
    drawVec('q', EX.q, 60, 24, '#1CB0F6');
    drawVec('k₁', EX.k1, 160, 24, '#C2543C');
    drawVec('k₂', EX.k2, 260, 24, '#C2543C');
    this.scoreText = this.svg('text', { x: 170, y: 140, 'font-size': 16, fill: '#5A6774', 'text-anchor': 'middle' }, g);
    this.scoreText.textContent = 's₁ = q·k₁/√d = ？　　s₂ = q·k₂/√d = ？';
    // softmax 条形
    this.barBox = this.el('div', { style: 'display:none;width:100%;max-width:470px' }, this.vis);
    this.el('div', { class: 'dim2 small', html: 'softmax 后的权重' }, this.barBox);
    this.bar1 = this.el('div', { style: 'height:20px;border-radius:6px;background:#1CB0F6;width:0%;transition:width .8s;display:flex;align-items:center;justify-content:flex-end;color:#fff;font-size:12px;padding-right:6px' }, this.barBox);
    this.bar2 = this.el('div', { style: 'height:20px;border-radius:6px;background:#C2543C;width:0%;transition:width .8s;display:flex;align-items:center;justify-content:flex-end;color:#fff;font-size:12px;padding-right:6px;margin-top:4px' }, this.barBox);
    // 加权输出
    this.outBox = this.el('div', { class: 'readout', style: 'display:none;font-size:15px' }, this.vis);
  }

  showStep() {
    const s = STEPS[this.si];
    document.getElementById('stepName').textContent = s.name;
    document.getElementById('knownTxt').innerHTML = s.known;
    document.getElementById('askTxt').innerHTML = s.ask;
    document.getElementById('hintTxt').textContent = s.hint;
    this.hudApi.setSteps(`第 ${this.si + 1}/4 步`);
    // 分步显隐可视化（score 答案在学生完成第 1 步后才揭示）
    if (this.si >= 1) this.scoreText.textContent = 's₁ = q·k₁/√d = 1　　s₂ = q·k₂/√d = 0';
    this.barBox.style.display = this.si >= 1 ? '' : 'none';
    this.outBox.style.display = this.si >= 2 ? '' : 'none';
    if (this.si >= 1) { this.bar1.style.width = '73%'; this.bar1.textContent = 'w₁ = 0.73'; this.bar2.style.width = '27%'; this.bar2.textContent = 'w₂ = 0.27'; }
    if (this.si >= 2) this.outBox.innerHTML = `out = 0.73×[1,2] + 0.27×[3,4] = <b>[1.46, 2.46]</b>`;
    if (this.si === 3) { this.barBox.style.display = ''; this.outBox.style.display = ''; }
    // 选项
    const box = document.getElementById('optBox');
    box.innerHTML = '';
    const opts = s.options.slice().sort(() => Math.random() - 0.5);
    opts.forEach((o, i) => {
      const b = this.el('button', {
        class: 'btn' + (s.concept ? '' : ' sm'), style: 'justify-content:flex-start;text-align:left;font-size:' + (s.concept ? '13px' : '14.5px'),
        html: `<b>${String.fromCharCode(65 + i)}.</b> ${o.v}`
      }, box);
      b.onclick = () => this.choose(o, b);
    });
  }

  choose(o, btn) {
    const s = STEPS[this.si];
    const ok = !!o.ok;
    this.record({ type: 'predict', correct: ok, value: o.v.slice(0, 24), mId: ok ? null : (o.mId || 'M-AT-01'), step: this.si + 1 });
    if (ok) {
      this.right(btn);
      document.getElementById('hintTxt').innerHTML = `<b style="color:var(--ok)">✓ ${o.why}</b><br><span class="mono" style="font-size:13px">${s.reveal}</span>`;
      this.si++;
      if (this.si >= STEPS.length) {
        toast('score→softmax→加权输出——注意力手算通关 🔢', 'ok');
        setTimeout(() => this.finish({}), 2800);
      } else setTimeout(() => this.showStep(), 3600);
    } else {
      this.wrong(btn, o.mId);
      document.getElementById('hintTxt').innerHTML = `<b style="color:var(--err)">✗ ${o.why}</b>`;
      setTimeout(() => this.showStep(), 4500);
    }
  }

  onTutorHint() { }
  showTutorMessage(a) { this.drawer.pushSystem(a); }
  restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/l5a', 0); }
}
