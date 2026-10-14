// 动作流记录器：判分、错误归因、回放测试、服务端上报共用同一数据源
export class Recorder{
  constructor(levelId,seed){
    this.levelId=levelId; this.seed=seed; this.t0=performance.now();
    this.actions=[]; this.seq=0; this.hintUsed=false;
  }
  push(a){
    const rec=Object.assign({seq:++this.seq,t:Math.round(performance.now()-this.t0)},a);
    this.actions.push(rec); return rec;
  }
  markHint(){ this.hintUsed=true; }
  errors(){ return this.actions.filter(a=>a.correct===false); }
  mCounts(){
    const m={};
    for(const a of this.errors()){ if(a.mId) m[a.mId]=(m[a.mId]||0)+1; }
    return m;
  }
  correctCount(){ return this.actions.filter(a=>a.correct===true).length; }
  snapshot(){ return {levelId:this.levelId,seed:this.seed,hintUsed:this.hintUsed,actions:this.actions.slice()}; }
}
