import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CollectionDetail,
  CollectionInput,
  CollectionItemPatch,
  CollectionPatch,
  CollectionSummary,
  CollectionVisibility,
} from '@jinsei/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { entryInclude, entryResult } from '../library/library.service';
import { UploadsService } from '../uploads/uploads.service';

const MAX_COLLECTIONS = 200;
const MAX_ITEMS = 500;
const summaryInclude = {
  _count: { select: { items: true } },
  items: {
    orderBy: { position: 'asc' },
    take: 4,
    select: { entry: { select: { media: { select: { coverUrl: true } } } } },
  },
} satisfies Prisma.CollectionInclude;
type SummaryRow = Prisma.CollectionGetPayload<{ include: typeof summaryInclude }>;

export function slugify(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'colecao';
}

export function summaryResult(row: SummaryRow): CollectionSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility as CollectionVisibility,
    ranked: row.ranked,
    coverUrl: row.coverUrl,
    itemCount: row._count.items,
    covers: row.items.flatMap((item) =>
      item.entry.media.coverUrl ? [item.entry.media.coverUrl] : [],
    ),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class CollectionsService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(UploadsService) private readonly uploads: UploadsService,
  ) {}

  private async owned(userId: string, id: string) {
    const collection = await this.db.collection.findFirst({ where: { id, userId } });
    if (!collection) throw new NotFoundException('Coleção não encontrada');
    return collection;
  }
  /** Slugs are unique per person; a numeric suffix resolves repeated names. */
  private async freeSlug(userId: string, name: string, ignoreId?: string) {
    const base = slugify(name);
    const taken = new Set(
      (
        await this.db.collection.findMany({
          where: {
            userId,
            slug: { startsWith: base },
            ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
          },
          select: { slug: true },
        })
      ).map((row) => row.slug),
    );
    if (!taken.has(base)) return base;
    let index = 2;
    while (taken.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  async list(userId: string, entryId?: string) {
    const rows = await this.db.collection.findMany({
      where: { userId },
      include: summaryInclude,
      orderBy: { updatedAt: 'desc' },
    });
    const containing = entryId
      ? new Set(
          (
            await this.db.collectionItem.findMany({
              where: { entryId, collection: { userId } },
              select: { collectionId: true },
            })
          ).map((item) => item.collectionId),
        )
      : null;
    return {
      collections: rows.map((row) => ({
        ...summaryResult(row),
        ...(containing ? { contains: containing.has(row.id) } : {}),
      })),
    };
  }

  async get(userId: string, id: string): Promise<CollectionDetail> {
    const row = await this.db.collection.findFirst({
      where: { id, userId },
      include: {
        ...summaryInclude,
        items: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          include: { entry: { include: entryInclude } },
        },
      },
    });
    if (!row) throw new NotFoundException('Coleção não encontrada');
    return {
      ...summaryResult({
        ...row,
        items: row.items.slice(0, 4).map((item) => ({
          entry: { media: { coverUrl: item.entry.media.coverUrl } },
        })),
      }),
      items: row.items.map((item) => ({
        position: item.position,
        note: item.note,
        entry: entryResult(item.entry),
      })),
    };
  }

  async create(userId: string, input: CollectionInput) {
    if ((await this.db.collection.count({ where: { userId } })) >= MAX_COLLECTIONS)
      throw new BadRequestException(`Você pode criar até ${MAX_COLLECTIONS} coleções`);
    const row = await this.db.collection.create({
      data: { ...input, userId, slug: await this.freeSlug(userId, input.name) },
    });
    await this.db.activityLog.create({
      data: { userId, action: 'collection.created', changes: { collectionId: row.id } },
    });
    return this.get(userId, row.id);
  }

  async update(userId: string, id: string, input: CollectionPatch) {
    const existing = await this.owned(userId, id);
    // Replacing the cover with a URL releases a previously uploaded image.
    const releaseCover =
      input.coverUrl !== undefined && existing.coverId && input.coverUrl !== existing.coverUrl;
    await this.db.collection.update({
      where: { id },
      data: {
        ...input,
        ...(releaseCover ? { coverId: null } : {}),
        ...(input.name && input.name !== existing.name
          ? { slug: await this.freeSlug(userId, input.name, id) }
          : {}),
      },
    });
    if (releaseCover) await this.uploads.remove(existing.coverId);
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const existing = await this.owned(userId, id);
    await this.db.collection.delete({ where: { id } });
    await this.uploads.remove(existing.coverId);
    return { deleted: true };
  }

  async addItem(userId: string, id: string, entryId: string, note: string) {
    await this.owned(userId, id);
    // Only entries of the same person can be collected.
    if (!(await this.db.userMediaEntry.findFirst({ where: { id: entryId, userId } })))
      throw new NotFoundException('Título não encontrado na sua biblioteca');
    const stats = await this.db.collectionItem.aggregate({
      where: { collectionId: id },
      _count: true,
      _max: { position: true },
    });
    if (stats._count >= MAX_ITEMS)
      throw new BadRequestException(`Uma coleção aceita até ${MAX_ITEMS} títulos`);
    try {
      await this.db.$transaction([
        this.db.collectionItem.create({
          data: { collectionId: id, entryId, note, position: (stats._max.position ?? 0) + 1 },
        }),
        this.db.collection.update({ where: { id }, data: { updatedAt: new Date() } }),
        this.db.activityLog.create({
          data: { userId, entryId, action: 'collection.item_added', changes: { collectionId: id } },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Esse título já está na coleção');
      throw error;
    }
    return this.get(userId, id);
  }

  async updateItem(userId: string, id: string, entryId: string, input: CollectionItemPatch) {
    await this.owned(userId, id);
    const updated = await this.db.collectionItem.updateMany({
      where: { collectionId: id, entryId },
      data: input,
    });
    if (!updated.count) throw new NotFoundException('Título não encontrado na coleção');
    await this.db.collection.update({ where: { id }, data: { updatedAt: new Date() } });
    return this.get(userId, id);
  }

  async removeItem(userId: string, id: string, entryId: string) {
    await this.owned(userId, id);
    const removed = await this.db.collectionItem.deleteMany({
      where: { collectionId: id, entryId },
    });
    if (!removed.count) throw new NotFoundException('Título não encontrado na coleção');
    await this.db.collection.update({ where: { id }, data: { updatedAt: new Date() } });
    return this.get(userId, id);
  }
}
