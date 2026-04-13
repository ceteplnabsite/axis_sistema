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
  
  // Remove UTF-8 BOM, zero-width spaces e falhas de encoding como þÿ vindos de Word/PDF
  const cleanEncoding = withLineBreaks
    .replace(/[\uFEFF\u200B\u200C\u200D\u00FE\u00FF]/g, '')
    .replace(/þÿ/g, '')

  // Remove all other tags
  return cleanEncoding.replace(/<[^>]*>?/gm, '').trim()
}
