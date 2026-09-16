import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generate,move,solved} from '../mechanics/lock-mechanics.mjs';
import {lockToken,parseLock,moveCode,replayToken,parseReplay,replayFrames} from '../replay.js';
function winningPath(game){let pins=game.start,path='';for(const step of game.proof){pins=move(pins,game.links,step.plate,step.direction);path+=moveCode(step.plate,step.direction);if(solved(pins))return path;}throw new Error('no solution');}
test('Shared seeds and winning replays reproduce all 4 difficulties, including uint32 seeds',()=>{
 for(const count of [4,5,6,7])for(const seed of [0,123,0xffffffff]){
  const token=lockToken(count,seed),game=generate(count,seed),path=winningPath(game);
  assert.deepEqual(parseLock(token),{count,seed,fragile:true});
  const replay=parseReplay(replayToken(token,path));
  assert.deepEqual(replay.frames[0].pins,game.start);
  assert(solved(replay.frames.at(-1).pins));assert.equal(replay.frames.length,path.length+1);
 }
});
test('Undo and mode changes are represented, with no shared mutable frames',()=>{
 const game=generate(4,123),token=lockToken(4,123);
 const first=game.proof[0],prefix=moveCode(first.plate,first.direction)+'ufg';
 const {frames}=replayFrames(token,prefix+winningPath(game));
 assert.deepEqual(frames[2].pins,game.start);assert.equal(frames[3].fragile,false);assert.equal(frames[4].fragile,true);
 frames[0].pins[0]=99;assert.notEqual(frames[2].pins[0],99);
});
test('Blocked steps retain positions and update damage; unfinished or invalid replays are rejected',()=>{
 let game,code;
 for(let seed=0;seed<100&&!code;seed++){
  game=generate(4,seed);
  for(let i=0;i<4;i++)for(const d of [-1,1])if(!move(game.start,game.links,i,d))code=moveCode(i,d);
 }
 const token=lockToken(game.count,game.seed);
 const frames=replayFrames(token,code,false).frames;
 assert.equal(frames[1].damage,1);assert(frames[1].blocked.length);assert.deepEqual(frames[0].pins,frames[1].pins);
 assert.throws(()=>replayFrames(token,code));assert.throws(()=>replayFrames(token,code.repeat(3),false));
 for(const bad of ['1.9.a.1','1.4.zzzzzzz.1','2.4.a.1','1.4.-1.0'])assert.throws(()=>parseLock(bad));
 assert.throws(()=>replayFrames(token,'u',false));assert.throws(()=>replayFrames(token,'d',false));
 assert.throws(()=>replayFrames(token,'x',false));assert.throws(()=>replayFrames(token,'0'.repeat(20001),false));
 const path=winningPath(game);assert.throws(()=>replayFrames(token,path+'f'));
});
