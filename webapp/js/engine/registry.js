// 关卡注册表：新增关卡在此登记即可
import L2T,{L2Essay} from '../levels/l2_think.js';
import {L3Think,L3Essay,L4Think,L4Essay,L5Think,L5Essay,L6Think,L6Essay} from '../levels/l3_to_l6_think.js';
import L1 from '../levels/l1_line.js';
import L2 from '../levels/l2_descent.js';
import L2B from '../levels/l2b_backprop2.js';
import L3A from '../levels/l3a_shape.js';
import L4 from '../levels/l4_kernel.js';
import L5 from '../levels/l5_clinic.js';
import L5A from '../levels/l5a_attn.js';
import L6 from '../levels/l6_attention.js';
import L6A from '../levels/l6a_ae.js';
import L6B from '../levels/l6b_vae.js';
import L6C from '../levels/l6c_gan.js';
import L6D from '../levels/l6d_diff.js';
import L3B from '../levels/l3b_shift.js';
import L3C from '../levels/l3c_hist.js';
import L4A from '../levels/l4a_unroll.js';
import L4B from '../levels/l4b_bptt.js';
import L4C from '../levels/l4c_gates.js';
import L4D from '../levels/l4d_seq.js';
import L5B from '../levels/l5b_mask.js';
import L5C from '../levels/l5c_duel.js';

export const LEVEL_CLASSES=[L2T,L2Essay,L3Think,L3Essay,L4Think,L4Essay,L5Think,L5Essay,L6Think,L6Essay,L1,L2,L2B,L3A,L3B,L3C,L4,L4A,L4B,L4C,L4D,L5,L5A,L5B,L5C,L6,L6A,L6B,L6C,L6D];
export const REGISTRY={}; LEVEL_CLASSES.forEach(C=>REGISTRY[C.id]=C);
export function levelClass(id){ return REGISTRY[id]; }
