/**
 * Fold text into a normalized search form.
 *
 * Goals:
 * - Case-insensitive matching
 * - Diacritic-insensitive matching (cafe ~= café)
 * - Common transliteration compatibility (weiss ~= weiß, strasse ~= straße)
 *
 * SYNC NOTE: SPECIAL_FOLD_MAP and COMBINING_MARK_REGEX are duplicated in
 * client/src/utils/format.tsx (used for highlight matching). Any change here
 * must be applied there too, and vice versa.
 */

const SPECIAL_FOLD_MAP: Record<string, string> = {
  // German sharp s
  ß: 'ss',
  // Latin ligatures and common special letters
  æ: 'ae',
  ǽ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
  ħ: 'h',
  ı: 'i',
  ĳ: 'ij',
  ſ: 's',
};

const COMBINING_MARK_REGEX = /\p{M}/u;

export function foldForSearch(value: string): string {
  const normalized = value.toLowerCase().normalize('NFKD');
  let result = '';

  for (const char of normalized) {
    if (COMBINING_MARK_REGEX.test(char)) {
      continue;
    }
    result += SPECIAL_FOLD_MAP[char] ?? char;
  }

  return result;
}
