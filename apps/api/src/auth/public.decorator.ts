import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 学生端公开端点标注：全局 AuthGuard 对标记了 @Public() 的路由放行。 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
