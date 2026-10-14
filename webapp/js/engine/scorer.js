// 判分与星级：按 levels 配置 + 动作流计算
// 星级规则（全站统一）：★通关；★★错误数≤star2MaxErrors；★★★无提示且错误数≤star2MaxErrors
export function computeScore(cfg,recorder){
  const errs=recorder.errors().length;
  const steps=recorder.correctCount();
  const minSteps=cfg.scoring&&cfg.scoring.minSteps||steps||1;
  const maxE=(cfg.scoring&&cfg.scoring.star2MaxErrors)!=null?cfg.scoring.star2MaxErrors:2;
  const score=Math.max(0,Math.round(100-errs*8-Math.max(0,steps-minSteps)*2-(recorder.hintUsed?10:0)));
  let stars=1;
  if(errs<=maxE) stars=2;
  if(errs<=maxE&&!recorder.hintUsed) stars=3;
  return {score:Math.min(100,Math.max(20,score)),stars,errs,steps,minSteps,mCounts:recorder.mCounts(),hintUsed:recorder.hintUsed};
}
