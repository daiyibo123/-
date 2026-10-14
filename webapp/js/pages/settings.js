import { profile, saveProfile } from '../store/idb.js';
import { confirmModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

export function renderSettings(app){
  const p=profile();
  app.innerHTML=`
  <div class="fade-in" style="max-width:640px;margin:0 auto">
    <div class="topbar">
      <h1 class="grad-text" style="font-size:24px">⚙ 设置</h1>
      <a class="btn sm ghost" href="#/map" style="margin-left:auto">← 地图</a>
    </div>
    <div class="panel">
      <div class="set-row"><div><b>音效</b><div class="dim2 small">演出音效（当前版本未启用，预留）</div></div>
        <input type="checkbox" id="snd" ${p.settings.sound?'checked':''} disabled></div>
      <div class="set-row"><div><b>出错时 AI 助教主动追问</b><div class="dim2 small">关闭后仅手动呼出</div></div>
        <input type="checkbox" id="ai" ${p.settings.aiAuto!==false?'checked':''}></div>
      <div class="set-row"><div><b>匿名学情上报</b><div class="dim2 small">仅动作与判定数据，无个人信息；用于班级聚合看板</div></div>
        <input type="checkbox" id="rep" ${p.settings.report!==false?'checked':''}></div>
      <div class="set-row" style="border:none"><div><b style="color:var(--err)">重置全部进度</b>
        <div class="dim2 small">清除本地存档（图鉴/成就/星级）</div></div>
        <button class="btn danger sm" id="reset">重置</button></div>
    </div>
    <div class="dim2 small" style="margin-top:14px;line-height:1.8">
      《手搓神经网络》v1.0 · 数媒竞赛参赛作品<br>
      本地优先架构：断网可完整游玩；AI 助教离线时自动降级为内置提示。
    </div>
  </div>`;
  app.querySelector('#ai').onchange=e=>{p.settings.aiAuto=e.target.checked;saveProfile();toast('已保存','ok',1500);};
  app.querySelector('#rep').onchange=e=>{p.settings.report=e.target.checked;saveProfile();toast('已保存','ok',1500);};
  app.querySelector('#reset').onclick=async()=>{
    const ok=await confirmModal('重置进度','确定清除全部本地存档吗？此操作不可恢复。');
    if(ok){p.unlocked=['l1'];p.stars={};p.achievements=[];p.codex=[];await saveProfile();toast('已重置','warn');location.hash='#/intro';}
  };
}
