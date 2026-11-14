import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureBucket, imageType, s3, storageEnabled } from './storage';

export type UploadedImage = { buffer: Buffer; size: number } | undefined;
export type Purpose = 'avatar' | 'banner' | 'collection';
const limits: Record<Purpose, number> = {
  avatar: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
  collection: 5 * 1024 * 1024,
};
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export const mediaUrl = (id: string | null | undefined) => (id ? `/api/media/${id}` : null);

@Injectable()
export class UploadsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private async store(userId: string, purpose: Purpose, file: UploadedImage) {
    if (!storageEnabled)
      throw new ServiceUnavailableException(
        'O envio de imagens não está configurado nesta instância',
      );
    if (!file?.buffer?.length) throw new BadRequestException('Escolha uma imagem');
    if (file.size > limits[purpose])
      throw new PayloadTooLargeException(
        `A imagem deve ter até ${limits[purpose] / 1024 / 1024} MB`,
      );
    const contentType = imageType(file.buffer);
    if (!contentType) throw new UnsupportedMediaTypeException('Envie uma imagem JPEG, PNG ou WebP');
    const key = `${purpose}/${userId}/${randomBytes(16).toString('hex')}.${extensions[contentType]}`;
    try {
      await ensureBucket();
      const response = await s3('PUT', key, file.buffer, contentType);
      if (!response.ok) throw new Error(`Storage HTTP ${response.status}`);
    } catch {
      throw new ServiceUnavailableException('Não foi possível salvar a imagem. Tente novamente.');
    }
    return this.db.mediaAsset.create({
      data: { userId, key, purpose, contentType, size: file.size },
    });
  }

  /** Removes the stored object and its record; failures in storage do not block the user. */
  async remove(assetId: string | null | undefined) {
    if (!assetId) return;
    const asset = await this.db.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) return;
    if (storageEnabled) await s3('DELETE', asset.key).catch(() => undefined);
    await this.db.mediaAsset.delete({ where: { id: assetId } }).catch(() => undefined);
  }

  async setProfileImage(userId: string, purpose: 'avatar' | 'banner', file: UploadedImage) {
    const profile = await this.db.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    const asset = await this.store(userId, purpose, file);
    const field = purpose === 'avatar' ? 'avatarId' : 'bannerId';
    await this.db.profile.update({ where: { userId }, data: { [field]: asset.id } });
    await this.remove(profile[field]);
    return { url: mediaUrl(asset.id) };
  }

  async clearProfileImage(userId: string, purpose: 'avatar' | 'banner') {
    const profile = await this.db.profile.findUnique({ where: { userId } });
    const field = purpose === 'avatar' ? 'avatarId' : 'bannerId';
    await this.db.profile.update({ where: { userId }, data: { [field]: null } });
    await this.remove(profile?.[field]);
    return { url: null };
  }

  async setCollectionCover(userId: string, collectionId: string, file: UploadedImage) {
    const collection = await this.db.collection.findFirst({ where: { id: collectionId, userId } });
    if (!collection) throw new NotFoundException('Coleção não encontrada');
    const asset = await this.store(userId, 'collection', file);
    await this.db.collection.update({
      where: { id: collectionId },
      data: { coverId: asset.id, coverUrl: mediaUrl(asset.id) },
    });
    await this.remove(collection.coverId);
    return { url: mediaUrl(asset.id) };
  }

  async clearCollectionCover(userId: string, collectionId: string) {
    const collection = await this.db.collection.findFirst({ where: { id: collectionId, userId } });
    if (!collection) throw new NotFoundException('Coleção não encontrada');
    await this.db.collection.update({
      where: { id: collectionId },
      data: { coverId: null, coverUrl: null },
    });
    await this.remove(collection.coverId);
    return { url: null };
  }

  async serve(id: string, response: Response) {
    const asset = await this.db.mediaAsset.findUnique({ where: { id } });
    const stored = asset && storageEnabled ? await s3('GET', asset.key).catch(() => null) : null;
    if (!asset || !stored?.ok) throw new NotFoundException('Imagem não encontrada');
    response.setHeader('Content-Type', asset.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'");
    response.send(Buffer.from(await stored.arrayBuffer()));
  }
}
