import { profile } from '../store/idb.js';
export function renderIntro(app){
  const p=profile();
  const hasSave=p&&Object.keys(p.stars).length>0;
  app.innerHTML=`
  <div class="fade-in" style="min-height:88vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:26px">
    <div style="font-family:var(--mono);color:var(--sig);font-size:13px;letter-spacing:.35em">DEEP LEARNING · PLAY BY HAND</div>
    <h1 class="grad-text" style="font-size:clamp(38px,7vw,64px);letter-spacing:.04em">手搓神经网络</h1>
    <p class="dim" style="max-width:560px;line-height:2;font-size:15px">
      在这里，你不"看"神经网络的可视化动画——你<b style="color:var(--text)">亲手当</b>它本身：<br>
      拖出决策边界 · 驾着梯度下山 · 把误差包裹一站站送回去 · 滑过图卷当一枚卷积核。<br>
      <span class="dim2">你的每一次动手，都对应公式的一步。</span>
    </p>
    <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center">
      <button class="btn primary" style="font-size:17px;padding:13px 34px" id="go">${hasSave?'继续学习':'开始学习'} ⚡</button>
    </div>
    <div class="dim2 small" style="margin-top:8px">深度学习课程配套闯关 H5 · 免注册匿名游玩 · 数据仅本地保存</div>
  </div>`;
  app.querySelector('#go').onclick=()=>location.hash='#/map';   // 主按钮统一进课程路径（地图）页
}
