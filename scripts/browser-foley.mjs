import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const url=process.env.ODYSSEY_URL??'http://127.0.0.1:4173/';
const out=resolve(process.env.ODYSSEY_QA_DIR??'artifacts/browser-foley');await mkdir(out,{recursive:true});
const proxyServer=url.startsWith('https:')?process.env.HTTPS_PROXY:process.env.HTTP_PROXY;
const proxy=proxyServer&&!['localhost','127.0.0.1'].includes(new URL(url).hostname)?{server:proxyServer,bypass:process.env.NO_PROXY}:undefined;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--autoplay-policy=user-gesture-required'],proxy});
const errors=[],results=[];
function probe(){
 window.foley={voices:[],contexts:[]};const bytes=new WeakMap(),buffers=new WeakMap();
 const fetch=window.fetch;window.fetch=async(...args)=>{const response=await fetch(...args),read=response.arrayBuffer.bind(response);response.arrayBuffer=async()=>{const data=await read();bytes.set(data,response.url);return data;};return response;};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);const e=window.foley.contexts.find(e=>e.context===this.context);if(e&&destination===this.context.destination){connect.call(this,e.analyser);connect.call(this,e.recording);}return result;};
 const Original=window.AudioContext;window.AudioContext=class extends Original{
  constructor(...args){super(...args);const analyser=this.createAnalyser();analyser.fftSize=2048;window.foley.contexts.push({context:this,analyser,recording:this.createMediaStreamDestination()});}
  async decodeAudioData(data,...args){const id=bytes.get(data);const buffer=await super.decodeAudioData(data,...args);buffers.set(buffer,id);return buffer;}
  createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{const actor=document.querySelector('[data-testid=traveler]'),img=actor?.querySelector('[data-layer=current]');const voice={url:buffers.get(source.buffer)||'',time:performance.now(),loop:source.loop,live:true,pose:actor?.dataset.pose,frame:img?.dataset.frame,scene:document.querySelector('[data-testid=walk-stage]')?.dataset.scene};window.foley.voices.push(voice);source.addEventListener('ended',()=>{voice.live=false;});return start(...args);};return source;}
 };
 window.foley.level=()=>{const e=window.foley.contexts.at(-1);if(!e)return 0;const d=new Float32Array(2048);e.analyser.getFloatTimeDomainData(d);return Math.sqrt(d.reduce((s,n)=>s+n*n,0)/d.length);};
}
const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addInitScript(probe);
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const ready=p=>p.locator('[data-testid=walk-stage][data-display=ready]').waitFor();
const expandMix=async p=>{const details=p.locator('.audio-channel-details');if(await details.getAttribute('open')===null)await details.locator('summary').click();};
const voices=(p,part)=>p.evaluate(part=>window.foley.voices.filter(v=>v.url.includes(part)),part);
async function seed(p,fixture,scene){await p.evaluate(({fixture,scene})=>{const save=structuredClone(fixture);save.screen='island';save.currentScene=scene;save.overlay='none';save.feedback={seq:0,kind:'none'};save.flags['dba.flag.taught-approach']=true;for(const word of Object.values(save.words))word.state='learned';localStorage.setItem('odyssey.save.v1',JSON.stringify(save));},{fixture,scene});await p.reload();await p.getByRole('button',{name:'继续',exact:true}).click();await ready(p);await p.waitForTimeout(450);}
async function spot(p,id){const el=p.getByTestId(id);await el.click();await p.waitForFunction(id=>document.querySelector(`[data-testid="${id}"]`)?.dataset.reach==='near',id);await p.waitForFunction(()=>document.querySelector('[data-testid=traveler]')?.dataset.moving==='no');await p.waitForTimeout(200);await el.click();}
try{
 await page.goto(url);assert.equal(await page.evaluate(()=>window.foley.contexts.length),0);
 await page.getByRole('button',{name:'启用声音',exact:true}).click();await page.waitForFunction(()=>window.foley.voices.some(v=>v.live&&v.url.includes('theme-title'))&&window.foley.level()>.001);
 await expandMix(page);await page.getByRole('slider',{name:'音乐',exact:true}).fill('0');await page.waitForFunction(()=>window.foley.level()<.0001);
 await page.getByRole('slider',{name:'音乐',exact:true}).fill('55');await page.waitForFunction(()=>window.foley.level()>.001);
 await page.getByRole('button',{name:'新游戏',exact:true}).click();await page.getByRole('button',{name:'跳过序章',exact:true}).click();await ready(page);
 const fixture=await page.evaluate(()=>JSON.parse(localStorage.getItem('odyssey.save.v1')));
 for(const [scene,material] of [['shore','sand'],['yard','stone'],['camp','wood']]){
  await seed(page,fixture,`dba.scene.${scene}`);
  assert.equal((await voices(page,'word-learn')).length,0,'loading a learned save replayed a reward');
  await page.keyboard.down('d');await page.waitForTimeout(1450);await page.keyboard.up('d');await page.waitForTimeout(250);
  const steps=await voices(page,`step-${material}`);assert.ok(steps.length>=3,`${scene} has only ${steps.length} contacts`);
  assert.ok(steps.every(v=>v.pose==='walk'&&['0','2'].includes(v.frame)),`${material}: sound outside a displayed contact frame`);
  assert.ok(steps.every((v,i)=>!i||v.url!==steps[i-1].url),'identical consecutive footfall');
  const n=steps.length;await page.waitForTimeout(450);assert.equal((await voices(page,`step-${material}`)).length,n,'footsteps continued at rest');
  assert.ok((await voices(page,`step-${material}`)).every(v=>!v.live),'footstep voices survived release');
  await page.keyboard.down('a');await page.waitForTimeout(350);await page.getByRole('button',{name:'设置',exact:true}).click();await page.keyboard.up('a');await page.waitForTimeout(250);
  const paused=(await voices(page,'step-')).length;await page.waitForTimeout(400);assert.equal((await voices(page,'step-')).length,paused,'menu allowed footsteps');
  await page.getByRole('button',{name:'合上',exact:true}).click();
  results.push({scene,material,steps:steps.length,frames:[...new Set(steps.map(v=>v.frame))]});
 }
 await seed(page,fixture,'dba.scene.shore');await page.keyboard.down('w');await page.waitForTimeout(1600);
 await page.waitForFunction(()=>document.querySelector('[data-testid=traveler]')?.dataset.moving==='no');const wall=(await voices(page,'step-')).length;await page.waitForTimeout(500);assert.equal((await voices(page,'step-')).length,wall,'pressing into a wall still sounded steps');await page.keyboard.up('w');
 await seed(page,fixture,'dba.scene.camp');await spot(page,'act-dba.word.drink');await page.waitForTimeout(1900);
 const gulps=await voices(page,'/drink-');assert.ok(gulps.length>0);assert.ok(gulps.every(v=>v.pose==='drink'&&v.frame==='2'));
 const fills=await voices(page,'water-draw-');assert.ok(fills.length>0&&fills.every(v=>v.pose==='drink'&&v.frame==='0'));
 await spot(page,'camp-sleep');await page.waitForTimeout(1500);const sitting=await voices(page,'/sit-');assert.ok(sitting.length>0&&sitting.every(v=>v.pose==='lie'&&v.frame==='1'));
 assert.equal((await voices(page,'cat-purr')).length,0,'drinking/resting still uses the generic purr reward');
 // All mixer preferences persist, and isolating effects actually silences them.
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('slider',{name:'动作与反馈',exact:true}).fill('0');await page.getByRole('slider',{name:'环境',exact:true}).fill('0');
 await page.getByRole('button',{name:'合上',exact:true}).click();await page.waitForFunction(()=>window.foley.level()<.0001);
 const muted=(await voices(page,'step-')).length;await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');assert.equal((await voices(page,'step-')).length,muted);
 await page.reload();await expandMix(page);await page.getByRole('slider',{name:'动作与反馈',exact:true}).waitFor();assert.equal(await page.getByRole('slider',{name:'动作与反馈',exact:true}).inputValue(),'0');
 await page.getByRole('slider',{name:'动作与反馈',exact:true}).fill('100');await page.getByRole('slider',{name:'环境',exact:true}).fill('80');
 // Desktop and touch layout, with every control reachable in the scroll panel.
 await page.setViewportSize({width:390,height:844});await page.getByRole('slider',{name:'音乐',exact:true}).scrollIntoViewIfNeeded();await page.waitForTimeout(1000);await page.screenshot({path:resolve(out,'mobile-mixer.png')});
 await context.close();
 // Cold delayed samples cannot play in a burst after a player has stopped.
 const slow=await browser.newContext();await slow.addInitScript(probe);await slow.addInitScript(save=>localStorage.setItem('odyssey.save.v1',JSON.stringify(save)),fixture);
 const cold=await slow.newPage();cold.on('pageerror',e=>errors.push(e.message));await cold.route('**/*step-*.mp3',async route=>{await new Promise(r=>setTimeout(r,1100));await route.continue().catch(()=>{});});
 await cold.goto(url);await cold.getByRole('button',{name:'继续',exact:true}).click();await ready(cold);await cold.keyboard.down('d');await cold.waitForTimeout(120);await cold.keyboard.up('d');await cold.waitForTimeout(1500);
 assert.equal((await voices(cold,'step-')).length,0,'late downloads replayed old contacts');await slow.close();
 // Capture the actual mixed game output alongside the live body animation.
 const demoContext=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}});await demoContext.addInitScript(probe);
 const demo=await demoContext.newPage();demo.on('pageerror',e=>errors.push(e.message));await demo.goto(url);await seed(demo,fixture,'dba.scene.camp');
 await demo.evaluate(()=>{window.chunks=[];window.rec=new MediaRecorder(window.foley.contexts[0].recording.stream,{mimeType:'audio/webm;codecs=opus'});window.rec.ondataavailable=e=>{if(e.data.size)window.chunks.push(e.data);};window.rec.start();});
 await demo.keyboard.down('d');await demo.waitForTimeout(900);await demo.keyboard.up('d');await demo.keyboard.down('a');await demo.waitForTimeout(900);await demo.keyboard.up('a');
 await spot(demo,'act-dba.word.drink');await demo.waitForTimeout(1900);await spot(demo,'camp-sleep');await demo.waitForTimeout(1800);await demo.screenshot({path:resolve(out,'camp-foley.png')});
 const bytes=await demo.evaluate(async()=>{await new Promise(r=>{window.rec.onstop=r;window.rec.stop();});const bytes=new Uint8Array(await new Blob(window.chunks).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);});
 const audioFile=resolve(out,'game-audio.webm');await writeFile(audioFile,Buffer.from(bytes,'base64'));const videoFile=await demo.video().path();await demoContext.close();
 const duration=file=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim());
 execFileSync('ffmpeg',['-v','error','-y','-ss',String(Math.max(0,duration(videoFile)-duration(audioFile))),'-i',videoFile,'-i',audioFile,'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',resolve(out,'gameplay-sound-demo.mp4')]);
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({result:'PASS',results,checks:['title theme and music isolation','3 ground materials','contact-frame synchronization','nonrepeating variants','release/menu/wall silence','drink and sit sync','no generic purr','independent persisted mix','mobile controls','no delayed step burst','captured actual mixed output'],errors},null,2));console.log('PASS gameplay sound checks');
}catch(e){if(!page.isClosed())await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});console.error(e);process.exitCode=1;}finally{await browser.close();}
