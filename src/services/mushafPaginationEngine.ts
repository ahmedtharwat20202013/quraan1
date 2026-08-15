/**
 * Helper utility functions for Quran text display
 */

/**
 * Converts English digits to Arabic-Indic digits (e.g. 1 -> ١, 12 -> ١٢)
 */
export function toArabicDigits(num: number): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, w => arabicDigits[parseInt(w, 10)]);
}
