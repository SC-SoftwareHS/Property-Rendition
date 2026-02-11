import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { auditLogs } from '../database/schema';

export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  changedBy?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        changedBy: entry.changedBy ?? null,
      });

      this.logger.debug(
        `Audit log recorded: ${entry.action} ${entry.entityType} ${entry.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
