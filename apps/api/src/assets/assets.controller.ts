import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AssetsService, type UploadedFilePayload } from './assets.service.js';

/** passthrough 模式下只需 setHeader（避免仅为类型引入 @types/express）。 */
interface ContentResponse {
  setHeader(name: string, value: string): void;
}

/** 资源只做逻辑登记：assetId/类型/元数据，绝不包含供应商 URL。 */
const registerAssetSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'MODEL', 'TEXT', 'DATASET']),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** 上传大小上限：50MB。 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Controller('assets')
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assets: AssetsService) {}

  @Post()
  register(
    @Body(new ZodValidationPipe(registerAssetSchema)) body: z.infer<typeof registerAssetSchema>,
  ) {
    return this.assets.register(body);
  }

  /** 教师上传实体文件（全局守卫默认要求 JWT）。 */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Body() body: { type?: string; name?: string },
  ) {
    if (!file || !body.type) {
      throw new BadRequestException({ code: 'ASSET_UPLOAD_INCOMPLETE' });
    }
    return this.assets.upload({ type: body.type, name: body.name, file });
  }

  /** 公开内容分发：学生端按 assetId 拉取媒体流。声明在 :assetId 之前避免路由歧义。 */
  @Public()
  @Get(':assetId/content')
  async content(
    @Param('assetId') assetId: string,
    @Res({ passthrough: true }) res: ContentResponse,
  ) {
    const content = await this.assets.getContent(assetId);
    if (!content) {
      throw new NotFoundException({ code: 'ASSET_CONTENT_MISSING', assetId });
    }
    res.setHeader('Content-Type', content.mimeType);
    if (content.sizeBytes != null) res.setHeader('Content-Length', String(content.sizeBytes));
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return new StreamableFile(content.data);
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
