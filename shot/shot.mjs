import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 640, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('file://' + process.cwd() + '/safety.html');
await p.screenshot({ path: 'safety.png', fullPage: true });
await b.close();
console.log('ok');
