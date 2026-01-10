import VisibilityScope from '@src/interpreter/VisibilityScope';
import { ParserRuleContext } from 'antlr4';
import { __name } from '@src/interpreter/consts';

interface TraceLocation {
  line: number;
  column: number;
  filename: string;
  info: string;
}

export class TraceFrame implements Readonly<TraceLocation> {
  readonly filename: string;
  readonly line: number;
  readonly column: number;
  readonly info: string;
  constructor(ctx: ParserRuleContext, scope: VisibilityScope | string);
  constructor(ctx: Readonly<TraceLocation>);
  constructor(
    ctx: ParserRuleContext | Readonly<TraceLocation>,
    scope?: VisibilityScope | string
  ) {
    if (ctx instanceof ParserRuleContext) {
      this.filename =
        typeof scope === 'string'
          ? scope
          : (scope?.get(__name).toString() ?? '<unknown>');
      this.line = ctx.start.line;
      this.column = ctx.start.column;
      this.info = ctx.getText();
    } else {
      this.filename = ctx.filename;
      this.line = ctx.line;
      this.column = ctx.column;
      this.info = ctx.info;
    }
  }
  toString() {
    return `${this.filename}:${this.line}:${this.column}`;
  }
}
