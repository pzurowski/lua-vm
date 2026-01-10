import ExtFunction from '@src/interpreter/ExtFunction';
import {
  BooleanValue,
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import {
  requestBooleanOrNil,
  requestNumber,
  requestNumberOrNil,
  requestString,
  requestStringOrNil,
} from '@src/interpreter/utils';

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
functions.set(StringValue.from('len'), ExtFunction.of(len));
functions.set(StringValue.from('lower'), ExtFunction.of(lower));
functions.set(StringValue.from('upper'), ExtFunction.of(upper));
functions.set(StringValue.from('rep'), ExtFunction.of(rep));
functions.set(StringValue.from('reverse'), ExtFunction.of(reverse));
functions.set(StringValue.from('sub'), ExtFunction.of(sub));

const stringStdLib = new TableValue();
stringStdLib.set(StringValue.from('string'), functions);

export default stringStdLib;
