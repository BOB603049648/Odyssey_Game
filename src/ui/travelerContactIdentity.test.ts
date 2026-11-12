import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { verifyTravelerContactAssets, verifyTravelerContactBytes } from '../../scripts/verifyTravelerContact';
import { approvedTravelerContactSource } from './travelerContactIdentity';
import { travelerFrameUrl } from '../content/assetUrls';
it.each(['idle-front-01.png','idle-front-01.webp'])('%s: same-name same-size actual changed pixels cannot pass the build identity',file=>{
 const original=readFileSync('src/assets/traveler/'+file);expect(()=>verifyTravelerContactBytes(file,original)).not.toThrow();
 const changed=execFileSync('python3',['-c',`from PIL import Image
import io,sys
im=Image.open(sys.argv[1]).convert('RGBA');p=im.getpixel((300,1050));im.putpixel((300,1050),(p[0]^1,*p[1:]));out=io.BytesIO();im.save(out,format='WEBP' if sys.argv[1].endswith('webp') else 'PNG',lossless=True);sys.stdout.buffer.write(out.getvalue())`,'src/assets/traveler/'+file],{maxBuffer:2_000_000});
 expect(()=>verifyTravelerContactBytes(file,changed)).toThrow(/identity/);
});
it('runtime accepts only asset-import identities, never a same-name arbitrary URL; no crypto.subtle needed',()=>{
 expect(approvedTravelerContactSource('idle-front-01.png',travelerFrameUrl('idle-front-01.png')!)).toBe(true);
 expect(approvedTravelerContactSource('idle-front-01.png','http://unreviewed.invalid/idle-front-01.webp')).toBe(false);
});

it('the build validator covers the full approved asset set and is wired into mandatory Vite buildStart',()=>{
 expect(()=>verifyTravelerContactAssets()).not.toThrow();
 const config=readFileSync('vite.config.ts','utf8');expect(config).toMatch(/apply:\s*'build'.*buildStart\(\).*verifyTravelerContactAssets\(\)/);
});
