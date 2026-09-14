import assert from 'node:assert/strict';
import {createSession,attempt,replacePick,move,generate,solved} from '../mechanics/lock-mechanics.mjs';
const initial=createSession(4,1);
const links=[[0,1,-1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
const s={...initial,links,pins:[3,6,0,3],start:[2,4,2,3],history:[[3,3,3,3]]};
const first=attempt(s,0,-1);assert.equal(first.event,'blocked');assert.deepEqual(first.blocked,[1,2]);assert.equal(first.state.damage,1);assert.deepEqual(first.state.pins,s.pins);
const second=attempt(first.state,0,-1);assert.equal(second.event,'break');assert.deepEqual(second.state.pins,s.start);assert.equal(second.state.history.length,0);assert.equal(attempt(second.state,0,1).event,'broken');
assert.equal(replacePick(second.state).damage,0);assert.equal(s.damage,0);
for(const count of [4,5,6,7])for(let seed=0;seed<100;seed++){
 const lock=generate(count,seed);let pins=lock.pins;
 for(const step of lock.proof){pins=move(pins,lock.links,step.plate,step.direction);assert.ok(pins);}
 assert.ok(solved(pins));
}
console.log('OK: solvability, direct/opposite blockers, second-error reset, replacement, immutable transitions.');
