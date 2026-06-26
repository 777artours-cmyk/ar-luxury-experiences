const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let failed = false;

function logError(file, message) {
  console.error(`❌ [ERROR] ${path.relative(rootDir, file)}: ${message}`);
  failed = true;
}

// Simple parser for .gitignore to exclude matching paths
const gitignoreContent = fs.existsSync(path.join(rootDir, '.gitignore'))
  ? fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8')
  : '';

const ignorePatterns = gitignoreContent
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'));

function shouldIgnore(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  
  // Custom ignore patterns for build/screens/temp files
  if (relativePath.includes('node_modules') || relativePath.startsWith('.')) {
    return true;
  }
  if (relativePath.endsWith('_screenshot.html') || relativePath === 'take_screenshot.js') {
    return true;
  }
  if (relativePath === 'apps_script_ai_flow.js') {
    return true;
  }

  // Check gitignore matches
  return ignorePatterns.some(pattern => {
    const cleanPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
    return relativePath === cleanPattern || relativePath.startsWith(cleanPattern + path.sep) || relativePath.endsWith(cleanPattern);
  });
}

// Recursively find all HTML files
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!shouldIgnore(fullPath)) {
        results = results.concat(getHtmlFiles(fullPath));
      }
    } else if (file.endsWith('.html')) {
      if (!shouldIgnore(fullPath)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const htmlFiles = getHtmlFiles(rootDir);
console.log(`Found ${htmlFiles.length} production HTML files to validate.`);

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const dirOfFile = path.dirname(file);

  // 1. Check for unclosed style/script tags
  const styleOpen = (content.match(/<style\b/gi) || []).length;
  const styleClose = (content.match(/<\/style>/gi) || []).length;
  if (styleOpen !== styleClose) {
    logError(file, `Mismatched <style> tags (Open: ${styleOpen}, Close: ${styleClose})`);
  }

  const scriptOpen = (content.match(/<script\b/gi) || []).length;
  const scriptClose = (content.match(/<\/script>/gi) || []).length;
  if (scriptOpen !== scriptClose) {
    logError(file, `Mismatched <script> tags (Open: ${scriptOpen}, Close: ${scriptClose})`);
  }

  // 2. Simple regex checking of internal links (href)
  const hrefRegex = /href="([^"\s>]+)"/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const link = match[1];
    
    // Ignore external or specialized protocols
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('tel:') || link.startsWith('mailto:') || link.startsWith('javascript:') || link.startsWith('#')) {
      continue;
    }
    
    // Strip query parameters and hash fragments
    const cleanLink = link.split('?')[0].split('#')[0];
    if (!cleanLink) continue;

    // Resolve path
    let targetPath;
    if (cleanLink.startsWith('/')) {
      targetPath = path.join(rootDir, cleanLink);
    } else {
      targetPath = path.join(dirOfFile, cleanLink);
    }

    // Special case for directory links (e.g. blog/ -> blog/index.html)
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    // Only complain about broken links if the target is not ignored in .gitignore
    if (!fs.existsSync(targetPath)) {
      if (!shouldIgnore(targetPath)) {
        logError(file, `Broken link: "${link}" (Cleaned path: "${cleanLink}" -> Resolved to: ${path.relative(rootDir, targetPath)})`);
      }
    }
  }
});

if (failed) {
  console.log('\nValidation FAILED.');
  process.exit(1);
} else {
  console.log('\nAll HTML validations PASSED successfully.');
}
