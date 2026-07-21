import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('src/data/analyst-coverage.json', 'utf8'));

// 수동 수정
for (const item of data.coverage) {
  if (item.company === 'APR') item.ticker = '278470'; // 에이피알
  if (item.company === '에스엔시스' && item.ticker === '0008Z0') item.ticker = '217730';
  if (item.company === '복합유틸리티' || item.company === '철강') item.ticker = ''; // 섹터
}

// 확인
const noTicker = data.coverage.filter(c => !c.ticker);
console.log('ticker 없는 항목:', noTicker.map(c => c.company));

const withTicker = data.coverage.filter(c => c.ticker);
console.log(`ticker 있는 항목: ${withTicker.length}건`);

writeFileSync('src/data/analyst-coverage.json', JSON.stringify(data, null, 2), 'utf8');
console.log('=> 수정 완료');
