const { execSync } = require('child_process');
try {
  const stdout = execSync('node scripts/generate-inventory-reference.cjs', { 
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('STDOUT length:', stdout.length);
  console.log('First 200 chars:', stdout.slice(0, 200));
  console.log('Last 200 chars:', stdout.slice(-200));
} catch (e) {
  console.log('EXIT CODE:', e.status);
  console.log('STDOUT:', e.stdout ? e.stdout.slice(0, 500) : '(none)');
  console.log('STDERR:', e.stderr ? e.stderr.slice(0, 500) : '(none)');
}
