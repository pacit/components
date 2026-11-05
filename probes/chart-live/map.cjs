const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dir = 'dist/apps/sandbox/browser/';
const self = new Map();
const dt = p.timeDeltas; const byId = new Map(p.nodes.map((n) => [n.id, n]));
p.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; if (!f.url) return;
  const k = f.url.split('/').pop() + ':' + f.columnNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  const [file, col] = k.split(':'); const src = fs.readFileSync(dir + file, 'utf8');
  console.log((us / 1000).toFixed(0).padStart(6), 'ms', k, '|', src.slice(+col, +col + 150).replace(/\s+/g, ' '));
}
