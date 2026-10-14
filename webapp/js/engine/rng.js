// 种子随机：保证关卡数据可复现、动作流可回放测试
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rngOf(seed){ const r = mulberry32(seed); return {
  next: r,
  range:(a,b)=>a+(b-a)*r(),
  int:(a,b)=>Math.floor(a+(b-a+1)*r()),
  pick:(arr)=>arr[Math.floor(r()*arr.length)],
  gauss:(mu=0,sigma=1)=>{ // Box-Muller
    const u=Math.max(r(),1e-9), v=r();
    return mu+sigma*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
};}
