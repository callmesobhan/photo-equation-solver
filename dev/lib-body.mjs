// Shared by build.mjs (the Gallery page) and build-node.mjs (the Node module for the MCP server and the CLI):
// concatenates src/*.js, escapes every non-ASCII character as \uXXXX, and refuses duplicate top-level names.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** escape (default): every non-ASCII character becomes \\uXXXX, as the Gallery page needs. escape:false keeps real UTF-8, as the Node module can. */
export function readSources({ escape = true } = {}) {
  const srcDir = path.join(here, 'src');
  const parts = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
  let body = parts.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8').trimEnd()).join('\n');
  if (escape) {
    body = body.replace(/[^\x00-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    if (/[^\x00-\x7e]/.test(body.replace(/\\u[0-9a-f]{4}/g, ''))) throw new Error('non-ASCII left over');
  }
  const names = [...body.matchAll(/^(?:async\s+)?(?:function\s*\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const seen = new Map();
  for (const f of parts) {
    const text = fs.readFileSync(path.join(srcDir, f), 'utf8');
    for (const m of text.matchAll(/^(?:async\s+)?(?:function\s*\*?|class|const|let)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (seen.has(m[1])) throw new Error('duplicate top-level name "' + m[1] + '" in ' + f + ' (first in ' + seen.get(m[1]) + ')');
      seen.set(m[1], f);
    }
  }
  return { body, names };
}
