import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { NotificationController } from './notifications.controller';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { SmtpModule } from '../smtp/smtp.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [DatabaseModule, SmtpModule, WhatsAppModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
