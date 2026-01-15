import { ExtFunctionError } from '@src/interpreter/errors';
import ExtFunction from '@src/interpreter/ExtFunction';
import {
  BooleanValue,
  InternalListValue,
  InterpreterValue,
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import {
  flattenList,
  getOrNil,
  isTrue,
  requestContext,
  requestFunctionOrNil,
  requestInterpreter,
  requestNumberOrNil,
  requestString,
  requestTable,
} from '@src/interpreter/utils';

function concat(args: Value[]): Value[] {
  const table = requestTable(
    args,
    0,
    'concat requires first argument to be a table'
  );
  const sep = requestString(
    args,
    1,
    'concat requires separator to be a string'
  );
  const iArg = requestNumberOrNil(
    args,
    2,
    'concat requires index to be a number'
  );
  const jArg = requestNumberOrNil(
    args,
    3,
    'concat requires index to be a number'
  );
  const list = tableToList(table);
  const i = iArg instanceof NilValue ? 0 : iArg.number - 1;
  const j = jArg instanceof NilValue ? list.length - 1 : jArg.number - 1;
  const resultList = [];
  for (let k = i; k <= j; k++) {
    resultList.push(list[k].toString());
  }
  return [StringValue.from(resultList.join(sep.string))];
}

function tableToList(table: TableValue): Value[] {
  const result = [];
  let i = 1;
  while (!(table.get(NumberValue.from(i)) instanceof NilValue)) {
    result.push(table.get(NumberValue.from(i)));
    i++;
  }
  return result;
}

function insert(args: Value[]): Value[] {
  const table = requestTable(args, 0, 'table has to be provided');
  const list = tableToList(table);
  const a = getOrNil(args, 1);
  const b = getOrNil(args, 2);
  if (a instanceof NumberValue) {
    const pos = a.number;
    if (b instanceof NilValue) {
      return [table];
    }
    if (pos < 1 || pos > list.length + 1) {
      throw new ExtFunctionError(
        `pos has to be in [1..${list.length + 1}] inteval`
      );
    }
    list.splice(pos - 1, 0, b);
    return [listToTable(table, list)];
  } else {
    const pos = list.length;
    if (a instanceof NilValue) {
      return [table];
    }
    list.splice(pos, 0, a);
    return [listToTable(table, list)];
  }
}

function listToTable(table: TableValue, list: Value[]): TableValue {
  for (let i = 0; i < list.length; i++) {
    table.set(NumberValue.from(i + 1), list[i]);
  }
  return table;
}

function remove(args: Value[]): Value[] {
  const table = requestTable(args, 0, 'table has to be provided');
  const list = tableToList(table);
  const posArg = requestNumberOrNil(args, 1, 'pos has to be a number');
  const pos = posArg instanceof NilValue ? list.length - 1 : posArg.number - 1;
  if (pos < 0 || pos >= list.length) {
    throw new ExtFunctionError('pos is out of range');
  }
  const removed = list.splice(pos, 1);
  table.remove(NumberValue.from(list.length + 1));
  listToTable(table, list);
  return [removed[0]];
}

function sort(args: Value[]): Value[] {
  const table = requestTable(args, 0, 'table has to be provided');
  const list = tableToList(table);
  const comparatorOrNil = requestFunctionOrNil(
    args,
    1,
    'comparator muse be a function'
  );
  const comparator =
    comparatorOrNil instanceof NilValue
      ? ExtFunction.of(defaultComparator)
      : comparatorOrNil;
  const interpreter = requestInterpreter(args);
  const ctx = requestContext(args);

  list.sort((a, b) => {
    const result = (interpreter as InterpreterValue).interpreter.exec_function(
      comparator,
      new InternalListValue([a, b]),
      ctx.ctx
    );
    const aIsFirst = flattenList(result).getValueOrNil(1);
    return isTrue(aIsFirst) ? -1 : 1;
  });
  listToTable(table, list);
  return [table];
}

function defaultComparator(args: Value[]): Value[] {
  const a = getOrNil(args, 0);
  const b = getOrNil(args, 1);
  if (a instanceof NumberValue && b instanceof NumberValue) {
    return [BooleanValue.from(a.number < b.number)];
  }
  if (a instanceof StringValue && b instanceof StringValue) {
    return [BooleanValue.from(a.string < b.string)];
  }
  throw new ExtFunctionError('Elements must all be either numbers or strings');
}

const functions = new TableValue();
functions.set(StringValue.from('concat'), ExtFunction.of(concat));
functions.set(StringValue.from('insert'), ExtFunction.of(insert));
functions.set(StringValue.from('remove'), ExtFunction.of(remove));
functions.set(StringValue.from('sort'), ExtFunction.WithInterpreter(sort));

const tableStdLib = new TableValue();
tableStdLib.set(StringValue.from('table'), functions);

export default tableStdLib;
