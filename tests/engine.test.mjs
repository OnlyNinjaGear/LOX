import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,move,solved} from '../mechanics/lock-mechanics.mjs';
test('Every generated chest can be opened by legal inverse moves',()=>{
 for(const count of [4,5,6,7]) for(let seed=0;seed<250;seed++) {
  const game=generate(count,seed);
  assert.equal(solved(game.pins),false);
  let pins=game.pins;
  for(const step of game.proof){pins=move(pins,game.links,step.plate,step.direction);assert.ok(pins,`Unsolvable count=${count}, seed=${seed}`);}
  assert.ok(solved(pins));
  for(let plate=0;plate<count;plate++) for(const dir of [-1,1]) {
   const next=move(game.pins,game.links,plate,dir);
   if(next) assert.deepEqual(move(next,game.links,plate,-dir),game.pins);
  }
 }
});
test('Plate direction, same/opposite links, no chaining and no implicit reverse link',()=>{
 const links=[[0,1,-1,0],[0,0,0,1],[0,0,0,0],[0,0,0,0]];
 assert.deepEqual(move([3,3,3,3],links,0,-1),[4,4,2,3]);
 assert.deepEqual(move([3,3,3,3],links,1,1),[3,2,3,2]);
});
test('A linked pin at the wall blocks the entire move without mutation',()=>{
 const pins=[3,6,3,3],links=[[0,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 assert.equal(move(pins,links,0,-1),null);assert.deepEqual(pins,[3,6,3,3]);
 assert.equal(move([0,3,3,3],links,0,1),null);
 assert.equal(move(pins,links,-1,1),null);
});
test('Generator is deterministic and validates plate count',()=>{
 assert.deepEqual(generate(7,42),generate(7,42));assert.throws(()=>generate(3),RangeError);
});

test('All and only out-of-range pins are identified, including opposite links',async()=>{
 const {blockers}=await import('../mechanics/lock-mechanics.mjs');
 const links=[[0,1,-1,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 assert.deepEqual(blockers([3,6,0,6],links,0,-1),[1,2]);
 assert.deepEqual(blockers([3,6,0,6],links,0,1),[]);
 assert.deepEqual(blockers([6,3,3,6],links,0,-1),[0]);
});
