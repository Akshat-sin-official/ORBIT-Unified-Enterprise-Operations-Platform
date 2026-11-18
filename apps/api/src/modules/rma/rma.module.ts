import { Module } from '@nestjs/common';
import { RmaController } from './rma.controller';
import { RmaService } from './rma.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RmaController],
  providers: [RmaService],
  exports: [RmaService],
})
export class RmaModule {}
