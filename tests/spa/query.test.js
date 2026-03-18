import { describe, it, expect } from 'bun:test';
const { parseQuery, termMatches } = require('../../spa/static/parser.js');

// ---- parseQuery ----

describe('parseQuery', () => {
  it('returns empty array for empty string', () => {
    expect(parseQuery('')).toEqual([]);
    expect(parseQuery('   ')).toEqual([]);
  });

  it('parses a single plain word', () => {
    const terms = parseQuery('opeth');
    expect(terms).toHaveLength(1);
    expect(terms[0].text).toBe('opeth');
    expect(terms[0].exact).toBe(false);
    expect(terms[0].regex).toBeNull();
  });

  it('lowercases plain words', () => {
    const terms = parseQuery('Opeth');
    expect(terms[0].text).toBe('opeth');
  });

  it('parses multiple plain words', () => {
    const terms = parseQuery('opeth tavastia');
    expect(terms).toHaveLength(2);
    expect(terms[0].text).toBe('opeth');
    expect(terms[1].text).toBe('tavastia');
  });

  it('parses a quoted phrase as exact', () => {
    const terms = parseQuery('"maija vilkkumaa"');
    expect(terms).toHaveLength(1);
    expect(terms[0].text).toBe('maija vilkkumaa');
    expect(terms[0].exact).toBe(true);
    expect(terms[0].regex).not.toBeNull();
  });

  it('parses mix of quoted and plain', () => {
    const terms = parseQuery('"maija vilkkumaa" 2005');
    expect(terms).toHaveLength(2);
    expect(terms[0].exact).toBe(true);
    expect(terms[1].exact).toBe(false);
    expect(terms[1].text).toBe('2005');
  });

  it('strips stray leading/trailing quotes from plain tokens', () => {
    const terms = parseQuery('"opeth');
    expect(terms).toHaveLength(1);
    expect(terms[0].text).toBe('opeth');
    expect(terms[0].exact).toBe(false);
  });

  it('skips empty tokens after quote stripping', () => {
    const terms = parseQuery('""');
    expect(terms).toHaveLength(0);
  });
});

// ---- termMatches ----

describe('termMatches', () => {
  const plain = (text) => ({ text, exact: false, regex: null });

  it('plain term matches as substring (haystack pre-lowercased by caller)', () => {
    expect(termMatches('opeth', plain('op'))).toBe(true);
    expect(termMatches('opeth', plain('eth'))).toBe(true);
    expect(termMatches('opeth', plain('opeth'))).toBe(true);
  });

  it('plain term does not match when absent', () => {
    expect(termMatches('opeth', plain('xyz'))).toBe(false);
  });

  it('exact term matches whole word', () => {
    const term = parseQuery('"awa"')[0];
    expect(termMatches('awa performs tonight', term)).toBe(true);
  });

  it('exact term does not match as a substring within a word', () => {
    const term = parseQuery('"awa"')[0];
    expect(termMatches('awalon', term)).toBe(false);
  });

  it('exact term matches at start of string', () => {
    const term = parseQuery('"fish"')[0];
    expect(termMatches('fish (acoustic)', term)).toBe(true);
  });

  it('exact term matches at end of string', () => {
    const term = parseQuery('"opeth"')[0];
    expect(termMatches('venue opeth', term)).toBe(true);
  });

  it('exact multi-word phrase matches', () => {
    const term = parseQuery('"maija vilkkumaa"')[0];
    expect(termMatches('maija vilkkumaa', term)).toBe(true);
    expect(termMatches('concert by maija vilkkumaa tonight', term)).toBe(true);
  });

  it('exact multi-word phrase does not match partial', () => {
    const term = parseQuery('"maija vilkkumaa"')[0];
    expect(termMatches('maija', term)).toBe(false);
  });

  it('exact term handles special regex characters in the text', () => {
    const term = parseQuery('"c++"')[0];
    expect(termMatches('c++ conference', term)).toBe(true);
    expect(termMatches('c++ something', term)).toBe(true);
  });

  it('exact term with non-ASCII boundary (ä, ö)', () => {
    const term = parseQuery('"ääniwalli"')[0];
    expect(termMatches('ääniwalli', term)).toBe(true);
    expect(termMatches('club ääniwalli helsinki', term)).toBe(true);
  });

  it('plain term with non-ASCII matches substring', () => {
    const term = plain('ääniwalli');
    expect(termMatches('club ääniwalli helsinki', term)).toBe(true);
  });
});
