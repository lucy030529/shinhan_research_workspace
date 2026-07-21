import XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const wb = XLSX.readFile('C:/Users/lucy0/Desktop/신한_기업분석2부_커버리지.xlsx');

// 각 시트(애널리스트)별로 최신 종목 커버리지 추출
const analysts = {};
const allReports = [];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const analystCoverage = new Map(); // company -> latest report info

  for (const row of rows) {
    if (!row || !row[0] || !row[1]) continue;

    const dateRaw = String(row[0]); // "26.07.21"
    const company = String(row[1]);
    const title = String(row[2] || '');
    const analystNames = String(row[3] || sheetName);
    const opinion = row[5] != null ? String(row[5]) : '';
    const targetPrice = row[6] != null ? Number(row[6]) : 0;

    // 날짜 변환: "26.07.21" -> "2026-07-21"
    const parts = dateRaw.split('.');
    if (parts.length !== 3) continue;
    const isoDate = `20${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;

    // 영문 종목명은 스킵 (같은 종목의 한글/영문 중복)
    // 영문 레포트도 포함하되, 한글 버전이 있으면 한글 우선
    const isEnglish = /^[A-Z]/.test(company) && company !== 'NAVER' && company !== 'SOOP' && company !== 'RFHIC' && company !== 'NHN' && company !== 'HMM' && company !== 'F&F' && company !== 'APR' && company !== 'GKL' && company !== 'SBS' && company !== 'KT';

    const report = {
      date: isoDate,
      company,
      title,
      analyst: sheetName,
      analystFull: analystNames,
      opinion: opinion === 'null' ? '' : opinion,
      targetPrice: targetPrice || 0,
      isEnglish,
    };

    allReports.push(report);

    // 종목별 최신 레포트만 저장 (한글 우선)
    const existing = analystCoverage.get(company);
    if (!existing || report.date > existing.date) {
      analystCoverage.set(company, report);
    }
  }

  analysts[sheetName] = {
    name: sheetName,
    totalReports: rows.length,
    coverage: [...analystCoverage.values()],
  };
}

// 전체 종목 목록 (한글 종목만, 중복 제거)
const uniqueCompanies = new Map();
for (const report of allReports) {
  if (report.isEnglish) continue;
  const key = report.company;
  const existing = uniqueCompanies.get(key);
  if (!existing || report.date > existing.date) {
    uniqueCompanies.set(key, report);
  }
}

// 커버리지 데이터 생성
const coverageData = [...uniqueCompanies.values()].map(r => ({
  company: r.company,
  analyst: r.analyst,
  analystFull: r.analystFull,
  lastUpdated: r.date,
  opinion: r.opinion,
  targetPrice: r.targetPrice,
  title: r.title,
})).sort((a, b) => a.analyst.localeCompare(b.analyst) || a.company.localeCompare(b.company));

console.log(`\n=== 기업분석2부 커버리지 요약 ===`);
console.log(`애널리스트 수: ${wb.SheetNames.length}명`);
console.log(`총 종목 수 (한글): ${coverageData.length}개\n`);

for (const name of wb.SheetNames) {
  const a = analysts[name];
  const korCoverage = a.coverage.filter(c => !c.isEnglish);
  console.log(`${name}: ${korCoverage.length}개 종목`);
  for (const c of korCoverage.sort((a,b) => b.date.localeCompare(a.date))) {
    const tp = c.targetPrice ? ` TP:${c.targetPrice.toLocaleString()}` : '';
    const op = c.opinion ? ` [${c.opinion}]` : '';
    console.log(`  ${c.date} ${c.company}${op}${tp}`);
  }
}

// JSON 파일로 저장
const output = {
  generatedAt: new Date().toISOString(),
  source: '신한_기업분석2부_커버리지.xlsx',
  analysts: wb.SheetNames,
  coverage: coverageData,
};

writeFileSync('src/data/analyst-coverage.json', JSON.stringify(output, null, 2), 'utf-8');
console.log(`\n=> src/data/analyst-coverage.json 저장 완료 (${coverageData.length}건)`);
