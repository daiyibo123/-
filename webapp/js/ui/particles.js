// 全屏粒子特效层：正确=青色迸发，错误=品红碎裂，发散=爆炸
const cv=document.getElementById('fx'); const ctx=cv.getContext('2d');
let parts=[],running=false;
function fit(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;
  cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}
addEventListener('resize',fit);fit();
function loop(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.life>0);
  for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.life-=0.02;
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*Math.max(.2,p.life),0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(parts.length){requestAnimationFrame(loop);}else running=false;
}
function burst(x,y,{n=26,color='#1CB0F6',spread=5,g=.12,r=3}={}){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=Math.random()*spread+1;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g,life:1,r:r*(.5+Math.random()),color});
  }
  if(!running){running=true;requestAnimationFrame(loop);}
}
export function burstAt(el,color){ if(!el)return; const r=el.getBoundingClientRect();
  burst(r.left+r.width/2,r.top+r.height/2,{color}); }
export function burstXY(x,y,opt){ burst(x,y,opt); }
export function explodeAt(el){ if(!el)return; const r=el.getBoundingClientRect();
  burst(r.left+r.width/2,r.top+r.height/2,{n:70,color:'#C2543C',spread:11,g:.2,r:4});
  burst(r.left+r.width/2,r.top+r.height/2,{n:30,color:'#C98A2D',spread:7,g:.1,r:2}); }
