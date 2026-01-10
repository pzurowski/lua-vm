import {
  CharStreams,
  CommonTokenStream,
  ErrorListener,
  RecognitionException,
  Recognizer,
} from 'antlr4';
import LuaLexer from '../parser/LuaLexer';
import LuaParser from '../parser/LuaParser';
import LuaInterpreter from './LuaInterpreter';
import {
  BooleanValue,
  FunctionValue,
  InternalContextValue,
  InternalListValue,
  InterpreterValue,
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from './types';
import { ExtFunctionError, LuaLangError } from './errors';
import { TraceFrame } from './TraceFrame';
import ExtFunction from './ExtFunction';

class ThrowErrorListener<T> extends ErrorListener<T> {
  private readonly filename;

  constructor(filename: string) {
    super();
    this.filename = filename;
  }

  syntaxError(
    recognizer: Recognizer<T>,
    offendingSymbol: T,
    line: number,
    column: number,
    msg: string,
    _e: RecognitionException | undefined
  ): void {
    throw new LuaLangError(
      msg,
      new TraceFrame({
        line,
        column,
        filename: this.filename,
        info: `${offendingSymbol}`,
      })
    );
  }
}

function make_parser(
  lua_code: string,
  showAntlrError = true,
  fileName = 'VM'
): LuaParser {
  const charStream = CharStreams.fromString(lua_code);
  const lexer = new LuaLexer(charStream);
  if (!showAntlrError) {
    lexer.removeErrorListeners();
    lexer.addErrorListener(new ThrowErrorListener(fileName));
  }
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new LuaParser(tokenStream);
  if (!showAntlrError) {
    parser.removeErrorListeners();
    parser.addErrorListener(new ThrowErrorListener(fileName));
  }
  return parser;
}

function executeWithInterpreter(
  lua_code: string,
  interpreter: LuaInterpreter,
  showAntlrError = true
): Value {
  const parser = make_parser(
    lua_code,
    showAntlrError,
    interpreter.getCurrentScopeName().string
  );
  const start = parser.start_();
  return start.accept(interpreter);
}

function isFalse(value: Value): boolean {
  if (value instanceof InternalListValue) {
    value = (value as InternalListValue).getValueOrNil(1);
  }
  return (
    value instanceof NilValue ||
    (value instanceof BooleanValue && !(value as BooleanValue).boolean)
  );
}

function isTrue(value: Value): boolean {
  return !isFalse(value);
}

function firstValue(value: Value): Value {
  return flattenList(value).getValueOrNil(1);
}

function flattenList(value: Value): InternalListValue {
  if (value instanceof InternalListValue) {
    const list = value as InternalListValue;
    const result: Value[] = [];
    for (let i = 1; i < list.size(); i++) {
      if (list.get(i) instanceof InternalListValue) {
        result.push((list.get(i) as InternalListValue).getValueOrNil(1));
      } else {
        result.push(list.get(i));
      }
    }
    if (list.get(list.size()) instanceof InternalListValue) {
      const lastList = flattenList(list.get(list.size())) as InternalListValue;
      result.push(...lastList.asList());
    } else {
      result.push(list.getValueOrNil(list.size()));
    }
    return new InternalListValue(result);
  } else {
    return new InternalListValue([value]);
  }
}

function getOrNilWithSpecial(values: Value[], index: number): Value {
  if (index < 0) {
    index = values.length + index;
  }

  return 0 <= index && index < values.length ? values[index] : new NilValue();
}

function getOrNil(values: Value[], index: number): Value {
  const value = getOrNilWithSpecial(values, index);
  return isRegularArg(value) ? value : new NilValue();
}

export {
  make_parser,
  executeWithInterpreter,
  isFalse,
  isTrue,
  firstValue,
  flattenList,
  getOrNil,
};

function requestConcrete<T extends Value>(
  args: Value[],
  index: number,
  errorMessage: string,
  Constructor: new (...args: any[]) => T
): T {
  const result = getOrNil(args, index);
  if (!(result instanceof Constructor)) {
    throw new ExtFunctionError(errorMessage);
  }
  return result;
}

function requestConcreteOrNil<T extends Value>(
  args: Value[],
  index: number,
  errorMessage: string,
  Constructor: new (...args: any[]) => T
): T | NilValue {
  const result = getOrNil(args, index);
  if (!(result instanceof Constructor) && !(result instanceof NilValue)) {
    throw new ExtFunctionError(errorMessage);
  }
  return result;
}

export function requestTable(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a table'
) {
  return requestConcrete(args, index, errorMessage, TableValue);
}

export function requestTableOrNil(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a table'
) {
  return requestConcreteOrNil(args, index, errorMessage, TableValue);
}

export function requestString(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a string'
) {
  return requestConcrete(args, index, errorMessage, StringValue);
}

export function requestStringOrNil(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a string'
) {
  return requestConcreteOrNil(args, index, errorMessage, StringValue);
}

export function requestNumber(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a number'
) {
  return requestConcrete(args, index, errorMessage, NumberValue);
}

export function requestNumberOrNil(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a number'
) {
  return requestConcreteOrNil(args, index, errorMessage, NumberValue);
}

export function requestBoolean(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a boolean'
) {
  return requestConcrete(args, index, errorMessage, BooleanValue);
}

export function requestBooleanOrNil(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a boolean'
) {
  return requestConcreteOrNil(args, index, errorMessage, BooleanValue);
}

export function requestFunctionOrNil(
  args: Value[],
  index = 0,
  errorMessage = 'parameter is not a function'
) {
  const result = getOrNil(args, index);
  if (
    !(result instanceof FunctionValue) &&
    !(result instanceof ExtFunction) &&
    !(result instanceof NilValue)
  ) {
    throw new ExtFunctionError(errorMessage);
  }
  return result;
}

export function requestInterpreter(args: Value[]) {
  const interpreter = getOrNilWithSpecial(args, -2);
  if (!(interpreter instanceof InterpreterValue)) {
    throw new ExtFunctionError('parameter is not a interpreter');
  }
  return interpreter;
}

export function requestContext(args: Value[]): InternalContextValue {
  const ctxValue = getOrNilWithSpecial(args, -1);
  if (!(ctxValue instanceof InternalContextValue)) {
    throw new ExtFunctionError('parameter is not a context');
  }
  return ctxValue;
}

function isRegularArg(value: Value) {
  return (
    !(value instanceof InternalContextValue) &&
    !(value instanceof InterpreterValue)
  );
}

export function countSpecialArguments(args: Value[]): number {
  const last = !isRegularArg(getOrNilWithSpecial(args, -1));
  const lastBefore = !isRegularArg(getOrNilWithSpecial(args, -2));

  return last && lastBefore ? 2 : last || lastBefore ? 1 : 0;
}

export function countRegularArguments(args: Value[]): number {
  return args.length - countSpecialArguments(args);
}
