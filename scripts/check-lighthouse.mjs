import { appendFileSync, readFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'lighthouse-report.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

const categoryScore = (id) => report.categories?.[id]?.score;
const auditScore = (id) => report.audits?.[id]?.score;
const auditValue = (id) => report.audits?.[id]?.numericValue;

const failures = [];
const warnings = [];

const categories = [
  { id: 'performance', label: 'Performance', hard: 0.75, warn: 0.85 },
  { id: 'accessibility', label: 'Accessibility', hard: 0.99 },
  { id: 'best-practices', label: 'Best Practices', hard: 1 },
  { id: 'seo', label: 'SEO', hard: 1 },
];

for (const category of categories) {
  const score = categoryScore(category.id);
  if (typeof score !== 'number') {
    failures.push(`${category.label}: punteggio Lighthouse mancante`);
    continue;
  }
  if (score < category.hard) {
    failures.push(`${category.label}: ${(score * 100).toFixed(0)} < ${(category.hard * 100).toFixed(0)}`);
  } else if (category.warn !== undefined && score < category.warn) {
    warnings.push(`${category.label}: ${(score * 100).toFixed(0)} < target ${(category.warn * 100).toFixed(0)}`);
  }
}

for (const auditId of ['color-contrast', 'label-content-name-mismatch']) {
  const score = auditScore(auditId);
  // Lighthouse uses null for audits that are not applicable; that is not a failure.
  if (score === 0) failures.push(`${auditId}: audit non superato`);
}

const totalBytes = auditValue('total-byte-weight');
if (typeof totalBytes === 'number') {
  if (totalBytes > 250 * 1024) {
    failures.push(`Peso iniziale: ${(totalBytes / 1024).toFixed(0)} KiB > 250 KiB`);
  } else if (totalBytes > 150 * 1024) {
    warnings.push(`Peso iniziale: ${(totalBytes / 1024).toFixed(0)} KiB > target 150 KiB`);
  }
}

const formatScore = (id) => {
  const score = categoryScore(id);
  return typeof score === 'number' ? `${(score * 100).toFixed(0)}/100` : 'n/d';
};

const summary = [
  '## Lighthouse CI',
  '',
  '| Categoria | Punteggio |',
  '| --- | ---: |',
  `| Performance | ${formatScore('performance')} |`,
  `| Accessibility | ${formatScore('accessibility')} |`,
  `| Best Practices | ${formatScore('best-practices')} |`,
  `| SEO | ${formatScore('seo')} |`,
  '',
  typeof totalBytes === 'number' ? `Payload iniziale: **${(totalBytes / 1024).toFixed(0)} KiB**.` : 'Payload iniziale: n/d.',
];

if (warnings.length > 0) {
  summary.push('', '### Avvisi', ...warnings.map((warning) => `- ${warning}`));
}
if (failures.length > 0) {
  summary.push('', '### Errori', ...failures.map((failure) => `- ${failure}`));
}

console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);

if (failures.length > 0) process.exitCode = 1;
