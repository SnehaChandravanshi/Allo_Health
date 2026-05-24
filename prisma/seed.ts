import { getPrismaClient } from '../src/lib/prisma';
import 'dotenv/config';

const client = getPrismaClient();
if (!client) {
  throw new Error('❌ Error: DATABASE_URL must be configured in .env to run the seed script.');
}
const prisma = client;

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records (Cascade delete should handle stocks/reservations)
  await prisma.reservation.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.idempotencyKey.deleteMany({});

  console.log('Cleaned old database records.');

  // 2. Create Warehouses
  const whEast = await prisma.warehouse.create({
    data: {
      id: 'wh-east',
      name: 'East Coast Logistics Hub',
      location: 'Boston, MA'
    }
  });

  const whWest = await prisma.warehouse.create({
    data: {
      id: 'wh-west',
      name: 'West Coast Distribution Center',
      location: 'Oakland, CA'
    }
  });

  const whCentral = await prisma.warehouse.create({
    data: {
      id: 'wh-central',
      name: 'Midwest Fulfillment Center',
      location: 'Chicago, IL'
    }
  });

  console.log('Created Warehouses.');

  // 3. Create Products
  const prod1 = await prisma.product.create({
    data: {
      id: 'prod-1',
      name: 'Allo Comprehensive STI Test Kit',
      sku: 'ALLO-STD-TEST',
      description: 'Discreet home screening for Chlamydia, Gonorrhea, Syphilis, HIV, and Hepatitis. Simple, accurate, and completely confidential.',
      price: 79.00,
      imageUrl: '/images/sti_test_kit.png'
    }
  });

  const prod2 = await prisma.product.create({
    data: {
      id: 'prod-2',
      name: 'Allo Tadalafil Daily Plan',
      sku: 'ALLO-TADA-PLAN',
      description: 'Custom-dosed prescription plan for Erectile Dysfunction and Libido support. Designed to restore confidence and sexual wellness.',
      price: 49.00,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'
    }
  });

  const prod3 = await prisma.product.create({
    data: {
      id: 'prod-3',
      name: 'Allo Progressive Dilator Set',
      sku: 'ALLO-DIL-SET',
      description: 'Medical-grade silicone progressive dilator set designed by clinical therapists to treat vaginismus and intimate discomfort.',
      price: 65.00,
      imageUrl: '/images/dilator_set.png'
    }
  });

  const prod4 = await prisma.product.create({
    data: {
      id: 'prod-4',
      name: 'Allo PE Delay Spray',
      sku: 'ALLO-DELAY-SPRAY',
      description: 'Fast-acting, clinically formulated delay spray designed to treat premature ejaculation and improve sexual endurance.',
      price: 29.00,
      imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&auto=format&fit=crop&q=60'
    }
  });

  const prod5 = await prisma.product.create({
    data: {
      id: 'prod-5',
      name: 'Allo CBT Recovery Kit',
      sku: 'ALLO-CBT-KIT',
      description: 'Cognitive Behavioral Therapy (CBT) guide and habit-tracking workbook designed to overcome compulsive porn addiction.',
      price: 39.00,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60'
    }
  });

  console.log('Created Products.');

  // 4. Create Stocks
  const stocks = [
    // Product 1 (Wellness Tracker)
    { productId: prod1.id, warehouseId: whEast.id, totalUnits: 15 },
    { productId: prod1.id, warehouseId: whWest.id, totalUnits: 10 },
    { productId: prod1.id, warehouseId: whCentral.id, totalUnits: 8 },

    // Product 2 (Sleep Mask - Low Stock)
    { productId: prod2.id, warehouseId: whEast.id, totalUnits: 2 },
    { productId: prod2.id, warehouseId: whWest.id, totalUnits: 1 },
    { productId: prod2.id, warehouseId: whCentral.id, totalUnits: 0 },

    // Product 3 (Supplement Dispenser - Out of Stock)
    { productId: prod3.id, warehouseId: whEast.id, totalUnits: 0 },
    { productId: prod3.id, warehouseId: whWest.id, totalUnits: 0 },
    { productId: prod3.id, warehouseId: whCentral.id, totalUnits: 0 },

    // Product 4 (Light Lamp)
    { productId: prod4.id, warehouseId: whEast.id, totalUnits: 25 },
    { productId: prod4.id, warehouseId: whWest.id, totalUnits: 30 },
    { productId: prod4.id, warehouseId: whCentral.id, totalUnits: 15 },

    // Product 5 (Seat Cushion)
    { productId: prod5.id, warehouseId: whEast.id, totalUnits: 8 },
    { productId: prod5.id, warehouseId: whWest.id, totalUnits: 12 },
    { productId: prod5.id, warehouseId: whCentral.id, totalUnits: 6 }
  ];

  for (const s of stocks) {
    await prisma.stock.create({
      data: {
        productId: s.productId,
        warehouseId: s.warehouseId,
        totalUnits: s.totalUnits,
        reservedUnits: 0
      }
    });
  }

  console.log('Created Stocks.');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
