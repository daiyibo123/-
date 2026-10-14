// Canvas 雷达图（学情报告用，运行时手绘，无图表库依赖）
export function drawRadar(canvas,labels,values,{size=320,color='#1CB0F6'}={}){
  const dpr=devicePixelRatio||1;
  canvas.width=size*dpr;canvas.height=size*dpr;
  canvas.style.width=canvas.style.height=size+'px';
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const cx=size/2,cy=size/2,R=size/2-34,n=labels.length;
  const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
  ctx.clearRect(0,0,size,size);
  for(let ring=1;ring<=4;ring++){
    ctx.beginPath();
    for(let i=0;i<=n;i++){const[x,y]=pt(i%n,R*ring/4);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.strokeStyle='rgba(111,103,90,.25)';ctx.stroke();
  }
  for(let i=0;i<n;i++){const[x,y]=pt(i,R);
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.strokeStyle='rgba(111,103,90,.25)';ctx.stroke();}
  ctx.beginPath();
  for(let i=0;i<=n;i++){const v=Math.max(0,Math.min(1,values[i%n]));const[x,y]=pt(i%n,R*v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.closePath();
  ctx.fillStyle='rgba(28,176,246,.22)';ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<n;i++){const v=Math.max(0,Math.min(1,values[i]));const[x,y]=pt(i,R*v);
    ctx.beginPath();ctx.arc(x,y,3.5,0,7);ctx.fillStyle=color;ctx.fill();}
  ctx.font='16px sans-serif';ctx.fillStyle='#5A6774';ctx.textAlign='center';
  for(let i=0;i<n;i++){const[x,y]=pt(i,R+18);ctx.fillText(labels[i],x,y+4);}
}
