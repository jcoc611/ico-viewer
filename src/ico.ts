/** ICO/CUR directory parsing and uncompressed Windows DIB decoding; no Node dependencies. */
export interface IconEntry {
  index: number; width: number; height: number; bitDepth: number;
  encoding: 'PNG' | 'BMP'; byteLength: number; offset: number; data: Uint8Array;
  hotspot?: { x: number; y: number };
}
export const MAX_FILE_SIZE = 64 * 1024 * 1024;
const pngSignature = [137,80,78,71,13,10,26,10];
/** Parse either an ICO or a static CUR file, identified by its header. */
export function parseIco(bytes: Uint8Array): IconEntry[] {
  if (bytes.length > MAX_FILE_SIZE) throw Error('This icon exceeds the 64 MB limit.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 6 || v.getUint16(0,true) !== 0 || ![1,2].includes(v.getUint16(2,true))) throw Error('This is not a valid ICO or CUR file.');
  const isCursor = v.getUint16(2,true) === 2;
  const count = v.getUint16(4,true), directoryEnd = 6 + count * 16;
  if (count > 256) throw Error('This icon exceeds the 256-image limit.');
  if (!count || directoryEnd > bytes.length) throw Error('The icon directory is empty or truncated.');
  return Array.from({length:count}, (_,index) => {
    const p = 6 + index * 16, byteLength = v.getUint32(p+8,true), offset = v.getUint32(p+12,true);
    if (!byteLength || offset < directoryEnd || offset + byteLength > bytes.length) throw Error(`Image ${index+1} points outside the file.`);
    const data = bytes.slice(offset,offset+byteLength);
    const encoding = pngSignature.every((b,i) => data[i] === b) ? 'PNG' : 'BMP';
    // CUR uses the planes/bit-depth words for hotspot coordinates instead.
    const hotspot = isCursor ? {x:v.getUint16(p+4,true),y:v.getUint16(p+6,true)} : undefined;
    let bitDepth = isCursor ? 0 : v.getUint16(p+6,true);
    if (encoding === 'PNG' && data.length >= 26) {
      const channels: Record<number,number> = {0:1,2:3,3:1,4:2,6:4};
      bitDepth = data[24] * (channels[data[25]] || 1);
    } else if (encoding === 'BMP' && data.length >= 16) bitDepth = new DataView(data.buffer,data.byteOffset,data.byteLength).getUint16(14,true);
    return {index,width:bytes[p] || 256,height:bytes[p+1] || 256,bitDepth,encoding,byteLength,offset,data,...(hotspot ? {hotspot} : {})};
  });
}
export function decodeDib(entry: IconEntry): Uint8ClampedArray {
  const {data,width,height} = entry;
  const v = new DataView(data.buffer,data.byteOffset,data.byteLength);
  const requireBytes = (n:number) => { if (n > data.length) throw Error('Truncated bitmap data.'); };
  requireBytes(40);
  const header = v.getUint32(0,true), bits = v.getUint16(14,true), compression = v.getUint32(16,true);
  if (header < 40 || header > data.length) throw Error('Unsupported bitmap header.');
  if (v.getInt32(4,true) !== width || Math.abs(v.getInt32(8,true)) !== height * 2 || v.getUint16(12,true) !== 1) throw Error('Bitmap dimensions do not match its directory entry.');
  if (compression !== 0 || ![1,4,8,16,24,32].includes(bits)) throw Error(`Unsupported bitmap encoding (${bits}-bit, compression ${compression}).`);
  const colors = bits <= 8 ? v.getUint32(32,true) || (1 << bits) : 0;
  if (colors > 256) throw Error('Invalid bitmap palette.');
  const start = header + colors * 4, stride = Math.ceil(width * bits / 32) * 4;
  const maskStart = start + stride * height, maskStride = Math.ceil(width / 32) * 4;
  requireBytes(maskStart);
  // A 32-bit icon with real alpha may omit its redundant AND mask.
  const hasMask = maskStart + maskStride * height <= data.length;
  let hasAlpha = false;
  if (bits === 32) for (let y=0;y<height;y++) for (let x=0;x<width;x++) if(data[start+y*stride+x*4+3]) hasAlpha=true;
  if (!hasMask && !hasAlpha) throw Error('Bitmap transparency mask is missing.');
  const rgba = new Uint8ClampedArray(width*height*4);
  const topDown = v.getInt32(8,true) < 0;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const row = topDown ? y : height-1-y, p = start+row*stride, out = (y*width+x)*4;
    let r:number,g:number,b:number,a=255;
    if (bits <= 8) {
      const index = bits===8 ? data[p+x] : bits===4 ? (data[p+(x>>1)] >> (x%2===0?4:0)) & 15 : (data[p+(x>>3)] >> (7-x%8)) & 1;
      if(index>=colors) throw Error('Bitmap references a missing palette color.');
      const c=header+index*4; b=data[c];g=data[c+1];r=data[c+2];
    } else if(bits===16) {
      const c=v.getUint16(p+x*2,true); r=Math.round(((c>>10)&31)*255/31);g=Math.round(((c>>5)&31)*255/31);b=Math.round((c&31)*255/31);
    } else { const c=p+x*(bits/8);b=data[c];g=data[c+1];r=data[c+2];if(bits===32 && hasAlpha)a=data[c+3]; }
    if (!(bits===32 && hasAlpha) && hasMask && ((data[maskStart+row*maskStride+(x>>3)]>>(7-x%8))&1)) a=0;
    rgba.set([r,g,b,a],out);
  }
  return rgba;
}
/** Deterministic sample bundle, also useful for exercising legacy BMP entries. */
export function createDemoIco(): Uint8Array {
  const sizes=[16,24,32,48,64,128,256];
  const images=sizes.map(size=>{
    const stride=size*4, maskStride=Math.ceil(size/32)*4;
    const bytes=new Uint8Array(40+stride*size+maskStride*size),v=new DataView(bytes.buffer);
    v.setUint32(0,40,true);v.setInt32(4,size,true);v.setInt32(8,size*2,true);v.setUint16(12,1,true);v.setUint16(14,32,true);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=(x+.5)/size,t=(y+.5)/size,p=40+((size-1-y)*size+x)*4;
      const inside=Math.abs(u-.5)<.43 && Math.abs(t-.5)<.43 && Math.hypot(Math.max(Math.abs(u-.5)-.25,0),Math.max(Math.abs(t-.5)-.25,0))<.18;
      const mark=(Math.abs(u-.5)+Math.abs(t-.5)<.27) && !(Math.abs(u-.5)+Math.abs(t-.5)<.12);
      bytes.set(mark?[244,253,225,255]:[Math.round(120+50*t),Math.round(170+50*u),Math.round(75+30*t),inside?255:0],p);
    }
    return bytes;
  });
  const out=new Uint8Array(6+sizes.length*16+images.reduce((n,b)=>n+b.length,0)),v=new DataView(out.buffer);
  v.setUint16(2,1,true);v.setUint16(4,sizes.length,true);let offset=6+sizes.length*16;
  images.forEach((bytes,i)=>{const p=6+i*16;out[p]=sizes[i]%256;out[p+1]=sizes[i]%256;v.setUint16(p+4,1,true);v.setUint16(p+6,32,true);v.setUint32(p+8,bytes.length,true);v.setUint32(p+12,offset,true);out.set(bytes,offset);offset+=bytes.length;});
  return out;
}
