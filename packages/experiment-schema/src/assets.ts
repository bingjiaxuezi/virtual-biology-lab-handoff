import { z } from 'zod';

export const mediaTypeSchema = z.enum(['VIDEO', 'IMAGE', 'TEXT']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

const providerUrlPattern = /^https?:\/\//i;

/**
 * Asset 只保存逻辑引用（assetId），禁止出现任何供应商 URL（S3/OSS/CDN）。
 */
export const assetReferenceSchema = z
  .object({
    id: z.string().min(1),
    assetId: z.string().min(1),
    type: mediaTypeSchema,
    name: z.string().optional(),
  })
  .check((ctx) => {
    const value = ctx.value;
    for (const [key, fieldValue] of Object.entries(value)) {
      if (typeof fieldValue === 'string' && providerUrlPattern.test(fieldValue)) {
        ctx.issues.push({
          code: 'custom',
          input: fieldValue,
          path: [key],
          message: `Asset field "${key}" must not contain a provider URL; reference assetId only`,
        });
      }
    }
  });

export type AssetReference = z.infer<typeof assetReferenceSchema>;
