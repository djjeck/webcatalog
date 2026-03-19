/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes (or null)
 * @param nullDisplay - What to display for null/zero values (default: '-')
 */
export function formatBytes(
  bytes: number | null,
  nullDisplay: string = '-'
): string {
  if (bytes === null || bytes === 0) return nullDisplay;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format file size in human-readable format
 * Returns '-' for null or zero values
 */
export function formatFileSize(bytes: number | null): string {
  return formatBytes(bytes, '-');
}

/**
 * Format date string to relative time or absolute date
 */
export function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date string in human-readable format
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // Check for Invalid Date
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// SYNC NOTE: SPECIAL_FOLD_MAP, COMBINING_MARK_REGEX, and foldForSearch are
// duplicated from server/src/utils/search-fold.ts. Any change there must be
// applied here too, and vice versa.
const SPECIAL_FOLD_MAP: Record<string, string> = {
  ß: 'ss',
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

function foldForSearch(value: string): string {
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

/**
 * Build a mapping from each original character index to its start position
 * in the folded string, plus the total folded length.
 *
 * Because folding can expand characters (e.g. ß → ss), we need this map to
 * convert match positions in the folded string back to spans in the original.
 */
function buildFoldMap(text: string): {
  foldedText: string;
  // foldedStart[i] = index in foldedText where original char i begins
  foldedStart: number[];
} {
  let foldedText = '';
  // We iterate over the normalized string, but we need to track original char
  // boundaries. NFKD decomposition can expand characters (e.g. é → e + combining
  // accent), so we track original chars via the original text's code points.
  const foldedStart: number[] = [];

  // We need to walk both original text and normalized text in parallel.
  // The safest approach: fold each original character independently.
  for (let i = 0; i < text.length; i++) {
    foldedStart.push(foldedText.length);
    const normalizedChar = text[i].toLowerCase().normalize('NFKD');
    for (const char of normalizedChar) {
      if (!COMBINING_MARK_REGEX.test(char)) {
        foldedText += SPECIAL_FOLD_MAP[char] ?? char;
      }
    }
  }

  return { foldedText, foldedStart };
}

/**
 * Highlight search terms in text, supporting diacritic/special-char folding.
 * e.g. searching "strasse" highlights "Straße", searching "cafe" highlights "café".
 */
export function highlightTerms(text: string, terms: string[]): React.ReactNode {
  if (!terms || terms.length === 0) {
    return text;
  }

  const { foldedText, foldedStart } = buildFoldMap(text);

  // Collect all match spans [start, end) in original text coords
  const spans: Array<[number, number]> = [];

  for (const term of terms) {
    const foldedTerm = foldForSearch(term);
    if (!foldedTerm) continue;

    let pos = 0;
    while (pos <= foldedText.length - foldedTerm.length) {
      const idx = foldedText.indexOf(foldedTerm, pos);
      if (idx === -1) break;

      // Map folded start index back to original char index
      const origStart = foldedStart.findIndex((s, i) => {
        const end =
          i + 1 < foldedStart.length ? foldedStart[i + 1] : foldedText.length;
        return s <= idx && idx < end;
      });

      // Map folded end index back to original char index
      const foldedEnd = idx + foldedTerm.length;
      let origEnd = foldedStart.findIndex((s, i) => {
        const end =
          i + 1 < foldedStart.length ? foldedStart[i + 1] : foldedText.length;
        return s < foldedEnd && foldedEnd <= end;
      });
      if (origEnd === -1) origEnd = text.length - 1;
      origEnd += 1; // exclusive

      if (origStart !== -1) {
        spans.push([origStart, origEnd]);
      }
      pos = idx + foldedTerm.length;
    }
  }

  if (spans.length === 0) {
    return text;
  }

  // Sort and merge overlapping spans
  spans.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    if (merged.length > 0 && span[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        span[1]
      );
    } else {
      merged.push([...span]);
    }
  }

  // Build React nodes from spans
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < merged.length; i++) {
    const [start, end] = merged[i];
    if (cursor < start) {
      nodes.push(text.slice(cursor, start));
    }
    nodes.push(
      <mark key={i} className="search-highlight">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
