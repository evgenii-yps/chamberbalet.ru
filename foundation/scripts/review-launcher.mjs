import {spawn} from 'node:child_process';
import http from 'node:http';
import {setTimeout as wait} from 'node:timers/promises';
const server=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,stdio:['inherit','pipe','inherit']});
let exited=false;
let listening=false;
server.stdout.on('data',chunk=>{process.stdout.write(chunk);if(chunk.toString().includes('PRIVATE LOCAL PREVIEW'))listening=true});
server.on('exit',()=>{exited=true});
let ready=false;
for(let i=0;i<50&&!exited;i++){
  await wait(100);
  if(!listening)continue;
  ready=await new Promise(resolve=>{const req=http.get('http://127.0.0.1:4181/',res=>{res.resume();resolve(res.statusCode===200)});req.on('error',()=>resolve(false));req.setTimeout(500,()=>req.destroy())});
  if(ready)break;
}
if(!ready||exited){console.error('Server failed to start. Check the messages above.');server.kill();process.exitCode=1}
else {const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler','http://127.0.0.1:4181/'],{detached:true,stdio:'ignore'});browser.on('error',()=>console.error('Open http://127.0.0.1:4181/ manually.'));browser.unref()}
