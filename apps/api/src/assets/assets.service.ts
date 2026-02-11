import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { and, eq, isNull, asc, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { assets, locations, clients } from '../database/schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findAllForLocation(firmId: string, clientId: string, locationId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    return this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      )
      .orderBy(asc(assets.description));
  }

  async findOne(firmId: string, clientId: string, locationId: string, assetId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const result = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('Asset not found');
    }

    return result[0];
  }

  async create(firmId: string, clientId: string, locationId: string, dto: CreateAssetDto) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const result = await this.db
      .insert(assets)
      .values({
        locationId,
        description: dto.description,
        category: dto.category as typeof assets.$inferInsert.category,
        originalCost: dto.originalCost,
        acquisitionDate: dto.acquisitionDate,
        disposalDate: dto.disposalDate,
        quantity: dto.quantity ?? 1,
        isLeased: dto.isLeased ?? false,
        lessorName: dto.lessorName,
        lessorAddress: dto.lessorAddress,
        notes: dto.notes,
      })
      .returning();

    return result[0];
  }

  async bulkCreate(firmId: string, clientId: string, locationId: string, dtos: CreateAssetDto[]) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const values = dtos.map((dto) => ({
      locationId,
      description: dto.description,
      category: dto.category as typeof assets.$inferInsert.category,
      originalCost: dto.originalCost,
      acquisitionDate: dto.acquisitionDate,
      disposalDate: dto.disposalDate,
      quantity: dto.quantity ?? 1,
      isLeased: dto.isLeased ?? false,
      lessorName: dto.lessorName,
      lessorAddress: dto.lessorAddress,
      notes: dto.notes,
    }));

    const result = await this.db
      .insert(assets)
      .values(values)
      .returning();

    return { inserted: result.length, assets: result };
  }

  async update(
    firmId: string,
    clientId: string,
    locationId: string,
    assetId: string,
    dto: UpdateAssetDto,
  ) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    // Verify asset exists
    const existing = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Asset not found');
    }

    const result = await this.db
      .update(assets)
      .set({
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category as typeof assets.$inferInsert.category }),
        ...(dto.originalCost !== undefined && { originalCost: dto.originalCost }),
        ...(dto.acquisitionDate !== undefined && { acquisitionDate: dto.acquisitionDate }),
        ...(dto.disposalDate !== undefined && { disposalDate: dto.disposalDate }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.isLeased !== undefined && { isLeased: dto.isLeased }),
        ...(dto.lessorName !== undefined && { lessorName: dto.lessorName }),
        ...(dto.lessorAddress !== undefined && { lessorAddress: dto.lessorAddress }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      })
      .where(eq(assets.id, assetId))
      .returning();

    return result[0];
  }

  async softDelete(firmId: string, clientId: string, locationId: string, assetId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const existing = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Asset not found');
    }

    const result = await this.db
      .update(assets)
      .set({ deletedAt: new Date() })
      .where(eq(assets.id, assetId))
      .returning();

    return result[0];
  }

  async getLocationSummary(firmId: string, clientId: string, locationId: string) {
    await this.verifyLocationOwnership(firmId, clientId, locationId);

    const result = await this.db
      .select({
        totalAssets: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${assets.originalCost}::numeric), 0)::text`,
      })
      .from(assets)
      .where(
        and(
          eq(assets.locationId, locationId),
          isNull(assets.deletedAt),
        ),
      );

    return result[0];
  }

  private async verifyLocationOwnership(firmId: string, clientId: string, locationId: string) {
    const result = await this.db
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(
        and(
          eq(locations.id, locationId),
          eq(locations.clientId, clientId),
          eq(clients.firmId, firmId),
          isNull(locations.deletedAt),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new ForbiddenException('Location not found or access denied');
    }
  }
}
