import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
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
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
