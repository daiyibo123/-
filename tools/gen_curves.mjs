// tools/gen_curves.mjs —— 真实训练曲线生成（L5 网络诊室的病历数据）
// 纯 JS 手写 MLP（1D 正弦回归），跑 6 组真实实验，导出 webapp/js/data/curves.js
// 运行：node tools/gen_curves.mjs
import { writeFileSync } from 'node:fs';

function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=(a+0x6D2B79F5)|0;
  let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

function makeData(n,seed,noise){
  const rng=mulberry32(seed),pts=[];
  for(let i=0;i<n;i++){const x=i/(n-1);pts.push([x,Math.sin(2*Math.PI*x)+noise*(rng()*2-1)]);}
  return pts;
}

class MLP{
  constructor(sizes,seed){
    this.sizes=sizes;const rng=mulberry32(seed);
    this.W=[];this.b=[];
    for(let l=0;l<sizes.length-1;l++){
      const w=[];
      for(let i=0;i<sizes[l+1];i++){const row=[];
        for(let j=0;j<sizes[l];j++)row.push((rng()*2-1)*Math.sqrt(2/sizes[l]));w.push(row);}
      this.W.push(w);this.b.push(new Array(sizes[l+1]).fill(0));
    }
  }
  forward(x,dropoutP,rng){
    let a=x;const acts=[x],masks=[null];
    for(let l=0;l<this.W.length;l++){
      const z=this.W[l].map((row,i)=>row.reduce((s,w,j)=>s+w*a[j],this.b[l][i]));
      let h=l<this.W.length-1?z.map(Math.tanh):z.slice();
      if(dropoutP>0&&l<this.W.length-1&&rng){
        const m=h.map(()=>rng()<dropoutP?0:1/(1-dropoutP));
        h=h.map((v,i)=>v*m[i]);masks.push(m);
      }else masks.push(null);
      acts.push(h);a=h;
    }
    return {y:a[0],acts,masks};
  }
  train({train,val,epochs,lr,dropout=0,l2=0,seed=1,mom=0.9,bs=null,recordEvery=1}){
    const rng=mulberry32(seed);
    const hist=[];let best={val:1e9,ep:0};
    const vW=this.W.map(w=>w.map(r=>r.map(()=>0)));
    const vb=this.b.map(b=>b.map(()=>0));
    const batches=bs?Math.ceil(train.length/bs):1;
    for(let ep=1;ep<=epochs;ep++){
      const order=train.map((_,i)=>i);
      if(bs)for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      let trLoss=0;
      for(const [x,t] of train){const {y}=this.forward([x]);trLoss+=0.5*(y-t)*(y-t);}
      for(let b=0;b<batches;b++){
        const gW=this.W.map(w=>w.map(r=>r.map(()=>0)));
        const gb=this.b.map(b=>b.map(()=>0));
        const idx=bs?order.slice(b*bs,(b+1)*bs):order;
        for(const k of idx){
          const [x,t]=train[k];
          const {acts,masks}=this.forward([x],dropout,rng);
          let delta=[acts[acts.length-1][0]-t];
          for(let l=this.W.length-1;l>=0;l--){
            const aPrev=acts[l];
            for(let i=0;i<this.W[l].length;i++)
              for(let j=0;j<aPrev.length;j++)
                gW[l][i][j]+=delta[i]*aPrev[j];
            for(let i=0;i<delta.length;i++)gb[l][i]+=delta[i];
            if(l>0){
              const nd=new Array(acts[l].length).fill(0);
              for(let j=0;j<nd.length;j++){
                let s=0;for(let i=0;i<delta.length;i++)s+=this.W[l][i][j]*delta[i];
                nd[j]=s*(1-acts[l][j]*acts[l][j]);
                if(masks[l])nd[j]*=masks[l][j];
              }
              delta=nd;
            }
          }
        }
        const n=idx.length;
        for(let l=0;l<this.W.length;l++)
          for(let i=0;i<this.W[l].length;i++)
            for(let j=0;j<this.W[l][i].length;j++){
              vW[l][i][j]=mom*vW[l][i][j]-lr*(gW[l][i][j]/n+l2*this.W[l][i][j]);
              this.W[l][i][j]+=vW[l][i][j];
            }
        for(let l=0;l<this.b.length;l++)for(let i=0;i<this.b[l].length;i++){
          vb[l][i]=mom*vb[l][i]-lr*gb[l][i]/n;
          this.b[l][i]+=vb[l][i];
        }
      }
      const msel=pts=>pts.reduce((s,[x,t])=>{const {y}=this.forward([x]);return s+0.5*(y-t)*(y-t);},0)/pts.length;
      const vl=msel(val);
      if(vl<best.val)best={val:vl,ep};
      if(ep%recordEvery===0)hist.push({ep,tr:+(trLoss/train.length).toFixed(4),va:+vl.toFixed(4)});
    }
    return {hist,best};
  }
}

const train=makeData(16,101,0.4), val=makeData(26,202,0.2);
const run=(opt)=>new MLP(opt.sizes,opt.seed).train({train,val,epochs:opt.E||320,lr:opt.lr,
  dropout:opt.dropout||0,l2:opt.l2||0,seed:opt.gseed||7,mom:0.9,bs:opt.bs||null});

console.log('训练 case1 过拟合（大网无正则）…');
const c1=run({sizes:[1,64,64,1],lr:0.01,bs:2,gseed:5,seed:11,E:2500});
console.log('训练 case2 欠拟合（极小网络）…');
const c2=run({sizes:[1,2,1],lr:0.02,seed:22,E:1000});
console.log('训练 case3 训练不稳（小批量+大学习率）…');
const c3=run({sizes:[1,20,20,1],lr:0.035,bs:4,gseed:99,seed:33,E:400});
console.log('训练处方 dropout…');const tDrop=run({sizes:[1,64,64,1],lr:0.01,bs:2,gseed:5,dropout:0.45,seed:11,E:2500});
console.log('训练处方 L2…');    const tL2=run({sizes:[1,64,64,1],lr:0.01,bs:2,gseed:5,l2:0.008,seed:11,E:2500});
console.log('训练处方 加大模型…');const tBig=run({sizes:[1,10,10,1],lr:0.02,seed:22,E:1000});
console.log('训练处方 降学习率…');const tLr=run({sizes:[1,20,20,1],lr:0.006,bs:26,gseed:99,seed:33,E:400});

const pack=(r)=>({train:r.hist.map(h=>h.tr),val:r.hist.map(h=>h.va)});
const out={
  meta:{note:'由 tools/gen_curves.mjs 真实训练生成（1D 正弦回归，纯 JS MLP + 动量 SGD），非手绘曲线',
        generatedAt:new Date().toISOString()},
  case1:Object.assign(pack(c1),{bestValEpoch:c1.best.ep,bestVal:+c1.best.val.toFixed(4),
    treat:{dropout:pack(tDrop),l2:pack(tL2),early:null}}),
  case2:Object.assign(pack(c2),{treat:{bigger:pack(tBig)}}),
  case3:Object.assign(pack(c3),{treat:{lrfix:pack(tLr)}})
};
// 质量断言
const c1v=out.case1.val,minV=Math.min(...c1v),endV=(c1v[c1v.length-1]+c1v[c1v.length-2]+c1v[c1v.length-3])/3;
const c1tEnd=(out.case1.train.at(-1)+out.case1.train.at(-2))/2;
const c3v=out.case3.val,c3tail=c3v.slice(20),jit=Math.max(...c3tail)-Math.min(...c3tail);
console.log(`case1: train_end=${c1tEnd.toFixed(3)}(应<0.02) val_min=${minV.toFixed(3)} val_end=${endV.toFixed(3)} 过拟合比=${(endV/minV).toFixed(2)}`);
console.log(`case2: train_end=${out.case2.train.at(-1).toFixed(3)} (应>0.1)`);
console.log(`case3: 尾段抖动幅度=${jit.toFixed(3)} (应>0.015)`);
if(endV<minV*1.3){console.error('⚠ case1 过拟合特征不明显，调参后重跑');process.exit(1);}
if(c1tEnd>0.03){console.error('⚠ case1 训练损失未降到底（没背下训练集）');process.exit(1);}
if(jit<0.015){console.error('⚠ case3 抖动不明显');process.exit(1);}

const js=`// 自动生成：tools/gen_curves.mjs（真实训练曲线，勿手改）
export const CURVES=${JSON.stringify(out)};
`;
writeFileSync(new URL('../webapp/js/data/curves.js',import.meta.url),js);
console.log('\n✓ 已写入 webapp/js/data/curves.js');
