import { VMBuilder } from '@src/vm';
import {
  expectToBeNil,
  expectToBeNumber,
  expectToBeString,
} from '@tests/interpreter/test_utils';

test('find', () => {
  const lua = `
    s = "hello world str hellllo again"
    a1, a2, a3 = string.find(s, "hel+o")
    b1, b2, b3 = string.find(s, "hel+o", 2)
    c1, c2, c3 = string.find(s, "hel+o", 1)
    d1, d2, d3 = string.find(s, "lo", 0, true)
    e1, e2, e3 = string.find(s, "lo", 5, true)
    f1, f2, f3 = string.find(s, "Hel+o", 5, false, "i")
    g1, g2, g3 = string.find(s, "xyz")
    return b
    `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('a1'), 1);
  expectToBeNumber(result.globalVar('a2'), 5);
  expectToBeString(result.globalVar('a3'), 'hello');
  expectToBeNumber(result.globalVar('b1'), 17);
  expectToBeNumber(result.globalVar('b2'), 23);
  expectToBeString(result.globalVar('b3'), 'hellllo');
  expectToBeNumber(result.globalVar('c1'), 1);
  expectToBeNumber(result.globalVar('c2'), 5);
  expectToBeString(result.globalVar('c3'), 'hello');
  expectToBeNumber(result.globalVar('d1'), 4);
  expectToBeNumber(result.globalVar('d2'), 5);
  expectToBeString(result.globalVar('d3'), 'lo');
  expectToBeNumber(result.globalVar('e1'), 22);
  expectToBeNumber(result.globalVar('e2'), 23);
  expectToBeString(result.globalVar('e3'), 'lo');
  expectToBeNumber(result.globalVar('f1'), 17);
  expectToBeNumber(result.globalVar('f2'), 23);
  expectToBeString(result.globalVar('f3'), 'hellllo');
  expectToBeNil(result.globalVar('g1'));
  expectToBeNil(result.globalVar('g2'));
  expectToBeNil(result.globalVar('g3'));
});

test('string function', () => {
  const lua = `
  len1 = string.len("")
  len2 = string.len("abc")
  low = string.lower("aBxY")
  up = string.upper("aBxY")
  rep1 = string.rep("ab", 2)
  rep2 = string.rep("ab", 3, ",")
  rev = string.reverse("xyz")
  sub1 = string.sub("1234567", 2)
  sub2 = string.sub("1234567", 2,4)
  sub3 = string.sub("1234567", 2,-2)
  sub4 = string.sub("1234567", -4,-2)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('len1'), 0);
  expectToBeNumber(result.globalVar('len2'), 3);
  expectToBeString(result.globalVar('low'), 'abxy');
  expectToBeString(result.globalVar('up'), 'ABXY');
  expectToBeString(result.globalVar('rep1'), 'abab');
  expectToBeString(result.globalVar('rep2'), 'ab,ab,ab');
  expectToBeString(result.globalVar('rev'), 'zyx');
  expectToBeString(result.globalVar('sub1'), '234567');
  expectToBeString(result.globalVar('sub2'), '234');
  expectToBeString(result.globalVar('sub3'), '23456');
  expectToBeString(result.globalVar('sub4'), '456');
});

test('string shorthand function', () => {
  const lua = `
  foo = "foo"
  foolen = foo:len()
  foorep = foo:rep(2)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('foolen'), 3);
  expectToBeString(result.globalVar('foorep'), 'foofoo');
});

test('gsub basic', () => {
  const lua = `
    res1, c1 = string.gsub("hello world", "hello", "hi")
    res2, c2 = string.gsub("banana", "a", "o", 2)
    res3, c3 = string.gsub("hello world", "l", "L")
    return res1, c1, res2, c2, res3, c3
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('res1'), 'hi world');
  expectToBeNumber(result.globalVar('c1'), 1);
  expectToBeString(result.globalVar('res2'), 'bonona');
  expectToBeNumber(result.globalVar('c2'), 2);
  expectToBeString(result.globalVar('res3'), 'heLLo worLd');
  expectToBeNumber(result.globalVar('c3'), 3);
});

test('gsub with captures', () => {
  const lua = `
    res, c = string.gsub("hello world", "([a-z]+)", "%%1=%1")
    return res, c
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('res'), '%1=hello %1=world');
  expectToBeNumber(result.globalVar('c'), 2);
});

test('gsub with captures simple', () => {
  const lua = `
    res, c = string.gsub("hello world", "([a-z]+)", "%1 %1")
    return res, c
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('res'), 'hello hello world world');
  expectToBeNumber(result.globalVar('c'), 2);
});

test('gsub with table', () => {
  const lua = `
    t = {h="H", e="E"}
    res, c = string.gsub("he", ".", t)
    return res, c
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('res'), 'HE');
  expectToBeNumber(result.globalVar('c'), 2);
});

test('gsub with function', () => {
  const lua = `
    res, c = string.gsub("hello", ".", function(s) return string.upper(s) end)
    return res, c
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('res'), 'HELLO');
  expectToBeNumber(result.globalVar('c'), 5);
});

test('string.format', () => {
  const lua = `
    f1 = string.format("%%")
    f2 = string.format("hello %s", "world")
    f3 = string.format("%d", 123)
    f4 = string.format("%02d", 7)
    f5 = string.format("%02i", 9)
    f6 = string.format("%.2f", 3.14159)
    f7 = string.format("%g", 123.456)
    f8 = string.format("mixed %s %d %.2f %%", "val", 42, 1.234)
    f9 = string.format("%03d", -7)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('f1'), '%');
  expectToBeString(result.globalVar('f2'), 'hello world');
  expectToBeString(result.globalVar('f3'), '123');
  expectToBeString(result.globalVar('f4'), '07');
  expectToBeString(result.globalVar('f5'), '09');
  expectToBeString(result.globalVar('f6'), '3.14');
  expectToBeString(result.globalVar('f7'), '123.456');
  expectToBeString(result.globalVar('f8'), 'mixed val 42 1.23 %');
  expectToBeString(result.globalVar('f9'), '-07');
});

test('string.byte', () => {
  const lua = `
    s = "ABCDE"
    b1 = string.byte(s)
    b2 = string.byte(s, 2)
    b3, b4, b5 = string.byte(s, 2, 4)
    b6 = string.byte(s, -1)
    b7 = string.byte(s, 10)
    b8 = string.byte(s, 2, 1)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('b1'), 65);
  expectToBeNumber(result.globalVar('b2'), 66);
  expectToBeNumber(result.globalVar('b3'), 66);
  expectToBeNumber(result.globalVar('b4'), 67);
  expectToBeNumber(result.globalVar('b5'), 68);
  expectToBeNumber(result.globalVar('b6'), 69);
  expectToBeNil(result.globalVar('b7'));
  expectToBeNil(result.globalVar('b8'));
});

test('string.char', () => {
  const lua = `
    c1 = string.char(65, 66, 67)
    c2 = string.char()
    c3 = string.char(10)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeString(result.globalVar('c1'), 'ABC');
  expectToBeString(result.globalVar('c2'), '');
  expectToBeString(result.globalVar('c3'), '\n');
});

test('string.byte with shorthand', () => {
  const lua = `
    s = "ABC"
    b1 = s:byte()
    b2 = s:byte(2)
  `;
  const vm = new VMBuilder().witStdLib().build();
  const result = vm.executeOnce(lua);
  expectToBeNumber(result.globalVar('b1'), 65);
  expectToBeNumber(result.globalVar('b2'), 66);
});
