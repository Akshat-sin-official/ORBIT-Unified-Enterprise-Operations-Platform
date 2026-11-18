import { PrismaClient, PartnerTier, PartnerStatus, SettlementStatus, ContractType, ContractStatus, ScheduleVisitStatus, RmaStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise Expansion Seed (Phases 1-6)...');

  // Find demo organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found. Please run base seed first.');
    return;
  }

  // 1. Update Customer Addresses with GPS coordinates & realistic pincodes
  const addresses = await prisma.customerAddress.findMany({
    where: { customer: { organizationId: org.id } },
  });

  const geoCoords = [
    { lat: 12.9716, lng: 77.5946, pin: '560001' }, // MG Road Bengaluru
    { lat: 12.9279, lng: 77.6271, pin: '560034' }, // Koramangala
    { lat: 12.9784, lng: 77.6408, pin: '560038' }, // Indiranagar
    { lat: 12.9141, lng: 77.6387, pin: '560102' }, // HSR Layout
    { lat: 12.9916, lng: 77.7126, pin: '560066' }, // Whitefield
  ];

  for (let i = 0; i < addresses.length; i++) {
    const coord = geoCoords[i % geoCoords.length];
    await prisma.customerAddress.update({
      where: { id: addresses[i].id },
      data: {
        latitude: coord.lat,
        longitude: coord.lng,
        postalCode: coord.pin,
      },
    });
  }
  console.log(`✅ Geotagged ${addresses.length} customer addresses with GPS coordinates.`);

  // 2. Enhance Technicians with certified skills & route pincodes
  const technicians = await prisma.technician.findMany({
    where: { organizationId: org.id },
  });

  const skillsets = [
    ['HARDWARE_FAILURE', 'DISPLAY_PANEL', 'CIRCUIT_CALIBRATION', 'REFRIGERATION'],
    ['ELECTRICAL', 'HVAC_COOLING', 'INVERTER_PCB', 'COMPRESSOR_REPAIR'],
    ['NETWORK_CONNECTIVITY', 'FIRMWARE_OS', 'POWER_SUPPLY', 'SMART_HOME'],
  ];

  const pincodeSets = [
    ['560001', '560034', '560038'],
    ['560102', '560034', '560068'],
    ['560066', '560038', '560017'],
  ];

  for (let i = 0; i < technicians.length; i++) {
    await prisma.technician.update({
      where: { id: technicians[i].id },
      data: {
        skills: skillsets[i % skillsets.length],
        servicePincodes: pincodeSets[i % pincodeSets.length],
        maxDailyJobs: 6,
      },
    });
  }
  console.log(`✅ Enhanced ${technicians.length} technicians with skills, daily quotas & territory pincodes.`);

  // 3. Seed Maintenance Contracts (AMC/CMC)
  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id },
    take: 3,
  });

  const products = await prisma.product.findMany({
    where: { organizationId: org.id },
    take: 3,
  });

  if (customers.length > 0) {
    const c1 = customers[0];
    const p1 = products[0];

    const existingAmc = await prisma.maintenanceContract.findFirst({
      where: { organizationId: org.id, contractNumber: 'AMC-2026-0001' },
    });

    if (!existingAmc) {
      const now = new Date();
      const contract1 = await prisma.maintenanceContract.create({
        data: {
          organizationId: org.id,
          customerId: c1.id,
          productId: p1?.id || null,
          serialNumber: 'SN-2024-SAM-INV',
          contractNumber: 'AMC-2026-0001',
          contractType: ContractType.COMPREHENSIVE_CMC,
          startDate: new Date(now.getTime() - 60 * 24 * 3600 * 1000), // 60 days ago
          endDate: new Date(now.getTime() + 305 * 24 * 3600 * 1000), // 305 days left
          visitsIncluded: 4,
          visitsCompleted: 1,
          visitIntervalDays: 90,
          amountPaid: 6500,
          status: ContractStatus.ACTIVE,
          notes: 'Comprehensive annual care package covering inverter compressor and control boards.',
        },
      });

      // Schedules: visit 1 completed, visit 2 due in 5 days (trigger for cron!), visits 3 & 4 future
      await prisma.maintenanceSchedule.createMany({
        data: [
          {
            contractId: contract1.id,
            visitSequence: 1,
            dueDate: new Date(now.getTime() - 15 * 24 * 3600 * 1000),
            status: ScheduleVisitStatus.COMPLETED,
            completedAt: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
          },
          {
            contractId: contract1.id,
            visitSequence: 2,
            dueDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000), // due in 5 days!
            status: ScheduleVisitStatus.SCHEDULED,
          },
          {
            contractId: contract1.id,
            visitSequence: 3,
            dueDate: new Date(now.getTime() + 95 * 24 * 3600 * 1000),
            status: ScheduleVisitStatus.SCHEDULED,
          },
          {
            contractId: contract1.id,
            visitSequence: 4,
            dueDate: new Date(now.getTime() + 185 * 24 * 3600 * 1000),
            status: ScheduleVisitStatus.SCHEDULED,
          },
        ],
      });
      console.log('✅ Created Maintenance Contract AMC-2026-0001 with 4 schedules (Visit #2 due in 5 days).');
    }
  }

  // 4. Seed Serialized Part Swaps (RMA exchanges)
  const workOrders = await prisma.workOrder.findMany({
    where: { organizationId: org.id },
    take: 3,
  });

  const parts = await prisma.part.findMany({
    where: { organizationId: org.id },
    take: 3,
  });

  if (workOrders.length > 0) {
    const existingRma = await prisma.serializedPartSwap.findFirst({
      where: { organizationId: org.id },
    });

    if (!existingRma) {
      await prisma.serializedPartSwap.createMany({
        data: [
          {
            organizationId: org.id,
            workOrderId: workOrders[0].id,
            partId: parts[0]?.id || null,
            defectiveSerialNumber: 'MOT-DEF-88102',
            replacementSerialNumber: 'MOT-FRESH-99201',
            rmaBarcode: 'RMA-2026-0001',
            rmaStatus: RmaStatus.RECEIVED_AT_DEPOT,
            receivedAt: new Date(),
          },
          {
            organizationId: org.id,
            workOrderId: workOrders[0].id,
            partId: parts[1]?.id || null,
            defectiveSerialNumber: 'PCB-DEF-77210',
            replacementSerialNumber: 'PCB-FRESH-33104',
            rmaBarcode: 'RMA-2026-0002',
            rmaStatus: RmaStatus.WITH_TECH,
          },
          {
            organizationId: org.id,
            workOrderId: workOrders[1]?.id || workOrders[0].id,
            partId: parts[2]?.id || null,
            defectiveSerialNumber: 'PANEL-CRACK-4412',
            replacementSerialNumber: 'PANEL-OEM-8891',
            rmaBarcode: 'RMA-2026-0003',
            rmaStatus: RmaStatus.AUDIT_PASSED,
            receivedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
            auditedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
            auditNotes: 'Bench testing confirmed hairline thermal trace crack. Covered under vendor RMA warranty.',
          },
        ],
      });
      console.log('✅ Seeded 3 Serialized Part Swaps (RMA-2026-0001 to 0003) across stages.');
    }
  }

  // 5. Seed Authorized Service Partners (ASPs) & Rate Cards
  const existingPartner = await prisma.contractorPartner.findFirst({
    where: { organizationId: org.id },
  });

  if (!existingPartner) {
    const p1 = await prisma.contractorPartner.create({
      data: {
        organizationId: org.id,
        partnerCode: 'ASP-101',
        companyName: 'Apex ElectroTech Services LLP',
        contactName: 'Rajesh Sharma',
        email: 'rajesh@apexelectrotech.in',
        phone: '+91 98450 12345',
        region: 'Bengaluru Urban & South',
        tier: PartnerTier.PLATINUM,
        status: PartnerStatus.ACTIVE,
        gstNumber: '29ABCDE1234F1Z5',
        bankAccountInfo: {
          bank: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifsc: 'HDFC0000240',
        },
      },
    });

    const p2 = await prisma.contractorPartner.create({
      data: {
        organizationId: org.id,
        partnerCode: 'ASP-102',
        companyName: 'Prompt Care Services India',
        contactName: 'Anil Kulkarni',
        email: 'anil@promptcare.co.in',
        phone: '+91 98860 54321',
        region: 'Bengaluru East & Whitefield',
        tier: PartnerTier.GOLD,
        status: PartnerStatus.ACTIVE,
        gstNumber: '29PQRS5678T1Z9',
      },
    });

    // Rate cards for Apex
    await prisma.aspRateCard.createMany({
      data: [
        {
          partnerId: p1.id,
          productCategory: 'Air Conditioners',
          labourAllowance: 480.0,
          tatBonusPercent: 5.0,
          rcrPenaltyPercent: 10.0,
        },
        {
          partnerId: p1.id,
          productCategory: 'Refrigerators',
          labourAllowance: 420.0,
          tatBonusPercent: 5.0,
          rcrPenaltyPercent: 12.0,
        },
        {
          partnerId: p1.id,
          productCategory: 'Washing Machines',
          labourAllowance: 380.0,
          tatBonusPercent: 5.0,
          rcrPenaltyPercent: 10.0,
        },
        {
          partnerId: p2.id,
          productCategory: 'Air Conditioners',
          labourAllowance: 450.0,
          tatBonusPercent: 4.0,
          rcrPenaltyPercent: 10.0,
        },
      ],
    });

    // Seed sample monthly settlement statement for Apex
    await prisma.aspSettlement.create({
      data: {
        organizationId: org.id,
        partnerId: p1.id,
        settlementNumber: 'SETTL-2026-0001',
        periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        periodEnd: new Date(),
        totalJobsCompleted: 42,
        grossLabourEarned: 19400.0,
        tatBonusAmount: 970.0,
        rcrPenaltyAmount: 480.0,
        netPayable: 19890.0,
        status: SettlementStatus.APPROVED,
        approvedAt: new Date(),
        notes: 'Monthly ASP billing settlement. 42 service tickets audited and approved by service director.',
      },
    });

    console.log('✅ Seeded 2 Authorized Service Partners (ASP-101, ASP-102) with Rate Cards & Settlement Statement.');
  }

  console.log('🎉 Enterprise Expansion Data successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
