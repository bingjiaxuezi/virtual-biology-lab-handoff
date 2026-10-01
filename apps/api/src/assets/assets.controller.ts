import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { AssetsService } from './assets.service.js';

/** 资源只做逻辑登记：assetId/类型/元数据，绝不包含供应商 URL。 */
const registerAssetSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'MODEL', 'TEXT', 'DATASET']),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  register(
    @Body(new ZodValidationPipe(registerAssetSchema)) body: z.infer<typeof registerAssetSchema>,
  ) {
    return this.assets.register(body);
  }

  @Get()
  list() {
    return this.assets.list();
  }

  @Get(':assetId')
  getByAssetId(@Param('assetId') assetId: string) {
    return this.assets.getByAssetId(assetId);
  }
}
