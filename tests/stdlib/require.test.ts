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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(
        () => luaPackageB,
        () => true
      )
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
      .withRequire(packageContentLoader, () => true)
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

  test('module not found error', () => {
    const lua = `
      require('nonexistent')
    `;

    const vm = new VMBuilder()
      .withRequire(
        () => '',
        () => false
      )
      .build();

    expect(() => vm.executeOnce(lua)).toThrow(/module not found: nonexistent/);
  });

  test('module load error', () => {
    const lua = `
      require('/err')
    `;

    const vm = new VMBuilder()
      .withRequire(
        () => {
          throw new Error('Load failed');
        },
        () => true
      )
      .build();

    expect(() => vm.executeOnce(lua)).toThrow();
  });

  test('module syntax error', () => {
    const lua = `
      require('/syntax-err')
    `;

    const vm = new VMBuilder()
      .withRequire(
        () => 'invalid lua code {',
        () => true
      )
      .build();

    expect(() => vm.executeOnce(lua)).toThrow();
  });

  test('package.loaded contains loaded modules', () => {
    const lua = `
      require('/m1')
      res = package.loaded['/m1']
    `;

    const result = new VMBuilder()
      .withRequire(
        () => 'return "val1"',
        () => true
      )
      .build()
      .executeOnce(lua);

    expectToBeString(result.globalVar('res'), 'val1');
  });

  test('searchers can be customized', () => {
    const lua = `
      table.insert(package.searchers, 1, function(name)
        if name == 'custom' then
          return function() return 'custom-searcher-result' end, 'custom-resolved'
        end
      end)
      return require('custom')
    `;

    const result = new VMBuilder()
      .witStdLib()
      .withRequire(
        () => '',
        () => false
      )
      .build()
      .executeOnce(lua);

    expectToBeString(result.returnValueAsList()[0], 'custom-searcher-result');

    const loaded = (result.globalVar('package') as TableValue).get(
      StringValue.from('loaded')
    ) as TableValue;
    expectToBeString(
      loaded.get(StringValue.from('custom-resolved')),
      'custom-searcher-result'
    );
  });
});
