import ExtFunction from '@src/interpreter/ExtFunction';
import {
  BooleanValue,
  FunctionValue,
  InternalListValue,
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import {
  isFalse,
  requestBooleanOrNil,
  requestContext,
  requestInterpreter,
  requestNumber,
  requestNumberOrNil,
  requestString,
  requestStringOrNil,
} from '@src/interpreter/utils';

function gsub(args: Value[]): Value[] {
  const s = requestString(args, 0, 'first parameter is not string');
  const pattern = requestString(args, 1, 'pattern parameter is not string');
  const repl = args[2];
  const nArg = requestNumberOrNil(args, 3, 'n parameter is not number');
  const n = nArg instanceof NumberValue ? nArg.number : Infinity;

  const interpreterValue = requestInterpreter(args);
  const interpreter = interpreterValue.interpreter;
  const ctx = requestContext(args).ctx;

  if (
    !(repl instanceof StringValue) &&
    !(repl instanceof TableValue) &&
    !(repl instanceof FunctionValue) &&
    !(repl instanceof ExtFunction)
  ) {
    throw new Error('string.gsub: replacement must be a string, table, or function');
  }

  let count = 0;
  let result = '';
  let lastIndex = 0;

  // TODO: Full Lua Pattern Support
  const regex = new RegExp(pattern.string, 'g');
  let match: RegExpExecArray | null;

  while (count < n && (match = regex.exec(s.string)) !== null) {
    const fullMatch = match[0];
    const matchIndex = match.index;

    // Append part before match
    result += s.string.substring(lastIndex, matchIndex);

    const captures: string[] = [];
    if (match.length > 1) {
      for (let i = 1; i < match.length; i++) {
        captures.push(match[i]);
      }
    } else {
      captures.push(fullMatch);
    }

    let replacement: string | undefined;

    if (repl instanceof StringValue) {
      replacement = repl.string.replace(/%([0-9%])/g, (m, g) => {
        if (g === '%') return '%';
        const d = parseInt(g, 10);
        if (d === 0) return fullMatch;
        return match?.[d] === undefined ? m : match[d];
      });
    } else if (repl instanceof TableValue) {
      const key = StringValue.from(captures[0]);
      const value = repl.get(key);
      if (!(value instanceof NilValue) && !isFalse(value)) {
        replacement = value.toString();
      }
    } else if (repl instanceof FunctionValue || repl instanceof ExtFunction) {
      const callArgs = captures.map(c => StringValue.from(c));
      const callResult = interpreter.exec_function(
        repl,
        new InternalListValue(callArgs),
        ctx
      );
      const firstRes =
        callResult instanceof InternalListValue
          ? callResult.getValueOrNil(1)
          : callResult;

      if (!(firstRes instanceof NilValue) && !isFalse(firstRes)) {
        replacement = firstRes.toString();
      }
    }

    if (replacement !== undefined) {
      result += replacement;
    } else {
      result += fullMatch;
    }

    lastIndex = matchIndex + fullMatch.length;
    count++;

    // Prevent infinite loop with empty matches
    if (fullMatch.length === 0) {
      if (lastIndex < s.string.length) {
        result += s.string[lastIndex];
        lastIndex++;
        regex.lastIndex = lastIndex;
      } else {
        break;
      }
    }
  }

  result += s.string.substring(lastIndex);

  return [StringValue.from(result), NumberValue.from(count)];
}

function find(args: Value[]): Value[] {
  const s = requestString(args, 0, 'first parameter is not string');
  const pattern = requestString(args, 1, 'pattern parameter is not string');
  const init = requestNumberOrNil(args, 2, 'init parameter is not number');
  const plain = requestBooleanOrNil(args, 3, 'plain parameter is not boolean');
  const flags = requestStringOrNil(args, 4, 'flags parameter is not string');

  const startIndex = init instanceof NumberValue ? init.number - 1 : 0;
  const plainSearch = plain instanceof BooleanValue ? plain.boolean : false;
  const regexFlags = flags instanceof StringValue ? flags.string : '';

  if (plainSearch) {
    return plainFind(s.string, pattern.string, startIndex);
  } else {
    return regexFind(s.string, pattern.string, regexFlags, startIndex);
  }
}

function plainFind(s: string, pattern: string, startIndex: number): Value[] {
  const index = s.indexOf(pattern, startIndex);
  if (index === -1) {
    return [new NilValue()];
  }
  return [
    NumberValue.from(index + 1),
    NumberValue.from(index + pattern.length),
    StringValue.from(pattern),
  ];
}

function regexFind(
  s: string,
  pattern: string,
  flags: string,
  startIndex: number
): Value[] {
  const regex = new RegExp(pattern, flags + (startIndex > 0 ? 'g' : ''));
  regex.lastIndex = startIndex;
  const match = regex.exec(s);
  if (!match) {
    return [new NilValue()];
  }
  const index = match.index;
  const endIndex = index + match[0].length;
  return [
    NumberValue.from(index + 1),
    NumberValue.from(endIndex),
    StringValue.from(match[0]),
  ];
}

function len(args: Value[]): Value[] {
  const s = requestString(args);
  return [NumberValue.from(s.string.length)];
}

function lower(args: Value[]): Value[] {
  const s = requestString(args);
  return [StringValue.from(s.string.toLowerCase())];
}

function upper(args: Value[]): Value[] {
  const s = requestString(args);
  return [StringValue.from(s.string.toUpperCase())];
}

function rep(args: Value[]): Value[] {
  const s = requestString(args);
  const n = requestNumber(args, 1);
  const sep = requestStringOrNil(args, 2, 'separator parameter is not string');
  const separator = sep instanceof StringValue ? sep.string : '';
  return [StringValue.from(Array(n.number).fill(s.string).join(separator))];
}

function reverse(args: Value[]): Value[] {
  const s = requestString(args);
  return [StringValue.from(s.string.split('').reverse().join(''))];
}

function sub(args: Value[]): Value[] {
  const s = requestString(args);
  const start = requestNumber(args, 1, 'start parameter is not number');
  const end = requestNumberOrNil(args, 2, 'end parameter is not number');
  const strLength = s.string.length;
  const startIndex =
    start.number < 0 ? Math.max(0, strLength + start.number) : start.number - 1;
  const endIndex =
    end instanceof NumberValue
      ? end.number < 0
        ? strLength + end.number + 1
        : end.number
      : strLength;
  return [StringValue.from(s.string.substring(startIndex, endIndex))];
}

const functions = new TableValue();
functions.set(StringValue.from('find'), ExtFunction.of(find));
functions.set(StringValue.from('gsub'), ExtFunction.WithInterpreter(gsub));
functions.set(StringValue.from('len'), ExtFunction.of(len));
functions.set(StringValue.from('lower'), ExtFunction.of(lower));
functions.set(StringValue.from('upper'), ExtFunction.of(upper));
functions.set(StringValue.from('rep'), ExtFunction.of(rep));
functions.set(StringValue.from('reverse'), ExtFunction.of(reverse));
functions.set(StringValue.from('sub'), ExtFunction.of(sub));

const stringStdLib = new TableValue();
stringStdLib.set(StringValue.from('string'), functions);

export default stringStdLib;
