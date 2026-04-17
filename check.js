const fs = require('fs');
const c = fs.readFileSync('src/App.jsx', 'utf8');
const m = c.match(/"ICON_\w+"[A-Z]/g);
if (m) {
  console.log('FOUND', m.length, 'matches');
  m.slice(0, 5).forEach(x => console.log(' ', x));
} else {
  console.log('CLEAN - no remaining malformed ICON patterns');
}
