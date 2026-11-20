import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4178);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try { const u=new URL(req.url,'http://127.0.0.1');const raw=decodeURIComponent(u.pathname);if(raw.includes('\0')) throw new Error('bad path');let target=path.resolve(dist,'.'+(raw==='/'?'/index.html':raw));if(!target.startsWith(dist+path.sep)) throw new Error('outside root');const bytes=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});res.end(bytes); }
 catch {res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});try{res.end(await fs.readFile(path.join(dist,'404.html')))}catch{res.end('404')}}
}).listen(port,'127.0.0.1',()=>console.log(`PRIVATE PREVIEW http://127.0.0.1:${port}`));
