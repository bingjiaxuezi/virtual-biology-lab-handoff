import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** 用 Zod schema 校验请求体，失败返回 400 + 完整 issues。 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Request validation failed',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
