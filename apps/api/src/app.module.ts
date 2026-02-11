import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
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
import { ClerkAuthGuard } from './auth/auth.guard';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SupabaseModule,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
