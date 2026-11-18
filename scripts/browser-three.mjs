import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output=process.env.ODYSSEY_THREE_QA??'artifacts/three-v2';
await mkdir(output,{recursive:true});
await mkdir(output+'/base',{recursive:true});
const server=spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','8793','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:8793';
let browser;
try {
  for(let i=0;i<100;i++) {try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  page.setDefaultTimeout(30000);
  await page.goto(url+'/?renderer=three');
  await page.getByRole('button',{name:'新游戏',exact:true}).click();
  await page.getByRole('button',{name:'跳过序章',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.ready==='true');
  await page.screenshot({path:output+'/shore.png'});
  const foot=()=>page.getByTestId('traveler').evaluate(el=>({x:+el.dataset.x,y:+el.dataset.y}));
  const before=await foot();await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
  const after=await foot();assert(after.x>before.x,'keyboard movement reaches GPU view');
  const metrics=[];
  for(const scene of ['shore','camp','yard','hall','path','night','shore']) {
    // Visual fixtures; actual gameplay journey is exercised by browser-smoke separately.
    await page.evaluate(async scene=>{const {useGame}=await import('/src/stores/gameStore.ts');const current=useGame.getState();
      useGame.setState({save:{...current.save,currentScene:`dba.scene.${scene}`,screen:'island',overlay:'none'},place:null});},scene);
    await page.waitForFunction(scene=>{const e=document.querySelector('[data-testid="three-world"]');return e?.dataset.ready==='true'&&e.dataset.scene===`dba.scene.${scene}`;},scene);
    await page.waitForTimeout(350);
    await page.emulateMedia({reducedMotion:'reduce'});
    metrics.push(await page.getByTestId('three-world').evaluate(e=>({...e.dataset})));
    await page.screenshot({path:`${output}/${scene}.png`});
    assert.equal(await page.getByTestId('three-world').getAttribute('data-post-passes'),'4');
    assert.equal(await page.locator('.scene-grade').evaluate(e=>getComputedStyle(e).opacity),'0','GPU output must not be graded twice');
    await page.getByRole('button',{name:'切换画面模式',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.look==='base');
    assert.equal(await page.getByTestId('three-world').getAttribute('data-post-passes'),'0');
    await page.screenshot({path:`${output}/base/${scene}.png`});
    await page.getByRole('button',{name:'切换画面模式',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.look==='cinematic');
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
  // Camera/pointer mapping still follows the original scene coordinates.
  const world=await page.getByTestId('world-camera').locator('.world-layer').boundingBox();
  await page.mouse.click(world.x+world.width*.5,world.y+world.height*.82);
  await page.waitForTimeout(1400);assert((await foot()).y>.73,'point-to-ground movement works');
  await page.evaluate(()=>{
    const canvas=document.querySelector('.three-world canvas');
    const stream=canvas.captureStream(24),chunks=[];
    window.threeRecording={stream,chunks,recorder:new MediaRecorder(stream,{mimeType:'video/webm'})};
    window.threeRecording.recorder.ondataavailable=e=>chunks.push(e.data);
    window.threeRecording.recorder.start();
  });
  await page.keyboard.down('a');await page.waitForTimeout(1600);await page.keyboard.up('a');
  await page.waitForTimeout(800);await page.keyboard.down('d');await page.waitForTimeout(2200);await page.keyboard.up('d');
  const recording=await page.evaluate(()=>new Promise(resolve=>{
    const {recorder,chunks,stream}=window.threeRecording;
    recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());stream.getTracks().forEach(t=>t.stop());resolve(Array.from(bytes));};recorder.stop();
  }));
  await writeFile(output+'/shore-motion.webm',Buffer.from(recording));
  // Modal pauses decorative time as well as the existing simulation.
  await page.evaluate(async()=>{const {useGame}=await import('/src/stores/gameStore.ts');const {save}=useGame.getState();useGame.setState({save:{...save,overlay:'settings'}});});
  await page.waitForTimeout(100);const frozen=await page.getByTestId('three-world').getAttribute('data-time');
  await page.waitForTimeout(300);assert.equal(await page.getByTestId('three-world').getAttribute('data-time'),frozen);
  await page.evaluate(async()=>{const {useGame}=await import('/src/stores/gameStore.ts');const {save}=useGame.getState();useGame.setState({save:{...save,overlay:'none'}});});
  // Portrait view and reduced motion must still render and accept game UI.
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(500);await page.screenshot({path:output+'/phone.png'});
  const reduced=await page.getByTestId('three-world').getAttribute('data-time');await page.waitForTimeout(200);
  assert.equal(await page.getByTestId('three-world').getAttribute('data-time'),reduced);
  // Actual context loss must reveal the fallback rather than leave a blank scene.
  await page.evaluate(()=>{const canvas=document.querySelector('.three-world canvas');canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
  await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.status==='fallback');
  assert.equal(await page.getByTestId('world-root').getAttribute('data-three-ready'),'false');
  assert.equal(await page.locator('.painted-environment').last().evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.notEqual(await page.locator('.scene-grade').evaluate(e=>getComputedStyle(e).opacity),'0','fallback restores the original color grade');
  // Exercise the unsigned-byte path on a context without float render targets.
  const ldrContext=await browser.newContext({viewport:{width:1100,height:700}});
  await ldrContext.addInitScript(()=>{
    const original=WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:original.call(this,name);};
  });
  const ldr=await ldrContext.newPage();ldr.on('pageerror',e=>errors.push(e.message));
  ldr.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await ldr.goto(url+'/?renderer=three');
  await ldr.getByRole('button',{name:'新游戏',exact:true}).click();
  await ldr.getByRole('button',{name:'跳过序章',exact:true}).click();
  await ldr.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.ready==='true');
  assert.equal(await ldr.getByTestId('three-world').getAttribute('data-hdr'),'false');
  await ldr.screenshot({path:output+'/ldr-fallback.png'});await ldrContext.close();
  assert.deepEqual(errors,[]);
  await writeFile(output+'/checks.json',JSON.stringify({status:'PASS',metrics,errors,checks:['six scene fixtures','live enhanced/base comparison','one color grade','keyboard and click movement','modal pause','portrait','reduced motion','WebGL context loss fallback','unsigned-byte render targets']},null,2));
  console.log(JSON.stringify({status:'PASS',metrics,errors}));
  await browser.close(); browser=null;
  if(process.argv.includes('--journey')) {
    // Execute the existing real-click journey with explicit WebGL assertions;
    // temporary runner keeps the original baseline test unchanged.
    const path='scripts/.three-journey.mjs';
    const source=(await readFile('scripts/browser-smoke.mjs','utf8'))
      .replace('page.setDefaultTimeout(20000)','page.setDefaultTimeout(60000)')
      .replace("args:['--no-sandbox']","args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']")
      .replace("async function ready(){await page.locator('.scene-display').waitFor({state:'hidden'});}","async function ready(){await page.locator('.scene-display').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('[data-testid=three-world]')?.dataset.ready==='true');}");
    await writeFile(path,source);
    try {
      const code=await new Promise(resolve=>{const proc=spawn('node',[path],{stdio:'inherit',env:{...process.env,ODYSSEY_URL:url+'/?renderer=three',CHROMIUM_PATH:'/usr/bin/chromium',ODYSSEY_QA_DIR:output+'/journey'}});proc.on('exit',resolve);});
      assert.equal(code,0,'full gameplay journey in the Three.js view');
    }finally{await unlink(path);}
  }
} finally {await browser?.close();server.kill();}
