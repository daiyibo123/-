# 《手搓神经网络》webapp

深度学习课程智慧教育闯关 H5。浏览器即开即玩，免安装免注册，断网可完整游玩（AI 助教自动降级为内置提示阶梯）。

## 快速开始

方式一：双击项目根目录的 `启动手搓神经网络.bat`

方式二（命令行）：

```bash
node tools/serve.mjs 8799        # 零依赖静态服务器
# 打开 http://127.0.0.1:8799/
```

完整服务端（含 AI 助教代理 + 匿名学情统计 + 教师看板）：

```bash
cd server && npm install
# 可选：配置 AI（不配也能玩，前端自动降级）
set TUTOR_API_KEY=你的key      (Windows)   /  export TUTOR_API_KEY=...  (bash)
npm start                       # http://127.0.0.1:8800  看板: /dashboard
```

## 关卡

| 关 | 名称 | 知识点 | 主交互 |
|---|---|---|---|
| L1 | 划一刀 | 线性分类/偏置/XOR | 拖拽直线、旋钮、滑块 |
| L2 | 梯度下山 | 学习率/发散/动量 | 八向摇杆 + 换挡拨杆 |
| L3 | 误差快递站 | 反向传播（旗舰） | 导数卡拖放投递 |
| L4 | 你是卷积核 | 卷积/特征图/池化 | 拖动滑窗 + 九宫格拨轮 |
| L5 | 网络诊室 | 过拟合/正则化 | 诊断牌拖挂 + 药架处方 + 标尺 |
| L6 | 注意力连线 | Q/K/V/softmax | 拖线调强度 + 身份配对 |

L7/L8 为扩展关卡（地图上锁定）。

## 工程说明

- 无构建、原生 ES Modules；关卡模块只依赖统一 `LevelInterface` 契约（`js/engine/level-base.js`）
- 内容=数据：关卡数值/知识点/提示语在 `js/data/*.js`（对应开发文档 7.2 节 schema）
- 本地优先：进度/动作日志存 IndexedDB；`tools/gen_levels.mjs` 校验 L3 金标准数值，`tools/gen_curves.mjs` 生成 L5 真实训练曲线（均为 Node，无 Python）
