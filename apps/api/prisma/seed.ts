/**
 * 幂等种子：初始教师账号 + 样板实验（含发布版本与 Asset 注册）。
 * 可反复执行：已存在的数据一律跳过，不做任何修改。
 * 运行：pnpm prisma db seed（或由 db:setup 串联调用）。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SAMPLE_PATH = path.join(REPO_ROOT, 'examples/enzyme-temperature.v0.1.json');

const prisma = new PrismaClient();

async function seedTeacher() {
  const username = process.env.SEED_TEACHER_USERNAME ?? 'teacher_dev';
  const password = process.env.SEED_TEACHER_PASSWORD ?? 'dev-password-123';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`[seed] 教师账号 ${username} 已存在，跳过`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.create({ data: { username, passwordHash } });
  console.log(`[seed] 已创建教师账号 ${username}`);
}

async function seedSampleExperiment() {
  const raw = await readFile(SAMPLE_PATH, 'utf-8');
  const definition = experimentDefinitionSchema.parse(JSON.parse(raw));
  const { issues } = validateExperiment(definition);
  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw new Error(
      `样板实验未通过校验：${errors.map((issue) => `[${issue.code}] ${issue.path}`).join(', ')}`,
    );
  }

  // 以 definition.id 作为判重锚点（draft JSONB 的 id 字段）
  const existing = await prisma.experiment.findFirst({
    where: { draft: { path: ['id'], equals: definition.id } },
    include: { versions: { select: { version: true } } },
  });

  let experimentId: string;
  if (existing) {
    console.log(`[seed] 样板实验 ${definition.id} 已存在，跳过创建`);
    experimentId = existing.id;
  } else {
    const created = await prisma.experiment.create({
      data: { title: definition.metadata.title, draft: definition },
    });
    await prisma.experimentVersion.create({
      data: { experimentId: created.id, version: definition.version, definition },
    });
    experimentId = created.id;
    console.log(`[seed] 已创建样板实验「${definition.metadata.title}」并发布版本 ${definition.version}`);
  }

  // 样板实验引用的 Asset 一并注册（幂等 upsert）
  for (const asset of definition.assets) {
    await prisma.asset.upsert({
      where: { assetId: asset.assetId },
      update: {},
      create: { assetId: asset.assetId, type: asset.type, name: asset.name },
    });
  }
  console.log(`[seed] 已确认 ${definition.assets.length} 个 Asset 注册（experiment ${experimentId}）`);
}

try {
  await seedTeacher();
  await seedSampleExperiment();
} finally {
  await prisma.$disconnect();
}
