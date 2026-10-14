// 零依赖静态服务器：node tools/serve.mjs [port]
// 用于本地开发/离线演示（AI 助教自动降级为内置提示）
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=join(fileURLToPath(new URL('..',import.meta.url)),'webapp');
const PORT=+(process.argv[2]||process.env.PORT||8799);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.md':'text/markdown; charset=utf-8'};

createServer(async(req,res)=>{
  try{
    let p=decodeURIComponent(new URL(req.url,'http://x').pathname);
    if(p==='/')p='/index.html';
    const file=normalize(join(ROOT,p));
    if(!file.startsWith(ROOT)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'});
    res.end(data);
  }catch{
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('404');
  }
}).listen(PORT,()=>{
  console.log(`《手搓神经网络》已启动： http://127.0.0.1:${PORT}  （Ctrl+C 退出）`);
});
