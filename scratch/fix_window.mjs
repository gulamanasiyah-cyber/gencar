import fs from 'fs';

const filePath = 'app/(dashboard)/rundown/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix TypeScript errors by casting window to any
const replacements = [
  ['window.pdfjsLib', '(window as any).pdfjsLib'],
];

let count = 0;
for (const [old, newStr] of replacements) {
  while (content.includes(old)) {
    content = content.replace(old, newStr);
    count++;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`✅ Made ${count} replacements`);
