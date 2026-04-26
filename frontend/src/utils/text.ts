/** Replace [brand] placeholder with the actual brand name */
export function replaceBrand(text: string, brand: string): string {
  if (!text) return text
  return text.replace(/\[brand\]/gi, brand || 'your brand')
}

/** If a string looks like a raw Peec prompt ID (pr_... or UUID), show "Loading data…" */
export function resolvePromptText(text: string): string {
  if (!text) return text
  if (/^pr_/i.test(text) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return 'Loading data…'
  }
  return text
}

/** Apply both replacements */
export function cleanText(text: string, brand: string): string {
  return resolvePromptText(replaceBrand(text, brand))
}
