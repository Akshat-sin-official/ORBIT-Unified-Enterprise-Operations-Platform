import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { HealthModule } from './modules/health/health.module';
import { CrmModule } from './modules/crm/crm.module';
import { ServiceDeskModule } from './modules/service-desk/service-desk.module';
import { FieldServiceModule } from './modules/field-service/field-service.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SmtpModule } from './modules/smtp/smtp.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { NotificationModule } from './modules/notifications/notifications.module';
import { CopilotModule } from './modules/copilot/copilot.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { RmaModule } from './modules/rma/rma.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ProofOfWorkModule } from './modules/proof-of-work/proof-of-work.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { PartnersModule } from './modules/partners/partners.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120, // 120 requests per minute baseline
      },
    ]),
    DatabaseModule,
    RedisModule,
    AuthModule,
    IdentityModule,
    OrganizationsModule,
    HealthModule,
    CrmModule,
    ServiceDeskModule,
    FieldServiceModule,
    InventoryModule,
    LogisticsModule,
    FinanceModule,
    AnalyticsModule,
    SmtpModule,
    WhatsAppModule,
    NotificationModule,
    CopilotModule,
    DispatchModule,
    RmaModule,
    ContractsModule,
    ProofOfWorkModule,
    TrackingModule,
    PartnersModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
