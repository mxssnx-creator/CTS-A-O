// Reconstruct the unchanged archived public-price reference without network or new performance selection.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,openSync,writeSync,closeSync,renameSync,createReadStream} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname,basename} from 'node:path';
const arg=(name,fallback)=>{const i=process.argv.indexOf(`--${name}`);return i<0?fallback:process.argv[i+1]};
const out=resolve(arg('out','runs/combined-reference'));mkdirSync(out,{recursive:true});
const expected='1373d0a7fab7528d0528573385e19dfecf6f4ab353194231c639103af29aadcd';
const digest=x=>createHash('sha256').update(x).digest('hex');
let feed=arg('feed');
if(!feed){
 const file='research/fixtures/postbase-20261017/manifest.json',manifest=JSON.parse(readFileSync(file)),root=dirname(file);
 assert.equal(manifest.gzip.sha256,expected);
 const temp=`${out}/feed.json.gz.tmp`,fd=openSync(temp,'w'),hash=createHash('sha256');let bytes=0;
 try{for(const [i,chunk] of manifest.chunks.entries()){
  assert.equal(chunk.index,i);assert.equal(chunk.path,`feed.json.gz.part-${String(i).padStart(3,'0')}.b64`);assert.equal(basename(chunk.path),chunk.path);
  const raw=readFileSync(`${root}/${chunk.path}`);assert.equal(raw.length,chunk.textBytes);assert.equal(digest(raw),chunk.textSha256);
  const part=Buffer.from(raw.toString().trim(),'base64');assert.equal(part.length,chunk.decodedBytes);assert.equal(digest(part),chunk.decodedSha256);
  writeSync(fd,part);hash.update(part);bytes+=part.length;
 }}finally{closeSync(fd)}
 assert.equal(bytes,manifest.gzip.bytes);assert.equal(hash.digest('hex'),expected);feed=`${out}/feed.json.gz`;renameSync(temp,feed);
}
const hash=createHash('sha256');for await(const part of createReadStream(feed))hash.update(part);assert.equal(hash.digest('hex'),expected);
const archive=JSON.parse(gunzipSync(readFileSync('docs/sims/inverse-20-symbol-20261020.json.gz'))),ref=archive.runs.find(x=>x.name==='inverse-20-24h-lowmem-final');assert.ok(ref);
const protocol=JSON.stringify(ref.protocol,null,2);assert.equal(digest(protocol),'423891ed3b5559d545b8a2a852bf504d6bfa5701c64511634c9f4a58dea73286');
const all=JSON.parse(gunzipSync(readFileSync('docs/sims/inverse-20-symbol-20261020-executions.json.gz'))),execution=JSON.stringify(all.find(x=>x.name===ref.name).executions);assert.equal(digest(execution),'5ae4df47f1866faca7e0a8239742bdda5358a820d8283f8ce7bed738b42b9e48');
writeFileSync(`${out}/protocol.json`,protocol);writeFileSync(`${out}/result.json`,JSON.stringify(ref.result,null,2));writeFileSync(`${out}/executions.json.gz`,gzipSync(execution,{level:9}));
if(resolve(feed)!==`${out}/feed.json.gz`)copyFileSync(feed,`${out}/feed.json.gz`);
console.log(JSON.stringify({out,feedSha256:expected,protocolSha256:digest(protocol),executionSha256:digest(execution),classification:'Restored prior post-Base reference; retrospective correctness/latency only'}));
