import { Module } from '@nestjs/common';
import { ProofOfWorkController } from './proof-of-work.controller';
import { ProofOfWorkService } from './proof-of-work.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProofOfWorkController],
  providers: [ProofOfWorkService],
  exports: [ProofOfWorkService],
})
export class ProofOfWorkModule {}
