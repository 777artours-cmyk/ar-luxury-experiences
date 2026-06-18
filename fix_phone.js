const fs = require('fs');
const path = require('path');

const baseDir = '/Users/grr/Downloads/WEBSITES/AR Tours Operations';
const toursDir = path.join(baseDir, 'tours');
const files = fs.readdirSync(toursDir).filter(f => f.endsWith('.html')).map(f => path.join(toursDir, f));
files.push(path.join(baseDir, 'AR_Tours_Website.html'));
files.push(path.join(baseDir, 'walkthrough.md')); // it doesn't matter much but just in case
files.push('/Users/grr/.gemini/antigravity/brain/53d30b1e-94ed-4527-b8a8-82ad7af405b5/walkthrough.md');

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace +61414445344 with +61400044004
  content = content.replace(/\+61414445344/g, '+61400044004');
  content = content.replace(/\+61 414 445 344/g, '+61 400 044 004');
  content = content.replace(/61414445344/g, '61400044004');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
