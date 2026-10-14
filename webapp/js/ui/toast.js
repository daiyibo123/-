// Toast 通知
export function toast(text,kind='info',ms=2600){
  const root=document.getElementById('toasts');
  const t=document.createElement('div');
  t.className=`toast toast-${kind} pop-in`;
  t.textContent=text;
  root.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(-8px)';setTimeout(()=>t.remove(),300);},ms);
}
export function toastHTML(html,kind='info',ms=3600){
  const root=document.getElementById('toasts');
  const t=document.createElement('div');
  t.className=`toast toast-${kind} pop-in`; t.innerHTML=html;
  root.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},ms);
}
