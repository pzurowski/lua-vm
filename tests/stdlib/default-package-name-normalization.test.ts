import { defaultPackageNameNormalization } from '@src/stdlib/package';

describe('defaultPackageNameNormalization', () => {
  it('should replace the first part entirely if the second part starts with a slash', () => {
    expect(
      defaultPackageNameNormalization('/old/path/module', '/new/module')
    ).toBe('/new/module');
  });

  it('should remove the last segment of the first part when joining a relative second part', () => {
    expect(defaultPackageNameNormalization('/a/b/c', 'd')).toBe('/a/b/d');
  });

  it('should handle ".." by moving up from the parent directory of the first part', () => {
    expect(defaultPackageNameNormalization('/a/b/c', '../d')).toBe('/a/d');
  });

  it('should handle "./" segments correctly', () => {
    expect(defaultPackageNameNormalization('/a/b/c', './d')).toBe('/a/b/d');
  });

  it('should handle multiple consecutive ".." segments', () => {
    expect(defaultPackageNameNormalization('/a/b/c/d', '../../e')).toBe('/a/e');
  });

  it('should not go above the root directory', () => {
    expect(defaultPackageNameNormalization('/a/b', '../../../../c')).toBe('/c');
  });

  it('should always return a path starting with a slash', () => {
    expect(defaultPackageNameNormalization('init', 'main')).toBe('/main'); // 'init' is current module, removed, 'main' added
  });

  it('should return exactly "/" when the resulting path is empty', () => {
    expect(defaultPackageNameNormalization('/a', '..')).toBe('/');
  });

  it('should handle multiple slashes by ignoring empty segments', () => {
    expect(defaultPackageNameNormalization('/a/b', 'c///d')).toBe('/a/c/d');
  });
});
