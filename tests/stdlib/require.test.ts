import {
  expectToBeNil,
  expectToBeNumber,
  expectToBeString,
} from '../interpreter/test_utils';
import { StringValue, TableValue } from '@src/interpreter/types';
import { VMBuilder } from '@src/vm';

describe('require', () => {
  test('required package can return a value', () => {
    const lua = `
      result = require('b')
    `;
    const luaPackageB = `
      return 42
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeNumber(result.globalVar('result'), 42);
  });

  test('required package can add new symbols to global environment', () => {
    const lua = `
      require('b')
    `;
    const luaPackageB = `
      value = "42"
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeString(result.globalVar('value'), '42');
  });

  test('required package does not pollute global environment with local variables', () => {
    const lua = `
      require('b')
    `;
    const luaPackageB = `
      local value = "42"
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeNil(result.globalVar('value'));
  });

  test('required package can modify global variables', () => {
    const lua = `
      value = 93
      require('b')
    `;
    const luaPackageB = `
      value = "42"
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeString(result.globalVar('value'), '42');
  });

  test('required package has access to parent declared global variables', () => {
    const lua = `
      parent = 93
      require('b')
    `;
    const luaPackageB = `
      value = parent or '42'
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeNumber(result.globalVar('value'), 93);
  });
  test('required package does not inherit parent local variables', () => {
    const lua = `
      local parent = 93
      require('b')
    `;
    const luaPackageB = `
      value = parent or '42'
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeString(result.globalVar('value'), '42');
  });
  test('required package is run only once', () => {
    const lua = `
      calls = 0
      require('b')
      require('b')
      require('b')
      require('b')
    `;
    const luaPackageB = `
      calls = calls + 1
    `;

    const result = new VMBuilder()
      .withRequire(() => luaPackageB)
      .build()
      .executeOnce(lua);

    expectToBeNumber(result.globalVar('calls'), 1);
  });
  test('requires package from required package', () => {
    const lua = `
      require('/b')
    `;
    const luaPackageB = `
      require('/c')
    `;
    const luaPackageC = `
      return "xyz";
    `;

    const packageContentLoader = jest
      .fn()
      .mockImplementation(
        (p: string) => ({ '/b': luaPackageB, '/c': luaPackageC })[p]
      );

    const result = new VMBuilder()
      .withRequire(packageContentLoader)
      .build()
      .executeOnce(lua);
    const loaded = (result.globalVar('package') as TableValue).get(
      StringValue.from('loaded')
    ) as TableValue;

    expect(packageContentLoader).nthCalledWith(1, '/b');
    expect(packageContentLoader).nthCalledWith(2, '/c');
    expect(loaded.hasKey(StringValue.from('/b'))).toBe(true);
    expectToBeNil(loaded.get(StringValue.from('/b')));
    expect(loaded.hasKey(StringValue.from('/c'))).toBe(true);
    expectToBeString(loaded.get(StringValue.from('/c')), 'xyz');
  });
});
