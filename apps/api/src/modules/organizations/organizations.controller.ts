import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('current')
  @Permissions('organization.view')
  @ApiOperation({ summary: 'Get current tenant organization profile and counts' })
  async getCurrent(@CurrentUser('organizationId') organizationId: string) {
    return this.orgsService.getCurrent(organizationId);
  }

  @Patch('current')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update organization profile and timezone settings' })
  async updateCurrent(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.updateCurrent(organizationId, dto);
  }
}
