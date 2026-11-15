/* Run with portable Windows Node; no personal browser profile or normal database. */
import { resolve } from 'node:path';
if(process.platform!=='win32')throw new Error('Run this entry point with Windows Node 24.21+, not Linux Node.');
process.env.ASTRA_BROWSER_BIN??=String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
process.env.ASTRA_BROWSER_OUTPUT??=resolve(process.argv.includes('--closure')?'artifacts/n03-closure-'+(process.argv.includes('--zoom=2')?'200':'100')+'-'+(process.argv.find(s=>s.startsWith('--task='))?.slice(7)??'audit'):'artifacts/n03-windows-real-browser');
await import('./browser-acceptance.mjs');
