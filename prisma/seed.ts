import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Identity & Access
  { code: 'user.view', description: 'View organization users', module: 'identity' },
  { code: 'user.create', description: 'Create new organization users', module: 'identity' },
  { code: 'user.update', description: 'Update organization users', module: 'identity' },
  { code: 'user.delete', description: 'Delete organization users', module: 'identity' },
  { code: 'user.assign_roles', description: 'Assign roles to users', module: 'identity' },
  { code: 'role.view', description: 'View organization roles', module: 'identity' },
  { code: 'role.create', description: 'Create custom roles', module: 'identity' },
  { code: 'role.update', description: 'Update custom roles', module: 'identity' },
  { code: 'role.delete', description: 'Delete custom roles', module: 'identity' },
  { code: 'role.assign_permissions', description: 'Assign permissions to roles', module: 'identity' },
  { code: 'audit.view', description: 'View audit logs', module: 'identity' },

  // Organization
  { code: 'organization.view', description: 'View organization details', module: 'organization' },
  { code: 'organization.update', description: 'Update organization settings', module: 'organization' },

  // CRM
  { code: 'customer.view', description: 'View customer records', module: 'crm' },
  { code: 'customer.create', description: 'Create customer records', module: 'crm' },
  { code: 'customer.update', description: 'Update customer records', module: 'crm' },
  { code: 'product.view', description: 'View products & catalog', module: 'crm' },
  { code: 'product.register', description: 'Register product serial numbers', module: 'crm' },
  { code: 'warranty.view', description: 'View warranty status', module: 'crm' },
  { code: 'warranty.validate', description: 'Validate warranty claims', module: 'crm' },

  // Service Desk
  { code: 'ticket.view', description: 'View service tickets', module: 'service-desk' },
  { code: 'ticket.create', description: 'Create service tickets', module: 'service-desk' },
  { code: 'ticket.update', description: 'Update ticket details and status', module: 'service-desk' },
  { code: 'ticket.escalate', description: 'Escalate service tickets', module: 'service-desk' },
  { code: 'ticket.close', description: 'Close service tickets', module: 'service-desk' },

  // Field Service
  { code: 'work_order.view', description: 'View work orders', module: 'field-service' },
  { code: 'work_order.create', description: 'Create work orders from tickets', module: 'field-service' },
  { code: 'work_order.assign', description: 'Assign work orders to technicians', module: 'field-service' },
  { code: 'work_order.update', description: 'Update work order progress', module: 'field-service' },
  { code: 'work_order.complete', description: 'Complete work orders with evidence', module: 'field-service' },

  // Inventory
  { code: 'inventory.view', description: 'View stock balances and parts', module: 'inventory' },
  { code: 'inventory.reserve', description: 'Reserve parts for work orders', module: 'inventory' },
  { code: 'inventory.issue', description: 'Issue parts to technicians', module: 'inventory' },
  { code: 'inventory.stock.adjust', description: 'Adjust stock quantities', module: 'inventory' },
  { code: 'inventory.stock.transfer', description: 'Transfer stock across warehouses', module: 'inventory' },

  // Logistics
  { code: 'shipment.view', description: 'View shipments and tracking', module: 'logistics' },
  { code: 'shipment.create', description: 'Create part shipments', module: 'logistics' },
  { code: 'shipment.dispatch', description: 'Dispatch shipments', module: 'logistics' },
  { code: 'shipment.track', description: 'Record tracking events', module: 'logistics' },

  // Finance
  { code: 'invoice.view', description: 'View invoices and charges', module: 'finance' },
  { code: 'invoice.create', description: 'Generate service invoices', module: 'finance' },
  { code: 'invoice.approve', description: 'Approve invoice credit notes', module: 'finance' },
  { code: 'payment.record', description: 'Record customer payments', module: 'finance' },

  // Analytics
  { code: 'analytics.view', description: 'View operational dashboards and KPIs', module: 'analytics' },
  { code: 'reports.export', description: 'Export operational data reports', module: 'analytics' },
];

async function main() {
  console.log('🌱 Starting ORBIT Database Seed...');

  // 1. Seed Permissions
  console.log(`- Upserting ${PERMISSIONS.length} permissions...`);
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, module: perm.module },
      create: perm,
    });
  }

  // 2. Demo Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'orbit-electronics' },
    update: {
      name: 'ORBIT Electronics',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
    create: {
      name: 'ORBIT Electronics',
      slug: 'orbit-electronics',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    },
  });
  console.log(`- Organization ready: ${org.name} (${org.id})`);

  // 3. System Roles for Organization
  const rolesDefinition = [
    {
      name: 'Super Admin',
      description: 'Platform owner with full system access',
      permissions: PERMISSIONS.map((p) => p.code),
    },
    {
      name: 'Org Admin',
      description: 'Organization administrator managing users, roles and settings',
      permissions: [
        'user.view', 'user.create', 'user.update', 'user.assign_roles',
        'role.view', 'role.create', 'role.update', 'role.assign_permissions',
        'audit.view', 'organization.view', 'organization.update',
        'customer.view', 'customer.create', 'customer.update',
        'ticket.view', 'ticket.create', 'ticket.update',
        'work_order.view', 'inventory.view', 'shipment.view', 'analytics.view',
      ],
    },
    {
      name: 'Operations Manager',
      description: 'Oversees service desk, dispatch, field operations and inventory',
      permissions: [
        'customer.view', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.escalate', 'ticket.close',
        'work_order.view', 'work_order.create', 'work_order.assign', 'work_order.update', 'work_order.complete',
        'inventory.view', 'inventory.reserve', 'inventory.issue', 'inventory.stock.transfer',
        'shipment.view', 'shipment.create', 'shipment.dispatch', 'shipment.track',
        'analytics.view', 'reports.export',
      ],
    },
    {
      name: 'Support Agent',
      description: 'Handles incoming customer complaints, diagnostics and warranty validation',
      permissions: [
        'customer.view', 'customer.create', 'customer.update',
        'product.view', 'product.register', 'warranty.view', 'warranty.validate',
        'ticket.view', 'ticket.create', 'ticket.update',
      ],
    },
    {
      name: 'Dispatcher',
      description: 'Assigns service orders to field technicians and arranges part shipments',
      permissions: [
        'ticket.view', 'work_order.view', 'work_order.assign', 'work_order.update',
        'inventory.view', 'inventory.reserve', 'shipment.view', 'shipment.create',
      ],
    },
    {
      name: 'Technician',
      description: 'Field engineer performing on-site repairs and submitting diagnostics',
      permissions: [
        'work_order.view', 'work_order.update', 'work_order.complete',
        'inventory.view', 'inventory.issue',
      ],
    },
    {
      name: 'Warehouse Manager',
      description: 'Manages spare parts inventory, stock movements and goods receipts',
      permissions: [
        'inventory.view', 'inventory.reserve', 'inventory.issue', 'inventory.stock.adjust', 'inventory.stock.transfer',
        'shipment.view', 'shipment.dispatch',
      ],
    },
    {
      name: 'Finance Officer',
      description: 'Manages repair invoices, customer payments and warranty claims',
      permissions: [
        'invoice.view', 'invoice.create', 'invoice.approve', 'payment.record', 'analytics.view',
      ],
    },
    {
      name: 'Customer',
      description: 'External customer accessing registered products and service history',
      permissions: [
        'customer.view', 'product.register', 'warranty.view', 'ticket.view', 'ticket.create', 'invoice.view',
      ],
    },
  ];

  const allDbPermissions = await prisma.permission.findMany();
  const permMap = new Map(allDbPermissions.map((p) => [p.code, p.id]));

  for (const roleDef of rolesDefinition) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: roleDef.name,
        },
      },
      update: { description: roleDef.description, isSystemRole: true },
      create: {
        organizationId: org.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: true,
      },
    });

    // Assign permissions
    const permissionIds = roleDef.permissions
      .map((code) => permMap.get(code))
      .filter(Boolean) as string[];

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permId) => ({
        roleId: role.id,
        permissionId: permId,
      })),
      skipDuplicates: true,
    });
  }
  console.log(`- Created ${rolesDefinition.length} system roles`);

  // 4. Default Users
  const passwordHash = await bcrypt.hash('admin123', 12);

  const usersToSeed = [
    {
      email: 'admin@orbit.local',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Super Admin',
      phone: '+919876543200',
    },
    {
      email: 'support@orbit.local',
      firstName: 'Pooja',
      lastName: 'Verma',
      role: 'Support Agent',
      phone: '+919876543201',
    },
    {
      email: 'dispatcher@orbit.local',
      firstName: 'Amit',
      lastName: 'Kumar',
      role: 'Dispatcher',
      phone: '+919876543202',
    },
    {
      email: 'tech@orbit.local',
      firstName: 'Ravi',
      lastName: 'Sharma',
      role: 'Technician',
      phone: '+919876543203',
    },
  ];

  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        organizationId: org.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        phone: u.phone,
        status: 'ACTIVE',
      },
    });

    const targetRole = await prisma.role.findFirst({
      where: { organizationId: org.id, name: u.role },
    });

    if (targetRole) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: targetRole.id,
        },
      });
    }
  }

  console.log(`- Seeded ${usersToSeed.length} demo users (password: admin123)`);

  // 5. CRM: Categories & Products
  console.log('- Seeding CRM product catalog & categories...');
  const catLaptops = await prisma.productCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Laptops & Workstations' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Laptops & Workstations',
      description: 'High performance enterprise ultrabooks and mobile workstations',
    },
  });

  const catMonitors = await prisma.productCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Displays & Monitors' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Displays & Monitors',
      description: 'Professional color-accurate studio and office displays',
    },
  });

  const productX1 = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'ORBIT-THINK-X1' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catLaptops.id,
      sku: 'ORBIT-THINK-X1',
      name: 'ThinkBook Pro X1 Carbon 14"',
      modelNumber: 'TP-X1-2026',
      description: 'Intel Core Ultra 7, 32GB RAM, 1TB SSD, 2.8K OLED display',
      defaultWarrantyMonths: 24,
    },
  });

  const productLegion = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'ORBIT-LEG-5P' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catLaptops.id,
      sku: 'ORBIT-LEG-5P',
      name: 'Legion Pro 5 Gen 8 16"',
      modelNumber: 'LP-5G8-RTX4070',
      description: 'AMD Ryzen 7 7745HX, RTX 4070 8GB, 16GB DDR5, 1TB SSD',
      defaultWarrantyMonths: 12,
    },
  });

  const productMonitor = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: org.id, sku: 'ORBIT-MON-4K' } },
    update: {},
    create: {
      organizationId: org.id,
      categoryId: catMonitors.id,
      sku: 'ORBIT-MON-4K',
      name: 'VisionPro 27" 4K Studio Display',
      modelNumber: 'VP-27-4K-IPS',
      description: 'IPS Black, 99% DCI-P3, Thunderbolt 4 96W PD, Factory Calibrated',
      defaultWarrantyMonths: 36,
    },
  });

  // Pre-generate manufacturing serial numbers
  const serials = [
    { sn: 'SN-LEN-882101', product: productX1 },
    { sn: 'SN-LEN-882102', product: productLegion },
    { sn: 'SN-LEN-882103', product: productX1 },
    { sn: 'SN-LEN-882104', product: productMonitor },
    { sn: 'SN-LEN-882105', product: productLegion },
  ];

  for (const s of serials) {
    await prisma.productSerialNumber.upsert({
      where: { organizationId_serialNumber: { organizationId: org.id, serialNumber: s.sn } },
      update: {},
      create: {
        organizationId: org.id,
        productId: s.product.id,
        serialNumber: s.sn,
        manufacturingBatch: 'BATCH-2026-Q1',
        manufacturedDate: new Date('2026-01-15'),
      },
    });
  }

  // 6. Customers & Registrations & Warranties
  console.log('- Seeding demo customers, product registrations & warranties...');
  const cust1 = await prisma.customer.upsert({
    where: { organizationId_customerCode: { organizationId: org.id, customerCode: 'CUST-1001' } },
    update: {},
    create: {
      organizationId: org.id,
      customerCode: 'CUST-1001',
      name: 'Rajesh Khanna',
      email: 'rajesh@infotech.in',
      phone: '+919811223344',
      companyName: 'InfoTech Solutions Pvt Ltd',
      type: 'ENTERPRISE',
      status: 'ACTIVE',
      notes: 'Corporate account, priority enterprise support SLA',
      addresses: {
        create: {
          street: 'Block B, Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          postalCode: '201309',
          isDefault: true,
        },
      },
    },
  });

  const cust2 = await prisma.customer.upsert({
    where: { organizationId_customerCode: { organizationId: org.id, customerCode: 'CUST-1002' } },
    update: {},
    create: {
      organizationId: org.id,
      customerCode: 'CUST-1002',
      name: 'Ananya Sharma',
      email: 'ananya.sharma@gmail.com',
      phone: '+919877665544',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      addresses: {
        create: {
          street: 'Apartment 4B, Green Glen Layout, Bellandur',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560103',
          isDefault: true,
        },
      },
    },
  });

  // Active Warranty Registration (6 months ago, 24 mo total -> ACTIVE)
  const purchaseDate1 = new Date();
  purchaseDate1.setMonth(purchaseDate1.getMonth() - 6);
  const expiryDate1 = new Date(purchaseDate1);
  expiryDate1.setMonth(expiryDate1.getMonth() + 24);

  const reg1 = await prisma.productRegistration.upsert({
    where: { organizationId_serialNumber: { organizationId: org.id, serialNumber: 'SN-LEN-882101' } },
    update: {},
    create: {
      organizationId: org.id,
      customerId: cust1.id,
      productId: productX1.id,
      serialNumber: 'SN-LEN-882101',
      purchaseDate: purchaseDate1,
      invoiceNumber: 'INV-2026-8812',
      sellerName: 'Chroma Electronics Ltd',
    },
  });

  await prisma.warranty.upsert({
    where: { registrationId: reg1.id },
    update: {},
    create: {
      organizationId: org.id,
      registrationId: reg1.id,
      warrantyNumber: 'WAR-2026-1001',
      coverageType: 'STANDARD',
      status: 'ACTIVE',
      startDate: purchaseDate1,
      endDate: expiryDate1,
      terms: 'Comprehensive parts and onsite technician coverage under standard OEM terms.',
    },
  });

  // Expired Warranty Registration (16 months ago, 12 mo total -> EXPIRED)
  const purchaseDate2 = new Date();
  purchaseDate2.setMonth(purchaseDate2.getMonth() - 16);
  const expiryDate2 = new Date(purchaseDate2);
  expiryDate2.setMonth(expiryDate2.getMonth() + 12);

  const reg2 = await prisma.productRegistration.upsert({
    where: { organizationId_serialNumber: { organizationId: org.id, serialNumber: 'SN-LEN-882102' } },
    update: {},
    create: {
      organizationId: org.id,
      customerId: cust2.id,
      productId: productLegion.id,
      serialNumber: 'SN-LEN-882102',
      purchaseDate: purchaseDate2,
      invoiceNumber: 'AMZ-IN-99432',
      sellerName: 'Appario Retail Pvt Ltd',
    },
  });

  await prisma.warranty.upsert({
    where: { registrationId: reg2.id },
    update: {},
    create: {
      organizationId: org.id,
      registrationId: reg2.id,
      warrantyNumber: 'WAR-2025-0442',
      coverageType: 'STANDARD',
      status: 'EXPIRED',
      startDate: purchaseDate2,
      endDate: expiryDate2,
      terms: 'Standard 1-year consumer hardware warranty. Expired.',
    },
  });

  // 7. Service Desk: SLA Policies & Sample Tickets
  console.log('- Seeding Service Desk SLA policies & sample tickets...');
  const supportUser = await prisma.user.findUnique({ where: { email: 'support@orbit.local' } });

  const slaPoliciesData = [
    { name: 'P1 - Critical Priority SLA', priority: 'P1_CRITICAL' as const, responseHours: 0.5, resolutionHours: 4.0, isDefault: true },
    { name: 'P2 - High Priority SLA', priority: 'P2_HIGH' as const, responseHours: 2.0, resolutionHours: 8.0, isDefault: true },
    { name: 'P3 - Medium Priority SLA', priority: 'P3_MEDIUM' as const, responseHours: 8.0, resolutionHours: 24.0, isDefault: true },
    { name: 'P4 - Low Priority SLA', priority: 'P4_LOW' as const, responseHours: 24.0, resolutionHours: 72.0, isDefault: true },
  ];

  const slaMap = new Map();
  for (const sp of slaPoliciesData) {
    const policy = await prisma.slaPolicy.upsert({
      where: { organizationId_name: { organizationId: org.id, name: sp.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: sp.name,
        priority: sp.priority,
        responseHours: sp.responseHours,
        resolutionHours: sp.resolutionHours,
        isDefault: sp.isDefault,
      },
    });
    slaMap.set(sp.priority, policy.id);
  }

  // Seed sample tickets
  const now = new Date();

  // Ticket 1: Critical with Active Warranty
  const tick1Creation = new Date(now.getTime() - 45 * 60 * 1000); // 45m ago
  const tick1Response = new Date(tick1Creation.getTime() + 15 * 60 * 1000); // responded in 15m
  const tick1ResolutionDeadline = new Date(tick1Creation.getTime() + 4 * 60 * 60 * 1000); // 4h resolution

  const tick1 = await prisma.ticket.upsert({
    where: { organizationId_ticketNumber: { organizationId: org.id, ticketNumber: 'TICK-2026-0001' } },
    update: {},
    create: {
      organizationId: org.id,
      ticketNumber: 'TICK-2026-0001',
      customerId: cust1.id,
      productId: productX1.id,
      registrationId: reg1.id,
      assignedToId: supportUser?.id,
      slaPolicyId: slaMap.get('P1_CRITICAL'),
      title: 'Display flickering and blanking intermittently during video conferences',
      description: 'OLED display starts flickering rapidly whenever Intel Core Ultra GPU boosts to 4K resolution. Prevents attending client meetings.',
      category: 'HARDWARE_FAILURE',
      priority: 'P1_CRITICAL',
      status: 'IN_PROGRESS',
      source: 'PORTAL',
      responseDeadline: new Date(tick1Creation.getTime() + 30 * 60 * 1000),
      respondedAt: tick1Response,
      resolutionDeadline: tick1ResolutionDeadline,
      createdAt: tick1Creation,
    },
  });

  await prisma.ticketComment.createMany({
    data: [
      {
        ticketId: tick1.id,
        authorId: supportUser?.id,
        message: 'Hello Rajesh, our support engineering team has received your ticket. We are checking the diagnostic history for this ThinkBook Pro X1 Carbon.',
        isInternal: false,
        createdAt: tick1Response,
      },
      {
        ticketId: tick1.id,
        authorId: supportUser?.id,
        message: 'Checked warranty: Active standard OEM coverage until May 2028. Eligible for expedited parts dispatch and on-site field tech.',
        isInternal: true,
        createdAt: new Date(tick1Response.getTime() + 5 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.ticketStatusHistory.createMany({
    data: [
      { ticketId: tick1.id, changedById: supportUser?.id, fromStatus: 'OPEN', toStatus: 'TRIAGED', reason: 'Assigned to level 2 hardware support', createdAt: tick1Response },
      { ticketId: tick1.id, changedById: supportUser?.id, fromStatus: 'TRIAGED', toStatus: 'IN_PROGRESS', reason: 'Diagnosis verified and escalated to parts replacement', createdAt: new Date(tick1Response.getTime() + 10 * 60 * 1000) },
    ],
    skipDuplicates: true,
  });

  // Ticket 2: High priority with Expired Warranty
  const tick2Creation = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const tick2ResolutionDeadline = new Date(tick2Creation.getTime() + 8 * 60 * 60 * 1000); // 8h

  const tick2 = await prisma.ticket.upsert({
    where: { organizationId_ticketNumber: { organizationId: org.id, ticketNumber: 'TICK-2026-0002' } },
    update: {},
    create: {
      organizationId: org.id,
      ticketNumber: 'TICK-2026-0002',
      customerId: cust2.id,
      productId: productLegion.id,
      registrationId: reg2.id,
      slaPolicyId: slaMap.get('P2_HIGH'),
      title: 'Right exhaust fan loud grinding noise and GPU thermal throttling',
      description: 'Right cooling fan produces high pitched mechanical grinding noise. GPU temperatures hitting 98C throttling performance.',
      category: 'HARDWARE_FAILURE',
      priority: 'P2_HIGH',
      status: 'TRIAGED',
      source: 'EMAIL',
      responseDeadline: new Date(tick2Creation.getTime() + 2 * 60 * 60 * 1000),
      resolutionDeadline: tick2ResolutionDeadline,
      createdAt: tick2Creation,
    },
  });

  await prisma.ticketComment.create({
    data: {
      ticketId: tick2.id,
      authorId: supportUser?.id,
      message: 'Hardware warranty for SN-LEN-882102 has expired. Customer must approve quotation for replacement dual vapor chamber fan assembly (Part #FAN-LEG-5P).',
      isInternal: true,
      createdAt: new Date(tick2Creation.getTime() + 30 * 60 * 1000),
    },
  });

  // Ticket 3: Low priority General Inquiry - Resolved
  const tick3Creation = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tick3Resolved = new Date(now.getTime() - 18 * 60 * 60 * 1000);

  await prisma.ticket.upsert({
    where: { organizationId_ticketNumber: { organizationId: org.id, ticketNumber: 'TICK-2026-0003' } },
    update: {},
    create: {
      organizationId: org.id,
      ticketNumber: 'TICK-2026-0003',
      customerId: cust1.id,
      assignedToId: supportUser?.id,
      slaPolicyId: slaMap.get('P4_LOW'),
      title: 'Compatibility query: Max supported RAM and SSD speeds',
      description: 'Customer requested official specifications for upgrading to 64GB DDR5 SO-DIMM and secondary PCIe 4.0 NVMe drive.',
      category: 'GENERAL_INQUIRY',
      priority: 'P4_LOW',
      status: 'RESOLVED',
      source: 'PHONE',
      responseDeadline: new Date(tick3Creation.getTime() + 24 * 60 * 60 * 1000),
      respondedAt: new Date(tick3Creation.getTime() + 2 * 60 * 60 * 1000),
      resolutionDeadline: new Date(tick3Creation.getTime() + 72 * 60 * 60 * 1000),
      resolvedAt: tick3Resolved,
      createdAt: tick3Creation,
    },
  });

  // 8. Field Service: Technicians & Work Orders
  console.log('- Seeding Field Service technicians & work orders...');
  const techUser1 = await prisma.user.findUnique({ where: { email: 'tech@orbit.local' } });

  // Create or update tech 1
  let tech1 = null;
  if (techUser1) {
    tech1 = await prisma.technician.upsert({
      where: { userId: techUser1.id },
      update: {},
      create: {
        organizationId: org.id,
        userId: techUser1.id,
        technicianCode: 'TECH-101',
        phone: '+919876543203',
        currentStatus: 'ON_JOB',
        skills: ['HARDWARE_FAILURE', 'LAPTOP_MOTHERBOARD', 'DISPLAY_REPLACEMENT', 'THERMAL_SOLUTIONS'],
        serviceZone: 'Bengaluru Urban - East',
        maxDailyJobs: 5,
        rating: 4.9,
      },
    });
  }

  // Create tech 2 (Suresh Patel)
  const techUser2 = await prisma.user.upsert({
    where: { email: 'tech2@orbit.local' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'tech2@orbit.local',
      firstName: 'Suresh',
      lastName: 'Patel',
      passwordHash,
      phone: '+919876543204',
      status: 'ACTIVE',
    },
  });

  const techRole = await prisma.role.findFirst({ where: { organizationId: org.id, name: 'Technician' } });
  if (techRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: techUser2.id, roleId: techRole.id } },
      update: {},
      create: { userId: techUser2.id, roleId: techRole.id },
    });
  }

  const tech2 = await prisma.technician.upsert({
    where: { userId: techUser2.id },
    update: {},
    create: {
      organizationId: org.id,
      userId: techUser2.id,
      technicianCode: 'TECH-102',
      phone: '+919876543204',
      currentStatus: 'AVAILABLE',
      skills: ['HARDWARE_FAILURE', 'MONITORS', 'THERMAL_SOLUTIONS', 'DESKTOP_WORKSTATIONS'],
      serviceZone: 'Noida - NCR Sector 62',
      maxDailyJobs: 5,
      rating: 4.8,
    },
  });

  // Sample Work Order 1: From Ticket 1 (Critical ThinkBook OLED screen replacement)
  const cust1Address = await prisma.customerAddress.findFirst({ where: { customerId: cust1.id } });
  const cust2Address = await prisma.customerAddress.findFirst({ where: { customerId: cust2.id } });

  const wo1 = await prisma.workOrder.upsert({
    where: { organizationId_workOrderNumber: { organizationId: org.id, workOrderNumber: 'WO-2026-0001' } },
    update: {},
    create: {
      organizationId: org.id,
      workOrderNumber: 'WO-2026-0001',
      ticketId: tick1.id,
      customerId: cust1.id,
      customerAddressId: cust1Address?.id,
      productId: productX1.id,
      registrationId: reg1.id,
      technicianId: tech1?.id,
      technicianUserId: techUser1?.id,
      title: 'On-site 4K OLED Panel Diagnostic & Display Assembly Replacement',
      description: 'Replace flickering OLED screen panel assembly under active manufacturer warranty. Customer confirmed morning site visit.',
      priority: 'CRITICAL',
      status: 'ON_SITE',
      scheduledDate: new Date(),
      timeSlot: '10:00 AM - 01:00 PM',
      customerOtp: '882104',
      travelStartedAt: new Date(now.getTime() - 40 * 60 * 1000),
      arrivedOnSiteAt: new Date(now.getTime() - 15 * 60 * 1000),
      diagnosisNotes: 'Visual inspection confirms panel ribbon cable strain and micro-fracture near lower right bezel hinge.',
    },
  });

  await prisma.workOrderPartUsed.createMany({
    data: [
      {
        workOrderId: wo1.id,
        partNumber: 'PANEL-OLED-14',
        partName: '14" 2.8K OLED Display Matrix Assembly',
        serialNumber: 'PART-SN-99812',
        quantity: 1,
        unitCost: 14500.0,
        warrantyCovered: true,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.workOrderStatusHistory.createMany({
    data: [
      { workOrderId: wo1.id, fromStatus: 'DRAFT', toStatus: 'ASSIGNED', changedById: supportUser?.id, notes: 'Work order dispatched to Ravi Sharma based on skill & zone match' },
      { workOrderId: wo1.id, fromStatus: 'ASSIGNED', toStatus: 'ACCEPTED', changedById: techUser1?.id, notes: 'Technician accepted job on mobile PWA' },
      { workOrderId: wo1.id, fromStatus: 'ACCEPTED', toStatus: 'TRAVELING', changedById: techUser1?.id, notes: 'Technician departed with replacement OLED panel' },
      { workOrderId: wo1.id, fromStatus: 'TRAVELING', toStatus: 'ON_SITE', changedById: techUser1?.id, notes: 'Technician arrived at customer office site' },
    ],
    skipDuplicates: true,
  });

  // Sample Work Order 2: From Ticket 2 (Legion Fan Replacement)
  const wo2 = await prisma.workOrder.upsert({
    where: { organizationId_workOrderNumber: { organizationId: org.id, workOrderNumber: 'WO-2026-0002' } },
    update: {},
    create: {
      organizationId: org.id,
      workOrderNumber: 'WO-2026-0002',
      ticketId: tick2.id,
      customerId: cust2.id,
      customerAddressId: cust2Address?.id,
      productId: productLegion.id,
      registrationId: reg2.id,
      technicianId: tech1?.id,
      technicianUserId: techUser1?.id,
      title: 'Dual Vapor Chamber Fan Replacement & Thermal Repasting',
      description: 'Replace rattling right exhaust cooling fan and apply thermal paste. Out-of-warranty quotation approved by customer.',
      priority: 'HIGH',
      status: 'ASSIGNED',
      scheduledDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      timeSlot: '02:00 PM - 05:00 PM',
      customerOtp: '451920',
    },
  });

  await prisma.workOrderStatusHistory.create({
    data: {
      workOrderId: wo2.id,
      fromStatus: 'DRAFT',
      toStatus: 'ASSIGNED',
      changedById: supportUser?.id,
      notes: 'Scheduled for tomorrow afternoon route',
    },
  });

  // 9. Inventory & Warehouse Ledger
  console.log('- Seeding Inventory hubs, parts catalog, stock balances & ledger...');

  // Warehouses
  const whBlr = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-BLR-01' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-BLR-01',
      name: 'Central Distribution Hub - Bengaluru',
      type: 'CENTRAL_HUB',
      address: 'Plot 42, Phase 1, Electronic City',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560100',
    },
  });

  const whDel = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-DEL-01' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-DEL-01',
      name: 'Northern Regional Logistics Hub - NCR',
      type: 'REGIONAL_DEPOT',
      address: 'C-12, Sector 62, Institutional Area',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201309',
    },
  });

  const whMum = await prisma.warehouse.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'WH-MUM-01' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'WH-MUM-01',
      name: 'Western Regional Depot - Mumbai',
      type: 'REGIONAL_DEPOT',
      address: 'Building 7, MIDC Marol, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400093',
    },
  });

  // Bin Locations for Central Hub
  const binA1 = await prisma.binLocation.upsert({
    where: { warehouseId_code: { warehouseId: whBlr.id, code: 'A1-R02-S3' } },
    update: {},
    create: {
      warehouseId: whBlr.id,
      code: 'A1-R02-S3',
      zone: 'Zone A (OLED & Displays)',
      aisle: 'A1',
      rack: 'R02',
      shelf: 'S3',
    },
  });

  const binB2 = await prisma.binLocation.upsert({
    where: { warehouseId_code: { warehouseId: whBlr.id, code: 'B2-R01-S1' } },
    update: {},
    create: {
      warehouseId: whBlr.id,
      code: 'B2-R01-S1',
      zone: 'Zone B (Thermal Modules)',
      aisle: 'B2',
      rack: 'R01',
      shelf: 'S1',
    },
  });

  // Part Categories
  const catDisplays = await prisma.partCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Display Panels & Digitizers' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Display Panels & Digitizers',
      description: 'OLED, IPS, and high-refresh laptop matrices',
    },
  });

  const catCooling = await prisma.partCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Cooling Fans & Thermal Modules' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Cooling Fans & Thermal Modules',
      description: 'Vapor chambers, heatsinks, and dual fan assemblies',
    },
  });

  const catPower = await prisma.partCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Batteries & Power Adapters' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Batteries & Power Adapters',
      description: 'Internal Li-poly packs and rapid GaN chargers',
    },
  });

  const catStorage = await prisma.partCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Memory & Solid State Storage' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Memory & Solid State Storage',
      description: 'PCIe Gen4/5 NVMe M.2 SSDs and DDR5 SO-DIMMs',
    },
  });

  // Parts Master
  const partsData = [
    {
      partNumber: 'PANEL-OLED-14',
      name: '14" 2.8K OLED Display Matrix Assembly',
      categoryId: catDisplays.id,
      costPrice: 11500.0,
      retailPrice: 14500.0,
      minSafetyStock: 5,
      isSerialTracked: true,
      compatibleModels: ['ORBIT-THINK-X1'],
    },
    {
      partNumber: 'FAN-LEG-5P',
      name: 'Dual Vapor Chamber Dual Fan Assembly',
      categoryId: catCooling.id,
      costPrice: 1800.0,
      retailPrice: 2800.0,
      minSafetyStock: 10,
      isSerialTracked: false,
      compatibleModels: ['ORBIT-LEG-5P'],
    },
    {
      partNumber: 'BAT-THINK-X1',
      name: '57Wh 4-Cell Li-Polymer Battery Pack',
      categoryId: catPower.id,
      costPrice: 3200.0,
      retailPrice: 4600.0,
      minSafetyStock: 8,
      isSerialTracked: true,
      compatibleModels: ['ORBIT-THINK-X1'],
    },
    {
      partNumber: 'SSD-NVME-2TB',
      name: '2TB Gen4x4 NVMe M.2 2280 PCIe SSD',
      categoryId: catStorage.id,
      costPrice: 6800.0,
      retailPrice: 9200.0,
      minSafetyStock: 15,
      isSerialTracked: true,
      compatibleModels: ['ORBIT-THINK-X1', 'ORBIT-LEG-5P'],
    },
    {
      partNumber: 'PWR-135W-USB',
      name: '135W USB-C GaN Rapid Power Adapter',
      categoryId: catPower.id,
      costPrice: 1600.0,
      retailPrice: 2400.0,
      minSafetyStock: 12,
      isSerialTracked: false,
      compatibleModels: ['ORBIT-LEG-5P', 'ORBIT-MON-4K'],
    },
  ];

  const partMap = new Map();
  for (const pd of partsData) {
    const part = await prisma.part.upsert({
      where: { organizationId_partNumber: { organizationId: org.id, partNumber: pd.partNumber } },
      update: {},
      create: {
        organizationId: org.id,
        partNumber: pd.partNumber,
        name: pd.name,
        categoryId: pd.categoryId,
        costPrice: pd.costPrice,
        retailPrice: pd.retailPrice,
        minSafetyStock: pd.minSafetyStock,
        isSerialTracked: pd.isSerialTracked,
        compatibleModels: pd.compatibleModels,
      },
    });
    partMap.set(pd.partNumber, part.id);
  }

  // Stock Balances in Central Hub (WH-BLR-01)
  const blrBalances = [
    { partNumber: 'PANEL-OLED-14', binId: binA1.id, onHand: 18, reserved: 2 },
    { partNumber: 'FAN-LEG-5P', binId: binB2.id, onHand: 35, reserved: 1 },
    { partNumber: 'BAT-THINK-X1', binId: null, onHand: 22, reserved: 0 },
    { partNumber: 'SSD-NVME-2TB', binId: null, onHand: 40, reserved: 0 },
    { partNumber: 'PWR-135W-USB', binId: null, onHand: 50, reserved: 0 },
  ];

  for (const b of blrBalances) {
    const pId = partMap.get(b.partNumber);
    const available = b.onHand - b.reserved;
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_partId: {
          warehouseId: whBlr.id,
          partId: pId,
        },
      },
      update: {
        quantityOnHand: b.onHand,
        quantityReserved: b.reserved,
        quantityAvailable: available,
        binLocationId: b.binId,
      },
      create: {
        organizationId: org.id,
        warehouseId: whBlr.id,
        partId: pId,
        binLocationId: b.binId,
        quantityOnHand: b.onHand,
        quantityReserved: b.reserved,
        quantityAvailable: available,
      },
    });
  }

  // Stock Balances in Northern Hub (WH-DEL-01)
  const delBalances = [
    { partNumber: 'PANEL-OLED-14', onHand: 8, reserved: 0 },
    { partNumber: 'FAN-LEG-5P', onHand: 12, reserved: 0 },
    { partNumber: 'BAT-THINK-X1', onHand: 10, reserved: 0 },
  ];

  for (const b of delBalances) {
    const pId = partMap.get(b.partNumber);
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_partId: {
          warehouseId: whDel.id,
          partId: pId,
        },
      },
      update: {
        quantityOnHand: b.onHand,
        quantityReserved: b.reserved,
        quantityAvailable: b.onHand,
      },
      create: {
        organizationId: org.id,
        warehouseId: whDel.id,
        partId: pId,
        quantityOnHand: b.onHand,
        quantityReserved: b.reserved,
        quantityAvailable: b.onHand,
      },
    });
  }

  // Stock Movements Ledger
  await prisma.stockMovement.upsert({
    where: { organizationId_movementNumber: { organizationId: org.id, movementNumber: 'MOV-2026-0001' } },
    update: {},
    create: {
      organizationId: org.id,
      movementNumber: 'MOV-2026-0001',
      partId: partMap.get('PANEL-OLED-14'),
      destinationWarehouseId: whBlr.id,
      type: 'GOODS_RECEIPT',
      quantity: 20,
      unitCost: 11500.0,
      referenceNotes: 'Initial PO receipt from OEM display fab (PO-2026-0101)',
      actorId: supportUser?.id,
    },
  });

  await prisma.stockMovement.upsert({
    where: { organizationId_movementNumber: { organizationId: org.id, movementNumber: 'MOV-2026-0002' } },
    update: {},
    create: {
      organizationId: org.id,
      movementNumber: 'MOV-2026-0002',
      partId: partMap.get('PANEL-OLED-14'),
      sourceWarehouseId: whBlr.id,
      workOrderId: wo1.id,
      type: 'RESERVATION',
      quantity: 1,
      unitCost: 11500.0,
      serialNumber: 'PART-SN-99812',
      referenceNotes: 'Reserved for critical on-site work order WO-2026-0001 (ThinkBook screen)',
      actorId: supportUser?.id,
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. Logistics & Fleet Seeding (Milestone 6)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('- Seeding Fleet vehicles, shipments & live tracking events...');

  const vehicle1 = await prisma.vehicle.upsert({
    where: {
      organizationId_registrationNumber: {
        organizationId: org.id,
        registrationNumber: 'KA-01-EQ-9082',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      registrationNumber: 'KA-01-EQ-9082',
      model: 'Tata Ace EV Rapid Service Van',
      type: 'VAN',
      status: 'ON_ROUTE',
      capacityKg: 850,
      currentDriverName: 'Suresh Gowda',
      currentDriverPhone: '+919876543110',
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: {
      organizationId_registrationNumber: {
        organizationId: org.id,
        registrationNumber: 'DL-03-CX-4102',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      registrationNumber: 'DL-03-CX-4102',
      model: 'Mahindra Bolero Maxi Truck',
      type: 'TRUCK',
      status: 'AVAILABLE',
      capacityKg: 1500,
      currentDriverName: 'Rajesh Pal',
      currentDriverPhone: '+919876543111',
    },
  });

  const shipment1 = await prisma.shipment.upsert({
    where: {
      organizationId_shipmentNumber: {
        organizationId: org.id,
        shipmentNumber: 'SHP-2026-0001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      shipmentNumber: 'SHP-2026-0001',
      trackingNumber: 'TRK-BLUEDART-992144',
      type: 'FORWARD_PART_DISPATCH',
      carrier: 'BLUE_DART',
      status: 'IN_TRANSIT',
      originWarehouseId: whBlr.id,
      workOrderId: wo1.id,
      vehicleId: vehicle1.id,
      destinationAddress: 'Tech Mahindra SEZ, Tower 4, Floor 3',
      destinationCity: 'Bengaluru',
      destinationState: 'Karnataka',
      destinationPostalCode: '560100',
      recipientName: 'Vikram Malhotra',
      recipientPhone: '+919876543210',
      estimatedDelivery: new Date(Date.now() + 4 * 3600 * 1000),
      notes: 'Urgent OLED display dispatch for critical executive laptop repair',
    },
  });

  await prisma.shipmentItem.createMany({
    data: [
      {
        shipmentId: shipment1.id,
        partId: partMap.get('PANEL-OLED-14')!,
        quantity: 1,
        serialNumbers: ['SN-OLED-2026-092'],
      },
    ],
    skipDuplicates: true,
  });

  await prisma.shipmentTrackingEvent.createMany({
    data: [
      {
        shipmentId: shipment1.id,
        status: 'READY_FOR_PICKUP',
        location: 'Central Distribution Hub (WH-BLR-01)',
        latitude: 12.8452,
        longitude: 77.6602,
        description: 'Consignment packaged, sealed and barcoded for dispatch',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000),
      },
      {
        shipmentId: shipment1.id,
        status: 'DISPATCHED',
        location: 'Electronic City Toll Plaza Hub',
        latitude: 12.8523,
        longitude: 77.6681,
        description: 'Van departed warehouse, handed over to courier transit network',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        shipmentId: shipment1.id,
        status: 'IN_TRANSIT',
        location: 'Hosur Road Sorting Facility',
        latitude: 12.8791,
        longitude: 77.6432,
        description: 'In transit to Tech Mahindra delivery zone',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  // Reverse Logistics Defective Return Shipment
  const shipment2 = await prisma.shipment.upsert({
    where: {
      organizationId_shipmentNumber: {
        organizationId: org.id,
        shipmentNumber: 'SHP-2026-0002',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      shipmentNumber: 'SHP-2026-0002',
      trackingNumber: 'TRK-DELHIVERY-440182',
      type: 'REVERSE_DEFECTIVE_RETURN',
      carrier: 'DELHIVERY',
      status: 'DELIVERED',
      originWarehouseId: whDel.id,
      destinationAddress: 'Lenovo Central Warranty RMA Center, Peenya Industrial Area',
      destinationCity: 'Bengaluru',
      destinationState: 'Karnataka',
      destinationPostalCode: '560058',
      recipientName: 'OEM RMA Inwarding Desk',
      recipientPhone: '+919876543299',
      estimatedDelivery: new Date(Date.now() - 24 * 3600 * 1000),
      actualDelivery: new Date(Date.now() - 18 * 3600 * 1000),
      proofOfDeliverySignee: 'Ramesh K. (Security/Gate 2)',
      proofOfDeliveryNotes: 'Package intact, RMA #RMA-8812 verified and stamped.',
      notes: 'Defective cracked display returned from completed customer visit',
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. Billing & Finance Seeding (Milestone 7)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('- Seeding Invoices, line items & payment transactions...');

  const inv1 = await prisma.invoice.upsert({
    where: {
      organizationId_invoiceNumber: {
        organizationId: org.id,
        invoiceNumber: 'INV-2026-0001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      invoiceNumber: 'INV-2026-0001',
      customerId: cust1.id,
      workOrderId: wo1.id,
      status: 'PAID',
      subtotal: 1850.0,
      taxAmount: 333.0,
      totalAmount: 2183.0,
      amountPaid: 2183.0,
      balanceDue: 0.0,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      paidAt: new Date(Date.now() - 2 * 3600 * 1000),
      notes: 'Hardware warranty covered parts (OLED 100% absorbed). On-site expedited visit charge applicable.',
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: inv1.id,
        partId: partMap.get('PANEL-OLED-14'),
        description: '14" 2.8K OLED Display Matrix Assembly (100% OEM Warranty Claim)',
        quantity: 1,
        unitPrice: 16500.0,
        taxRate: 0.0,
        amount: 0.0,
        isWarrantyCovered: true,
      },
      {
        invoiceId: inv1.id,
        description: 'Tier-1 Certified Engineer On-Site Visit & Diagnostics Fee',
        quantity: 1,
        unitPrice: 1850.0,
        taxRate: 18.0,
        amount: 1850.0,
        isWarrantyCovered: false,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.payment.upsert({
    where: {
      organizationId_paymentNumber: {
        organizationId: org.id,
        paymentNumber: 'PAY-2026-0001',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      invoiceId: inv1.id,
      paymentNumber: 'PAY-2026-0001',
      amount: 2183.0,
      paymentMethod: 'UPI',
      transactionRef: 'UPI/20261117/HDFC/998124801',
      status: 'SUCCESS',
      paidAt: new Date(Date.now() - 2 * 3600 * 1000),
      notes: 'Customer paid via Google Pay QR on technician mobile terminal.',
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: {
      organizationId_invoiceNumber: {
        organizationId: org.id,
        invoiceNumber: 'INV-2026-0002',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      invoiceNumber: 'INV-2026-0002',
      customerId: cust2.id,
      workOrderId: wo2.id,
      status: 'ISSUED',
      subtotal: 5800.0,
      taxAmount: 1044.0,
      totalAmount: 6844.0,
      amountPaid: 0.0,
      balanceDue: 6844.0,
      dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      notes: 'Out-of-warranty battery replacement & thermal overhaul service.',
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      {
        invoiceId: inv2.id,
        partId: partMap.get('BAT-THINK-X1'),
        description: '57Wh 4-Cell Li-Polymer Battery Pack Replacement',
        quantity: 1,
        unitPrice: 4600.0,
        taxRate: 18.0,
        amount: 4600.0,
        isWarrantyCovered: false,
      },
      {
        invoiceId: inv2.id,
        description: 'Heatsink Thermal Paste Service & Labor',
        quantity: 1,
        unitPrice: 1200.0,
        taxRate: 18.0,
        amount: 1200.0,
        isWarrantyCovered: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete with CRM, Tickets, Field Ops, Inventory, Logistics & Billing!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
