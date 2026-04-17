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
  
  // Remove UTF-8 BOM, zero-width spaces e falhas de encoding como þÿ vindos de Word/PDF
  const cleanEncoding = withLineBreaks
    .replace(/[\uFEFF\u200B\u200C\u200D\u00FE\u00FF]/g, '')
    .replace(/þÿ/g, '')
    .replace(/\u00C2/g, '') // Remove o caractere Â (frequente em erros de charset UTF-8/Latin1)

  // Normalização de caracteres especiais para compatibilidade com jsPDF (fontes padrão não suportam)
  const normalized = cleanEncoding
    // Sobrescritos
    .replace(/⁰/g, '0').replace(/¹/g, '1').replace(/²/g, '2').replace(/³/g, '3')
    .replace(/⁴/g, '4').replace(/⁵/g, '5').replace(/⁶/g, '6').replace(/⁷/g, '7')
    .replace(/⁸/g, '8').replace(/⁹/g, '9')
    // Subscritos (Comum em Química: H₂O)
    .replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3')
    .replace(/₄/g, '4').replace(/₅/g, '5').replace(/₆/g, '6').replace(/₇/g, '7')
    .replace(/₈/g, '8').replace(/₉/g, '9')
    .replace(/ₙ/g, 'n').replace(/ₓ/g, 'x')

  // Remove all other tags
  return normalized.replace(/<[^>]*>?/gm, '').trim()
}
