import { VMBuilder } from '@src/vm';
import { expectToBeNumber } from '@tests/interpreter/test_utils';

test('math', () => {
  const lua = `
    abs1 = math.abs(-10)
    abs2 = math.abs(20)
    ceil = math.ceil(4/3)
    floor = math.floor(4/3)
    max = math.max(5,3,1,2,4)
    min = math.min(5,3,1,2,4)
    sqrt = math.sqrt(25)
    acos = math.acos(0.5)
    atan2 = math.atan2(1, 2)
    cos = math.cos(math.pi)
    huge = math.huge
    log = math.log(10)
    pi = math.pi
    rad = math.rad(180)
    sin = math.sin(math.pi / 2)
    random = math.random()
    random1 = math.random(1)
    random2 = math.random(10, 20)
    `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('abs1'), 10);
  expectToBeNumber(result.globalVar('abs2'), 20);
  expectToBeNumber(result.globalVar('ceil'), 2);
  expectToBeNumber(result.globalVar('floor'), 1);
  expectToBeNumber(result.globalVar('max'), 5);
  expectToBeNumber(result.globalVar('min'), 1);
  expectToBeNumber(result.globalVar('sqrt'), 5);

  expectToBeNumber(result.globalVar('acos'), Math.acos(0.5));
  expectToBeNumber(result.globalVar('atan2'), Math.atan2(1, 2));
  expectToBeNumber(result.globalVar('cos'), Math.cos(Math.PI));
  expectToBeNumber(result.globalVar('huge'), Infinity);
  expectToBeNumber(result.globalVar('log'), Math.log(10));
  expectToBeNumber(result.globalVar('pi'), Math.PI);
  expectToBeNumber(result.globalVar('rad'), (180 * Math.PI) / 180);
  expectToBeNumber(result.globalVar('sin'), Math.sin(Math.PI / 2));

  const rnd = (result.globalVar('random') as any).number;
  expect(rnd).toBeGreaterThanOrEqual(0);
  expect(rnd).toBeLessThan(1);

  expectToBeNumber(result.globalVar('random1'), 1); // math.random(1) should be 1
  const rnd2 = (result.globalVar('random2') as any).number;
  expect(rnd2).toBeGreaterThanOrEqual(10);
  expect(rnd2).toBeLessThanOrEqual(20);
  expect(rnd2 % 1).toBe(0);
});
