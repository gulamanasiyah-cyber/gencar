import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appDir = path.join(__dirname, 'app');

function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findRouteFiles(fullPath, fileList);
    } else if (file === 'page.tsx' || file === 'layout.tsx') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const routes = findRouteFiles(appDir);
let modifiedCount = 0;

for (const route of routes) {
  let content = fs.readFileSync(route, 'utf-8');
  if (content.includes('export const runtime = "edge";')) {
    content = content.replace(/export const runtime = "edge";\n?/g, '');
    fs.writeFileSync(route, content, 'utf-8');
    modifiedCount++;
    console.log(`Removed edge runtime from: ${route}`);
  }
}

console.log(`\nSuccessfully modified ${modifiedCount} files.`);
