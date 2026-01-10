import { TraceFrame } from '@src/interpreter/TraceFrame';

export abstract class VMError extends Error {
  private _cause?: VMError | unknown;
  protected _errorCode: string;
  protected _traceFrame?: TraceFrame;

  constructor(message: string, traceFrame?: TraceFrame, errorCode = '0000') {
    super(message);
    this._errorCode = errorCode;
    this._traceFrame = traceFrame;
  }

  set cause(cause: VMError | unknown) {
    this._cause = cause;
  }

  get cause(): VMError | unknown | undefined {
    return this._cause;
  }

  get errorCode(): string {
    return this._errorCode;
  }

  get traceFrame(): TraceFrame | undefined {
    return this._traceFrame;
  }

  toString(prefix = '') {
    const result: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: VMError | unknown | undefined = this;
    while (current) {
      if (current instanceof VMError) {
        result.push(
          prefix +
            current.message +
            (current.traceFrame ? ` at ${current.traceFrame}` : '')
        );
        current = current.cause;
      } else if (current instanceof Error) {
        result.push(prefix + current.message);
        current = undefined;
      } else if (current instanceof String) {
        result.push(prefix + current);
        current = undefined;
      }
      prefix = prefix + '  ';
    }
    return result.join('\n');
  }
}

class NotYetImplemented extends VMError {
  constructor(feature: string, traceFrame: TraceFrame, errorCode = '0000') {
    super(
      `[${errorCode}] Feature not yet implemented: ${feature}`,
      traceFrame,
      errorCode
    );
  }
}

class RuntimeError extends VMError {
  constructor(message: string, traceFrame: TraceFrame) {
    super(`Runtime error: ${message}`, traceFrame);
  }
}

class LuaLangError extends VMError {
  constructor(message: string, traceFrame: TraceFrame) {
    super(`Lua: ${message}`, traceFrame);
  }
}

class ExtFunctionError extends VMError {}

export class RequireError extends VMError {
  constructor(message: string, traceFrame: TraceFrame) {
    super(`Require: ${message}`, traceFrame);
  }
}

export { NotYetImplemented, RuntimeError, LuaLangError, ExtFunctionError };
