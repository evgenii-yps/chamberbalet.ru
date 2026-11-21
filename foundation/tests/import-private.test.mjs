import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

test('verified source import is deterministic and preserves counts and approval boundaries',async()=>{
  assert.ok(process.env.SITES_SOURCE,'SITES_SOURCE required');
  const run=()=>{const r=spawnSync(process.execPath,['scripts/import-private.mjs'],{env:process.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
  run();const first=await fs.readFile('.private/data/events.json','utf8');const peopleFirst=await fs.readFile('.private/data/people.json','utf8');
  run();assert.equal(await fs.readFile('.private/data/events.json','utf8'),first);assert.equal(await fs.readFile('.private/data/people.json','utf8'),peopleFirst);
  const events=JSON.parse(first),people=JSON.parse(peopleFirst);
  assert.equal(events.length,266);assert.equal(events.filter(x=>x.value.isTour).length,168);assert.equal(new Set(events.map(x=>x.id)).size,266);
  assert.equal(people.length,15);assert.equal(people.filter(x=>x.value.leader).length,2);assert.equal(people.filter(x=>x.value.photos.length).length,14);
  assert.ok(events.every(x=>!x.ticket.live_checked.value&&!x.ticket.owner_approved.value));
});
