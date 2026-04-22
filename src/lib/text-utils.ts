/**
 * Utilitários para processamento de texto e HTML
 */

/**
 * Remove tags HTML de uma string, preservando quebras de linha básicas.
 */
export function stripHtml(html: string): string {
  if (!html) return ""
  
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, '·')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // Remove UTF-8 BOM, zero-width spaces e falhas de encoding como þÿ vindos de Word/PDF
  // Convert Non-breaking spaces to regular spaces to allow PDF library to word wrap
  const cleanEncoding = withLineBreaks
    .replace(/\u00A0/g, ' ')
    .replace(/[\uFEFF\u200B\u200C\u200D\u00FE\u00FF]/g, '')
    .replace(/þÿ/g, '')
    .replace(/\u00C2/g, '') // Remove o caractere Â (frequente em erros de charset UTF-8/Latin1)

  // Normalização de caracteres especiais para compatibilidade com jsPDF (fontes padrão não suportam)
  const normalized = cleanEncoding
  // Removido a normalização forçada para não quebrar a formatação de fórmulas
  // jsPDF padrão suporta ² e ³. 
  
  // Transformar algumas tags em unicode antes de apagar o HTML (caso o prof tenha usado o editor)
  let processedHtml = normalized
    .replace(/<sup>0<\/sup>/gi, '⁰')
    .replace(/<sup>1<\/sup>/gi, '¹')
    .replace(/<sup>2<\/sup>/gi, '²')
    .replace(/<sup>3<\/sup>/gi, '³')
    .replace(/<sup>4<\/sup>/gi, '⁴')
    .replace(/<sup>5<\/sup>/gi, '⁵')
    .replace(/<sup>6<\/sup>/gi, '⁶')
    .replace(/<sup>7<\/sup>/gi, '⁷')
    .replace(/<sup>8<\/sup>/gi, '⁸')
    .replace(/<sup>9<\/sup>/gi, '⁹')
    .replace(/<sup>n<\/sup>/gi, 'ⁿ')
    .replace(/<sup>x<\/sup>/gi, 'ˣ')
    .replace(/<sup>\+<\/sup>/gi, '⁺')
    .replace(/<sup>-<\/sup>/gi, '⁻')
    .replace(/_{2}/g, '₂')
    .replace(/<sub>0<\/sub>/gi, '₀')
    .replace(/<sub>1<\/sub>/gi, '₁')
    .replace(/<sub>2<\/sub>/gi, '₂')
    .replace(/<sub>3<\/sub>/gi, '₃')
    .replace(/<sub>4<\/sub>/gi, '₄')
    .replace(/<sub>5<\/sub>/gi, '₅')
    .replace(/<sub>6<\/sub>/gi, '₆')
    .replace(/<sub>7<\/sub>/gi, '₇')
    .replace(/<sub>8<\/sub>/gi, '₈')
    .replace(/<sub>9<\/sub>/gi, '₉')
    .replace(/<sub>x<\/sub>/gi, 'ₓ')
    .replace(/<sub>n<\/sub>/gi, 'ₙ')

  // Remove all other tags
  return processedHtml.replace(/<[^>]*>?/gm, '').trim()
}
