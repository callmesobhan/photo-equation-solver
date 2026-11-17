// Draws the pictures in assets/ (logo, README hero, "what it solves" grid, GitHub social preview).
// Every result shown in them is printed by the real engine (mcp-server/bin/cli.js), never typed by hand.
//
// Usage:  node dev/make-visuals.cjs          (needs Playwright with Chromium; uses the font Inter if installed)
// Output: assets/logo.svg, logo-square.svg, logo-512.png, logo-square-512.png, hero.png, solves.png, social-preview.png
//
// The logo is drawn with strokes, not text, so the SVG looks the same on every machine.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const CLI = path.join(ROOT, 'mcp-server', 'bin', 'cli.js');
const PHOTO = path.join(ROOT, 'dev', 'tests', 'photo-kit', 'images', '06-fraction.png');
const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = '"JetBrains Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace';

// ---------- colours ----------
const C = { blue: '#0b57d0', blue2: '#1a73e8', navy: '#0a2a6b', navy2: '#06173f', ink: '#202124', grey: '#5f6368', soft: '#e8f0fe', line: '#dadce0', pale: '#8ab4f8' };

// ---------- the real engine ----------
function solve(text) {
  const out = execFileSync('node', [CLI, text], { encoding: 'utf8' });
  const lines = out.replace(/\s+$/, '').split('\n');
  const keep = [];
  for (const l of lines) {
    if (/^(Working:|Check:|Note:)/.test(l)) break;
    keep.push(l);
  }
  const read = (keep.find((l) => l.startsWith('Read as:')) || '').replace('Read as: ', '');
  const i = keep.findIndex((l) => l.startsWith('Answer:'));
  if (!read || i < 0) throw new Error('unexpected engine output for ' + text + ':\n' + out);
  const first = keep[i].replace('Answer:', '').trim();
  const answer = [first, ...keep.slice(i + 1).map((l) => l.trim())].filter(Boolean);
  const check = (lines.find((l) => l.startsWith('Check:')) || '').replace('Check: ', '');
  return { read, answer, check, full: out };
}

// ---------- logo ----------
function logoSvg(rx) {
  const sw = 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Photo Equation Solver">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.blue2}"/><stop offset="1" stop-color="#0842a0"/></linearGradient></defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <g fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
    <path d="M92 168 V92 H168"/><path d="M344 92 H420 V168"/><path d="M420 344 V420 H344"/><path d="M168 420 H92 V344"/>
  </g>
  <g fill="none" stroke="#ffffff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M139 236 L195 304 M195 236 L139 304"/>
    <path d="M222 252 H278 M222 288 H278"/>
    <path d="M356 304 V204 L305 282 H385"/>
  </g>
</svg>
`;
}
const logoDataUri = (rx) => 'data:image/svg+xml;base64,' + Buffer.from(logoSvg(rx)).toString('base64');

// ---------- small HTML helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${FONT}; color: ${C.ink}; -webkit-font-smoothing: antialiased; }
  .mono { font-family: ${MONO}; }
`;
function card(r, opts = {}) {
  const ans = r.answer.map((l) => `<div class="a">${esc(l)}</div>`).join('');
  return `<div class="card" style="${opts.style || ''}">
    <div class="ch">Exact result from the solver</div>
    <div class="rd"><span>Read as:</span> ${esc(r.read)}</div>
    <div class="al">Answer:</div>${ans}
    ${opts.check && r.check ? `<div class="ck">&#10003; ${esc(r.check)}</div>` : ''}
  </div>`;
}
const cardCss = `
  .card { background:#fff; border-radius:20px; padding:26px 30px 28px; box-shadow:0 18px 50px rgba(5,20,60,.28); font-size:26px; line-height:1.38; }
  .ch { font-size:15px; letter-spacing:.02em; color:${C.grey}; margin-bottom:14px; border-top:6px solid ${C.soft}; padding-top:14px; margin-top:-26px; margin-left:-30px; margin-right:-30px; padding-left:30px; border-radius:20px 20px 0 0; }
  .rd { color:${C.ink}; } .rd span { color:${C.grey}; }
  .al { color:${C.blue}; font-weight:700; margin-top:10px; }
  .a { color:${C.blue}; font-weight:700; padding-left:22px; }
  .ck { margin-top:16px; font-size:19px; color:#188038; }
`;

// ---------- the pictures ----------
function heroHtml(r, photoB64, typed) {
  // crop window of the photo (source pixels): x 170..870, y 95..425, shown in a 520 px wide box
  const s = 520 / 700;
  const ph = Math.round(330 * s);
  return `<style>${css}${cardCss}
    body { width:1600px; height:620px; background:linear-gradient(135deg,#f4f8ff 0%,#e3eeff 100%); position:relative; overflow:hidden; }
    .title { position:absolute; left:64px; top:38px; font-size:46px; font-weight:800; letter-spacing:-.02em; color:${C.navy}; }
    .sub { position:absolute; left:64px; top:98px; font-size:24px; color:${C.grey}; }
    .col { position:absolute; top:178px; }
    .lab { font-size:22px; font-weight:700; color:${C.navy}; display:flex; align-items:center; margin-bottom:20px; white-space:nowrap; }
    .n { display:inline-flex; width:36px; height:36px; border-radius:18px; background:${C.blue}; color:#fff; font-weight:800; align-items:center; justify-content:center; font-size:20px; margin-right:12px; flex:none; }
    .photo { width:520px; height:${ph}px; border-radius:18px; box-shadow:0 18px 50px rgba(5,20,60,.22);
      background:url(data:image/png;base64,${photoB64}) no-repeat; background-size:${Math.round(1540 * s)}px auto; background-position:${Math.round(-170 * s)}px ${Math.round(-95 * s)}px; }
    .bubble { width:360px; background:${C.navy}; color:#fff; border-radius:20px; padding:22px 26px; box-shadow:0 18px 50px rgba(5,20,60,.22); }
    .bubble .t { font-size:16px; color:${C.pale}; margin-bottom:12px; }
    .bubble .m { font-size:22px; line-height:1.55; }
    .bubble .m b { color:#ffd54f; font-weight:600; }
    .arrow { position:absolute; top:${178 + 78 + Math.round(ph / 2) - 30}px; font-size:44px; color:${C.blue}; font-weight:800; }
    .foot { position:absolute; left:64px; right:64px; bottom:36px; font-size:22px; color:${C.grey}; }
    .foot b { color:${C.navy}; }
    .card { width:450px; font-size:23px; box-shadow:0 18px 50px rgba(5,20,60,.22); }
  </style>
  <div class="title">Photo in, exact answer out</div>
  <div class="sub">The model reads the maths. The solver does the calculating and shows how it read the input.</div>
  <div class="col" style="left:64px"><div class="lab"><span class="n">1</span>A photo of the problem</div><div class="photo"></div></div>
  <div class="arrow" style="left:598px">&rarr;</div>
  <div class="col" style="left:650px"><div class="lab"><span class="n">2</span>The model writes it as text</div>
    <div class="bubble"><div class="t">run_js &middot; photo-equation-solver</div><div class="m mono">{"equation":<br>&nbsp;"<b>${esc(typed)}</b>"}</div></div></div>
  <div class="arrow" style="left:1028px">&rarr;</div>
  <div class="col" style="left:1086px"><div class="lab"><span class="n">3</span>The solver answers</div>${card(r, { check: true })}</div>
  <div class="foot"><b>Offline.</b> Exact fractions and symbols. A misread digit shows up in the "Read as" line, so it is easy to spot.</div>`;
}

function solvesHtml(tiles) {
  const t = tiles.map((x) => `<div class="tile"><div class="tag">${esc(x.tag)}</div><div class="inp mono">${esc(x.input)}</div>
    <div class="ans">${x.answer.map((l) => `<div>${esc(l)}</div>`).join('')}</div></div>`).join('');
  return `<style>${css}
    body { width:1600px; background:linear-gradient(135deg,#f4f8ff 0%,#e3eeff 100%); padding:48px 56px 44px; }
    h1 { font-size:42px; font-weight:800; letter-spacing:-.02em; color:${C.navy}; }
    .sub { font-size:22px; color:${C.grey}; margin:8px 0 30px; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
    .tile { background:#fff; border-radius:18px; padding:22px 26px 24px; min-height:188px; box-shadow:0 10px 32px rgba(5,20,60,.12); border-top:6px solid ${C.blue}; }
    .tag { font-size:15px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:${C.blue}; }
    .inp { font-size:21px; color:${C.grey}; margin:10px 0 12px; }
    .ans { font-size:24px; font-weight:700; color:${C.ink}; line-height:1.4; }
    .more { margin-top:26px; font-size:21px; color:${C.grey}; }
  </style>
  <h1>What it solves</h1>
  <div class="sub">Each result below was printed by the engine, with its input.</div>
  <div class="grid">${t}</div>
  <div class="more">Also: series, differential equations, Laplace transforms, vector calculus, probability, units, graphs and more.</div>`;
}

function socialHtml(r) {
  return `<style>${css}${cardCss}
    body { width:1280px; height:640px; background:linear-gradient(135deg,${C.navy} 0%,${C.navy2} 100%); position:relative; overflow:hidden; color:#fff; }
    .glow { position:absolute; right:-160px; top:-200px; width:760px; height:760px; border-radius:50%; background:radial-gradient(circle,rgba(26,115,232,.55),rgba(26,115,232,0) 65%); }
    .logo { position:absolute; left:72px; top:74px; width:120px; height:120px; border-radius:28px; }
    h1 { position:absolute; left:72px; top:228px; font-size:68px; font-weight:800; letter-spacing:-.025em; line-height:1.04; }
    .tag { position:absolute; left:72px; top:396px; font-size:29px; line-height:1.4; color:#cfe0ff; width:600px; }
    .chips { position:absolute; left:72px; top:528px; display:flex; gap:12px; }
    .chip { font-size:20px; font-weight:600; padding:9px 18px; border-radius:999px; border:2px solid rgba(255,255,255,.35); color:#fff; }
    .card { position:absolute; left:700px; top:150px; width:508px; font-size:24px; }
  </style>
  <div class="glow"></div>
  <img class="logo" src="${logoDataUri(28)}">
  <h1>Photo Equation<br>Solver</h1>
  <div class="tag">Exact, offline maths for AI models.<br>The model reads. The solver calculates.</div>
  <div class="chips"><span class="chip">Offline</span><span class="chip">Exact answers</span><span class="chip">Shows how it read the input</span></div>
  ${card(r, { check: true })}`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // real results
  const frac = solve('(x+1)/(x-1) = 3');
  const tiles = [
    { tag: 'Equations', input: '2x² − 5x + 3 = 0', cmd: '2x^2 - 5x + 3 = 0' },
    { tag: 'Systems', input: 'x² + y² = 25;  y = x + 1', cmd: 'x^2 + y^2 = 25; y = x + 1' },
    { tag: 'Inequalities', input: 'x² − 5x + 6 > 0', cmd: 'x^2 - 5x + 6 > 0', take: 1 },
    { tag: 'Integrals', input: 'integral of x³ sin(x) from 0 to π', cmd: 'integrate(x^3*sin(x), x, 0, pi)' },
    { tag: 'Limits', input: 'lim x→∞ (1 + 1/x)^x', cmd: 'limit((1 + 1/x)^x, x, oo)' },
    { tag: 'Matrices', input: 'eigenvalues of [[4,1,0],[1,3,1],[0,1,2]]', cmd: 'eigen([[4,1,0],[1,3,1],[0,1,2]])', cut: ':' },
    { tag: 'Statistics', input: 'Welch t-test, two samples', cmd: 'ttest2([5,6,7,8,9],[3,4,5,6,9])', cut: ',' },
    { tag: 'Finance', input: 'bond: 1000, 5% coupon, 6% yield, 10 y, twice a year', cmd: 'bond(1000, 5%, 6%, 10, 2)', take: 1 },
    { tag: 'Chemistry', input: 'balance Fe + O₂ → Fe₂O₃', cmd: 'balance(Fe + O2 -> Fe2O3)' },
  ].map((t) => {
    const r = solve(t.cmd);
    let ans = r.answer;
    if (t.cut) ans = ans.map((l) => l.split(t.cut)[0].trim()); // only cuts at a separator, never edits a number
    if (t.take) ans = ans.slice(0, t.take);
    return { ...t, answer: ans, full: r.full };
  });
  for (const t of tiles) console.log(`[${t.tag}]`, t.answer.join(' | '));

  // logo files
  fs.writeFileSync(path.join(OUT, 'logo.svg'), logoSvg(112));
  fs.writeFileSync(path.join(OUT, 'logo-square.svg'), logoSvg(0));

  const photoB64 = fs.readFileSync(PHOTO).toString('base64');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
  const shot = async (name, html, w, h, opts = {}) => {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: opts.scale || 1 });
    await p.setContent(`<!doctype html><meta charset="utf-8">${html}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name), omitBackground: !!opts.transparent, fullPage: !!opts.full, clip: opts.full ? undefined : { x: 0, y: 0, width: w, height: h } });
    await p.close();
    console.log('wrote assets/' + name);
  };

  await shot('logo-512.png', `<body style="margin:0;background:transparent">${logoSvg(112)}</body>`, 512, 512, { transparent: true });
  await shot('logo-square-512.png', `<body style="margin:0">${logoSvg(0)}</body>`, 512, 512);
  await shot('social-preview.png', socialHtml(frac), 1280, 640);
  await shot('solves.png', solvesHtml(tiles), 1600, 600, { full: true });

  await shot('hero.png', heroHtml(frac, photoB64, '(x+1)/(x-1) = 3'), 1600, 620);

  // ---------- teacher kit: sample files and the README picture ----------
  const { spawnSync } = require('child_process');
  const KIT = path.join(ROOT, 'teacher-kit');
  const sample = path.join(KIT, 'examples', 'sample-worksheet.html');
  fs.mkdirSync(path.dirname(sample), { recursive: true });
  const ws = spawnSync('node', [path.join(KIT, 'bin', 'worksheet.js'), '--topics', 'linear,quadratic,system,inequality,derivative,integral', '--level', '2', '--count', '8', '--seed', '2026', '--title', 'Algebra and calculus practice', '--out', sample, '--working'], { encoding: 'utf8' });
  if (ws.status !== 0) throw new Error('worksheet.js failed: ' + ws.stderr);
  const workingFile = path.join(KIT, 'examples', 'sample-working.txt');
  fs.writeFileSync(workingFile, '2(x + 3) = 14\n2x + 6 = 14\n2x = 20\nx = 10\n');
  const rep = spawnSync('node', [path.join(KIT, 'bin', 'check-working.js'), workingFile], { encoding: 'utf8' });
  if (rep.status !== 1) throw new Error('check-working.js should have found a wrong step: ' + rep.stdout + rep.stderr);
  fs.writeFileSync(path.join(KIT, 'examples', 'sample-working-report.txt'), rep.stdout);

  const tp = await browser.newPage({ viewport: { width: 760, height: 1000 } });
  await tp.goto('file://' + sample);
  await tp.waitForTimeout(200);
  await tp.pdf({ path: path.join(KIT, 'examples', 'sample-worksheet.pdf'), format: 'A4', printBackground: true });
  const top = await tp.screenshot({ clip: { x: 0, y: 0, width: 760, height: 470 } });
  const keyTop = await tp.evaluate(() => document.querySelector('.key').getBoundingClientRect().top + window.scrollY);
  const keyShot = await tp.screenshot({ fullPage: true, clip: { x: 0, y: keyTop, width: 760, height: 470 } });
  await tp.close();
  const panel = (title, cls, inner) => `<div class="p ${cls}"><div class="pt">${title}</div>${inner}</div>`;
  await shot('teacher-kit.png', `<style>${css}
      body { width:1600px; height:1060px; background:linear-gradient(135deg,#f4f8ff 0%,#e3eeff 100%); padding:34px 48px; }
      h1 { font-size:38px; font-weight:800; letter-spacing:-.02em; color:${C.navy}; }
      .sub { font-size:21px; color:${C.grey}; margin:4px 0 22px; }
      .row { display:flex; gap:24px; margin-bottom:24px; }
      .p { background:#fff; border-radius:16px; box-shadow:0 14px 40px rgba(5,20,60,.16); overflow:hidden; }
      .half { width:740px; }
      .full { width:1504px; }
      .pt { font-size:18px; font-weight:700; color:${C.navy}; padding:14px 22px 10px; }
      .p img { display:block; width:100%; border-top:1px solid ${C.line}; }
      pre { font-family:${MONO}; font-size:18px; line-height:1.55; padding:16px 22px 22px; color:${C.ink}; white-space:pre-wrap; border-top:1px solid ${C.line}; }
      .bad { color:#b3261e; font-weight:700; }
    </style>
    <h1>Teacher kit</h1>
    <div class="sub">Worksheets and answer keys from a seed, and a checker that names the first wrong step.</div>
    <div class="row">
      ${panel('A worksheet', 'half', `<img src="data:image/png;base64,${top.toString('base64')}">`)}
      ${panel('Its answer key', 'half', `<img src="data:image/png;base64,${keyShot.toString('base64')}">`)}
    </div>
    <div class="row">
      ${panel("Checking a student's working: <span style=\"font-weight:400;color:#5f6368\">node bin/check-working.js working.txt</span>", 'full', `<pre>${esc(rep.stdout.replace(/\n+$/, '')).replace(/(\s*\d+\. [^\n]*WRONG[^\n]*)/, '<span class="bad">$1</span>').replace(/(Step 3 is the first[^\n]*)/, '<span class="bad">$1</span>')}</pre>`)}
    </div>`, 1600, 1060);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
