import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Swap vowel (064B-0650, 0652) + shadda (0651) to shadda + vowel (fixes diacritic rendering in custom fonts)
    .replace(/([\u064B-\u0650\u0652])\u0651/g, '\u0651$1')
    .trim();
}
