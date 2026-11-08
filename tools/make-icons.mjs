// Renders the app icons from the game's own sprite code. Usage: node tools/make-icons.mjs (server on :8123)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:8123/tools/icons.html');
await p.waitForFunction(() => window.ICONS);
const icons = await p.evaluate(() => window.ICONS);
for (const [k, v] of Object.entries(icons)) fs.writeFileSync(`icons/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
await b.close();
console.log('icons written');
