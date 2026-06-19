const fs = require('fs');
const source = fs.readFileSync('D:/Apps/cursor/resources/app/out/vs/workbench/workbench.glass.main.js', 'utf8');

console.log('Last updated:', source.slice(source.indexOf('Last updated') - 20, source.indexOf('Last updated') + 60));
console.log('Debug settings:', source.slice(source.indexOf('"Whether additional debug') - 40, source.indexOf('"Whether additional debug') + 80));
console.log('Plan ternary:', source.match(/e\(\)\?"Plan Mode":"Debug Mode"/)?.[0]);
