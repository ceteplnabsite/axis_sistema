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
  
  // Remove all other tags
  return withLineBreaks.replace(/<[^>]*>?/gm, '').trim()
}
