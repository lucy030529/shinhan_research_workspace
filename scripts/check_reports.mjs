const resp = await fetch('https://m.stock.naver.com/api/research/company?page=1&pageSize=200', { headers: { 'User-Agent': 'Mozilla/5.0' } })
const all = await resp.json()
const shinhan = all.filter(r => r.brokerName.includes('신한'))
const latest = new Map()
for (const r of shinhan) {
  if (!r.itemCode) continue
  if (!latest.has(r.itemCode) || r.writeDate > latest.get(r.itemCode).writeDate) {
    latest.set(r.itemCode, r)
  }
}
console.log('신한 리포트 총:', shinhan.length, '종목 수:', latest.size)
for (const [ticker, r] of latest) {
  console.log(ticker, r.itemName, r.writeDate, r.title)
}
