function fitWeibull(gaps) {
  if (gaps.length === 0) return { k: 1, lambda: 1 };
  let bestK = 1, bestLambda = 1, bestLL = -Infinity;
  for (let k = 0.3; k <= 3.0; k += 0.02) {
    const sumXk = gaps.reduce((s, x) => s + Math.pow(x, k), 0);
    const lambda = Math.pow(sumXk / gaps.length, 1 / k);
    let ll = 0;
    for (const x of gaps) ll += Math.log(k) - Math.log(lambda) + (k - 1) * Math.log(x / lambda) - Math.pow(x / lambda, k);
    if (ll > bestLL) { bestLL = ll; bestK = k; bestLambda = lambda; }
  }
  return { k: bestK, lambda: bestLambda };
}

function weibullCondSurv(elapsed, shower, k, lambda) {
  return Math.exp(Math.pow(elapsed / lambda, k) - Math.pow((elapsed + shower) / lambda, k));
}

function computeRisk(gaps, elapsed, shower) {
  const { k, lambda } = fitWeibull(gaps);
  const pSafe = weibullCondSurv(elapsed, shower, k, lambda);
  const maxGap = Math.max(...gaps);
  const decay = elapsed <= maxGap ? 1 : maxGap / elapsed;
  return (1 - pSafe) * decay;
}

const gapSets = [
  { label: 'Frequent (5-20m)', gaps: [5, 8, 12, 7, 15, 10, 6, 18, 9, 14, 5, 11, 20, 8, 13, 7, 16, 10, 12, 9] },
  { label: 'Moderate (20-90m)', gaps: [30, 45, 60, 20, 90, 15, 40, 55, 35, 70, 25, 50, 80, 10, 65, 45, 30, 55, 40, 35] },
  { label: 'Sparse (60-360m)', gaps: [120, 180, 90, 240, 60, 300, 150, 200, 360, 100, 280, 130, 210, 170, 250, 80, 190, 310, 140, 220] },
  { label: 'Mixed (wide)', gaps: [5, 120, 10, 240, 15, 60, 8, 180, 20, 90, 12, 300, 7, 45, 150, 30, 70, 200, 25, 100] },
];

const elapsedList = [10, 30, 60, 120, 240, 480, 720, 1440, 2880, 10080, 43200];

for (const gs of gapSets) {
  const { k, lambda } = fitWeibull(gs.gaps);
  const maxGap = Math.max(...gs.gaps);
  console.log(`--- ${gs.label} | k=${k.toFixed(2)}, lambda=${lambda.toFixed(1)}, maxGap=${maxGap}m ---`);
  for (const e of elapsedList) {
    const risk = computeRisk(gs.gaps, e, 10);
    const h = e < 60 ? `${e}m` : e < 1440 ? `${(e/60).toFixed(0)}h` : `${(e/1440).toFixed(0)}d`;
    const bar = '#'.repeat(Math.round(risk * 50));
    console.log(`  ${h.padStart(4)} | ${(risk*100).toFixed(1).padStart(5)}% ${bar}`);
  }
  console.log();
}
