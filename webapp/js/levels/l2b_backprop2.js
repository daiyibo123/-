// L2-B 模块化反向传播：按课件三幕讲法（非线性模块→加权求和→向量化转置）的预测式关卡
// 设计文档：docs/案例设计/2B-模块化反向传播-设计文档.md ｜ 数值复用已验证的 2-2-1 金标准网络
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

// 金标准数值（tools/gen_levels.mjs 已独立校验）
const F = { x1: 1.2, x2: 0.5, z1: 0.62, h1: 0.6502, z2: 0.74, h2: 0.6770, zo: 0.8490, yhat: 0.7004, L: 0.3558, y: 1 };
const W21 = 0.5, W22 = 0.7;                       // W₂：h→z 的两条边
const sp1 = 0.2274, sp2 = 0.2186;                  // σ′(z₁), σ′(z₂)
const dz_o = -0.2996, dh1 = -0.1498, dh2 = -0.2097, dz1 = -0.0341;

// 五步预测定义
const STEPS = [
  {
    act: 1, actName: '第一幕 · 非线性模块（输出站的 σ）',
    known: 'ŷ = σ(z) = 0.7004，y = 1，L = 0.3558，z = 0.849',
    ask: '已知上游 ∂L/∂ŷ = −1.428。链式法则：δz = ∂L/∂z = ？',
    hint: '扰动观点：对 z 施加微小 dz，ŷ 会变 σ′(z)·dz；对 ŷ 施加 dŷ，L 会变 ∂L/∂ŷ · dŷ。',
    options: [
      { v: '−0.2996', ok: true, why: 'δz = ∂L/∂ŷ × σ′(z) = −1.428 × 0.2093 = −0.2996。BCE×sigmoid 有漂亮化简：它恰等于 ŷ − y。' },
      { v: '−1.428', mId: 'M-BP-02', why: '你只带了上游梯度，忘了乘本模块的局部导数 σ′(z)。链式法则两环缺一不可。' },
      { v: '0.2093', mId: 'M-BP-03', why: 'σ′(z)=0.2093 只是局部导数，还不是梯度——要再乘上游的 ∂L/∂ŷ。' },
      { v: '0.3558', mId: 'M-BP-01', why: '损失值 L 是"误差有多大"，梯度是"参数往哪调"——两个不同的量。' },
    ],
    reveal: 'σ′(z) = σ(z)(1−σ(z)) = 0.7004×0.2996 = 0.2093<br>δz = −1.428 × 0.2093 = <b>−0.2996</b>（= ŷ − y，这就是化简的魔力）',
  },
  {
    act: 2, actName: '第二幕 · 加权求和模块（W₂ 层，扰动观点）',
    known: `z = ${W21}·h₁ + ${W22}·h₂ + 0.05，已算得 δz = −0.2996`,
    ask: '对 h₁ 施加微小扰动 ε：z 会变多少？于是 δh₁ = ∂L/∂h₁ = ？',
    hint: 'h₁ 动 ε，z 动 w₂₁·ε，L 动 δz·w₂₁·ε —— 梯度就"乘着权重"流回去了。',
    options: [
      { v: '−0.1498', ok: true, why: `δh₁ = δz × w₂₁ = −0.2996 × ${W21} = −0.1498。扰动顺着边流动，梯度逆着边回传。` },
      { v: '−0.2996', mId: 'M-BP-02', why: '扰动经过这条边要乘它的权重 0.5 —— 忘乘权重，链就断了。' },
      { v: '−0.5', mId: 'M-BP-04', why: '0.5 是权重本身，不是梯度；δh₁ 是 δz 乘权重。' },
    ],
    reveal: `δh₁ = δz × w₂₁ = −0.2996 × ${W21} = <b>−0.1498</b>`,
  },
  {
    act: 2, actName: '第二幕 · 加权求和模块（W₂ 层）',
    known: `同一模块，另一条边：w₂₂ = ${W22}`,
    ask: 'δh₂ = ∂L/∂h₂ = ？',
    hint: '同一条规则换一条边：δh₂ = δz × w₂₂。',
    options: [
      { v: '−0.2097', ok: true, why: `δh₂ = −0.2996 × ${W22} = −0.2097。两条边各自回传，互不干扰。` },
      { v: '−0.2996', mId: 'M-BP-02', why: '这条边的权重是 0.7，别忘了乘。' },
      { v: '−0.7', mId: 'M-BP-04', why: '权重不是梯度——梯度 = 上游 δ × 权重。' },
    ],
    reveal: `δh₂ = δz × w₂₂ = −0.2996 × ${W22} = <b>−0.2097</b>`,
  },
  {
    act: 3, actName: '第三幕 · 隐藏站的 σ + 向量化',
    known: `h₁ = σ(z₁)，z₁ = 0.62，δh₁ = −0.1498（注意：δh₁ 是对 h₁ 的梯度，还要穿过 σ 才到 z₁）`,
    ask: 'δz₁ = ∂L/∂z₁ = ？',
    hint: '又是一个非线性模块——和第一幕同样的规则，自己走一遍。',
    options: [
      { v: '−0.0341', ok: true, why: `δz₁ = δh₁ × σ′(z₁) = −0.1498 × ${sp1} = −0.0341。第一幕的规则你已经会独立使用了。` },
      { v: '−0.1498', mId: 'M-BP-03', why: 'δh₁ 是穿过 σ 之后的量；从 h₁ 到 z₁ 还要过一次非线性模块（乘 σ′）。' },
      { v: '−0.0974', mId: 'M-BP-03', why: 'σ(z₁)=0.6502 是激活值；局部导数是 σ′(z₁)=σ(1−σ)=0.2274。别把 σ 当 σ′。' },
    ],
    reveal: `σ′(z₁) = 0.6502 × 0.3498 = ${sp1}<br>δz₁ = −0.1498 × ${sp1} = <b>−0.0341</b>`,
  },
  {
    act: 3, actName: '第三幕 · 向量化揭秘', concept: true,
    known: '真实网络是向量与矩阵：z = W₂h + b。刚才的"逐条边乘权重"要同时做几十次。',
    ask: 'PyTorch 的 backward() 里为什么到处出现 Wᵀ（转置）？',
    hint: '想想 δh 的每个分量是怎么来的：它是 δz 各分量按 W 的"某一列"加权求和。',
    options: [
      { v: '反向传播过线性层 = 左乘权重矩阵的转置：δh = W₂ᵀ·δz，这是链式法则向量化的自然结果', ok: true, why: 'δh₁ = w₂₁·δz、δh₂ = w₂₂·δz —— 写成矩阵正是 [δh₁;δh₂] = W₂ᵀ[δz]。转置不是人为规定，是链式法则在向量形式下的自然结果（课件 S53）。' },
      { v: '只是为了让矩阵维度对得上的技术处理', mId: 'M-BP-04', why: '维度恰好对上本身就是数学正确的表现，但原因不是"凑维度"。' },
      { v: '转置能让反向传播计算更快', mId: 'M-BP-04', why: '与速度无关——是链式法则的必然。' },
    ],
    reveal: '[δh₁; δh₂] = [w₂₁·δz; w₂₂·δz] = <b>W₂ᵀ·δz</b><br>这就是反向传播实现里"到处是转置"的来源。',
  },
];

export default class L2BBackprop extends LevelBase {
  static id = 'l2b'; static title = '模块化反向传播';

  mount() {
    const cfg = this.cfg = LEVELS.l2b;
    this.si = 0; this.attempts = 0; this.firstTry = [];

    this.root.innerHTML = `
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div class="target-card" style="margin-bottom:10px"><h4 id="actName">…</h4><p id="goalTxt"></p></div>
      <div class="level-body">
        <div class="stage" id="stage" style="min-height:460px"></div>
        <div class="side">
          <div class="target-card"><h4>已知</h4><p id="knownTxt" class="dim small" style="line-height:1.8"></p></div>
          <div class="tool-panel"><h4>你的预测</h4>
            <p id="askTxt" style="font-size:13.5px;line-height:1.7;text-align:left"></p>
            <p class="dim2 small" id="hintTxt" style="text-align:left;line-height:1.6"></p>
            <div id="optBox" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>
          <div class="tool-panel"><h4>进度</h4>
            <div class="readout">第 <b id="progNow">1</b> / 5 步 · 错误 <b id="progErr">0</b></div>
          </div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi = mountHUD(document.getElementById('hudhost'), {
      title: '模块化反向传播', steps: '第 1/5 步',
      canUndo: false, onUndo: null, onRestart: () => this.restart(),
      onHelp: () => this.explain(), onHome: () => location.hash = '#/map'
    });
    this.drawer = mountDrawer(document.getElementById('aihost'), {
      onAsk: q => this.ctx.tutor.ask(q, { levelId: 'l2b' }),
      quick: ['σ 的导数是什么？', '扰动观点怎么理解？', '为什么反向传播有转置？']
    });

    this.buildGraph();
    this.showStep();
    setTimeout(() => this.explain(), 400);
  }

  explain() {
    infoModal('模块化反向传播 · 讲解',
      `<p style="line-height:1.9">网络只有两种模块，各有一条反向规则（课件的讲法）：
      <br><b>非线性模块</b>（σ）：δ<sub>入</sub> = δ<sub>出</sub> × σ′(z)，其中 σ′(z)=σ(1−σ)
      <br><b>加权求和模块</b>（线性层）：每条边"乘着自己的权重"回传，δhᵢ = δz·wᵢ；写成矩阵就是 δh = Wᵀδz
      </p>
      <p class="dim2 small" style="margin-top:8px">玩法：五步预测。每步先选你的答案，再看扰动动画揭示；答错会讲解你踩的误区并换序重问，答对才推进。</p>`);
  }

  /* ---------- 计算图（垂直分层，当前幕高亮） ---------- */
  buildGraph() {
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    this.graph = this.svg('svg', { viewBox: '0 0 520 460', width: '100%', style: 'max-width:520px;display:block;margin:auto' }, stage);
    const defs = this.svg('defs', {}, this.graph);
    const layers = [
      { y: 40, label: '输入 x', nodes: [{ k: 'x1', t: 'x₁=1.2' }, { k: 'x2', t: 'x₂=0.5' }] },
      { y: 150, label: '隐藏站 σ', nodes: [{ k: 'h1', t: 'h₁=0.6502' }, { k: 'h2', t: 'h₂=0.6770' }] },
      { y: 270, label: '输出站 σ', nodes: [{ k: 'o', t: 'ŷ=0.7004' }] },
      { y: 370, label: '损失', nodes: [{ k: 'L', t: 'L=0.3558' }] },
    ];
    this.gNodes = {}; this.gEdges = [];
    const pos = {};
    for (const L of layers) {
      this.svg('text', { x: 26, y: L.y + 40, 'font-size': 16, fill: '#98A1AC' }, this.graph).textContent = L.label;
      L.nodes.forEach((n, i) => {
        const x = 170 + i * 170 + (L.nodes.length === 1 ? 85 : 0), y = L.y;
        pos[n.k] = [x, y];
        const g = this.svg('g', { class: 'gnode', 'data-k': n.k }, this.graph);
        this.svg('rect', { x: x - 62, y: y, width: 124, height: 44, rx: 10, fill: '#FFFFFF', stroke: '#B9C4CE', 'stroke-width': 1.5 }, g);
        const t = this.svg('text', { x, y: y + 27, 'text-anchor': 'middle', 'font-size': 16, fill: '#1F2933', 'font-family': 'var(--mono),monospace' }, g);
        t.textContent = n.t;
        this.gNodes[n.k] = g;
      });
    }
    const edge = (a, b, label) => {
      const [ax, ay] = pos[a], [bx, by] = pos[b];
      const l = this.svg('line', { x1: ax, y1: ay + 44, x2: bx, y2: by, stroke: '#C9BCA4', 'stroke-width': 2 }, this.graph);
      if (label) {
        const t = this.svg('text', { x: (ax + bx) / 2 + 10, y: (ay + by) / 2 + 24, 'font-size': 16, fill: '#5A6774' }, this.graph);
        t.textContent = label;
      }
      this.gEdges.push(l); return l;
    };
    edge('x1', 'h1', 'w₁₁'); edge('x2', 'h1', 'w₁₂'); edge('x1', 'h2', 'w₁₃'); edge('x2', 'h2', 'w₁₄');
    edge('h1', 'o', `w₂₁=${W21}`); edge('h2', 'o', `w₂₂=${W22}`);
    edge('o', 'L', 'BCE');
    this.graphPos = pos;
  }

  highlightAct(act) {
    const map = { 1: ['o', 'L'], 2: ['h1', 'h2', 'o'], 3: ['x1', 'x2', 'h1', 'h2', 'o', 'L'] };
    for (const k in this.gNodes) {
      const on = map[act].includes(k);
      this.gNodes[k].style.opacity = on ? 1 : 0.35;
    }
  }

  /* ---------- 扰动粒子动画：沿边 a→b 流动 ---------- */
  flowParticle(a, b, color = '#C2543C') {
    const [ax, ay] = this.graphPos[a], [bx, by] = this.graphPos[b];
    const c = this.svg('circle', { r: 6, fill: color, opacity: 0.9 }, this.graph);
    let t = 0;
    const tick = () => {
      t += 0.06;
      if (t >= 1) { c.remove(); return; }
      c.setAttribute('cx', ax + (bx - ax) * t);
      c.setAttribute('cy', ay + 44 + (by - ay) * t);
      setTimeout(tick, 25);
    };
    tick();
  }

  showStep() {
    const s = STEPS[this.si];
    document.getElementById('actName').textContent = s.actName;
    document.getElementById('knownTxt').innerHTML = s.known;
    document.getElementById('askTxt').innerHTML = s.ask;
    document.getElementById('hintTxt').textContent = s.hint;
    document.getElementById('progNow').textContent = this.si + 1;
    this.hudApi.setSteps(`第 ${this.si + 1}/5 步`);
    this.highlightAct(s.act);
    // 选项（换序）
    const box = document.getElementById('optBox');
    box.innerHTML = '';
    const opts = s.options.slice().sort(() => Math.random() - 0.5);
    opts.forEach((o, i) => {
      const b = this.el('button', {
        class: 'btn' + (s.concept ? '' : ' sm'), style: 'justify-content:flex-start;text-align:left;font-size:' + (s.concept ? '13px' : '15px'),
        html: `<b>${String.fromCharCode(65 + i)}.</b> ${o.v}`
      }, box);
      b.onclick = () => this.choose(o, b);
    });
    this.attempts = 0;
  }

  choose(o, btn) {
    const s = STEPS[this.si];
    this.attempts++;
    const ok = !!o.ok;
    this.record({ type: 'predict', correct: ok, value: o.v, mId: ok ? null : (o.mId || 'M-BP-02'), step: this.si + 1, attempt: this.attempts });
    if (ok) {
      if (this.attempts === 1) this.firstTry.push(this.si);
      this.right(btn);
      // 扰动动画 + 揭示
      this.reveal(s, o);
    } else {
      this.wrong(btn, o.mId);
      // 归因讲解（保留足量阅读时间后再换序重问）
      const card = document.getElementById('hintTxt');
      card.innerHTML = `<b style="color:var(--err)">✗ ${o.why}</b>`;
      setTimeout(() => this.showStep(), 4500);
    }
  }

  reveal(s, o) {
    // 对应扰动动画
    if (this.si === 0) { this.flowParticle('L', 'o'); setTimeout(() => this.flowParticle('o', 'o'), 500); }
    if (this.si === 1) this.flowParticle('o', 'h1');
    if (this.si === 2) this.flowParticle('o', 'h2');
    if (this.si === 3) { this.flowParticle('o', 'h1'); setTimeout(() => this.flowParticle('h1', 'h1'), 500); }
    document.getElementById('hintTxt').innerHTML = `<b style="color:var(--ok)">✓ ${o.why}</b><br><span class="mono" style="font-size:13px">${s.reveal}</span>`;
    this.si++;
    document.getElementById('progErr').textContent = this.recorder.errors().length;
    if (this.si >= STEPS.length) {
      toast('五步全部走通——反向传播的两种模块你都掌握了 🧩', 'ok');
      setTimeout(() => this.finish({}), 2600);
    } else {
      setTimeout(() => this.showStep(), 3400);
    }
  }

  onTutorHint() { }
  showTutorMessage(a) { this.drawer.pushSystem(a); }
  restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/l2b', 0); }
}
