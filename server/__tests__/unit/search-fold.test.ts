import { describe, it, expect } from 'vitest';
import { foldForSearch } from '../../src/utils/search-fold.js';

describe('foldForSearch', () => {
  it('should remove diacritics and lowercase text', () => {
    expect(foldForSearch('Café')).toBe('cafe');
  });

  it('should fold German sharp-s to ss', () => {
    expect(foldForSearch('weiß')).toBe('weiss');
    expect(foldForSearch('Straße')).toBe('strasse');
  });

  it('should fold common ligatures and special letters', () => {
    expect(foldForSearch('encyclopædia')).toBe('encyclopaedia');
    expect(foldForSearch('smørrebrød')).toBe('smorrebrod');
  });

  it('should handle dotted uppercase I forms', () => {
    expect(foldForSearch('İstanbul')).toBe('istanbul');
  });

  it('should preserve non-folded punctuation and separators', () => {
    expect(foldForSearch('weiß_notes-v1.2')).toBe('weiss_notes-v1.2');
  });
});

