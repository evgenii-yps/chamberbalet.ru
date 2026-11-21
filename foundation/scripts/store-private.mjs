import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {initialize,loadActive,planUpdate,promote,rollback,recover,guardEditorialFiles} from '../src/private-store.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.private');const store=path.join(base,'version-store');
if(await fs.realpath(base)!==base)throw Error('Unsafe private root');
async function checked(name){const f=path.resolve(name);if(!f.startsWith(base+path.sep))throw Error('Input must be private');let p=base;for(const part of path.relative(base,f).split(path.sep)){p=path.join(p,part);if((await fs.lstat(p)).isSymbolicLink())throw Error('Symlink not allowed')}return JSON.parse(await fs.readFile(f,'utf8'))}
async function write(name,value){const f=path.resolve(name);if(!f.startsWith(base+path.sep))throw Error('Output must be private');const dir=path.dirname(f);const actual=await fs.realpath(dir);if(actual!==dir||!actual.startsWith(base+path.sep))throw Error('Unsafe output directory');await fs.writeFile(f,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})}
const [cmd,...args]=process.argv.slice(2);let result;
if(['plan','promote','rollback'].includes(cmd))await guardEditorialFiles(path.join(base,'data'),(await loadActive(store)).state);
if(cmd==='init'){await fs.mkdir(store,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e});result=await initialize(store,{events:await checked(path.join(base,'data/events.json')),people:await checked(path.join(base,'data/people.json')),baseline:await checked(path.join(base,'data/baseline-v16.json'))})}
else if(cmd==='status')result=await loadActive(store);
else if(cmd==='history'){const active=await loadActive(store);console.log(JSON.stringify(active.state.ledger,null,2));process.exit(0)}
else if(cmd==='plan'){if(args.length!==2)throw Error('plan INCOMING OUTPUT');const active=await loadActive(store);const proposal=await planUpdate(store,await checked(args[0]),active.state.sourceRevision);await write(args[1],proposal);console.log('Private plan written');process.exit(0)}
else if(cmd==='promote'){if(args.length!==3)throw Error('promote INCOMING PLAN REVIEW');result=await promote(store,await checked(args[0]),await checked(args[1]),await checked(args[2]))}
else if(cmd==='rollback'){if(args.length!==3)throw Error('rollback SNAPSHOT REVIEWER REASON');result=await rollback(store,...args)}
else if(cmd==='recover')result=await recover(store);
else throw Error('Use init, status, history, plan, promote, rollback or recover');
console.log(JSON.stringify({active:result.ref,sourceRevision:result.state.sourceRevision,events:result.state.events.length,people:result.state.people.length,ledgerEntries:result.state.ledger.length}));
