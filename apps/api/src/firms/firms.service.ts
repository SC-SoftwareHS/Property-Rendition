import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { firms } from '../database/schema';
import { UpdateFirmDto } from './dto/update-firm.dto';

@Injectable()
export class FirmsService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findOne(firmId: string) {
    const [firm] = await this.db
      .select()
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    if (!firm) {
      throw new NotFoundException('Firm not found');
    }

    return firm;
  }

  async update(firmId: string, dto: UpdateFirmDto) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.zip !== undefined) updateData.zip = dto.zip;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.defaultState !== undefined) updateData.defaultState = dto.defaultState;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;

    if (Object.keys(updateData).length === 0) {
      return this.findOne(firmId);
    }

    const [updated] = await this.db
      .update(firms)
      .set(updateData)
      .where(eq(firms.id, firmId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Firm not found');
    }

    return updated;
  }
}
