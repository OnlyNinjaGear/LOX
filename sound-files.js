export const SOUND_NAMES=['select','insert','turn','slide','impact','bend','snap','remove'];
// Files are optional. Each name is fetched once per page load; MP3 takes priority.
export function createFileSounds(baseURL,fetchFile=globalThis.fetch){
 const ready=new Map(),decoding=new Map();
 const files=new Map(SOUND_NAMES.map(name=>[name,(async()=>{
  for(const extension of ['mp3','wav']){
   try{
    const response=await fetchFile(new URL(`${name}.${extension}`,baseURL),{cache:'no-cache'});
    if(response.ok)return {bytes:await response.arrayBuffer(),extension};
   }catch{}
  }
  return null;
 })()]));
 return {
  get:name=>ready.get(name),
  async decode(context){
   await Promise.all(SOUND_NAMES.map(name=>{
    if(!decoding.has(name))decoding.set(name,(async()=>{
     const file=await files.get(name);if(!file)return;
     try{ready.set(name,await context.decodeAudioData(file.bytes));}
     catch{
      // An invalid MP3 must not hide a working WAV replacement.
      if(file.extension!=='mp3')return;
      try{
       const response=await fetchFile(new URL(`${name}.wav`,baseURL),{cache:'no-cache'});
       if(response.ok)ready.set(name,await context.decodeAudioData(await response.arrayBuffer()));
      }catch{}
     }
    })());
    return decoding.get(name);
   }));
  }
 };
}
