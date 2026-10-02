import { Module } from '@nestjs/common';
import { resolveStorageProvider } from '../storage/resolve-storage.js';
import { STORAGE_PROVIDER } from '../storage/storage-provider.js';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';

@Module({
  controllers: [AssetsController],
  providers: [
    AssetsService,
    { provide: STORAGE_PROVIDER, useFactory: () => resolveStorageProvider() },
  ],
})
export class AssetsModule {}
