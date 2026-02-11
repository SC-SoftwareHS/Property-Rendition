import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, isNull, or, asc, desc, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { clients } from '../database/schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientsDto } from './dto/query-clients.dto';

@Injectable()
export class ClientsService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findAll(firmId: string, query: QueryClientsDto) {
    const { search, limit = 25, offset = 0, sortBy = 'companyName', sortOrder = 'asc' } = query;

    const baseConditions = [
      eq(clients.firmId, firmId),
      isNull(clients.deletedAt),
    ];

    if (search) {
      baseConditions.push(
        or(
          ilike(clients.companyName, `%${search}%`),
          ilike(clients.contactName, `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...baseConditions);

    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(clients)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(whereClause),
    ]);

    return {
      data,
      total: countResult[0].count,
      limit,
      offset,
    };
  }

  async findOne(firmId: string, clientId: string) {
    const result = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.firmId, firmId),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('Client not found');
    }

    return result[0];
  }

  async create(firmId: string, dto: CreateClientDto) {
    const result = await this.db
      .insert(clients)
      .values({
        firmId,
        companyName: dto.companyName,
        ein: dto.ein,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        industry: dto.industry,
        notes: dto.notes,
      })
      .returning();

    return result[0];
  }

  async update(firmId: string, clientId: string, dto: UpdateClientDto) {
    // Verify ownership first
    await this.findOne(firmId, clientId);

    const result = await this.db
      .update(clients)
      .set({
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.ein !== undefined && { ein: dto.ein }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      })
      .where(eq(clients.id, clientId))
      .returning();

    return result[0];
  }

  async softDelete(firmId: string, clientId: string) {
    // Verify ownership first
    await this.findOne(firmId, clientId);

    const result = await this.db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(eq(clients.id, clientId))
      .returning();

    return result[0];
  }

  private getSortColumn(sortBy: string) {
    switch (sortBy) {
      case 'contactName':
        return clients.contactName;
      case 'industry':
        return clients.industry;
      case 'createdAt':
        return clients.createdAt;
      case 'updatedAt':
        return clients.updatedAt;
      default:
        return clients.companyName;
    }
  }
}
