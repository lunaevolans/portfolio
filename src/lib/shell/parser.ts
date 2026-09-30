/**
 * Tiny POSIX-ish command-line parser: quotes, escapes, `|` pipes, and `&&` / `;`
 * sequencing. Returns a list of pipelines with the operator that joins each
 * one to the previous.
 */

export interface Command {
  name: string;
  args: string[];
}

export interface Step {
  /** How this pipeline joins the previous one. First step is always ';'. */
  op: ';' | '&&' | '||';
  pipeline: Command[];
}

type Token = { t: 'word'; v: string } | { t: 'op'; v: '|' | '&&' | '||' | ';' };

export class ParseError extends Error {}

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let buf = '';
  let inWord = false;
  let quote: '"' | "'" | null = null;
  const push = () => {
    if (inWord) out.push({ t: 'word', v: buf });
    buf = '';
    inWord = false;
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i] as string;
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < input.length) buf += input[++i];
      else buf += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      inWord = true;
    } else if (c === '\\' && i + 1 < input.length) {
      buf += input[++i];
      inWord = true;
    } else if (/\s/.test(c)) {
      push();
    } else if (c === '|' || c === '&' || c === ';') {
      push();
      const two = input.slice(i, i + 2);
      if (two === '&&' || two === '||') {
        out.push({ t: 'op', v: two });
        i++;
      } else if (c === '&') {
        throw new ParseError('background jobs (&) are not supported');
      } else {
        out.push({ t: 'op', v: c as '|' | ';' });
      }
    } else if (c === '#' && !inWord) {
      break; // comment
    } else {
      buf += c;
      inWord = true;
    }
  }
  if (quote) throw new ParseError(`unterminated ${quote === '"' ? 'double' : 'single'} quote`);
  push();
  return out;
}

export function parse(input: string): Step[] {
  const tokens = tokenize(input);
  const steps: Step[] = [];
  let op: Step['op'] = ';';
  let pipeline: Command[] = [];
  let words: string[] = [];

  const endCommand = (required: boolean) => {
    if (!words.length) {
      if (required) throw new ParseError('syntax error near unexpected token');
      return;
    }
    const [name, ...args] = words as [string, ...string[]];
    pipeline.push({ name, args });
    words = [];
  };
  const endPipeline = (required: boolean) => {
    endCommand(required || pipeline.length > 0);
    if (pipeline.length) steps.push({ op, pipeline });
    pipeline = [];
  };

  for (const tok of tokens) {
    if (tok.t === 'word') words.push(tok.v);
    else if (tok.v === '|') endCommand(true);
    else {
      endPipeline(tok.v !== ';');
      op = tok.v;
    }
  }
  endPipeline(op !== ';');
  return steps;
}
