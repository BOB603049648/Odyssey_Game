import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const url=process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output=resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/v01-release'); await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:output,size:{width:1280,height:800}}});
const page=await context.newPage(); page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('odyssey.save.v1')));
const ready=()=>page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
async function spot(id){const el=page.getByTestId(id);await el.click();await page.waitForFunction(id=>document.querySelector(`[data-testid="${id}"]`)?.dataset.reach==='near',id);await page.waitForFunction(()=>document.querySelector('[data-testid=traveler]')?.dataset.moving==='no');await page.waitForTimeout(250);await el.click();}
async function frames(pose,duration){
 const found=new Set(); const start=Date.now();
 while(Date.now()-start<duration){
  const result=await page.getByTestId('traveler').evaluate(el=>({pose:el.dataset.pose,frame:el.querySelector('img[data-layer=current]')?.dataset.atlas}));
  if(result.pose===pose)found.add(result.frame);
  if(found.size===4) { await page.screenshot({path:resolve(output,`${pose}.png`)}); break; }
  await page.waitForTimeout(50);
 }
 assert.equal(found.size,4,`${pose}: four authored frames, got ${[...found]}`);
}
try{
 await page.goto(url);await page.getByRole('button',{name:'新游戏',exact:true}).click();
 await page.locator('.prologue-camera[data-limbs=ready]').waitFor();
 const style=await page.addStyleTag({content:'.prologue-weather {visibility:hidden!important}.prologue-camera {transform:none!important}'});
 const painting=page.locator('.prologue-painting');
 const a=await painting.screenshot();await page.waitForTimeout(450);const b=await painting.screenshot();assert.notDeepEqual(a,b,'limbs animate independently of weather/camera');
 await page.getByRole('button',{name:'暂停',exact:true}).click();await page.waitForTimeout(150);
 const c=await painting.screenshot();await page.waitForTimeout(400);assert.deepEqual(await painting.screenshot(),c,'limbs freeze on pause');
 await style.evaluate(el=>el.remove());await page.getByRole('button',{name:'跳过序章',exact:true}).click();await ready();
 await page.getByRole('button',{name:'标题',exact:true}).click();const original=await save();
 await page.getByRole('button',{name:'新游戏',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await save(),original);
 await page.getByText('存档与恢复',{exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'备份存档',exact:true}).click();
 const download=await downloadPromise;const backup=await readFile(await download.path(),'utf8');assert.deepEqual(JSON.parse(backup).save,original);
 await page.getByLabel('选择存档文件').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
 await page.getByText('无法识别这个存档，当前进度没有改变。').waitFor();assert.deepEqual(await save(),original);
 const fixture=structuredClone(original);fixture.currentScene='dba.scene.camp';fixture.flags['dba.flag.taught-approach']=true;
 for(const word of Object.values(fixture.words))word.state='learned';
 await page.getByLabel('选择存档文件').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await page.getByRole('button',{name:'确认恢复',exact:true}).click();await page.getByRole('button',{name:'完成',exact:true}).click();await page.getByRole('button',{name:'继续',exact:true}).click();await ready();
 await spot('act-dba.word.drink');await frames('drink',1750);
 await spot('camp-sleep');await frames('lie',1400);
 await page.waitForFunction(()=>document.querySelector('[data-testid=traveler]')?.dataset.pose!=='lie');
 assert.ok((await save()).beats['dba.beat.sleep']);
 // Every background and all input areas remain readable on a narrow viewport.
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByRole('button',{name:'备份存档',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:resolve(output,'mobile-settings.png')});
 assert.ok(await page.getByRole('button',{name:'备份存档',exact:true}).isVisible());
 await page.getByRole('button',{name:'合上',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.screenshot({path:resolve(output,'mobile-camp.png')});
 await context.close();
 const fallback=await browser.newContext();await fallback.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:get.call(this,kind,...args)};
 });
 const low=await fallback.newPage();low.on('pageerror',e=>errors.push(e.message));await low.goto(url);await low.getByRole('button',{name:'新游戏',exact:true}).click();
 await low.locator('[data-frame-status=ready]').waitFor();assert.equal(await low.locator('.prologue-camera').getAttribute('data-limbs'),'still');
 assert.equal(await low.locator('.prologue-camera > img').evaluate(el=>getComputedStyle(el).opacity),'1');
 await low.getByRole('button',{name:'跳过序章',exact:true}).click();await low.locator('[data-testid=walk-stage][data-display=ready]').waitFor();await fallback.close();
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'result.json'),JSON.stringify({result:'PASS',checks:['independent limb motion','pause','new-game cancel','backup export','invalid backup','restore','drink four frames','seated rest four frames','mobile settings','no WebGL fallback'],errors},null,2));console.log('PASS v0.1 release checks');
}catch(error){await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});console.error(error);process.exitCode=1;}finally{await browser.close();}
