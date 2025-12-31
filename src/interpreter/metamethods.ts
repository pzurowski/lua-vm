import {
  booleanMetatable,
  BooleanValue,
  numberMetatable,
  NumberValue,
  stringMetatable,
  StringValue,
  Value,
} from './types';
import ExtFunction from './ExtFunction';
import { ExtFunctionError } from './errors';
import { getOrNil } from './utils';

const numberOperators = {
  __add: (l: number, r: number) => l + r,
  __sub: (l: number, r: number) => l - r,
  __mul: (l: number, r: number) => l * r,
  __div: (l: number, r: number) => l / r,
  __mod: (l: number, r: number) => l % r,
  __unm: (l: number, _: number) => -l,
  __pow: (l: number, r: number) => Math.pow(l, r),
  __idiv: (l: number, r: number) => Math.floor(l / r),
  __band: (l: number, r: number) => l & r,
  __bor: (l: number, r: number) => l | r,
  __bxor: (l: number, r: number) => l ^ r,
  __bnot: (l: number, _: number) => ~l,
  __shr: (l: number, r: number) => l >> r,
  __shl: (l: number, r: number) => l << r
};
const numberRelationalOperators = {
  __le: (l: number, r: number) => l <= r,
  __lt: (l: number, r: number) => l < r,
  __eq: (l: number, r: number) => l === r,
};
const stringRelationalOperators = {
  __le: (l: string, r: string) => l <= r,
  __lt: (l: string, r: string) => l < r,
  __eq: (l: string, r: string) => l === r,
};
const booleanOperators = {
  __eq: (l: boolean, r: boolean) => l === r,
};
const stringOperators = {
  __len: (l: string, _: string) => l.length,
};

export function initializeMethaMethodsForBasicTypes() {
  Object.entries(numberOperators).forEach(([op, fn]) => {
    numberMetatable.set(
      StringValue.from(op),
      wrapOp(fn, expectNumber, extractNumber, NumberValue.from)
    );
  });
  Object.entries(numberRelationalOperators).forEach(([op, fn]) => {
    numberMetatable.set(
      StringValue.from(op),
      wrapOp(fn, expectNumber, extractNumber, BooleanValue.from)
    );
  });
  Object.entries(booleanOperators).forEach(([op, fn]) => {
    booleanMetatable.set(
      StringValue.from(op),
      wrapOp(fn, expectBoolean, extractBoolean, BooleanValue.from)
    );
  });
  Object.entries(stringRelationalOperators).forEach(([op, fn]) => {
    stringMetatable.set(
      StringValue.from(op),
      wrapOp(fn, expectString, extractString, BooleanValue.from)
    );
  });
  Object.entries(stringOperators).forEach(([op, fn]) => {
    stringMetatable.set(
      StringValue.from(op),
      wrapOp(fn, expectString, extractString, NumberValue.from)
    );
  });

  [numberMetatable, booleanMetatable, stringMetatable].forEach(metatable => {
    metatable.set(
      StringValue.from('__concat'),
      wrapOp(
        (l: string, r: string) => l + r,
        expectValue,
        extractStringRepresentation,
        StringValue.from
      )
    );
    ['__index', '__newindex', '__call'].forEach((op)=>{
      metatable.set(
        StringValue.from(op),
        ExtFunction.of(() => {
          throw new ExtFunctionError(`Unsupported operation: ${op}`);
        })
      );
    });
  });
}

function expectNumber(value: Value): value is NumberValue {
  if (!(value instanceof NumberValue)) {
    throw new ExtFunctionError(
      `Expected NumberValue, but got ${value.constructor.name}`
    );
  }
  return true;
}

function expectString(value: Value): value is StringValue {
  if (!(value instanceof StringValue)) {
    throw new ExtFunctionError(
      `Expected StringValue, but got ${value.constructor.name}`
    );
  }
  return true;
}

function expectBoolean(value: Value): value is BooleanValue {
  if (!(value instanceof BooleanValue)) {
    throw new ExtFunctionError(
      `Expected BooleanValue, but got ${value.constructor.name}`
    );
  }
  return true;
}

function expectValue(value: Value): value is Value {
  return true;
}

function extractNumber(value: NumberValue) {
  return value.number;
}

function extractString(value: StringValue) {
  return value.string;
}

function extractBoolean(value: BooleanValue) {
  return value.boolean;
}

function extractStringRepresentation(value: Value) {
  return value.toString();
}

function wrapOp<
  InputValue extends Value,
  OutputValue extends Value,
  BaseInputType = never,
  BaseOutputType = never,
>(
  fn: (left: BaseInputType, right: BaseInputType) => BaseOutputType,
  typeGuard: (value: Value) => value is InputValue,
  extractBaseType: (value: InputValue) => BaseInputType,
  wrapValue: (value: BaseOutputType) => OutputValue
) {
  return ExtFunction.of((args: Value[]): Value[] => {
    const left = getOrNil(args, 0);
    const right = getOrNil(args, 1);

    if (!typeGuard(left) || !typeGuard(right)) {
      return []; /* should not reach here */
    }

    return [wrapValue(fn(extractBaseType(left), extractBaseType(right)))];
  });
}
