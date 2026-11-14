import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUserId, Public } from '../auth/session.guard';
import { UploadsService, type UploadedImage } from './uploads.service';

// Files stay in memory and are capped before the service validates their real type.
const upload = FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const throttle = Throttle({ default: { limit: 20, ttl: 60000 } });

@ApiTags('Imagens')
@Controller()
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploads: UploadsService) {}
  @Put('users/me/avatar')
  @ApiConsumes('multipart/form-data')
  @throttle
  @UseInterceptors(upload)
  avatar(@CurrentUserId() userId: string, @UploadedFile() file: UploadedImage) {
    return this.uploads.setProfileImage(userId, 'avatar', file);
  }
  @Delete('users/me/avatar') clearAvatar(@CurrentUserId() userId: string) {
    return this.uploads.clearProfileImage(userId, 'avatar');
  }
  @Put('users/me/banner')
  @ApiConsumes('multipart/form-data')
  @throttle
  @UseInterceptors(upload)
  banner(@CurrentUserId() userId: string, @UploadedFile() file: UploadedImage) {
    return this.uploads.setProfileImage(userId, 'banner', file);
  }
  @Delete('users/me/banner') clearBanner(@CurrentUserId() userId: string) {
    return this.uploads.clearProfileImage(userId, 'banner');
  }
  @Put('collections/:id/cover')
  @ApiConsumes('multipart/form-data')
  @throttle
  @UseInterceptors(upload)
  cover(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.uploads.setCollectionCover(userId, id, file);
  }
  @Delete('collections/:id/cover') clearCover(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.uploads.clearCollectionCover(userId, id);
  }
  @Public()
  @Get('media/:id')
  async media(@Param('id') id: string, @Res() response: Response) {
    await this.uploads.serve(id, response);
  }
}
