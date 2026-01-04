import { ParserRuleContext } from 'antlr4/src/antlr4/context/ParserRuleContext';

class VMError extends Error {
  private _cause: unknown | undefined;
  protected _errorCode: string;

  constructor(message: string, errorCode = '0000') {
    super(message);
    this._errorCode = errorCode;
  }

  set cause(cause: unknown) {
    this._cause = cause;
  }

  get cause(): unknown | undefined {
    return this._cause;
  }

  get errorCode(): string {
    return this._errorCode;
  }
}

class NotYetImplemented extends VMError {
  constructor(feature: string, ctx: ParserRuleContext, errorCode = '0000') {
    const line = ctx && ctx.start ? ctx.start.line : -1;
    const col = ctx && ctx.start ? ctx.start.column : -1;
    super(
      `[${errorCode}] Feature not yet implemented(line: ${line}, col: ${col}): ${feature}`,
      errorCode
    );
  }
}

class RuntimeError extends VMError {
  constructor(message: string, ctx: ParserRuleContext) {
    const line = ctx && ctx.start ? ctx.start.line : -1;
    const col = ctx && ctx.start ? ctx.start.column : -1;
    super(`Runtime error: (line: ${line}, col: ${col}): ${message}`);
  }

  static message(msg: string): RuntimeError {
    return new RuntimeError(msg, {} as ParserRuleContext);
  }
}

class LuaLangError extends VMError {
  constructor(message: string, line: number, col: number) {
    super(`Lua: ${message} (line: ${line}, col: ${col})`);
  }
}

class ExtFunctionError extends VMError {}

export { NotYetImplemented, RuntimeError, LuaLangError, ExtFunctionError };
