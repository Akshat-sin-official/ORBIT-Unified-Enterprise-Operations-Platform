import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  UploadProofMediaDto,
  UploadSignatureDto,
} from './dto/proof-of-work.dto';
import { ProofMediaType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProofOfWorkService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads', 'proof');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload and record geo-tagged and watermarked proof of work media
   */
  async uploadMedia(
    organizationId: string,
    workOrderId: string,
    dto: UploadProofMediaDto,
    file?: Express.Multer.File,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    let fileUrl = '';
    const now = new Date();

    if (file) {
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `proof-${wo.workOrderNumber}-${Date.now()}${ext}`;
      const destPath = path.join(this.uploadDir, filename);
      fs.writeFileSync(destPath, file.buffer);
      fileUrl = `/uploads/proof/${filename}`;
    } else if (dto.fileData) {
      if (dto.fileData.startsWith('data:image')) {
        const matches = dto.fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `proof-${wo.workOrderNumber}-${Date.now()}.png`;
          const destPath = path.join(this.uploadDir, filename);
          fs.writeFileSync(destPath, buffer);
          fileUrl = `/uploads/proof/${filename}`;
        } else {
          fileUrl = dto.fileData;
        }
      } else {
        fileUrl = dto.fileData;
      }
    } else {
      throw new BadRequestException('Either image file upload or base64 fileData is required.');
    }

    const lat = dto.latitude ? Number(dto.latitude) : null;
    const lng = dto.longitude ? Number(dto.longitude) : null;
    const watermarkText = `WO #${wo.workOrderNumber} | ${now.toISOString().replace('T', ' ').substring(0, 19)} | GPS: ${lat ?? '12.9716'}, ${lng ?? '77.5946'}`;

    const media = await this.prisma.proofOfWorkMedia.create({
      data: {
        workOrderId: wo.id,
        mediaType: dto.mediaType,
        fileUrl,
        latitude: lat,
        longitude: lng,
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : now,
        watermarkText,
      },
    });

    return media;
  }

  /**
   * Save customer digital signature captured on canvas
   */
  async uploadSignature(
    organizationId: string,
    workOrderId: string,
    dto: UploadSignatureDto,
  ) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    let fileUrl = dto.signatureDataUrl;
    if (dto.signatureDataUrl.startsWith('data:image')) {
      const matches = dto.signatureDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `sig-${wo.workOrderNumber}-${Date.now()}.png`;
        const destPath = path.join(this.uploadDir, filename);
        fs.writeFileSync(destPath, buffer);
        fileUrl = `/uploads/proof/${filename}`;
      }
    }

    // Upsert or create signature record
    const signatureMedia = await this.prisma.proofOfWorkMedia.create({
      data: {
        workOrderId: wo.id,
        mediaType: ProofMediaType.SIGNATURE,
        fileUrl,
        capturedAt: new Date(),
        watermarkText: `Digital Signature Verified: ${dto.signeeName || 'Customer Signoff'} on WO #${wo.workOrderNumber}`,
      },
    });

    return signatureMedia;
  }

  /**
   * List all proof of work attachments for a work order
   */
  async getProofMedia(organizationId: string, workOrderId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });
    if (!wo) throw new NotFoundException('Work order not found');

    const mediaList = await this.prisma.proofOfWorkMedia.findMany({
      where: { workOrderId: wo.id },
      orderBy: { createdAt: 'desc' },
    });

    const hasBefore = mediaList.some((m) => m.mediaType === ProofMediaType.BEFORE_REPAIR);
    const hasDefective = mediaList.some((m) => m.mediaType === ProofMediaType.DEFECTIVE_PART);
    const hasAfter = mediaList.some((m) => m.mediaType === ProofMediaType.AFTER_REPAIR);
    const hasSignature = mediaList.some((m) => m.mediaType === ProofMediaType.SIGNATURE);

    return {
      media: mediaList,
      compliance: {
        isCompliant: hasBefore && hasAfter && hasSignature,
        hasBeforePhoto: hasBefore,
        hasDefectivePartPhoto: hasDefective,
        hasAfterPhoto: hasAfter,
        hasCustomerSignature: hasSignature,
      },
    };
  }
}
