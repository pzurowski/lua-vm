import { ExtFunctionError } from '@src/interpreter/errors';
import ExtFunction from '@src/interpreter/ExtFunction';
import {
  InternalListValue,
  InterpreterValue,
  NilValue,
  StringValue,
  TableValue,
  Value,
} from '@src/interpreter/types';
import { executeWithInterpreter, getOrNil } from '@src/interpreter/utils';

export type PackageLoaderProvider = (packageName: string) => string;

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
  providePackageCallback: PackageLoaderProvider,
  normalizeNameCallback: PackageNameNormalize = defaultPackageNameNormalization
) {
  const loaded = new TableValue();

  const packageLib = new TableValue();
  packageLib.set(StringValue.from('config'), StringValue.from('/\n;\n?\n!\n-'));
  packageLib.set(StringValue.from('cpath'), StringValue.from('.'));
  packageLib.set(StringValue.from('loaded'), loaded);
  packageLib.set(StringValue.from('path'), StringValue.from('.'));
  packageLib.set(StringValue.from('preload'), new TableValue());
  packageLib.set(StringValue.from('searchers'), new TableValue());
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
    const rawModuleName = getOrNil(args, 0);
    const interpreter = getOrNil(args, 1);
    if (!(rawModuleName instanceof StringValue)) {
      throw new ExtFunctionError('parameter is not string');
    }
    if (!(interpreter instanceof InterpreterValue)) {
      throw new ExtFunctionError('something went wrong');
    }

    const currentPackageNameRaw = interpreter.interpreter.getGlobalVar(
      StringValue.from('__name')
    );
    const currentPackageName =
      currentPackageNameRaw instanceof StringValue
        ? currentPackageNameRaw
        : StringValue.from('/');
    const moduleName = StringValue.from(
      normalizeNameCallback(currentPackageName.string, rawModuleName.string)
    );
    if (loaded.hasKey(moduleName)) {
      return [loaded.get(moduleName)];
    }
    let lua: string;
    let module = new NilValue();
    loaded.set(moduleName, module);
    try {
      lua = providePackageCallback(moduleName.string);
    } catch (e) {
      const error = new ExtFunctionError(
        `Unable to load module source: ${moduleName}`,
        '9000'
      );
      error.cause = e;
      throw error;
    }
    try {
      module = interpreter.interpreter.rootScoped(moduleName, () =>
        executeWithInterpreter(lua, interpreter.interpreter, false)
      );
    } catch (e) {
      const error = new ExtFunctionError(
        `Unable to execute module: ${moduleName}`,
        '9001'
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
