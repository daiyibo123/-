// 模态框：info / confirm(Promise) / levelIntro
export function modal({title,html,okText='确定',cancelText=null,onOk}){
  const root=document.getElementById('modal-root');
  const mask=document.createElement('div'); mask.className='modal-mask fade-in';
  const box=document.createElement('div'); box.className='modal-box pop-in';
  box.innerHTML=`<h3>${title||''}</h3><div class="modal-body">${html}</div>`;
  const btns=document.createElement('div'); btns.className='modal-btns';
  if(cancelText){const c=document.createElement('button');c.className='btn ghost';c.textContent=cancelText;
    c.onclick=()=>{mask.remove();};btns.appendChild(c);}
  const ok=document.createElement('button'); ok.className='btn primary'; ok.textContent=okText;
  ok.onclick=()=>{mask.remove();onOk&&onOk();};
  btns.appendChild(ok); box.appendChild(btns); mask.appendChild(box);
  mask.addEventListener('pointerdown',e=>{if(e.target===mask&&!cancelText)mask.remove();});
  root.appendChild(mask);
  return mask;
}
export function confirmModal(title,html){ return new Promise(res=>{
  modal({title,html,okText:'确定',cancelText:'取消',onOk:()=>res(true)})&&null;
  // 取消时 resolve(false)
  setTimeout(()=>{const masks=document.querySelectorAll('.modal-mask');const m=masks[masks.length-1];
    if(m){const c=m.querySelector('.btn.ghost');if(c)c.onclick=()=>{m.remove();res(false)};}},0);
});}
export function infoModal(title,html){ modal({title,html}); }
