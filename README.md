# 《手搓神经网络》——深度学习课程交互式学习系统

面向长春理工大学《深度学习》课程（48 学时）的 H5 闯关式学习应用：**第 2–6 章 × 每章 4 个互动案例**，配"精讲 → 案例 → 知识路智能体 → 单元测评+个人报告"四段式教学流（多邻国式）。零依赖、离线可用、AI 助教三级降级。

## 一、快速启动

**方式 A（推荐，零依赖）**：双击 `启动手搓神经网络.bat` → 浏览器打开 `http://127.0.0.1:8799/`
（等价命令：`node tools/serve.mjs 8799`，仅需 Node.js ≥18，无需 npm install）

**方式 B（带后端：AI 助教 API + 学情看板 + 事件入库）**：
```bash
cd server && npm install && npm start     # 端口 8800；/dashboard 看板
```
未配置后端时前端自动降级：AI 助教走 IndexedDB 缓存 → 内置提示阶梯，离线全功能可玩。

**方式 C（Docker，适合服务器部署）**：

```bash
cp .env.example .env
# 可选：编辑 .env，填写 TUTOR_API_KEY
docker compose up -d --build
```

启动后访问 `http://服务器地址:8800/`，教师看板位于 `/dashboard`，健康检查位于 `/api/health`。
SQLite 数据保存在 Docker 命名卷 `app-data` 中，重新创建容器不会丢失。若 8800 端口已占用，可在 `.env` 中修改 `APP_PORT`。

更新部署：

```bash
git pull
docker compose up -d --build
```

停止服务：`docker compose down`。不要使用 `docker compose down -v`，后者会同时删除学习数据卷。

## 二、目录结构

```
├ webapp/                  前端（原生 ES Modules，无构建）
│  ├ index.html
│  ├ css/                  tokens/base/map/level/result（多邻国式视觉体系（浅灰底白卡片·五章分色蓝绿橙紫红·绿色 3D 主按钮·语义色））
│  └ js/
│    ├ main.js             hash 路由 + 通关结算 + 事件上报
│    ├ pages/              units(路径) lesson(精讲) unitquiz(测评) ureport(报告) agent(智能体) intro result codex report settings
│    ├ levels/             20 个案例（l1,l2,l2b,l5 | l3a,l4,l3b,l3c | l4a-d | l5a,l6,l5b,l5c | l6a-d）
│    ├ engine/             level-base(关卡契约/拖放) registry scorer recorder rng
│    ├ ui/                 controls(旋钮/摇杆/拨杆/步进) drawer(宠物"突触") modal toast particles hud
│    ├ ai/tutor.js         AI 三级降级（API→IndexedDB 缓存→hints.json）
│    ├ data/               units(章节知识库) levels(关卡配置) knowledge(知识点/误区/成就/图鉴) hints curves
│    └ store/idb.js        IndexedDB 本地存档（失败时内存兜底）
├ server/                  可选后端（Express+SQLite：/api/tutor /api/events /api/stats /dashboard）
├ tools/                   serve.mjs(静态服务器) gen_levels.mjs(金标准校验) gen_curves.mjs(训练曲线生成)
├ docs/                    设计文档（案例总设计 v3 + 11 份案例文档 + 章节与教学模式方案）+ 交付素材/截图
└ 启动手搓神经网络.bat
```

## 三、教学内容架构（对齐教学大纲 2022 版）

| 章 | 案例与针对考点 |
|---|---|
| 2 深度学习基础 | 划一刀（课程原例：上课×作业→及格线，偏置/异或）· 误差往回流（模块化反向传播，课件讲法）· 梯度下山（学习率/发散/动量/SGD 算力竞速）· 诊室·先预测（三集指标/过拟合/测试集无曲线） |
| 3 CNN | 尺寸车间（输出尺寸/参数量，大纲考核+课程 7×7 原例）· 核工坊（设计核+逆向猜核）· 平移的阴谋（池化不变性/层级抽象）· 结构进化史（LeNet→ResNet+残差实验） |
| 4 序列模型 | 展开时间轴（权重共享拍卡）· 梯度的长途旅行（BPTT 连乘消失实感）· 三扇门（LSTM 门控 A/B 任务）· 一句一句生成（Seq2Seq/Teacher Forcing/困惑度） |
| 5 Transformer | 手算台（Scaled Dot-Product 手算，大纲考核）· 读心连线（分布+温度+多头）· 因果之幕（Mask+位置编码）· 王座之争（与 RNN 三轴对决） |
| 6 生成模型 | 压缩工坊 AE（插值鬼影）· 潜空间 VAE（采样/重参数化）· 猫鼠大战 GAN（**页内真实交替训练**+模式崩溃）· 从噪声里捞图（真实加噪/去噪） |

每个案例 = 预测-验证 / 直觉训练 / 诊断纠错三类形态之一；错题按 49 条误区库（M-*）归因，贯通提示阶梯、AI 助教与学情报告。

**知识图鉴（#/codex）共 27 卡**：章节卡 14 张（随通关解锁）+ **先修基础卡 13 张（默认开放）**——先修 · 线性代数（向量点积/矩阵乘法/转置/形状广播）、先修 · 微积分（导数/梯度/复合函数求导）、先修 · 概率（交叉熵/采样与温度）、先修 · 机器学习（监督学习/三集划分/评价指标/过拟合）。AI 助手"突触"在所有界面常驻可问答（自动携带当前误区上下文）。

## 四、四段式教学流（每章一条路径）

`📘 精讲（翻卡：重点+难点预告）→ ⚡ 4 案例（按序解锁）→ 🧠 知识路智能体（苏格拉底问答逐节点点灯）→ 📝 单元测评 → 📄 个人分析报告`

个人报告（规则引擎，可追溯）：大纲基本要求逐条对照（案例星级 40% + 测评首答 40% + 知识路 20%）· 误区暴露榜 Top3 · 学习行为（次数/用时/提示依赖）· 3 条个性化建议。上章测评过关解锁下一章。

## 五、如何新增/修改一个案例（5 步）

1. `js/levels/lXX_xxx.js`：新建类继承 `LevelBase`（约定：`static id/title` + `mount()`，用 `this.record()` 记事件、`this.right()/wrong(el, mId)` 演出反馈、`this.finish(extra)` 结算）；可复用 `ui/controls.js` 物理控件与各案例的 `ask()` 预测问答模式；
2. `js/engine/registry.js`：import 并加入 `LEVEL_CLASSES`；
3. `js/data/levels.js`：加配置（story/goal/scoring/hints/seed），加入 `ORDER` 与所在章 `unit`；
4. `js/data/units.js`：把新案例 id 放进对应章 `cases`；精讲卡/测评题/智能体节点按需增补；
5. 若引入新误区：`knowledge.js` + `hints.js` + `server/index.js` MIS 副本三处同步。

内容校准入口：`units.js`（章节知识库）、`levels.js`（文案/星级）、各关卡文件头部的数据常量（全部带课件页码注释）。

## 六、交付状态摘要（2026-10）

- **试用情况**：28 名同学完成试玩，主线 20 案例整体通关率 60%–80%；试玩反馈驱动 5 轮可用性迭代（视觉体系 3 版演进、案例页单屏化、SVG 字号四档标准化、AI 面板布局修正），测试驱动修复教学判定缺陷 6 处并全部回归验证。
- **一屏适配**：全部案例页实测单屏内完成（无滚动遗漏交互）。
- **视觉体系**：多邻国式语义色（浅灰底白卡片 · 五章分色蓝绿橙紫红 · 绿色 3D 主按钮）。
- **答辩材料**：docs/交付素材/手搓神经网络_答辩.pptx（13 页，按创新性/技术性/艺术性/完成度四维组织）。

## 六、测试与部署注意事项

- 本地开发改完代码后**强制刷新**（Ctrl+F5）或带 `?fresh=时间戳` 访问，避免模块缓存；
- 所有动画用 `setTimeout` 时间补偿驱动（不用 rAF），后台标签页节流下仍能正确完成；
- 部署：推荐用根目录 `docker-compose.yml` 部署完整服务；也可只把 `webapp/` 放到任意静态服务器/Nginx；
- 密钥：只通过服务器环境变量或 `.env` 配置 `TUTOR_API_KEY`，不要提交真实密钥；
- 已知边界：第 6 章 AE/VAE 演示与 Teacher Forcing 对比曲线为**教学构造**（页面上已标注），GAN/扩散/反传金标准值为真实计算；联机 AI 需在 `server` 配置 API Key。

## 七、更多文档

- 总体设计：`docs/案例总设计_v3_第2-6章.md`、`docs/章节与教学模式重构方案_v2.md`
- 各案例设计：`docs/案例设计/*.md`（11 份，含考点针对性与误区接线）
- 交付截图：`docs/交付素材/截图/`
- 答辩演示：`《手搓神经网络_答辩.pptx`（随包交付）
