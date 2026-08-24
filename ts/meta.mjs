import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SCRIPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'src/scripts');

/** Pull the `export const meta = {...}` literal out of a script's source. */
function readMeta(path, filename) {
  const source = ts.createSourceFile(
    filename,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === 'meta' && decl.initializer) {
        // Read, never import: importing the module would run the script's
        // top-level DOM code in Node. ScriptMeta requires a pure literal, so
        // evaluating it in an empty scope is enough.
        return new Function(`return (${decl.initializer.getText(source)});`)();
      }
    }
  }
  throw new Error(`${filename} is missing "export const meta"`);
}

/** Every script in src/scripts, with its metadata. The filename is the output name. */
export function loadScripts() {
  return readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => ({ file: f.replace(/\.ts$/, ''), ...readMeta(join(SCRIPTS_DIR, f), f) }));
}
