// 第 3-6 章深度思考+论述题关卡（数据从 deep-think-data.js 导入，引擎渲染）
import { LevelBase } from '../engine/level-base.js';
import { ThinkEngine } from '../engine/think-engine.js';
import { EssayEngine } from '../engine/essay-engine.js';
import { LEVELS } from '../data/levels.js';
import { CH3_THINK, CH3_ESSAY, CH4_THINK, CH4_ESSAY, CH5_THINK, CH5_ESSAY, CH6_THINK, CH6_ESSAY } from '../data/deep-think-data.js';

function makeThink(id, title, items) {
  return class extends LevelBase {
    static id = id; static title = title;
    mount() {
      this.root.innerHTML = `<div id="stage"></div>`;
      const engine = new ThinkEngine(this.root.querySelector('#stage'), this.ctx);
      engine.startThink(items, title);
    }
    onTutorHint() {} showTutorMessage(a) {}
    restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/' + id, 0); }
  };
}
function makeEssay(id, title, items) {
  return class extends LevelBase {
    static id = id; static title = title;
    mount() {
      this.root.innerHTML = `<div id="stage"></div>`;
      const engine = new EssayEngine(this.root.querySelector('#stage'), this.ctx);
      engine.startEssay(items[Math.floor(Math.random() * items.length)]);
    }
    onTutorHint() {} showTutorMessage(a) {}
    restart() { location.hash = '#/map'; setTimeout(() => location.hash = '#/level/' + id, 0); }
  };
}

export const L3Think = makeThink('l3t', '第 3 章 · CNN 深度思考', CH3_THINK);
export const L3Essay = makeEssay('l3e', '第 3 章 · 论述题', CH3_ESSAY);
export const L4Think = makeThink('l4t', '第 4 章 · 序列模型深度思考', CH4_THINK);
export const L4Essay = makeEssay('l4e', '第 4 章 · 论述题', CH4_ESSAY);
export const L5Think = makeThink('l5t', '第 5 章 · Transformer 深度思考', CH5_THINK);
export const L5Essay = makeEssay('l5e', '第 5 章 · 论述题', CH5_ESSAY);
export const L6Think = makeThink('l6t', '第 6 章 · 生成模型深度思考', CH6_THINK);
export const L6Essay = makeEssay('l6e', '第 6 章 · 论述题', CH6_ESSAY);
