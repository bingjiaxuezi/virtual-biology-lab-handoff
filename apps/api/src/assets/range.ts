/**
 * RFC 7233 单区间 Range 解析（仅 bytes 单位）。
 * 返回 {start,end} 合法闭区间；'unsatisfiable' 表示语法合法但越界（→ 416）；
 * null 表示无法解析或多区间，调用方应忽略 Range 头返回 200 全量。
 */
export type ParsedRange = { start: number; end: number } | 'unsatisfiable' | null;

export function parseBytesRange(header: string | undefined, size: number): ParsedRange {
  if (!header || !header.startsWith('bytes=')) return null;
  const spec = header.slice('bytes='.length).trim();
  if (spec.includes(',')) return null; // 多区间不支持，回退 200

  const match = /^(\d*)-(\d*)$/.exec(spec);
  if (!match) return null;
  const [, first, last] = match;

  let start: number;
  let end: number;
  if (first === '' && last === '') return null;
  if (first === '') {
    // 尾区间：-N 表示最后 N 字节；N=0 语法非法，忽略
    const suffix = Number(last);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(first);
    if (!Number.isSafeInteger(start)) return null;
    if (last === '') {
      end = size - 1;
    } else {
      end = Number(last);
      if (!Number.isSafeInteger(end) || end < start) return null;
      end = Math.min(end, size - 1);
    }
  }

  if (size <= 0 || start >= size) return 'unsatisfiable';
  return { start, end };
}
