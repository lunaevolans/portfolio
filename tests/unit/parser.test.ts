import { describe, expect, it } from 'vitest';
import { parse, tokenize, ParseError } from '../../src/lib/shell/parser';

describe('tokenize', () => {
  it('handles quotes and escapes', () => {
    expect(tokenize(`echo "hello world" 'a b' c\\ d`).map((t) => t.v)).toEqual(['echo', 'hello world', 'a b', 'c d']);
  });
  it('keeps empty quoted strings', () => {
    expect(tokenize(`echo ""`).map((t) => t.v)).toEqual(['echo', '']);
  });
  it('strips comments', () => {
    expect(tokenize('ls # list').map((t) => t.v)).toEqual(['ls']);
  });
  it('throws on unterminated quotes', () => {
    expect(() => tokenize('echo "oops')).toThrow(ParseError);
  });
});

describe('parse', () => {
  it('builds pipelines and sequences', () => {
    const steps = parse('cat a | grep x && ls ; pwd');
    expect(steps).toHaveLength(3);
    expect(steps[0]!.pipeline.map((c) => c.name)).toEqual(['cat', 'grep']);
    expect(steps[1]!.op).toBe('&&');
    expect(steps[2]!.op).toBe(';');
  });
  it('rejects dangling pipes', () => {
    expect(() => parse('ls |')).toThrow(ParseError);
    expect(() => parse('| ls')).toThrow(ParseError);
  });
  it('allows trailing semicolons', () => {
    expect(parse('ls;')).toHaveLength(1);
  });
});
