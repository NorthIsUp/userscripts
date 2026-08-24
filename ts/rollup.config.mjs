import pluginNodeResolve from '@rollup/plugin-node-resolve';
import pluginTypeScript from '@rollup/plugin-typescript';
import { buildHeader } from './header.mjs';
import { scripts } from './scripts.mjs';

// One rollup config per script; each bundles to a self-contained IIFE at the
// repo root under its existing filename, so installed @updateURLs keep working.
export default scripts.map((def) => ({
  input: `src/scripts/${def.file}.ts`,
  plugins: [
    pluginNodeResolve({ extensions: ['.ts'] }),
    pluginTypeScript({ tsconfig: './tsconfig.json', noEmit: false, outDir: undefined }),
  ],
  output: {
    file: `../${def.file}.user.js`,
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
