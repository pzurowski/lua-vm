import { ParserRuleContext } from 'antlr4';
import {
  InternalContextValue,
  InternalListValue,
  InterpreterValue,
  NilValue,
  TableValue,
  Value,
} from './types';
import LuaInterpreter from './LuaInterpreter';

export default class ExtFunction extends Value {
  private readonly uuid: string;
  private readonly f: (args: Value[]) => Value[];
  readonly name: string;
  private readonly passInterpreter: boolean;

  static of(f: (args: Value[]) => Value[], name = ''): ExtFunction {
    return new ExtFunction(f, name.length > 0 ? name : f.name, false);
  }

  static WithInterpreter(
    f: (args: Value[]) => Value[],
    name = ''
  ): ExtFunction {
    return new ExtFunction(f, name.length > 0 ? name : f.name, true);
  }

  constructor(
    f: (args: Value[]) => Value[],
    name: string,
    passInterpreter: boolean
  ) {
    super();
    this.uuid = crypto.randomUUID();
    this.f = f;
    this.name = name;
    this.passInterpreter = passInterpreter;
  }

  run(
    args: InternalListValue,
    ctx: ParserRuleContext,
    interpreter: LuaInterpreter
  ): InternalListValue {
    const result = this.f(
      args
        .asList()
        .concat(
          this.passInterpreter
            ? [new InterpreterValue(interpreter), new InternalContextValue(ctx)]
            : [new InternalContextValue(ctx)]
        )
    );
    return new InternalListValue(
      result.length == 0 ? [new NilValue()] : result
    );
  }

  asIdString(): string {
    return `extFun:${this.uuid}`;
  }

  toString(): string {
    return `extFun:${this.name}:${this.uuid}`;
  }

  getMetatable(): TableValue | NilValue {
    return new NilValue();
  }

  setMetatable(value: TableValue | NilValue): void {
    void value;
    throw new Error(`Cannot set metatable on ${this.constructor.name} value`);
  }
}
