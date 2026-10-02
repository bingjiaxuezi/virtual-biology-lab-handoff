/**
 * 批量素材导入：扫描目录中的媒体文件，经教师认证后调用 POST /api/assets/upload 逐个入库，
 * 输出 `文件名 → assetId` 映射 JSON（供实验定义编写引用）。
 *
 * 用法：
 *   node --import tsx scripts/import-assets.ts --dir <目录> [--out <映射JSON路径>]
 *   [--api http://localhost:3000] [--user teacher_dev] [--password dev-password-123]
 *
 * 单个文件失败不中断，结束后打印汇总；有失败时退出码为 1。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface ImportResult {
  file: string;
  ok: boolean;
  assetId?: string;
  type?: string;
  error?: string;
}

const TYPE_BY_EXT: Record<string, 'IMAGE' | 'VIDEO' | 'TEXT'> = {
  '.png': 'IMAGE',
  '.jpg': 'IMAGE',
  '.jpeg': 'IMAGE',
  '.webp': 'IMAGE',
  '.gif': 'IMAGE',
  '.mp4': 'VIDEO',
  '.webm': 'VIDEO',
  '.txt': 'TEXT',
  '.md': 'TEXT',
};

/** multipart 需显式 MIME，否则按 application/octet-stream 被服务端白名单拒绝。 */
const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i]?.startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] ?? '';
  }
  return args;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const dir = args.dir;
  if (!dir) {
    console.error('缺少 --dir <素材目录>');
    return 2;
  }
  const api = (args.api ?? 'http://localhost:3000').replace(/\/$/, '');
  const username = args.user ?? 'teacher_dev';
  const password = args.password ?? 'dev-password-123';
  const outPath = args.out ?? path.join(dir, '..', 'asset-map.json');

  const loginRes = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!loginRes.ok) {
    console.error(`教师登录失败：HTTP ${loginRes.status}`);
    return 2;
  }
  const { token } = (await loginRes.json()) as { token: string };

  const skip = new Set(
    (args.skip ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const files = (await readdir(dir))
    .filter((f) => TYPE_BY_EXT[path.extname(f).toLowerCase()] && !skip.has(f))
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));
  console.log(`发现 ${files.length} 个媒体文件，开始上传…`);

  const results: ImportResult[] = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const type = TYPE_BY_EXT[ext];
    const buffer = await readFile(path.join(dir, file));
    const form = new FormData();
    form.append('type', type);
    form.append('name', path.basename(file, ext));
    form.append('file', new Blob([buffer], { type: MIME_BY_EXT[ext] }), file);
    try {
      const res = await fetch(`${api}/api/assets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const record = (await res.json()) as { assetId: string };
      results.push({ file, ok: true, assetId: record.assetId, type });
      console.log(`OK  ${file} -> ${record.assetId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ file, ok: false, error: message });
      console.error(`FAIL ${file}: ${message}`);
    }
  }

  const mapping = Object.fromEntries(
    results.filter((r) => r.ok).map((r) => [r.file, { assetId: r.assetId, type: r.type }]),
  );
  await writeFile(outPath, `${JSON.stringify(mapping, null, 2)}\n`, 'utf8');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n完成：成功 ${results.length - failed.length}，失败 ${failed.length}，映射已写入 ${outPath}`);
  for (const f of failed) console.error(`  失败：${f.file} — ${f.error}`);
  return failed.length > 0 ? 1 : 0;
}

process.exitCode = await main();
