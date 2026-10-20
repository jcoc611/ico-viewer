import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemoIco,parseIco,decodeDib,MAX_FILE_SIZE } from '../src/ico';
function bitmap(bits:number,width:number,height:number,pixels:number[],palette:number[]=[],mask:number[]=[]) {
  const stride=Math.ceil(width*bits/32)*4, maskStride=Math.ceil(width/32)*4;
  const data=new Uint8Array(40+palette.length+stride*height+maskStride*height),v=new DataView(data.buffer);
  v.setUint32(0,40,true);v.setInt32(4,width,true);v.setInt32(8,height*2,true);v.setUint16(12,1,true);v.setUint16(14,bits,true);
  if(palette.length)v.setUint32(32,palette.length/4,true);
  data.set(palette,40);data.set(pixels,40+palette.length);data.set(mask,40+palette.length+stride*height);
  return {index:0,width,height,bitDepth:bits,encoding:'BMP' as const,byteLength:data.length,offset:22,data};
}
test('parses all resources, including the 256 dimension sentinel',()=>{
  const entries=parseIco(createDemoIco());assert.deepEqual(entries.map(e=>e.width),[16,24,32,48,64,128,256]);
  assert.ok(entries.every(entry=>entry.hotspot===undefined));
  for(const entry of entries){const rgba=decodeDib(entry);assert.equal(rgba.length,entry.width*entry.height*4);assert.equal(rgba[3],0);assert.ok(rgba.some(v=>v===255));}
});
test('rejects bad headers and truncated directory/payloads',()=>{
  for(const bytes of [new Uint8Array(),new Uint8Array([0,0,2,0,1,0]),createDemoIco().slice(0,20),createDemoIco().slice(0,-1)])assert.throws(()=>parseIco(bytes));
  const bytes=createDemoIco();new DataView(bytes.buffer).setUint32(18,6,true);assert.throws(()=>parseIco(bytes),/outside/);
});
test('rejects oversized files before parsing',()=>assert.throws(()=>parseIco(new Uint8Array(MAX_FILE_SIZE+1)),/64 MB/));
test('recognizes PNG resources and calculates their color depth',()=>{
  const bytes=new Uint8Array(55),v=new DataView(bytes.buffer);v.setUint16(2,1,true);v.setUint16(4,1,true);bytes[6]=16;bytes[7]=16;v.setUint32(14,33,true);v.setUint32(18,22,true);bytes.set([137,80,78,71,13,10,26,10],22);bytes[46]=8;bytes[47]=6;
  assert.equal(parseIco(bytes)[0].encoding,'PNG');assert.equal(parseIco(bytes)[0].bitDepth,32);
});
test('parses CUR hotspots per image and decodes unchanged DIB payloads',()=>{
  const ico=createDemoIco(),bytes=ico.slice(),v=new DataView(bytes.buffer);
  v.setUint16(2,2,true);
  const icons=parseIco(ico);
  for(const entry of icons){const p=6+entry.index*16;v.setUint16(p+4,entry.index===0?0:entry.width-1,true);v.setUint16(p+6,entry.index===0?0:entry.height/2,true);}
  // Exercise a Uint8Array view with a nonzero byte offset as well.
  const padded=new Uint8Array(bytes.length+10);padded.set(bytes,5);
  const cursors=parseIco(padded.subarray(5,5+bytes.length));
  assert.deepEqual(cursors.map(e=>e.width),[16,24,32,48,64,128,256]);
  for(const entry of cursors){
    assert.deepEqual(entry.hotspot,{x:entry.index===0?0:entry.width-1,y:entry.index===0?0:entry.height/2});
    assert.equal(entry.bitDepth,32);
    assert.deepEqual(decodeDib(entry),decodeDib(icons[entry.index]));
  }
});
test('reads mixed BMP/PNG CUR resources without using hotspot Y as bit depth',()=>{
  const cursors=parseIco(readFileSync(new URL('../fixtures/mixed.cur',import.meta.url)));
  assert.deepEqual(cursors.map(entry=>entry.width),[16,24,32,48,64,128,256]);
  for(const entry of cursors){
    const hotspot={x:Math.ceil(entry.width*2/16),y:Math.ceil(entry.height/16)};
    assert.deepEqual(entry.hotspot,hotspot);
    assert.equal(entry.bitDepth,32);
    if(entry.encoding==='BMP'){
      const rgba=decodeDib(entry);
      assert.equal(rgba[3],0);
      assert.equal(rgba[(hotspot.y*entry.width+hotspot.x)*4+3],255);
    }else{
      const header=new DataView(entry.data.buffer,entry.data.byteOffset,entry.data.byteLength);
      assert.equal(header.getUint32(16),entry.width);assert.equal(header.getUint32(20),entry.height);
    }
  }
  assert.equal(cursors[0].encoding,'BMP');assert.equal(cursors.at(-1)!.encoding,'PNG');
});
test('rejects unknown container types and malformed CUR directories and payloads',()=>{
  const bytes=createDemoIco(),v=new DataView(bytes.buffer);
  for(const type of [0,3,65535]){v.setUint16(2,type,true);assert.throws(()=>parseIco(bytes),/ICO or CUR/);}
  v.setUint16(2,2,true);
  for(const truncated of [bytes.slice(0,5),bytes.slice(0,20),bytes.slice(0,-1)])assert.throws(()=>parseIco(truncated));
  v.setUint32(18,6,true);assert.throws(()=>parseIco(bytes),/outside/);
  v.setUint16(4,0,true);assert.throws(()=>parseIco(bytes),/empty/);
  v.setUint16(4,257,true);assert.throws(()=>parseIco(bytes),/256-image/);
});
test('decodes bottom-up 24-bit pixels and AND transparency',()=>{
  const entry=bitmap(24,1,2,[255,0,0,0,0,0,255,0],[],[0,0,0,0,128,0,0,0]);
  assert.deepEqual([...decodeDib(entry)],[255,0,0,0,0,0,255,255]);
});
test('decodes 1, 4 and 8 bit palettes',()=>{
  const palette=[0,0,0,0,0,0,255,0];
  for(const [bits,pixel] of [[1,128],[4,16],[8,1]])assert.deepEqual([...decodeDib(bitmap(bits,1,1,[pixel],palette))],[255,0,0,255]);
});
test('preserves meaningful 32-bit alpha and falls back to AND mask for zero alpha',()=>{
  assert.deepEqual([...decodeDib(bitmap(32,1,1,[10,20,30,128],[],[128]))],[30,20,10,128]);
  assert.deepEqual([...decodeDib(bitmap(32,1,1,[10,20,30,0]))],[30,20,10,255]);
  assert.equal(decodeDib(bitmap(32,1,1,[10,20,30,0],[],[128]))[3],0);
});
test('decodes 16-bit RGB555',()=>assert.deepEqual([...decodeDib(bitmap(16,1,1,[0,124]))],[255,0,0,255]));
test('isolates unsupported compression and malformed bitmaps',()=>{
  const entry=bitmap(32,1,1,[0,0,0,255]);new DataView(entry.data.buffer).setUint32(16,3,true);assert.throws(()=>decodeDib(entry),/Unsupported/);
  assert.throws(()=>decodeDib({...entry,data:entry.data.slice(0,20)}),/Truncated/);
});
test('limits resource count and accepts top-down scanlines',()=>{
  const bytes=createDemoIco();new DataView(bytes.buffer).setUint16(4,257,true);assert.throws(()=>parseIco(bytes),/256-image/);
  const entry=bitmap(24,1,2,[0,0,255,0,255,0,0,0]);new DataView(entry.data.buffer).setInt32(8,-4,true);
  assert.deepEqual([...decodeDib(entry)],[255,0,0,255,0,0,255,255]);
});
