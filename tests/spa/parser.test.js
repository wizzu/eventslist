import { describe, it, expect } from 'bun:test';
const { parseLine, parseEvents, dateSortKey } = require('../../spa/static/parser.js');

// ---- dateSortKey ----

describe('dateSortKey', () => {
  it('converts D.M.YYYY to a numeric YYYYMMDD key', () => {
    expect(dateSortKey('15.6.2023')).toBe(20230615);
    expect(dateSortKey('1.1.2020')).toBe(20200101);
    expect(dateSortKey('31.12.1999')).toBe(19991231);
  });

  it('treats ? as 0', () => {
    expect(dateSortKey('?.?.2022')).toBe(20220000);
    expect(dateSortKey('?.6.2022')).toBe(20220600);
    expect(dateSortKey('15.?.2022')).toBe(20220015);
  });
});

// ---- parseLine ----

describe('parseLine', () => {
  it('returns null for non-matching lines', () => {
    expect(parseLine('')).toBeNull();
    expect(parseLine('not an event')).toBeNull();
    expect(parseLine('# comment')).toBeNull();
    expect(parseLine('just some text without semicolon')).toBeNull();
  });

  it('parses a basic full concert [C]', () => {
    const e = parseLine('15.6.2023 Radiohead; Glastonbury [C]');
    expect(e).not.toBeNull();
    expect(e.date).toBe('15.6.2023');
    expect(e.year).toBe(2023);
    expect(e.venue).toBe('Glastonbury');
    expect(e.type).toBe('C');
    expect(e.performers).toHaveLength(1);
    expect(e.performers[0].name).toBe('Radiohead');
    expect(e.performers[0].type).toBe('C');
    expect(e.performers[0].detail).toBeNull();
    expect(e.performers[0].jointGroup).toBeNull();
    expect(e.eventName).toBeNull();
    expect(e.comment).toBeNull();
  });

  it('parses a mini-concert [MC]', () => {
    const e = parseLine('1.1.2020 Opener; Club 007 [MC]');
    expect(e.type).toBe('MC');
    expect(e.performers[0].type).toBe('MC');
  });

  it('parses a non-concert event (no type tag)', () => {
    const e = parseLine('10.8.2019 Trip to London; Victoria station');
    expect(e).not.toBeNull();
    expect(e.type).toBeNull();
    expect(e.performers).toHaveLength(0);
    expect(e.eventName).toBe('Trip to London');
    expect(e.venue).toBe('Victoria station');
  });

  it('parses multiple performers separated by comma', () => {
    const e = parseLine('1.5.2022 Opeth, Enslaved; Tavastia [C]');
    expect(e.performers).toHaveLength(2);
    expect(e.performers[0].name).toBe('Opeth');
    expect(e.performers[1].name).toBe('Enslaved');
    expect(e.performers[0].jointGroup).toBeNull();
    expect(e.performers[1].jointGroup).toBeNull();
  });

  it('parses joint-billed performers with +', () => {
    const e = parseLine('1.5.2022 Fish + Marillion; Tavastia [C]');
    expect(e.performers).toHaveLength(2);
    expect(e.performers[0].name).toBe('Fish');
    expect(e.performers[1].name).toBe('Marillion');
    expect(e.performers[0].jointGroup).toBe(0);
    expect(e.performers[1].jointGroup).toBe(0);
  });

  it('assigns different jointGroup ids to separate joint pairs', () => {
    const e = parseLine('1.5.2022 A + B, C + D; Venue [C]');
    expect(e.performers).toHaveLength(4);
    expect(e.performers[0].jointGroup).toBe(0); // A
    expect(e.performers[1].jointGroup).toBe(0); // B
    expect(e.performers[2].jointGroup).toBe(1); // C
    expect(e.performers[3].jointGroup).toBe(1); // D
  });

  it('does not split on comma inside parentheses', () => {
    const e = parseLine('1.5.2022 Fish (with band, friends); Tavastia [C]');
    expect(e.performers).toHaveLength(1);
    expect(e.performers[0].name).toBe('Fish');
    expect(e.performers[0].detail).toBe('with band, friends');
  });

  it('does not split on + inside parentheses', () => {
    const e = parseLine('1.5.2022 Artist (feat. A + B); Venue [C]');
    expect(e.performers).toHaveLength(1);
    expect(e.performers[0].name).toBe('Artist');
    expect(e.performers[0].detail).toBe('feat. A + B');
  });

  it('extracts event name from "EventName: Performer" prefix', () => {
    const e = parseLine('1.7.1995 Ruisrock-95: The Beautiful South; Ruissalo [C]');
    expect(e.eventName).toBe('Ruisrock-95');
    expect(e.performers[0].name).toBe('The Beautiful South');
  });

  it('extracts event name with multiple performers', () => {
    const e = parseLine('1.7.1995 Ruisrock: Blur, Oasis; Ruissalo [C]');
    expect(e.eventName).toBe('Ruisrock');
    expect(e.performers).toHaveLength(2);
    expect(e.performers[0].name).toBe('Blur');
    expect(e.performers[1].name).toBe('Oasis');
  });

  it('uses description as eventName for non-concert with colon prefix', () => {
    const e = parseLine('10.8.2019 Conference: Day 1; Convention Centre');
    expect(e.type).toBeNull();
    expect(e.performers).toHaveLength(0);
    expect(e.eventName).toBe('Conference');
  });

  it('extracts performer detail from parentheses', () => {
    const e = parseLine('1.5.2022 Fish (acoustic); Tavastia [C]');
    expect(e.performers[0].name).toBe('Fish');
    expect(e.performers[0].detail).toBe('acoustic');
  });

  it('extracts venue comment from trailing parentheses', () => {
    const e = parseLine('1.5.2022 Opeth; Tavastia (2) [C]');
    expect(e.venue).toBe('Tavastia');
    expect(e.comment).toBe('2');
  });

  it('handles venue with city: no comment when no parens', () => {
    const e = parseLine('1.5.2022 Opeth; Tavastia, Helsinki [C]');
    expect(e.venue).toBe('Tavastia, Helsinki');
    expect(e.comment).toBeNull();
  });

  it('handles per-performer [MC] override in a [C] event', () => {
    const e = parseLine('1.5.2022 Headliner, Opener [MC]; Tavastia [C]');
    expect(e.performers).toHaveLength(2);
    expect(e.performers[0].name).toBe('Headliner');
    expect(e.performers[0].type).toBe('C');
    expect(e.performers[1].name).toBe('Opener');
    expect(e.performers[1].type).toBe('MC');
    expect(e.type).toBe('C'); // event-level type unchanged
  });

  it('handles per-performer [C] override in an [MC] event', () => {
    const e = parseLine('1.5.2022 Main [C], Short Set; Venue [MC]');
    expect(e.performers[0].name).toBe('Main');
    expect(e.performers[0].type).toBe('C');
    expect(e.performers[1].name).toBe('Short Set');
    expect(e.performers[1].type).toBe('MC');
  });

  it('handles ? in date', () => {
    const e = parseLine('?.?.2022 Opeth; Tavastia [C]');
    expect(e.date).toBe('?.?.2022');
    expect(e.year).toBe(2022);
  });

  it('handles Unicode in performer name', () => {
    const e = parseLine('1.5.2022 Maija Vilkkumaa; Tavastia [C]');
    expect(e.performers[0].name).toBe('Maija Vilkkumaa');
  });

  it('stores the original raw line', () => {
    const raw = '15.6.2023 Radiohead; Glastonbury [C]';
    const e = parseLine(raw);
    expect(e.raw).toBe(raw);
  });
});

// ---- parseEvents ----

describe('parseEvents', () => {
  it('parses multiple lines', () => {
    const text = [
      '1.5.2022 Opeth; Tavastia [C]',
      '2.5.2022 Enslaved; Gloria [C]',
    ].join('\n');
    expect(parseEvents(text)).toHaveLength(2);
  });

  it('skips blank lines', () => {
    const text = '\n1.5.2022 Opeth; Tavastia [C]\n\n2.5.2022 Enslaved; Gloria [C]\n';
    expect(parseEvents(text)).toHaveLength(2);
  });

  it('skips non-matching lines (with console.warn)', () => {
    const text = '1.5.2022 Opeth; Tavastia [C]\nbad line\n2.5.2022 Enslaved; Gloria [C]';
    expect(parseEvents(text)).toHaveLength(2);
  });

  it('returns empty array for empty string', () => {
    expect(parseEvents('')).toHaveLength(0);
  });

  it('includes non-concert events', () => {
    const text = '1.5.2022 Opeth; Tavastia [C]\n10.8.2019 Trip; Airport';
    const events = parseEvents(text);
    expect(events).toHaveLength(2);
    expect(events[1].type).toBeNull();
  });
});
