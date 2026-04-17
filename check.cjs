const fs = require('fs');
const c = fs.readFileSync('C:/Users/Administrator/.openclaw/workspace/darer-journey/src/App.jsx', 'utf8');
const m = c.match(/ICON_\d+"[A-Z]/g);
if (m) {
  console.log('FOUND', m.length);
  m.slice(0, 5).forEach(x => console.log(x));
} else {
  console.log('CLEAN');
}
