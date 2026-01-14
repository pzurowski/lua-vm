import ExtFunction from '@src/interpreter/ExtFunction';
import {
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import {
  countRegularArguments,
  requestNumber,
  requestNumberOrNil,
} from '@src/interpreter/utils';

function abs(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.abs(n))];
}

function ceil(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.ceil(n))];
}

function floor(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.floor(n))];
}

function minMax(args: Value[], max: boolean): Value[] {
  const regularArgumentsLength = countRegularArguments(args);
  if (regularArgumentsLength === 0) {
    return [new NilValue()];
  }
  let result = requestNumber(args);
  for (let i = 1; i < regularArgumentsLength; i++) {
    const n = requestNumber(args, i);
    if (
      (max && result.number < n.number) ||
      (!max && result.number > n.number)
    ) {
      result = n;
    }
  }
  return [result];
}

function max(args: Value[]): Value[] {
  return minMax(args, true);
}

function min(args: Value[]): Value[] {
  return minMax(args, false);
}

function sqrt(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.sqrt(n))];
}

function acos(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.acos(n))];
}

function atan2(args: Value[]): Value[] {
  const y = requestNumber(args, 0).number;
  const x = requestNumber(args, 1).number;
  return [NumberValue.from(Math.atan2(y, x))];
}

function cos(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.cos(n))];
}

function log(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.log(n))];
}

function rad(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from((n * Math.PI) / 180)];
}

function sin(args: Value[]): Value[] {
  const n = requestNumber(args).number;
  return [NumberValue.from(Math.sin(n))];
}

function random(args: Value[]): Value[] {
  const mValue = requestNumberOrNil(args, 0);
  const nValue = requestNumberOrNil(args, 1);

  if (mValue instanceof NilValue) {
    return [NumberValue.from(Math.random())];
  }

  if (nValue instanceof NilValue) {
    return [NumberValue.from(Math.floor(Math.random() * mValue.number) + 1)];
  }

  return [
    NumberValue.from(
      Math.floor(Math.random() * (nValue.number - mValue.number + 1)) +
        mValue.number
    ),
  ];
}

const functions = new TableValue();
functions.set(StringValue.from('abs'), ExtFunction.of(abs));
functions.set(StringValue.from('acos'), ExtFunction.of(acos));
functions.set(StringValue.from('atan2'), ExtFunction.of(atan2));
functions.set(StringValue.from('ceil'), ExtFunction.of(ceil));
functions.set(StringValue.from('cos'), ExtFunction.of(cos));
functions.set(StringValue.from('floor'), ExtFunction.of(floor));
functions.set(StringValue.from('huge'), NumberValue.from(Infinity));
functions.set(StringValue.from('log'), ExtFunction.of(log));
functions.set(StringValue.from('max'), ExtFunction.of(max));
functions.set(StringValue.from('min'), ExtFunction.of(min));
functions.set(StringValue.from('pi'), NumberValue.from(Math.PI));
functions.set(StringValue.from('rad'), ExtFunction.of(rad));
functions.set(StringValue.from('random'), ExtFunction.of(random));
functions.set(StringValue.from('sin'), ExtFunction.of(sin));
functions.set(StringValue.from('sqrt'), ExtFunction.of(sqrt));
const mathStdLib = new TableValue();
mathStdLib.set(StringValue.from('math'), functions);

export default mathStdLib;
