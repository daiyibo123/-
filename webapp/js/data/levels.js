// 关卡内容配置（内容=数据：教师校准课件引用、增补干扰卡只改本文件）
// 章节结构见 data/units.js（第2–6章 × 每章4案例 × 四段式教学）
// 已退役：l3 误差快递站（被 2-2 模块化反传取代）、l7/l8 占位（l7 拆为 l4a/l4b）
export const ORDER=['l2t','l2e','l1','l2b','l2','l5','l3t','l3e','l3a','l4','l3b','l3c','l4t','l4e','l4a','l4b','l4c','l4d','l5t','l5e','l5a','l6','l5b','l5c','l6t','l6e','l6a','l6b','l6c','l6d'];

export const LEVELS={
l2t:{id:"l2t",title:"第2章·深度思考",topic:"非线性·初始化·梯度·优化",diff:2,unlock:[],unit:"u2",chapter:"思考题",story:"8道深度思考题，每题倒计时。",goal:"完成8道思考题",scoring:{star2MaxErrors:3}},
l2e:{id:"l2e",title:"第2章·论述题",topic:"反向传播·训练诊断",diff:3,unlock:["l2t"],unit:"u2",chapter:"论述题",story:"自由写作，AI批改。",goal:"完成论述题",scoring:{star2MaxErrors:1}},
/* ===== 第 2 章 深度学习基础 ===== */
l1:{
  id:'l1',title:'划一刀',topic:'神经元·决策边界·偏置',diff:1,unlock:[],unit:'u2',
  chapter:'第2章 深度学习基础 · 2-1',
  story:'你是一枚刚通电的神经元：线性加权 + 非线性判断。课程原例：上课次数 × 交作业次数，决定能否通过课程。',
  goal:'拖动直线（或拧旋钮、调偏置滑块）使训练点 100% 正确分类；最后直面异或——单层的极限',
  scoring:{star2MaxErrors:2},hints:['H-LC-1']
},
l2b:{
  id:'l2b',title:'误差往回流',topic:'反向传播·两种模块',diff:2,unlock:['l1'],unit:'u2',
  chapter:'第2章 深度学习基础 · 2-2（本章最难：链式法则）',
  story:'网络只有两种模块：σ 站和加权求和层。每种模块一条反向规则——五步预测走通它，顺便解开"PyTorch 里为什么到处是转置"。',
  goal:'五步预测通关：非线性模块（链式法则）→加权求和模块（扰动回传）→隐藏站 σ→向量化转置揭秘',
  scoring:{star2MaxErrors:1,minSteps:5},hints:['H-BP-1','H-BP-2']
},
l2:{
  id:'l2',title:'梯度下山',topic:'学习率·发散·动量·SGD',diff:2,unlock:['l2b'],unit:'u2',
  chapter:'第2章 深度学习基础 · 2-3',
  story:'你驮着参数包从损失之山上下来。步子太大，会被弹射出山谷；太小，天黑前到不了山脚。最后一座山考算力：全批方向准但太贵，小批又抖又便宜。',
  goal:'前三座山在步数预算内到达谷底（loss<0.05）；第四座山先预测再换批大小，用算力预算 2.0 绕过禁地到达火种',
  budget:26,eps:0.05,
  gears:[{label:'0.05',v:0.05},{label:'0.2',v:0.2},{label:'1.0',v:1.0},{label:'5.0',v:5.0}],
  scoring:{star2MaxErrors:4},hints:['H-GD-1','H-GD-4']
},
l5:{
  id:'l5',title:'诊室·先预测',topic:'三集指标·过拟合·处方',diff:2,unlock:['l2'],unit:'u2',
  chapter:'第2章 深度学习基础 · 2-4（大纲：三集指标分析）',
  story:'炼丹房的模型们病了。你是网络医生：先读曲线猜出病因配置，再下诊断、开处方。药不对症，病情会加重。',
  goal:'每份病历先预测训练配置，再挂对诊断牌、拖入正确处方；毕业考核答对三集划分',
  golds:['dropout','l2','early','bigger','lrfix'],
  scoring:{star2MaxErrors:2},hints:['H-OF-1']
},
l3t:{id:'l3t',title:'第3章·深度思考',topic:'CNN 原理·残差·BN',diff:2,unlock:[],unit:'u3',chapter:'思考题',story:'深度思考题',goal:'完成',scoring:{star2MaxErrors:3}},
l3e:{id:'l3e',title:'第3章·论述题',topic:'论述',diff:3,unlock:['l3t'],unit:'u3',chapter:'论述题',story:'AI 批改',goal:'完成',scoring:{star2MaxErrors:1}},
l4t:{id:'l4t',title:'第4章·深度思考',topic:'RNN·LSTM·梯度',diff:2,unlock:[],unit:'u4',chapter:'思考题',story:'深度思考题',goal:'完成',scoring:{star2MaxErrors:3}},
l4e:{id:'l4e',title:'第4章·论述题',topic:'论述',diff:3,unlock:['l4t'],unit:'u4',chapter:'论述题',story:'AI 批改',goal:'完成',scoring:{star2MaxErrors:1}},
l5t:{id:'l5t',title:'第5章·深度思考',topic:'注意力·复杂度·多头',diff:2,unlock:[],unit:'u5',chapter:'思考题',story:'深度思考题',goal:'完成',scoring:{star2MaxErrors:3}},
l5e:{id:'l5e',title:'第5章·论述题',topic:'论述',diff:3,unlock:['l5t'],unit:'u5',chapter:'论述题',story:'AI 批改',goal:'完成',scoring:{star2MaxErrors:1}},
l6t:{id:'l6t',title:'第6章·深度思考',topic:'AE/VAE·GAN·扩散',diff:2,unlock:[],unit:'u6',chapter:'思考题',story:'深度思考题',goal:'完成',scoring:{star2MaxErrors:3}},
l6e:{id:'l6e',title:'第6章·论述题',topic:'论述',diff:3,unlock:['l6t'],unit:'u6',chapter:'论述题',story:'AI 批改',goal:'完成',scoring:{star2MaxErrors:1}},
/* ===== 第 3 章 卷积神经网络 ===== */
l3a:{
  id:'l3a',title:'尺寸车间',topic:'输出尺寸与参数量',diff:1,unlock:['l5'],unit:'u3',
  chapter:'第3章 CNN · 3-1（大纲考核：尺寸/参数量计算）',
  story:'卷积层的两个必考计算：输出尺寸和参数量。先玩明白公式怎么来，再连对五题出师（含课程 7×7 原例与全连接参数量）。',
  goal:'第一幕拖拨轮看懂 O=⌊(W−F+2P)/S⌋+1；第二幕连对 5 题（含取整陷阱与参数量）通关',
  scoring:{star2MaxErrors:2,minSteps:5},hints:['H-SZ-1','H-PR-1']
},
l4:{
  id:'l4',title:'核工坊',topic:'设计核·逆向猜核',diff:2,unlock:['l3a'],unit:'u3',
  chapter:'第3章 CNN · 3-2（难点：核↔特征图因果）',
  story:'千面之眼失明了。你必须亲手设计它的瞳孔——一枚 3×3 卷积核；再反过来，只看响应图猜出是哪枚核。',
  goal:'设计核检测指定方向边缘/暗记（相似度≥0.85）；逆向题：从特征图反推四个候选核中的哪一个',
  kernel:[[1,0,-1],[2,0,-2],[1,0,-1]],
  cells:[[0,0],[0,3],[0,6],[3,0],[3,3],[3,6],[6,0],[6,3],[6,6]],
  targetKernel:[[0,-1,0],[-1,4,-1],[0,-1,0]],
  simThreshold:0.85,simGreat:0.95,
  scoring:{star2MaxErrors:2},hints:['H-CV-1']
},
l3b:{
  id:'l3b',title:'平移的阴谋',topic:'池化·平移不变性·特征层级',diff:1,unlock:['l4'],unit:'u3',
  chapter:'第3章 CNN · 3-3（大纲：池化与特征层级抽象）',
  story:'目标在图里悄悄挪了两格。卷积响应炸了锅，池化后的最强响应却稳如老狗——先猜后看，见识"不变性"的代价。',
  goal:'预测目标平移前后卷积响应与 max-pool 响应的变化；再对比浅层/深层特征看"层级抽象"',
  scoring:{star2MaxErrors:2},hints:['H-CV-1']
},
l3c:{
  id:'l3c',title:'结构进化史',topic:'LeNet→ResNet·残差',diff:2,unlock:['l3b'],unit:'u3',
  chapter:'第3章 CNN · 3-4（大纲：比较经典结构）',
  story:'从 LeNet 到 ResNet 三十年：小核、加深、残差——每一步都是被上一步的痛点逼出来的。把时间线排对，再亲手看残差怎么救梯度。',
  goal:'结构卡按时间线与关键改进排序全对；残差梯度小实验：预测有/无捷径时深层的梯度大小',
  scoring:{star2MaxErrors:2},hints:['H-CV-1']
},
/* ===== 第 4 章 序列模型 ===== */
l4a:{
  id:'l4a',title:'展开时间轴',topic:'RNN·权重共享·隐状态',diff:1,unlock:['l3c'],unit:'u4',
  chapter:'第4章 序列模型 · 4-1（课件 S33：展开计算图）',
  story:'带自环的 RNN 看不清？沿时间轴展开它——然后把同一枚"W 卡"亲手拍到每一个时间步上，看隐状态怎么接力。',
  goal:'把共享权重卡放到每个时间步完成展开计算图；沿隐状态接力传完一个序列',
  scoring:{star2MaxErrors:2},hints:['H-SQ-1']
},
l4b:{
  id:'l4b',title:'梯度的长途旅行',topic:'BPTT·梯度消失',diff:2,unlock:['l4a'],unit:'u4',
  chapter:'第4章 序列模型 · 4-2（全课最难点：连乘消失）',
  story:'句首的线索，句尾的误差要怎么怪回去？误差包裹沿时间轴一站站倒传——每过一站乘 0.5。猜猜传回首站还剩多少。',
  goal:'预测 0.5 连乘 N 步后误差残量并验证；对照无衰减曲线理解"长序列的诅咒"',
  scoring:{star2MaxErrors:2},hints:['H-SQ-2']
},
l4c:{
  id:'l4c',title:'三扇门',topic:'LSTM·门控记忆',diff:2,unlock:['l4b'],unit:'u4',
  chapter:'第4章 序列模型 · 4-3（课件 S75-76）',
  story:'细胞状态 C 是条信息高速公路，三扇门把着出入口：遗忘门（该忘）、输入门（该写）、输出门（该读）。拖动门开度，让指定记忆活到最后。',
  goal:'通过调三门开度，让目标信息在长序列末端存活/被遗忘；理解 C 与 h 两条通路',
  scoring:{star2MaxErrors:2},hints:['H-SQ-3']
},
l4d:{
  id:'l4d',title:'一句一句生成',topic:'Seq2Seq·Teacher Forcing·困惑度',diff:2,unlock:['l4c'],unit:'u4',
  chapter:'第4章 序列模型 · 4-4（大纲：编码解码/TF/困惑度）',
  story:'编码器把一句话压成一个向量，解码器逐词吐出来。训练时喂真词（Teacher Forcing）收敛飞快——生成时可没人喂答案。开关它，亲眼看落差。',
  goal:'完成一次编码→解码生成；开关 Teacher Forcing 对比训练曲线；预测两段输出的困惑度高低',
  scoring:{star2MaxErrors:2},hints:['H-SQ-4']
},
/* ===== 第 5 章 Transformer 与注意力 ===== */
l5a:{
  id:'l5a',title:'手算台',topic:'Scaled Dot-Product 手算',diff:2,unlock:['l4d'],unit:'u5',
  chapter:'第5章 Transformer · 5-1（大纲考核：手算 score/softmax/输出）',
  story:'大纲要求手算注意力：score → softmax → 加权输出。三步走一遍，再解开 √d 的谜。',
  goal:'四步预测通关：score=q·k/√d → softmax 权重 → out=Σwᵢvᵢ → 为什么除 √d',
  scoring:{star2MaxErrors:1,minSteps:4},hints:['H-AT-3']
},
l6:{
  id:'l6',title:'读心连线',topic:'注意力分布·温度·多头',diff:2,unlock:['l5a'],unit:'u5',
  chapter:'第5章 Transformer · 5-2（难点：分布与消歧）',
  story:'读心试炼。句子里的每个词都藏着念力——牵出 "it" 真正看向谁；再用温度滑杆感受分布的锋利与平滑。',
  goal:'拖线调强度后 softmax，与真实模型分布比对（余弦≥0.80）；温度两问+多头一问全对',
  tokens:['The','animal',"didn't",'cross','the','street','because','it','was','too','tired'],
  focus:7,
  ref:[0.03,0.42,0.04,0.06,0.02,0.18,0.06,0.02,0.03,0.04,0.10],
  simThreshold:0.80,
  scoring:{star2MaxErrors:2},hints:['H-AT-1']
},
l5b:{
  id:'l5b',title:'因果之幕',topic:'Mask·位置编码·并行',diff:2,unlock:['l6'],unit:'u5',
  chapter:'第5章 Transformer · 5-3（大纲：Mask 与位置编码）',
  story:'给注意力拉一道因果之幕：未来词被盖住，分布如何重排？再打乱词序——你会震惊地发现注意力"毫无反应"，直到位置编码登场。',
  goal:'预测 Mask 前后的注意力分布变化；词序打乱实验引出位置编码；理解训练并行/生成串行',
  scoring:{star2MaxErrors:2},hints:['H-AT-3']
},
l5c:{
  id:'l5c',title:'王座之争',topic:'Transformer vs RNN',diff:2,unlock:['l5b'],unit:'u5',
  chapter:'第5章 Transformer · 5-4（大纲：与 RNN/LSTM 差异分析）',
  story:'同一个长句，一处远距离依赖。RNN 沿时间轴一步步传，注意力一步直连——三轴对决：长依赖、并行性、算力。预测谁赢。',
  goal:'长依赖赛跑实验观察两种机制；长依赖/并行性/算力三轴预测题全对',
  scoring:{star2MaxErrors:2},hints:['H-AT-3']
},
/* ===== 第 6 章 深度生成模型 ===== */
l6a:{
  id:'l6a',title:'压缩工坊（AE）',topic:'编码重构·潜空间',diff:1,unlock:['l5c'],unit:'u6',
  chapter:'第6章 生成模型 · 6-1',
  story:'把样本压成几个数字，再从这几个数字还原回去——自编码器是台复读机。但把两个真实样本的潜码取中点，出来的是什么？先猜再看。',
  goal:'三张潜码（真码/错码/插值码）的重构结果先预测后验证，发现"AE 只会复印不会创造"',
  scoring:{star2MaxErrors:2},hints:['H-GE-1']
},
l6b:{
  id:'l6b',title:'会做梦的潜空间（VAE）',topic:'KL·采样·重参数化',diff:2,unlock:['l6a'],unit:'u6',
  chapter:'第6章 生成模型 · 6-2',
  story:'给潜空间立规矩（KL 约束），它就从散点云变成连续的"梦乡"——滑动采样点，输出平滑过渡。生成，就此诞生。',
  goal:'潜空间滑杆采样，预测输出序列的平滑过渡；重参数化 z=μ+σ⊙ε 一图懂',
  scoring:{star2MaxErrors:2},hints:['H-GE-2']
},
l6c:{
  id:'l6c',title:'猫鼠大战（GAN）',topic:'对抗训练·模式崩溃',diff:2,unlock:['l6b'],unit:'u6',
  chapter:'第6章 生成模型 · 6-3（难点：对抗动力学）',
  story:'生成器造假、判别器打假，训练场就是它们的战场。看懂 D-G 振荡曲线，再诊断"只会画一种猫"的怪病。',
  goal:'真实对抗训练曲线判读（振荡≠失败）；模式崩溃诊断题；预测 G/D 强弱失衡的后果',
  scoring:{star2MaxErrors:2},hints:['H-GE-3']
},
l6d:{
  id:'l6d',title:'从噪声里捞图（扩散）',topic:'前向加噪·逆向去噪',diff:2,unlock:['l6c'],unit:'u6',
  chapter:'第6章 生成模型 · 6-4',
  story:'正向：一步步把图加噪到认不出；反向：训练网络每次只去掉一点噪。滑动 t，预测中途的样子，再来一次反向打捞。',
  goal:'滑动 t 预测加噪程度；逆向逐步复原；理解"每步只去一点噪"的稳定代价',
  scoring:{star2MaxErrors:2},hints:['H-GE-4']
}
};
