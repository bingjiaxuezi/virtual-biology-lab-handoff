/**
 * 建库引导：DATABASE_URL 指向的目标库不存在时自动创建。
 * 复用 @prisma/client（datasourceUrl 指向维护库 postgres），不新增依赖。
 * CREATE DATABASE 不支持参数化，因此库名先做白名单校验。
 */
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 未设置');
  process.exit(1);
}

const url = new URL(databaseUrl);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(dbName)) {
  console.error(`非法数据库名 "${dbName}"（仅允许字母/数字/下划线，且不以数字开头）`);
  process.exit(1);
}

const adminUrl = new URL(url);
adminUrl.pathname = '/postgres';

const prisma = new PrismaClient({ datasourceUrl: adminUrl.toString() });
try {
  const rows = await prisma.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (rows.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`[ensure-database] 已创建数据库 ${dbName}`);
  } else {
    console.log(`[ensure-database] 数据库 ${dbName} 已存在，跳过`);
  }
} finally {
  await prisma.$disconnect();
}
