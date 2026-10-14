// 深度思考题引擎：倒计时 + 推理选择题 + 小步递进
// 设计文档：docs/案例重构_v4_深度思考版.md
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';
import { infoModal } from '../ui/modal.js';
import { LEVELS } from '../data/levels.js';

export class ThinkEngine extends LevelBase {
  constructor(root, ctx) { super(root, ctx); this.qi = 0; }

  /* items: [{q, time, options:[{v, ok, why}], key}] */
  startThink(items, title) {
    this.items = items;
    this.title = title;
    this.qi = 0;
    this.renderQ();
  }

  renderQ() {
    if (this.qi >= this.items.length) { this.onAllDone(); return; }
    const it = this.items[this.qi];
    const stage = document.getElementById('stage') || this.root;

    stage.innerHTML = `
    <div class="level-page fade-in">
      <div id="hudhost"></div>
      <div style="max-width:720px;margin:0 auto;padding:8px 4px 40px">
        <div class="topbar">
          <span class="chip" style="background:#DDF4FF;color:#1CB0F6">第 ${this.qi + 1}/${this.items.length} 题</span>
          <div id="timer" class="mono" style="font-size:22px;font-weight:700;color:${it.time <= 60 ? '#FF4B4B' : '#FF9600'};margin-left:auto">
            ⏱ ${it.time}s
          </div>
        </div>
        <div class="panel" style="padding:20px;margin-top:12px">
          <p id="tq" style="font-size:17px;font-weight:700;line-height:1.8;color:#16324A">${it.q}</p>
          <div id="tOpts" style="display:flex;flex-direction:column;gap:10px;margin-top:16px"></div>
          <div id="tFb" style="margin-top:12px"></div>
        </div>
      </div>
      <div id="aihost"></div>
    </div>`;

    this.hudApi = mountHUD(document.getElementById('hudhost'), {
      title: this.title || '深度思考',
      steps: `第 ${this.qi + 1}/${this.items.length} 题`,
      canUndo: false, onUndo: null,
      onRestart: () => this.startThink(this.items, this.title),
      onHelp: () => infoModal('答题指南',
        `<p>每题有倒计时，时间到自动揭示答案。</p>
         <p class="dim2 small">思考提示：先想清楚问题在问"为什么"而不是"是多少"，然后用你已有的数学/CS 知识推导。</p>`),
      onHome: () => location.hash = '#/map'
    });
    this.drawer = mountDrawer(document.getElementById('aihost'), {
      onAsk: q => this.ctx.tutor.ask(q, { levelId: this.constructor.id }),
      quick: ['这道题的考点是什么？', '给我一个思考方向（不要直接告诉答案）']
    });

    // 选项
    const box = document.getElementById('tOpts');
    it.options.slice().sort(() => Math.random() - 0.5).forEach((o, i) => {
      const b = this.el('button', {
        class: 'btn sm',
        style: 'justify-content:flex-start;text-align:left;font-size:14px;padding:12px 16px;line-height:1.6',
        html: `<b>${String.fromCharCode(65 + i)}.</b> ${o.v}`
      }, box);
      b.onclick = () => this.pick(o, b, it);
    });

    // 倒计时
    this.remaining = it.time;
    this.timerEl = document.getElementById('timer');
    this.timerDone = false;
    this.timerId = setInterval(() => {
      this.remaining--;
      if (this.timerEl) {
        this.timerEl.textContent = `⏱ ${this.remaining}s`;
        if (this.remaining <= 10) this.timerEl.style.color = '#FF4B4B';
      }
      if (this.remaining <= 0) {
        clearInterval(this.timerId);
        this.timerDone = true;
        this.timeUp(it);
      }
    }, 1000);
  }

  pick(o, btn, it) {
    if (btn.disabled || this.timerDone) return;
    clearInterval(this.timerId);
    const ok = !!o.ok;
    this.record({ type: 'think_answer', correct: ok, qIndex: this.qi, value: o.v.slice(0, 30), mId: ok ? null : (it.key || 'THINK') });
    if (ok) {
      this.right(btn);
      btn.style.borderColor = 'var(--ok)';
      document.querySelectorAll('#tOpts button').forEach(x => x.disabled = true);
      document.getElementById('tFb').innerHTML =
        `<div style="background:#D7FFB8;border-radius:10px;padding:12px 16px;margin-top:8px">
          <b style="color:#43C000">✓ 正确！</b>
          <p style="font-size:13.5px;line-height:1.7;margin-top:6px">${o.why}</p>
        </div>
        <button class="btn primary" id="nextQ" style="margin-top:12px">下一题 →</button>`;
      document.getElementById('nextQ').onclick = () => { this.qi++; this.renderQ(); };
    } else {
      this.wrong(btn, it.key);
      btn.disabled = true;
      btn.style.opacity = .45;
      const why = document.createElement('p');
      why.style.cssText = 'font-size:13px;color:var(--err);margin-top:4px';
      why.innerHTML = `✗ ${o.why || '不对——再想想'}`;
      btn.after(why);
    }
  }

  timeUp(it) {
    if (!document.getElementById('tOpts')) return;
    document.querySelectorAll('#tOpts button').forEach(x => x.disabled = true);
    const correct = it.options.find(o => o.ok);
    document.getElementById('tFb').innerHTML =
      `<div style="background:#FFF4D9;border-radius:10px;padding:12px 16px;margin-top:8px">
        <b style="color:#E8992E">⏰ 时间到！</b>
        <p style="font-size:13.5px;line-height:1.7;margin-top:6px"><b>正确答案：</b>${correct ? correct.v : ''}<br>${correct ? correct.why : ''}</p>
      </div>
      <button class="btn primary" id="nextQ" style="margin-top:12px">下一题 →</button>`;
    document.getElementById('nextQ').onclick = () => { this.qi++; this.renderQ(); };
  }

  onAllDone() {
    const total = this.items.length;
    this.record({ type: 'think_set_done', correct: true, value: total });
    toast(`全部 ${total} 题完成！`, 'ok', 2500);
    setTimeout(() => this.finish({}), 1600);
  }
}
