import { Controller, Get, Inject, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  /** 学生可见的已发布实验目录：只含标题与最新版本信息，绝不包含草稿内容。 */
  @Get()
  list() {
    return this.catalog.listPublished();
  }

  /** 按版本 id 读取已发布 Definition 快照（学生渲染用，只读）。 */
  @Get('versions/:versionId')
  getVersion(@Param('versionId') versionId: string) {
    return this.catalog.getPublishedVersion(versionId);
  }
}
