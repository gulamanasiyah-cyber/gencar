import fs from 'fs';

const filePath = 'app/(dashboard)/rundown/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `        // @ts-ignore - Using stable CJS build for Next.js compatibility\r
        const pdfjsModule = await import("pdfjs-dist/build/pdf");\r
        const pdfjsLib = pdfjsModule.default || pdfjsModule;\r
        \r
        pdfjsLib.GlobalWorkerOptions.workerSrc = \`https://unpkg.com/pdfjs-dist@\${pdfjsLib.version}/build/pdf.worker.min.js\`;`;

const newCode = `        // Load pdfjs-dist from CDN to avoid bundling Node.js builtins (fs, http, https, url)\r
        // which cause build failures on Cloudflare Pages / Edge Runtime\r
        const PDFJS_VERSION = "4.4.168";\r
        const pdfjsLib = await new Promise((resolve, reject) => {\r
          if (window.pdfjsLib) {\r
            resolve(window.pdfjsLib);\r
            return;\r
          }\r
          const script = document.createElement("script");\r
          script.src = \`https://unpkg.com/pdfjs-dist@\${PDFJS_VERSION}/build/pdf.min.js\`;\r
          script.onload = () => resolve(window.pdfjsLib);\r
          script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));\r
          document.head.appendChild(script);\r
        });\r
        \r
        pdfjsLib.GlobalWorkerOptions.workerSrc = \`https://unpkg.com/pdfjs-dist@\${PDFJS_VERSION}/build/pdf.worker.min.js\`;`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully replaced pdfjs-dist import with CDN loading in rundown/page.tsx');
} else {
  console.log('❌ Could not find the target code block');
  // Debug: try to find parts
  const lines = oldCode.split('\r\n');
  lines.forEach((line, i) => {
    console.log(`Line ${i} found: ${content.includes(line)}`);
  });
}
