import { ExtFunctionError, RequireError } from '@src/interpreter/errors';
import ExtFunction from '@src/interpreter/ExtFunction';
import {
  FunctionValue,
  InternalListValue,
  NilValue,
  NumberValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import {
  executeWithInterpreter,
  getOrNil,
  requestContext,
  requestInterpreter,
  requestString,
} from '@src/interpreter/utils';
import { __name } from '@src/interpreter/consts';
import { TraceFrame } from '@src/interpreter/TraceFrame';

export type PackageNameNormalize = (
  packageNamePart1: string,
  packageNamePart2: string
) => string;

export const defaultPackageNameNormalization: PackageNameNormalize = (a, b) => {
  const stack: string[] = [];

  if (!b.startsWith('/')) {
    const [_, ...aParts] = a.split('/');
    stack.push(...aParts);
    stack.pop();
  }

  const bParts = b.split('/');
  for (const part of bParts) {
    switch (part) {
      case '':
      case '.':
        continue;
      case '..':
        stack.pop();
        continue;
      default:
        stack.push(part);
    }
  }

  return '/' + stack.join('/');
};

export function createPackageLib(
  loadFile: (packageName: string) => string,
  fileExists: (packageName: string) => boolean,
  normalizeNameCallback: PackageNameNormalize = defaultPackageNameNormalization
) {
  const loaded = new TableValue();
  const searchers = new TableValue();
  searchers.set(NumberValue.from(1), ExtFunction.of(absoluteSearch));
  searchers.set(
    NumberValue.from(2),
    ExtFunction.WithInterpreter(relativeSearch)
  );
  searchers.set(NumberValue.from(3), ExtFunction.of(pathSearch));

  const packageLib = new TableValue();
  packageLib.set(StringValue.from('config'), StringValue.from('/\n;\n?\n!\n-'));
  packageLib.set(StringValue.from('cpath'), StringValue.from('.'));
  packageLib.set(StringValue.from('loaded'), loaded);
  packageLib.set(StringValue.from('path'), StringValue.from('/libs/;/;./'));
  packageLib.set(StringValue.from('preload'), new TableValue());
  packageLib.set(StringValue.from('searchers'), searchers);
  packageLib.set(
    StringValue.from('searchpath'),
    ExtFunction.of(notImplemented)
  );

  const packageStdLib = new TableValue();
  packageStdLib.set(StringValue.from('package'), packageLib);
  packageStdLib.set(
    StringValue.from('require'),
    ExtFunction.WithInterpreter(requireFn, 'require')
  );

  return packageStdLib;

  function requireFn(args: Value[]): Value[] {
    const rawModuleName = requestString(args);
    const interpreter = requestInterpreter(args);
    const ctx = requestContext(args);

    for (const key of searchers.getKeys()) {
      const searcher = searchers.get(key);
      if (
        !(searcher instanceof ExtFunction) &&
        !(searcher instanceof FunctionValue)
      ) {
        continue;
      }
      const result = interpreter.interpreter.exec_function(
        searcher,
        new InternalListValue([rawModuleName]),
        ctx.ctx
      );
      if (!(result instanceof InternalListValue)) {
        continue;
      }
      if (
        result.size() !== 2 &&
        getOrNil(result.asList(), 0) instanceof NilValue
      ) {
        continue;
      }
      let moduleLoader = result.get(1);
      const resolvedModuleName = result.get(2);
      if (moduleLoader instanceof NilValue) {
        moduleLoader = ExtFunction.WithInterpreter(loader, 'loader');
      }
      if (
        !(moduleLoader instanceof FunctionValue) &&
        !(moduleLoader instanceof ExtFunction)
      ) {
        continue;
      }
      if (!(resolvedModuleName instanceof StringValue)) {
        continue;
      }

      if (!loaded.hasKey(resolvedModuleName)) {
        const loaderResult = interpreter.interpreter.exec_function(
          moduleLoader,
          new InternalListValue([resolvedModuleName]),
          ctx.ctx
        );
        if (
          loaded.get(resolvedModuleName) instanceof NilValue &&
          loaderResult instanceof InternalListValue
        ) {
          loaded.set(resolvedModuleName, loaderResult.getValueOrNil(1));
        }
      }
      return [loaded.get(resolvedModuleName)];
    }
    throw new RequireError(
      `module not found: ${rawModuleName}`,
      new TraceFrame(
        ctx.ctx,
        interpreter.interpreter.getCurrentScopeName().string
      )
    );
  }

  function wrapSearcherResult(moduleName: string): Value[] {
    if (!fileExists(moduleName)) {
      return [new NilValue()];
    }
    return [
      ExtFunction.WithInterpreter(loader, 'loader'),
      StringValue.from(moduleName),
    ];
  }

  function absoluteSearch(args: Value[]): Value[] {
    const rawModuleName = requestString(args);

    if (!rawModuleName.string.startsWith('/')) {
      return [new NilValue()];
    }
    const moduleName = normalizeNameCallback('', rawModuleName.string);

    return wrapSearcherResult(moduleName);
  }

  function relativeSearch(args: Value[]): Value[] {
    const rawModuleName = requestString(args);
    const interpreter = requestInterpreter(args);

    if (!rawModuleName.string.startsWith('.')) {
      return [new NilValue()];
    }
    const currentPackageNameRaw = interpreter.interpreter.getGlobalVar(__name);
    const currentPackageName =
      currentPackageNameRaw instanceof StringValue
        ? currentPackageNameRaw.string
        : '/';
    const moduleName = normalizeNameCallback(
      currentPackageName,
      rawModuleName.string
    );

    return wrapSearcherResult(moduleName);
  }

  function pathSearch(args: Value[]): Value[] {
    const rawModuleName = requestString(args);

    if (
      rawModuleName.string.startsWith('/') ||
      rawModuleName.string.startsWith('.')
    ) {
      return [new NilValue()];
    }
    const packagePath = packageLib
      .get(StringValue.from('path'))
      .toString()
      .split(/;/);
    for (const path of packagePath) {
      const moduleName = normalizeNameCallback(path, rawModuleName.string);
      const result = wrapSearcherResult(moduleName);
      if (!(result[0] instanceof NilValue)) {
        return result;
      }
    }
    return [new NilValue()];
  }

  function loader(args: Value[]): Value[] {
    const moduleName = requestString(args);
    const interpreter = requestInterpreter(args);
    const ctx = requestContext(args);
    let lua: string;
    let module = new NilValue();
    loaded.set(moduleName, module);
    try {
      lua = loadFile(moduleName.string);
    } catch (e) {
      const error = new RequireError(
        `Unable to load module source: ${moduleName}`,
        new TraceFrame(
          ctx.ctx,
          interpreter.interpreter.getCurrentScopeName().string
        )
      );
      error.cause = e;
      throw error;
    }
    try {
      module = interpreter.interpreter.rootScoped(moduleName, () =>
        executeWithInterpreter(lua, interpreter.interpreter, false)
      );
    } catch (e) {
      const error = new RequireError(
        `Unable to execute module: ${moduleName}`,
        new TraceFrame(
          ctx.ctx,
          interpreter.interpreter.getCurrentScopeName().string
        )
      );
      error.cause = e;
      throw error;
    }
    if (module instanceof InternalListValue) {
      loaded.set(moduleName, module.getValueOrNil(1));
    }
    return [module];
  }
}

function notImplemented(): Value[] {
  throw new ExtFunctionError('not implemented');
}
