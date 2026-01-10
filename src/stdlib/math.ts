import ExtFunction from '@src/interpreter/ExtFunction';
import {
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import { countRegularArguments, requestNumber } from '@src/interpreter/utils';

function getNumberOrError(args: Value[]): number {
  const n = requestNumber(args);
  return n.number;
}

function abs(args: Value[]): Value[] {
  const n = getNumberOrError(args);
  return [NumberValue.from(Math.abs(n))];
}

function ceil(args: Value[]): Value[] {
  const n = getNumberOrError(args);
  return [NumberValue.from(Math.ceil(n))];
}

function floor(args: Value[]): Value[] {
  const n = getNumberOrError(args);
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
  const n = getNumberOrError(args);
  return [NumberValue.from(Math.sqrt(n))];
}

const functions = new TableValue();
functions.set(StringValue.from('abs'), ExtFunction.of(abs));
functions.set(StringValue.from('ceil'), ExtFunction.of(ceil));
functions.set(StringValue.from('floor'), ExtFunction.of(floor));
functions.set(StringValue.from('max'), ExtFunction.of(max));
functions.set(StringValue.from('min'), ExtFunction.of(min));
functions.set(StringValue.from('sqrt'), ExtFunction.of(sqrt));
const mathStdLib = new TableValue();
mathStdLib.set(StringValue.from('math'), functions);

export default mathStdLib;
