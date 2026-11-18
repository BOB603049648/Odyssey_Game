import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root=resolve(import.meta.dirname,'..');
const server=spawn('python3',['-m','http.server','8794','--bind','127.0.0.1','--directory',root+'/dist'],{stdio:'ignore'});
let browser;
const errors=[];
try {
  for(let i=0;i<100;i++) {try{if((await fetch('http://127.0.0.1:8794/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const mode of ['original','three']) {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('http://127.0.0.1:8794/'+(mode==='three'?'?renderer=three':''));
    await page.getByRole('button',{name:'新游戏',exact:true}).click();
    await page.getByRole('button',{name:'跳过序章',exact:true}).click();
    await page.locator('.scene-display').waitFor({state:'hidden'});
    if(mode==='three') {
      await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.ready==='true');
      await page.screenshot({path:root+'/artifacts/three-v2/production.png'});
      await page.setViewportSize({width:390,height:844});
      await page.waitForTimeout(200);
      const box=await page.getByRole('button',{name:'切换画面模式',exact:true}).boundingBox();
      assert(box.x>=0&&box.y>240&&box.x+box.width<=390&&box.y+box.height<=844);
      await page.getByRole('button',{name:'切换画面模式',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.look==='base');
      await page.getByRole('button',{name:'切换画面模式',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[data-testid="three-world"]')?.dataset.look==='cinematic');
      await page.screenshot({path:root+'/artifacts/three-v2/phone.png'});
    } else assert.equal(await page.getByTestId('three-world').count(),0);
    await context.close();
  }
  const comparisonContext=await browser.newContext({viewport:{width:1440,height:1140}});
  const comparison=await comparisonContext.newPage();
  comparison.on('pageerror',e=>errors.push(e.message));
  await comparison.route('**/comparison',route=>readFile(root+'/artifacts/three-v2/render-comparison.html','utf8').then(body=>route.fulfill({contentType:'text/html',body})));
  await comparison.goto('http://127.0.0.1:8794/comparison');
  for(const name of ['雾岸','经堂','夜营']){
    await comparison.getByRole('button',{name,exact:true}).click();
    await comparison.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
    assert.equal(await comparison.locator('#title').textContent(),name);
  }
  await comparison.getByRole('slider',{name:'对比分界'}).fill('65');
  assert.equal(await comparison.locator('.stage').evaluate(e=>e.style.getPropertyValue('--split')),'65%');
  await comparison.screenshot({path:root+'/artifacts/three-v2/comparison-preview.png',fullPage:true});
  await comparisonContext.close();
  assert.deepEqual(errors,[]);
  await writeFile(root+'/artifacts/three-v2/package-check.json',JSON.stringify({status:'PASS',checks:['production assets and entry','original renderer entry','Three.js renderer entry','portrait compare button','standalone comparison three tabs and slider'],errors},null,2));
  console.log('Production preview and comparison: PASS; no asset errors.');
} finally {await browser?.close();server.kill();}
