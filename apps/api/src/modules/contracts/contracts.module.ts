import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsCronService } from './contracts.cron';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsCronService],
  exports: [ContractsService],
})
export class ContractsModule {}
