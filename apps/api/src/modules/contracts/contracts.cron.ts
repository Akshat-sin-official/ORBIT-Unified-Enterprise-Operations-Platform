import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ContractsService } from './contracts.service';
import { ScheduleVisitStatus, ContractStatus } from '@prisma/client';

@Injectable()
export class ContractsCronService {
  private readonly logger = new Logger(ContractsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Daily 06:00 AM Task: Auto-generate Work Orders for preventive maintenance due within 14 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyPpmGeneration() {
    this.logger.log('Starting daily preventive maintenance work order generation scan...');

    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);

      const dueSchedules = await this.prisma.maintenanceSchedule.findMany({
        where: {
          status: ScheduleVisitStatus.SCHEDULED,
          dueDate: { lte: targetDate },
          contract: { status: ContractStatus.ACTIVE },
        },
        include: { contract: true },
      });

      this.logger.log(`Found ${dueSchedules.length} pending PPM schedule visits due within 14 days.`);

      for (const item of dueSchedules) {
        try {
          await this.contractsService.generatePreventiveWorkOrder(
            item.contract.organizationId,
            item.id,
          );
          this.logger.log(`Generated WO for Contract ${item.contract.contractNumber} Visit #${item.visitSequence}`);
        } catch (err: any) {
          this.logger.error(`Failed to generate WO for schedule ${item.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in PPM generation cron: ${error.message}`);
    }
  }

  /**
   * Daily 07:00 AM Task: Check contracts expiring in 30 days and mark expired contracts
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleContractExpiryCheck() {
    this.logger.log('Checking contract expiry statuses...');
    const now = new Date();

    // Mark passed contracts as EXPIRED
    await this.prisma.maintenanceContract.updateMany({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: { lt: now },
      },
      data: {
        status: ContractStatus.EXPIRED,
      },
    });
  }
}
