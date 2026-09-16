export function normalizeSeed(value){
 const text=String(value).trim().normalize('NFC');
 if(text.length>128)throw new Error('Сид: максимум 128 символов');
 return text;
}
export function seedNumber(value){
 const text=normalizeSeed(value);if(!text)throw new Error('Пустой сид');
 if(/^\d+$/.test(text)&&Number(text)<=0xffffffff)return Number(text);
 let hash=2166136261;
 for(const byte of new TextEncoder().encode(text)){hash^=byte;hash=Math.imul(hash,16777619);}
 return hash>>>0;
}
export function encodeSeed(value){return Array.from(new TextEncoder().encode(normalizeSeed(value)),b=>b.toString(16).padStart(2,'0')).join('');}
export function decodeSeed(value){
 if(!/^(?:[0-9a-f]{2}){1,512}$/.test(value))throw new Error('Неверный сид');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(value.match(/../g),b=>parseInt(b,16)));
 if(normalizeSeed(text)!==text)throw new Error('Неверный сид');
 return text;
}
