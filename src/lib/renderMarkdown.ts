// 간단한 마크다운 → HTML 렌더러 (earnings_qa의 renderMarkdown 이식)

export function renderMarkdown(md: string): string {
  let html = md
    // code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // tables
    .replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_match, header: string, _sep: string, body: string) => {
      const ths = header.split('|').filter((x: string) => x.trim()).map((x: string) => `<th>${x.trim()}</th>`).join('')
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter((x: string) => x.trim()).map((x: string) => `<td>${x.trim()}</td>`).join('')
        return `<tr>${tds}</tr>`
      }).join('')
      return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`
    })
    // headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // bold, italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // unordered list
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')

  if (!html.startsWith('<')) html = '<p>' + html
  if (!html.endsWith('>')) html += '</p>'

  // Clean up list items
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
  html = html.replace(/<\/ul>\s*<ul>/g, '')

  return html
}
