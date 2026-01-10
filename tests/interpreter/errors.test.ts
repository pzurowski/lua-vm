import { VMBuilder } from '@src/vm';
import { expectToThrowVMError } from './test_utils';

test('concrete error place', () => {
  const lua = `
    a = 2 + 4;
    break;
    `;

  const vm = new VMBuilder().build();
  expectToThrowVMError(() => {
    vm.executeOnce(lua);
  }).toMatch(/Lua: Break called outside of a loop at .*?:3:4/);
});

test('concrete error place in depth tree', () => {
  const lua = `
      require('/b')
    `;
  const luaPackageB = `
      b = 1 + 8;
      c = 3 * 7;   
      require('/c')
    `;
  const luaPackageC = `
      a = 2 + 4;
      break;
    `;

  const vm = new VMBuilder()
    .withRequire(
      (p: string) => ({ '/b': luaPackageB, '/c': luaPackageC })[p] ?? '',
      () => true
    )
    .build();

  expectToThrowVMError(() => {
    vm.executeOnce(lua);
  }).toMatch(
    /Require:.*? \/b at .*?:2:6\n\s*Require:.*? \/c at \/b:4:6\n\s*Lua:.*? at \/c:3:6/
  );
});
