import LuaInterpreter from '@src/interpreter/LuaInterpreter';

import { NumberValue, StringValue, Value } from '@src/interpreter/types';
import { make_parser } from '@src/interpreter/utils';
import { initializeMethaMethodsForBasicTypes } from '@src/interpreter/metamethods';

const interpreter = new LuaInterpreter();
initializeMethaMethodsForBasicTypes();

function parseAs<T extends Value>(
  luaCode: string,
  expectedClass: new (...args: any[]) => T
): T {
  const parser = make_parser(luaCode);
  const node = parser.exp();
  const result = node.accept(interpreter);

  expect(result).toBeInstanceOf(expectedClass);
  return result as T;
}

describe('numbers', () => {
  const parse = (luaCode: string) => parseAs(luaCode, NumberValue);

  test('42', () => {
    expect(parse('42').number).toBe(42);
  });

  test('-42', () => {
    expect(parse('-42').number).toBe(-42);
  });

  test('42+10', () => {
    expect(parse('42+10').number).toBe(52);
  });

  test('42-10', () => {
    expect(parse('42-10').number).toBe(32);
  });

  test('10-32', () => {
    expect(parse('10 - 42').number).toBe(-32);
  });

  test('42*10', () => {
    expect(parse('42 * 10').number).toBe(420);
  });

  test('42/10', () => {
    expect(parse('42 / 10').number).toBe(4.2);
  });

  test('420/10', () => {
    expect(parse('420/10').number).toBe(42);
  });

  test('2*2+2', () => {
    expect(parse('2*2+2').number).toBe(6);
  });

  test('2+2*2', () => {
    expect(parse('2+2*2').number).toBe(6);
  });

  test('(2+2)*2', () => {
    expect(parse('(2+2)*2').number).toBe(8);
  });
});

describe('strings', () => {
  const parse = (luaCode: string) => parseAs(luaCode, StringValue);

  test('"abcdef"', () => {
    expect(parse('"abcdef"').string).toBe('abcdef');
  });

  test('"abc\\z  \n  \ndef"', () => {
    expect(parse('"abc\\z  \n  \ndef"').string).toBe('abcdef');
  });
});
