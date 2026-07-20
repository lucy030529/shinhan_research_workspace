// Phase 4 재무데이터 목업.
// 실제 연동 시 src/services/adapters/financial.ts 어댑터가 대체합니다.

export interface FinancialData {
  ticker: string
  name: string
  currency: string
  periods: string[]
  incomeStatement: {
    revenue: number[]
    operatingProfit: number[]
    netIncome: number[]
    eps: number[]
  }
  balanceSheet: {
    totalAssets: number[]
    totalLiabilities: number[]
    totalEquity: number[]
  }
  metrics: {
    per: number[]
    pbr: number[]
    roe: number[]
    operatingMargin: number[]
  }
}

export const FINANCIAL_DB: Record<string, FinancialData> = {
  '005930': {
    ticker: '005930',
    name: '삼성전자',
    currency: 'KRW (억원)',
    periods: ['2024', '2025E', '2026E'],
    incomeStatement: {
      revenue: [2_789_000, 3_050_000, 3_280_000],
      operatingProfit: [325_000, 420_000, 490_000],
      netIncome: [245_000, 320_000, 375_000],
      eps: [3_580, 4_680, 5_480],
    },
    balanceSheet: {
      totalAssets: [4_550_000, 4_800_000, 5_100_000],
      totalLiabilities: [1_120_000, 1_180_000, 1_250_000],
      totalEquity: [3_430_000, 3_620_000, 3_850_000],
    },
    metrics: {
      per: [21.9, 16.8, 14.3],
      pbr: [1.5, 1.4, 1.3],
      roe: [7.1, 8.8, 9.7],
      operatingMargin: [11.7, 13.8, 14.9],
    },
  },
  '000660': {
    ticker: '000660',
    name: 'SK하이닉스',
    currency: 'KRW (억원)',
    periods: ['2024', '2025E', '2026E'],
    incomeStatement: {
      revenue: [668_000, 820_000, 910_000],
      operatingProfit: [234_000, 310_000, 350_000],
      netIncome: [195_000, 260_000, 295_000],
      eps: [28_400, 37_800, 42_900],
    },
    balanceSheet: {
      totalAssets: [890_000, 1_020_000, 1_150_000],
      totalLiabilities: [310_000, 340_000, 370_000],
      totalEquity: [580_000, 680_000, 780_000],
    },
    metrics: {
      per: [8.1, 6.1, 5.4],
      pbr: [2.0, 1.7, 1.5],
      roe: [33.6, 38.2, 37.8],
      operatingMargin: [35.0, 37.8, 38.5],
    },
  },
  '035420': {
    ticker: '035420',
    name: 'NAVER',
    currency: 'KRW (억원)',
    periods: ['2024', '2025E', '2026E'],
    incomeStatement: {
      revenue: [105_000, 115_000, 125_000],
      operatingProfit: [18_500, 21_000, 24_000],
      netIncome: [13_200, 15_500, 18_000],
      eps: [8_050, 9_450, 10_980],
    },
    balanceSheet: {
      totalAssets: [320_000, 345_000, 375_000],
      totalLiabilities: [155_000, 162_000, 170_000],
      totalEquity: [165_000, 183_000, 205_000],
    },
    metrics: {
      per: [30.3, 25.8, 22.2],
      pbr: [1.8, 1.7, 1.5],
      roe: [8.0, 8.5, 8.8],
      operatingMargin: [17.6, 18.3, 19.2],
    },
  },
  '051910': {
    ticker: '051910',
    name: 'LG화학',
    currency: 'KRW (억원)',
    periods: ['2024', '2025E', '2026E'],
    incomeStatement: {
      revenue: [558_000, 590_000, 640_000],
      operatingProfit: [22_000, 30_000, 38_000],
      netIncome: [10_500, 18_000, 25_000],
      eps: [14_900, 25_500, 35_400],
    },
    balanceSheet: {
      totalAssets: [620_000, 650_000, 690_000],
      totalLiabilities: [350_000, 360_000, 370_000],
      totalEquity: [270_000, 290_000, 320_000],
    },
    metrics: {
      per: [23.5, 13.7, 9.9],
      pbr: [1.3, 1.2, 1.1],
      roe: [3.9, 6.2, 7.8],
      operatingMargin: [3.9, 5.1, 5.9],
    },
  },
  '005380': {
    ticker: '005380',
    name: '현대차',
    currency: 'KRW (억원)',
    periods: ['2024', '2025E', '2026E'],
    incomeStatement: {
      revenue: [1_628_000, 1_720_000, 1_800_000],
      operatingProfit: [148_000, 158_000, 168_000],
      netIncome: [115_000, 125_000, 135_000],
      eps: [54_000, 58_700, 63_400],
    },
    balanceSheet: {
      totalAssets: [2_850_000, 3_010_000, 3_180_000],
      totalLiabilities: [1_820_000, 1_900_000, 1_990_000],
      totalEquity: [1_030_000, 1_110_000, 1_190_000],
    },
    metrics: {
      per: [5.2, 4.8, 4.4],
      pbr: [0.6, 0.6, 0.5],
      roe: [11.2, 11.3, 11.3],
      operatingMargin: [9.1, 9.2, 9.3],
    },
  },
}

export const AVAILABLE_TICKERS = Object.keys(FINANCIAL_DB)
