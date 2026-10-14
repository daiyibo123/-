// tools/gen_levels.mjs —— 金标准数值独立校验
// 从开发文档附录 B 转录的网络参数出发，独立重算前向/反向全部数值，
// 与 webapp/js/data/levels.js 中固化的答案比对（容差 5e-4），防止转录错误。
import { readFileSync, writeFileSync } from 'node:fs';

// 附录 B 参数（独立转录，勿从 levels.js 复制）
const x=[1.2,0.5], y=1;
const W1=[[0.6,-0.4],[0.7,0.2]], b1=[0.1,-0.2], W2=[0.5,0.7], b2=0.05;
const sig=z=>1/(1+Math.exp(-z));

const z_h1=W1[0][0]*x[0]+W1[0][1]*x[1]+b1[0];
const z_h2=W1[1][0]*x[0]+W1[1][1]*x[1]+b1[1];
const h1=sig(z_h1), h2=sig(z_h2);
const z_o=W2[0]*h1+W2[1]*h2+b2, yhat=sig(z_o);
const L=-Math.log(yhat);
const dout=yhat-y;                     // BCE×sigmoid
const gradW2=[dout*h1,dout*h2], gradb2=dout;
const ds1=h1*(1-h1), ds2=h2*(1-h2);
const dh1=dout*W2[0]*ds1, dh2=dout*W2[1]*ds2;
const gradW1=[[dh1*x[0],dh1*x[1]],[dh2*x[0],dh2*x[1]]];
const gradb1=[dh1,dh2];

// 有限差分交叉验证反向结果
const lossAt=(dx)=>{const C1=W1.map(r=>r.slice()),Cb1=b1.slice(),C2=W2.slice();let cb2=b2;
  if(dx.p==='W1')C1[dx.i][dx.j]+=dx.d;else if(dx.p==='b1')Cb1[dx.i]+=dx.d;
  else if(dx.p==='W2')C2[dx.i]+=dx.d;else cb2+=dx.d;
  const H1=sig(C1[0][0]*x[0]+C1[0][1]*x[1]+Cb1[0]),H2=sig(C1[1][0]*x[0]+C1[1][1]*x[1]+Cb1[1]);
  return -Math.log(sig(C2[0]*H1+C2[1]*H2+cb2));};
const eps=1e-6;
const fd=(p,i,j)=>(lossAt({p,i,j,d:eps})-lossAt({p,i,j,d:-eps}))/(2*eps);

const computed={forward:{z_h1,h1,z_h2,h2,z_o,yhat,L},
  answer:{delta_o:dout,gradW2,gradb2,dsig1:ds1,dsig2:ds2,delta_h:[dh1,dh2],gradW1,gradb1}};

// 从 levels.js 抽取固化答案比对
const src=readFileSync(new URL('../webapp/js/data/levels.js',import.meta.url),'utf8');
const grab=(re)=>{const m=src.match(re);if(!m)throw new Error('levels.js 缺字段: '+re);return m[1];};
const toJsonObj=s=>JSON.parse('{'+s.replace(/([a-zA-Z_0-9]+):/g,'"$1":')+'}');
const lvAnswer=toJsonObj(grab(/answer:\{([\s\S]*?)\},\n {2}cards/s));
const lvForward=toJsonObj(grab(/forward:\{([\s\S]*?)\}\}/));

let fails=0;
const cmp=(name,a,b,tol=5e-4)=>{
  const ok=Math.abs(a-b)<tol; if(!ok){fails++;console.error(`✗ ${name}: levels.js=${b} vs 重算=${a}`);}
  else console.log(`✓ ${name}: ${b}`);
};
cmp('h1',h1,lvForward.h1); cmp('h2',h2,lvForward.h2); cmp('yhat',yhat,lvForward.yhat); cmp('L',L,lvForward.L);
cmp('delta_o',dout,lvAnswer.delta_o);
cmp('gradW2[0]',gradW2[0],lvAnswer.gradW2[0]); cmp('gradW2[1]',gradW2[1],lvAnswer.gradW2[1]);
cmp('gradb2',gradb2,lvAnswer.gradb2);
cmp('dsig1',ds1,lvAnswer.dsig1); cmp('dsig2',ds2,lvAnswer.dsig2);
cmp('delta_h[0]',dh1,lvAnswer.delta_h[0]); cmp('delta_h[1]',dh2,lvAnswer.delta_h[1]);
[[0,0],[0,1],[1,0],[1,1]].forEach(([i,j])=>cmp(`gradW1[${i}][${j}]`,gradW1[i][j],lvAnswer.gradW1[i][j]));
cmp('gradb1[0]',gradb1[0],lvAnswer.gradb1[0]); cmp('gradb1[1]',gradb1[1],lvAnswer.gradb1[1]);

// 反向 vs 有限差分（工程上的一致性）
const fdChecks=[['W2[0]',fd('W2',0),gradW2[0]],['W2[1]',fd('W2',1),gradW2[1]],['b2',fd('b2',0),gradb2],
  ['W1[0][0]',fd('W1',0,0),gradW1[0][0]],['W1[1][1]',fd('W1',1,1),gradW1[1][1]],['b1[0]',fd('b1',0),gradb1[0]]];
fdChecks.forEach(([n,f,a])=>{const ok=Math.abs(f-a)<1e-5;
  if(!ok){fails++;console.error(`✗ FD ${n}: fd=${f.toExponential(3)} vs bp=${a}`);}else console.log(`✓ FD ${n} 一致 (${f.toExponential(2)})`);});

if(fails){console.error(`\n${fails} 项不一致——请修正 levels.js 或文档附录 B！`);process.exit(1);}
console.log('\n全部通过：levels.js 金标准 = 独立重算 = 有限差分 ✓');
