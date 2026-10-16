import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({stdin:{contents:"export {toString, toDataURL} from 'qrcode/lib/browser.js';",resolveDir:root},bundle:true,platform:'browser',format:'esm',minify:true,outfile:fileURLToPath(new URL('../dist/qr.js',import.meta.url))});
