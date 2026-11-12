import { resolve, relative } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vite.config';

/** Explicit separate entry; regular Vite config and game index remain untouched. */
export default mergeConfig(base, defineConfig({
  define: {
    'import.meta.env.VITE_DISPLAY_REVIEW': JSON.stringify('1'),
    'import.meta.env.VITE_VISUAL_SAMPLE': JSON.stringify('1'),
    'import.meta.env.VITE_SHORE_DEPLOY_ORIGIN': JSON.stringify('http://47.252.94.138'),
  },
  build: { rollupOptions: { input: resolve(import.meta.dirname,'display-review.html') } },
  plugins: [{ name: 'display-review-no-persistent-entry', generateBundle() {
    const modules = [...this.getModuleIds()].filter(id=>id.startsWith(resolve(import.meta.dirname,'src')+'/')).map(id=>relative(import.meta.dirname,id));
    const forbidden = modules.filter(id=>/^src\/(App|ui\/IslandScreen)\.tsx$|^src\/stores\/|^src\/platform\/storage\.ts$/.test(id));
    if (forbidden.length) this.error(`Persistent dependency in display review: ${forbidden.join(', ')}`);
    this.emitFile({type:'asset',fileName:'display-review-module-graph.json',source:JSON.stringify({modules,forbidden},null,2)});
  } }],
}));
