import fs from 'fs';
try {
  const data = fs.readFileSync('lint-results.json', 'utf8');
  const results = JSON.parse(data);
  const fileErrors = [];
  const errorCounts = {};

  results.forEach(result => {
    if (result.errorCount > 0) {
      fileErrors.push({ path: result.filePath, count: result.errorCount });
      result.messages.forEach(msg => {
          const rule = msg.ruleId || 'unknown';
          errorCounts[rule] = (errorCounts[rule] || 0) + 1;
      });
    }
  });

  fileErrors.sort((a, b) => b.count - a.count);

  console.log('--- Top Files with Errors ---');
  fileErrors.slice(0, 15).forEach(f => console.log(`${f.count} errors: ${f.path}`));

    console.log('\n--- Error Counts by Rule ---');
  Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([rule, count]) => console.log(`${count}: ${rule}`));

} catch (e) {
  console.error("Error:", e.message);
}
