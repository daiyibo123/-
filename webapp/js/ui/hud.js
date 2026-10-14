// 关卡 HUD：标题 / 步数 / 连击 / 撤销 / 重开 / 规则 / AI入口
export function mountHUD(host,{title,steps='0/–',canUndo=false,onUndo,onRestart,onHelp,onHome}){
  host.innerHTML='';
  const bar=document.createElement('div'); bar.className='hud';
  const left=document.createElement('div'); left.className='hud-left';
  const t=document.createElement('span'); t.className='hud-title'; t.textContent='⚡ '+title;
  const combo=document.createElement('span'); combo.className='hud-combo mono'; combo.style.display='none';
  left.append(t,combo);
  const step=document.createElement('span'); step.className='hud-steps mono'; step.textContent=steps;
  const right=document.createElement('div'); right.className='hud-right';
  const mk=(txt,fn,cls='btn sm ghost')=>{const b=document.createElement('button');b.className=cls;b.textContent=txt;
    if(fn)b.onclick=fn; else b.disabled=true; right.appendChild(b); return b;};
  if(onHome)mk('🗺 地图',onHome);
  const undoBtn=mk('↶ 撤销',canUndo?onUndo:null);
  mk('⟳ 重开',onRestart);
  mk('❓ 规则',onHelp);
  bar.append(left,step,right); host.appendChild(bar);
  return {
    setSteps(s){step.textContent=s;},
    setCombo(n){ if(n>=2){combo.style.display='';combo.textContent=`连击 ×${n}`;combo.classList.add('pop-in');}
      else combo.style.display='none'; },
    setUndoEnabled(v){undoBtn.disabled=!v;}
  };
}
