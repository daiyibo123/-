// 第 2 章深度思考集：非线性本质 / 初始化 / 梯度 / 优化器（8 思考 + 2 论述）
// 设计文档：docs/案例重构_v4_深度思考版.md
import { ThinkEngine } from '../engine/think-engine.js';
import { EssayEngine } from '../engine/essay-engine.js';
import { LEVELS } from '../data/levels.js';

// --- 思考题集 ---
export const CH2_THINK = [
  {
    q: '一个没有非线性激活函数的 3 层全连接网络 y = W₃(W₂(W₁x)) 在数学上等价于什么？',
    time: 90,
    key: 'M-BP-01',
    options: [
      { v: '等价于单层线性变换 y = Wx（其中 W = W₃W₂W₁）', ok: true,
        why: '矩阵乘法满足结合律：W₃(W₂(W₁x)) = (W₃W₂W₁)x = Wx。无论叠多少层，没有非线性就只是一个线性变换。' },
      { v: '等价于一个更宽的单层网络', mId: 'M-BP-01',
       why: '不是"更宽"，是严格的数学等价——W₃W₂W₁ 的结果就是一个矩阵，跟直接用一个 W 没有任何区别。' },
      { v: '比单层更强，因为多层可以组合出复杂的决策边界', mId: 'M-BP-01',
       why: '恰恰相反！线性组合的线性还是线性。这正是深度学习需要激活函数的原因。' }
    ]
  },
  {
    q: '将所有权重初始化为 0，用 SGD 训练一个 2 层网络。第一轮梯度更新后，两个隐层神经元的权重会怎样？',
    time: 90,
    key: 'M-BP-02',
    options: [
      { v: '完全相同（对称性未被打破），网络退化为一个神经元', ok: true,
        why: '所有权重为 0 → 前向传播时所有隐层神经元输出相同 → 反向传播时梯度也相同 → 更新后仍然相同。这叫"对称性问题"，是零初始化致命的原因。' },
      { v: '各不相同，因为 SGD 的随机性会自然打破对称', mId: 'M-BP-02',
       why: 'SGD 的随机性来自样本顺序，但如果所有权重一开始就相同，对同一批样本的梯度也相同，不会自然分化。' },
      { v: '网络无法训练，梯度为 NaN', mId: 'M-BP-02',
       why: '梯度不会是 NaN，只是所有神经元保持对称——每个神经元都在做同样的计算，浪费容量。' }
    ]
  },
  {
    q: '如果将所有权重初始化为相同的非零值 c=0.5（而不是 0），对称性问题还存在吗？',
    time: 60,
    key: 'M-BP-02',
    options: [
      { v: '仍然存在——同层的神经元依然输出相同的值、获得相同的梯度', ok: true,
        why: '问题的关键不是初始值是不是 0，而是"是否相同"。所有神经元初始权重一样 → 输出一样 → 梯度一样 → 永远对称。这就是为什么用随机初始化。' },
      { v: '不存在了，因为非零值打破了死区', mId: 'M-BP-02',
       why: '非零≠不对称。只要所有神经元的初始权重完全相同，对称性就在。' },
      { v: '取决于激活函数是 sigmoid 还是 ReLU', mId: 'M-BP-02',
       why: '对称性问题和激活函数的选择无关（ReLU 在输入全同时输出也全同）。' }
    ]
  },
  {
    q: 'sigmoid 导数的最大值只有 0.25。一个 10 层的 sigmoid 网络中，从输出层传到第 1 层的梯度大约衰减到原始的多少？',
    time: 90,
    key: 'M-BP-03',
    options: [
      { v: '约 0.25¹⁰ ≈ 10⁻⁶，几乎为零', ok: true,
        why: '反向传播是链式法则的连乘。sigmoid 的 σ′ ≤ 0.25，经过 10 层就是 0.25¹⁰ ≈ 百万分之一。这就是"梯度消失"的数学根源。' },
      { v: '约 0.25 × 10 = 2.5，基本不变', mId: 'M-BP-03',
       why: '是连乘不是相加！每过一个 sigmoid 层，梯度至少乘 0.25，是指数衰减而非线性。' },
      { v: '取决于损失函数的类型', mId: 'M-BP-03',
       why: '损失函数影响初始梯度的大小，但每层的衰减因子 σ′ ≤ 0.25 是 sigmoid 自身的性质，与损失函数无关。' }
    ]
  },
  {
    q: 'ReLU 在输入 < 0 时梯度为 0。如果一个神经元在训练过程中所有输入都变成负数，它还能被"救活"吗？',
    time: 90,
    key: 'M-BP-03',
    options: [
      { v: '通常不能——它的梯度恒为 0，权重永远不更新，这就是"神经元死亡"', ok: true,
        why: 'ReLU(x) = max(0,x)，当 x < 0 时 ∂ReLU/∂x = 0。梯度为零 → 权重不变 → 输入永远为负 → 死循环。学习率过大是常见诱因。' },
      { v: '可以，因为其他神经元的梯度会间接影响它', mId: 'M-BP-03',
       why: '如果这个神经元自身的输出恒为 0，它对下游的贡献也是 0，下游的梯度无法传回来。' },
      { v: '可以，因为 BatchNorm 会自动调整输入分布', mId: 'M-BP-03',
       why: 'BN 确实可能帮助一些边缘情况，但如果权重已经使得所有输入都在负半区且梯度为 0，BN 也无法通过反向传播修复它。' }
    ]
  },
  {
    q: 'mini-batch size = 1（纯 SGD）的梯度估计与 size = 全数据（Batch GD）相比，方差有什么区别？对最终收敛到的解有什么影响？',
    time: 120,
    key: 'M-GD-01',
    options: [
      { v: 'SGD 方差更大、解更"跳出"尖锐极小；Batch GD 方差为零、倾向停在第一个驻点', ok: true,
        why: 'SGD 的噪声恰恰是优势：它像"模拟退火"，帮助跳出尖锐的（泛化差的）极小值；Batch GD 太"精确"，容易停在浅而差的局部最优点。' },
      { v: '两者方差相同，只是速度不同', mId: 'M-GD-01',
       why: 'SGD 每步只用一个样本估计梯度，方差远大于全数据平均。这是它"噪声大"的原因，也是它的正则化效果来源。' },
      { v: 'Batch GD 的方差更大，因为数据量更大', mId: 'M-GD-01',
       why: '反过来。全数据求平均后，梯度估计是确定性的（方差为 0）。单样本的梯度波动最大。' }
    ]
  },
  {
    q: '动量法 v ← βv − η∇L 中，β = 0.9 vs β = 0.99：哪个的"记忆"更长（历史梯度的影响更持久）？对越过局部极小的能力有什么影响？',
    time: 90,
    key: 'M-GD-03',
    options: [
      { v: 'β=0.99 记忆更长，惯性更大，更容易冲过窄的局部极小，但也更难精确收敛', ok: true,
        why: '有效记忆窗口 ≈ 1/(1-β)。β=0.9 窗口约 10 步，β=0.99 窗口约 100 步。惯性大→冲得远→适合逃离浅坑，但也容易在最优点附近震荡。' },
      { v: 'β=0.9 记忆更长，因为它衰减更慢', mId: 'M-GD-03',
       why: '0.9 的衰减比 0.99 更快（0.9¹⁰ ≈ 0.35 vs 0.99¹⁰ ≈ 0.90），所以 0.99 才是更长的记忆。' },
      { v: '两者记忆长度相同，区别只在步长', mId: 'M-GD-03',
       why: 'β 直接控制指数衰减率，是记忆长度的唯一决定因素。' }
    ]
  },
  {
    q: '一个 2→4→4→1 的 MLP：如果把中间两层从 4 个神经元扩到 100 个，参数量的增长是线性还是超线性的？为什么？',
    time: 120,
    key: 'M-PR-01',
    options: [
      { v: '超线性（近似平方）——参数量 ∝ 层宽的乘积，因为全连接是 W₁·W₂ 的矩阵乘法', ok: true,
        why: '参数量 = (2×4 + 4×4 + 4×1) = 28 → (2×100 + 100×100 + 100×1) = 10300。增长主要来自 100×100 = 10000，是平方级。这就是 CNN 用权值共享替代全连接的动机。' },
      { v: '线性——每多一个神经元多一份参数', mId: 'M-PR-01',
       why: '全连接层的参数量是前后两层宽度的乘积，增加宽度时参数量按乘积增长，不是按个数线性增长。' },
      { v: '取决于激活函数的选择', mId: 'M-PR-01',
       why: '激活函数不改变参数量，参数量由网络结构（层数×宽度）唯一决定。' }
    ]
  }
];

// --- 论述题 ---
export const CH2_ESSAY = [
  {
    q: '用不超过 200 字向一个懂微积分但不懂深度学习的同学解释：<b>为什么需要反向传播算法，而不是直接对每个权调用数值导数 ∂L/∂w ≈ [L(w+ε) − L(w−ε)] / 2ε？</b><br><br>提示：从计算量的角度思考。',
    rubric: [
      '指出数值导数需要对每个权重额外计算 2 次前向传播',
      '指出百万级参数的网络意味着百万 × 2 次前向传播，不可行',
      '反向传播只需一次前向 + 一次反向即可同时算出所有参数的梯度',
      '提到链式法则 / 计算图 / 动态规划避免重复计算中的至少一个',
      '逻辑清晰、用语适合目标读者（懂微积分但不 DL）'
    ],
    minLength: 80,
    hint: '核心思路：比较两种方法的计算复杂度。数值方法要 O(W) 次前向传播，反向传播只要 1 次。'
  },
  {
    q: '你正在训练一个网络。训练损失持续下降（已降到 0.01），但验证损失从 0.08 开始上升（现在 0.15）。<b>列出至少 3 种可能的原因，并为每种原因提出一个具体的诊断方法和解决方案。</b>',
    rubric: [
      '过拟合（模型容量过大或数据不足）→ 诊断：看训练/验证曲线分叉 → 解法：正则化/早停/数据增强',
      '学习率过大导致在最优点附近震荡 → 诊断：看损失曲线是否剧烈抖动 → 解法：降低学习率',
      '数据泄漏（验证集分布与训练集不一致）→ 诊断：检查数据划分方式 → 解法：重新随机划分',
      'BatchNorm 在小 batch 下的统计量不稳定 → 诊断：尝试增大 batch size → 解法：换 GroupNorm',
      '至少给出 3 个原因+诊断+方案的完整闭环',
      '用因果关系解释"为什么"而不只是列公式'
    ],
    minLength: 150,
    hint: '从"训练好、验证差"这个 gap 出发，思考哪些因素可以造成 train 和 val 表现的分歧。'
  }
];

// --- 关卡类（由 LevelBase 子类使用引擎）---
import { LevelBase } from '../engine/level-base.js';
import { mountHUD } from '../ui/hud.js';
import { mountDrawer } from '../ui/drawer.js';
import { toast } from '../ui/toast.js';

export default class L2Think extends LevelBase {
  static id = 'l2t'; static title = '第 2 章 · 深度思考';

  mount() {
    const cfg = this.cfg = LEVELS[this.constructor.id] || {};
    this.root.innerHTML = `<div class="level-page fade-in"><div id="stage"></div><div id="aihost"></div></div>`;
    // 先做 8 道思考题
    const engine = new ThinkEngine(this.root.querySelector('#stage'), this.ctx);
    engine.startThink(CH2_THINK, '第 2 章 · 深度思考');
  }
  onTutorHint() {}
  showTutorMessage(a) {}
  restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/l2t', 0); }
}

export class L2Essay extends LevelBase {
  static id = 'l2e'; static title = '第 2 章 · 论述题';

  mount() {
    this.root.innerHTML = `<div class="level-page fade-in"><div id="stage"></div><div id="aihost"></div></div>`;
    const engine = new EssayEngine(this.root.querySelector('#stage'), this.ctx);
    // 随机选一道论述题
    const item = CH2_ESSAY[Math.floor(Math.random() * CH2_ESSAY.length)];
    engine.startEssay(item);
  }
  onTutorHint() {}
  showTutorMessage(a) {}
  restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/l2e', 0); }
}
