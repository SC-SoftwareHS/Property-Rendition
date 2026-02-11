import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { eq } from 'drizzle-orm';
import { Request } from 'express';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { clients, locations, assets, renditions } from '../database/schema';
import { AuditService } from './audit.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';

/** Maps entity type strings to their corresponding Drizzle table references. */
const ENTITY_TABLE_MAP: Record<string, typeof clients | typeof locations | typeof assets | typeof renditions> = {
  client: clients,
  location: locations,
  asset: assets,
  rendition: renditions,
};

/** HTTP methods that trigger audit logging. */
const AUDITABLE_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

/** Route param names that carry entity IDs, ordered by specificity. */
const ID_PARAM_KEYS = ['clientId', 'locationId', 'assetId', 'id'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    @InjectDrizzle() private db: DrizzleDB,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const method = request.method.toUpperCase();

    // Only audit mutating requests
    if (!AUDITABLE_METHODS.has(method)) {
      return next.handle();
    }

    const entityType = this.extractEntityType(request.route?.path ?? request.path);
    const entityId = this.extractEntityId(request.params as Record<string, string>);

    // If we cannot determine what entity is being acted on, skip audit
    if (!entityType) {
      return next.handle();
    }

    const action = this.methodToAction(method);
    const changedBy = request.user?.userId ?? null;

    // Pre-read: capture old value for updates and deletes
    let oldValue: Record<string, unknown> | null = null;

    if ((action === 'update' || action === 'delete') && entityId) {
      oldValue = await this.preRead(entityType, entityId);
    }

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          try {
            const resolvedEntityId = entityId ?? this.extractIdFromResponse(responseBody);

            if (!resolvedEntityId) {
              this.logger.warn(
                `Could not determine entity ID for audit log: ${action} ${entityType}`,
              );
              return;
            }

            const newValue = this.buildNewValue(action, responseBody);

            // Fire-and-forget -- never await in tap to avoid blocking the response
            this.auditService.log({
              entityType,
              entityId: resolvedEntityId,
              action,
              oldValue,
              newValue,
              changedBy,
            });
          } catch (error) {
            this.logger.error(
              `Audit interceptor post-handler error: ${error instanceof Error ? error.message : error}`,
            );
          }
        },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Derive the singular entity type from a route path.
   * Examples:
   *   /clients/:id          -> "client"
   *   /clients/:clientId/locations/:locationId  -> "location" (last segment)
   *   /assets               -> "asset"
   */
  private extractEntityType(routePath: string): string | null {
    // Split into non-empty segments and filter out param placeholders
    const segments = routePath
      .split('/')
      .filter((s) => s && !s.startsWith(':'));

    if (segments.length === 0) return null;

    // Use the last resource segment (e.g. "locations" -> "location")
    const raw = segments[segments.length - 1];
    // Singularise: strip trailing "s" for standard English plurals
    const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;

    return singular.toLowerCase();
  }

  /**
   * Pull the entity ID from route params.
   * Checks specific names first (clientId, locationId, assetId), then falls back to :id.
   */
  private extractEntityId(params: Record<string, string>): string | null {
    if (!params) return null;

    for (const key of ID_PARAM_KEYS) {
      if (params[key]) {
        return params[key];
      }
    }

    return null;
  }

  /**
   * For POST responses the entity ID lives in the response body.
   */
  private extractIdFromResponse(body: unknown): string | null {
    if (body && typeof body === 'object' && 'id' in body) {
      return (body as Record<string, unknown>).id as string;
    }
    return null;
  }

  /** Map HTTP method to audit action verb. */
  private methodToAction(method: string): 'create' | 'update' | 'delete' {
    switch (method) {
      case 'POST':
        return 'create';
      case 'DELETE':
        return 'delete';
      default:
        return 'update';
    }
  }

  /**
   * Perform a SELECT to capture the current row before it is mutated.
   * Returns null if the entity type has no mapped table or the row is not found.
   */
  private async preRead(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const table = ENTITY_TABLE_MAP[entityType];

      if (!table) {
        this.logger.debug(
          `No table mapping for entity type "${entityType}", skipping pre-read`,
        );
        return null;
      }

      const rows = await this.db
        .select()
        .from(table)
        .where(eq(table.id, entityId))
        .limit(1);

      return (rows[0] as Record<string, unknown>) ?? null;
    } catch (error) {
      this.logger.error(
        `Audit pre-read failed for ${entityType}/${entityId}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Build the new_value payload stored in the audit log.
   * - create / update: full response body
   * - delete (soft-delete): include deleted_at timestamp
   */
  private buildNewValue(
    action: 'create' | 'update' | 'delete',
    responseBody: unknown,
  ): Record<string, unknown> | null {
    if (!responseBody || typeof responseBody !== 'object') return null;

    const body = responseBody as Record<string, unknown>;

    if (action === 'delete') {
      return {
        ...body,
        deletedAt: body.deletedAt ?? new Date().toISOString(),
      };
    }

    return body;
  }
}
