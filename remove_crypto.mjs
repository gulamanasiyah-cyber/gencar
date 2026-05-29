import fs from 'fs';
const f1 = 'app/api/admin/pengurus/route.ts';
const f2 = 'app/api/mandiri/kunjungan/route.ts';
if (fs.existsSync(f1)) {
  fs.writeFileSync(f1, fs.readFileSync(f1, 'utf8').replace(/import crypto from ["']crypto["'];?\r?\n?/g, ''));
}
if (fs.existsSync(f2)) {
  fs.writeFileSync(f2, fs.readFileSync(f2, 'utf8').replace(/import crypto from ["']crypto["'];?\r?\n?/g, ''));
}
console.log('Done');
