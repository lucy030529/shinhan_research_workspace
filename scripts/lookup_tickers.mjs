// 네이버 증권 자동완성 API로 종목코드 조회 후 analyst-coverage.json 업데이트
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('src/data/analyst-coverage.json', 'utf8'));
const companies = [...new Set(data.coverage.map(c => c.company))];

// 섹터/테마명은 종목코드가 없으므로 제외
const skipNames = new Set(['복합유틸리티', '철강']);

console.log(`총 ${companies.length}개 종목 조회 시작...\n`);

const tickerMap = new Map();
let found = 0;
const notFound = [];

for (const name of companies) {
  if (skipNames.has(name)) {
    console.log(`  SKIP ${name} (섹터/테마)`);
    continue;
  }

  try {
    const resp = await fetch(
      `https://ac.stock.naver.com/ac?q=${encodeURIComponent(name)}&target=stock`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (resp.ok) {
      const result = await resp.json();
      const items = (result.items || []).filter(i => i.nationCode === 'KOR' && i.category === 'stock');
      // 정확히 일치하는 종목 찾기
      const exact = items.find(i => i.name === name);
      if (exact) {
        tickerMap.set(name, exact.code);
        found++;
        console.log(`  OK ${exact.code} ${name}`);
      } else if (items.length > 0) {
        tickerMap.set(name, items[0].code);
        found++;
        console.log(`  ~~ ${items[0].code} ${name} -> ${items[0].name}`);
      } else {
        notFound.push(name);
        console.log(`  ?? ${name}`);
      }
    }
  } catch (e) {
    notFound.push(name);
    console.log(`  ERR ${name}: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 80));
}

console.log(`\n조회 결과: ${found}건 성공, ${notFound.length}건 실패`);
if (notFound.length > 0) {
  console.log('실패 종목:', notFound);
}

// JSON 업데이트
for (const item of data.coverage) {
  const ticker = tickerMap.get(item.company);
  if (ticker) {
    item.ticker = ticker;
  }
}

writeFileSync('src/data/analyst-coverage.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`\n=> analyst-coverage.json 업데이트 완료 (${found}건 ticker 매핑)`);
