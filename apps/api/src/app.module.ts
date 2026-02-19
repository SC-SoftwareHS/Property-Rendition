import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuditModule } from './audit/audit.module';
import { ClientsModule } from './clients/clients.module';
import { LocationsModule } from './locations/locations.module';
import { JurisdictionsModule } from './jurisdictions/jurisdictions.module';
import { AssetsModule } from './assets/assets.module';
import { ImportModule } from './import/import.module';
import { DepreciationModule } from './depreciation/depreciation.module';
import { RenditionsModule } from './renditions/renditions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RolloverModule } from './rollover/rollover.module';
import { ExportModule } from './export/export.module';
import { FirmsModule } from './firms/firms.module';
import { UsersModule } from './users/users.module';
import { BillingModule } from './billing/billing.module';
import { RelatedEntitiesModule } from './related-entities/related-entities.module';
import { ClerkAuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    WebhooksModule,
    AuditModule,
    ClientsModule,
    LocationsModule,
    JurisdictionsModule,
    AssetsModule,
    ImportModule,
    DepreciationModule,
    RenditionsModule,
    DashboardModule,
    RolloverModule,
    ExportModule,
    FirmsModule,
    UsersModule,
    BillingModule,
    RelatedEntitiesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
