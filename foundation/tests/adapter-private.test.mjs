import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('edited private records drive the preview without changing their IDs',async()=>{
  assert.ok(process.env.SITES_SOURCE,'SITES_SOURCE required');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'chamber-adapter-'));
  const run=(extra={})=>spawnSync(process.execPath,['scripts/build-private.mjs'],{encoding:'utf8',env:{...process.env,...extra}});
  try{
    const events=JSON.parse(await fs.readFile('.private/data/events.json'));
    const people=JSON.parse(await fs.readFile('.private/data/people.json'));
    const id=events[0].id;events[0].value.title='TEST EDIT';people[0].value.name='TEST PERSON';
    events.reverse();
    await fs.writeFile(path.join(dir,'events.json'),JSON.stringify(events));await fs.writeFile(path.join(dir,'people.json'),JSON.stringify(people));
    let r=run({PRIVATE_DATA_DIR:dir});assert.equal(r.status,0,r.stderr);
    assert.match(await fs.readFile('.private/dist/show-schedule.js','utf8'),/TEST EDIT/);
    assert.match(await fs.readFile('.private/dist/people-module/theatre-people.js','utf8'),/TEST PERSON/);
    assert.equal(events.find(x=>x.id===id).value.title,'TEST EDIT');
    events.push(events[0]);await fs.writeFile(path.join(dir,'events.json'),JSON.stringify(events));
    r=run({PRIVATE_DATA_DIR:dir});assert.notEqual(r.status,0,'duplicate IDs must fail');
  }finally{await fs.rm(dir,{recursive:true,force:true});const r=run();assert.equal(r.status,0,r.stderr)}
});
