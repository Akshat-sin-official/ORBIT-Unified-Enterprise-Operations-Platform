import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProofOfWorkService } from './proof-of-work.service';
import {
  UploadProofMediaDto,
  UploadSignatureDto,
} from './dto/proof-of-work.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Proof of Work & Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/proof-of-work')
export class ProofOfWorkController {
  constructor(private readonly proofService: ProofOfWorkService) {}

  @Post('work-orders/:workOrderId/media')
  @Permissions('work_order.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Upload geo-tagged proof of work media (Before/After/Defective)' })
  async uploadMedia(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: UploadProofMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.proofService.uploadMedia(organizationId, workOrderId, dto, file);
  }

  @Post('work-orders/:workOrderId/signature')
  @Permissions('work_order.update')
  @ApiOperation({ summary: 'Save customer digital touch signature on completion' })
  async uploadSignature(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
    @Body() dto: UploadSignatureDto,
  ) {
    return this.proofService.uploadSignature(organizationId, workOrderId, dto);
  }

  @Get('work-orders/:workOrderId')
  @Permissions('work_order.view')
  @ApiOperation({ summary: 'Get all proof of work attachments and compliance checklist' })
  async getProofMedia(
    @CurrentUser('organizationId') organizationId: string,
    @Param('workOrderId') workOrderId: string,
  ) {
    return this.proofService.getProofMedia(organizationId, workOrderId);
  }
}
