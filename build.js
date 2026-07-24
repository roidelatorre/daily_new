const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');
const files = ['index.html', 'styles.css', 'app.js'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing required source file: ${file}`);
  }
  fs.copyFileSync(source, path.join(dist, file));
}

console.log(`Built Today OS into ${dist}`);
