import pluginNodeResolve from '@rollup/plugin-node-resolve';
import pluginTypeScript from '@rollup/plugin-typescript';
import { buildHeader } from './build/header.mjs';
import { loadScripts } from './build/meta.mjs';

// The `meta` export exists for the build only; drop the keyword so the bundle
// has no exports (an IIFE can't have any) and the object tree-shakes away.
const stripMeta = {
  name: 'strip-meta',
  transform: (code, id) =>
    id.endsWith('.ts') ? code.replace(/^export const meta\b/m, 'const meta') : null,
};

// One rollup config per script; each bundles to a self-contained IIFE in dist/,
// which is what CI attaches to the release. Nothing built is committed.
export default loadScripts().map((def) => ({
  input: `src/scripts/${def.file}.ts`,
  plugins: [
    stripMeta,
    pluginNodeResolve({ extensions: ['.ts'] }),
    pluginTypeScript({ tsconfig: './tsconfig.json', noEmit: false, outDir: undefined }),
  ],
  output: {
    file: `dist/${def.file}.user.js`,
    format: 'iife',
    banner: buildHeader(def),
    // @require'd globals (toastify) are provided by the userscript manager.
    globals: { 'toastify-js': 'Toastify' },
  },
  external: ['toastify-js'],
  onwarn(warning, warn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') warn(warning);
  },
}));
