import { getPrismaClient } from './prisma';
import { ReservationStatus } from '@prisma/client';

// Define the shape of our records for the mock store
export interface ProductMock {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
}

export interface WarehouseMock {
  id: string;
  name: string;
  location: string | null;
}

export interface StockMock {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
}

export interface ReservationMock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: Date;
  idempotencyKey: string | null;
  createdAt: Date;
}

export interface IdempotencyMock {
  key: string;
  responseStatus: number;
  responseBody: string;
  createdAt: Date;
}

// In-memory mock database state
const INITIAL_PRODUCTS: ProductMock[] = [
  {
    id: 'prod-1',
    name: 'Allo Comprehensive STI Test Kit',
    sku: 'ALLO-STD-TEST',
    description: 'Discreet home screening for Chlamydia, Gonorrhea, Syphilis, HIV, and Hepatitis. Simple, accurate, and completely confidential.',
    price: 79.00,
    imageUrl: '/images/sti_test_kit.png'
  },
  {
    id: 'prod-2',
    name: 'Allo Tadalafil Daily Plan',
    sku: 'ALLO-TADA-PLAN',
    description: 'Custom-dosed prescription plan for Erectile Dysfunction and Libido support. Designed to restore confidence and sexual wellness.',
    price: 49.00,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-3',
    name: 'Allo Progressive Dilator Set',
    sku: 'ALLO-DIL-SET',
    description: 'Medical-grade silicone progressive dilator set designed by clinical therapists to treat vaginismus and intimate discomfort.',
    price: 65.00,
    imageUrl: '/images/dilator_set.png'
  },
  {
    id: 'prod-4',
    name: 'Allo PE Delay Spray',
    sku: 'ALLO-DELAY-SPRAY',
    description: 'Fast-acting, clinically formulated delay spray designed to treat premature ejaculation and improve sexual endurance.',
    price: 29.00,
    imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'prod-5',
    name: 'Allo CBT Recovery Kit',
    sku: 'ALLO-CBT-KIT',
    description: 'Cognitive Behavioral Therapy (CBT) guide and habit-tracking workbook designed to overcome compulsive porn addiction.',
    price: 39.00,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60'
  }
];

const INITIAL_WAREHOUSES: WarehouseMock[] = [
  { id: 'wh-east', name: 'East Coast Logistics Hub', location: 'Boston, MA' },
  { id: 'wh-west', name: 'West Coast Distribution Center', location: 'Oakland, CA' },
  { id: 'wh-central', name: 'Midwest Fulfillment Center', location: 'Chicago, IL' }
];

// Seed stock levels
const INITIAL_STOCKS: StockMock[] = [
  // Product 1 - Wellness Tracker (plentiful stock)
  { id: 's1-1', productId: 'prod-1', warehouseId: 'wh-east', totalUnits: 15, reservedUnits: 0 },
  { id: 's1-2', productId: 'prod-1', warehouseId: 'wh-west', totalUnits: 10, reservedUnits: 0 },
  { id: 's1-3', productId: 'prod-1', warehouseId: 'wh-central', totalUnits: 8, reservedUnits: 0 },

  // Product 2 - Sleep Mask (very low stock - ideal for race condition testing!)
  { id: 's2-1', productId: 'prod-2', warehouseId: 'wh-east', totalUnits: 2, reservedUnits: 0 },
  { id: 's2-2', productId: 'prod-2', warehouseId: 'wh-west', totalUnits: 1, reservedUnits: 0 },
  { id: 's2-3', productId: 'prod-2', warehouseId: 'wh-central', totalUnits: 0, reservedUnits: 0 },

  // Product 3 - Supplement Dispenser (out of stock everywhere)
  { id: 's3-1', productId: 'prod-3', warehouseId: 'wh-east', totalUnits: 0, reservedUnits: 0 },
  { id: 's3-2', productId: 'prod-3', warehouseId: 'wh-west', totalUnits: 0, reservedUnits: 0 },
  { id: 's3-3', productId: 'prod-3', warehouseId: 'wh-central', totalUnits: 0, reservedUnits: 0 },

  // Product 4 - Light Lamp
  { id: 's4-1', productId: 'prod-4', warehouseId: 'wh-east', totalUnits: 25, reservedUnits: 0 },
  { id: 's4-2', productId: 'prod-4', warehouseId: 'wh-west', totalUnits: 30, reservedUnits: 0 },
  { id: 's4-3', productId: 'prod-4', warehouseId: 'wh-central', totalUnits: 15, reservedUnits: 0 },

  // Product 5 - Seat Cushion
  { id: 's5-1', productId: 'prod-5', warehouseId: 'wh-east', totalUnits: 8, reservedUnits: 0 },
  { id: 's5-2', productId: 'prod-5', warehouseId: 'wh-west', totalUnits: 12, reservedUnits: 0 },
  { id: 's5-3', productId: 'prod-5', warehouseId: 'wh-central', totalUnits: 6, reservedUnits: 0 }
];

class MockDb {
  products: ProductMock[] = [...INITIAL_PRODUCTS];
  warehouses: WarehouseMock[] = [...INITIAL_WAREHOUSES];
  stocks: StockMock[] = [...INITIAL_STOCKS];
  reservations: ReservationMock[] = [];
  idempotencyKeys: IdempotencyMock[] = [];
}

const mockStore = new MockDb();

// Mutex lock to prevent race conditions in the in-memory mock store
class Mutex {
  private queue: Promise<any> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      try {
        return await fn();
      } catch (err) {
        throw err;
      }
    });
    this.queue = next.catch(() => {});
    return next;
  }
}

const mockMutex = new Mutex();

// Dynamic proxy to forward calls to the lazily instantiated Prisma Client
const prisma = new Proxy({} as any, {
  get(target, prop) {
    const client = getPrismaClient();
    if (!client) {
      throw new Error('Database client not available (DATABASE_URL not configured)');
    }
    return (client as any)[prop];
  }
});

// Flag to track database connectivity. If it fails once, we fall back to mock
let isDatabaseAvailable = true;
let checkedDb = false;
let lastCheckedDbTime = 0;
let dbConnectionError: string | null = null;

// Helper to determine if we should fall back to mock
async function checkDatabaseState(): Promise<boolean> {
  const now = Date.now();
  // Allow retrying connection after 10 seconds if it was previously unavailable (e.g. database woke up)
  if (checkedDb && (isDatabaseAvailable || (now - lastCheckedDbTime < 10000))) {
    return isDatabaseAvailable;
  }
  try {
    const client = getPrismaClient();
    if (!client) {
      isDatabaseAvailable = false;
      dbConnectionError = 'DATABASE_URL environment variable is not configured on the server.';
      checkedDb = true;
      lastCheckedDbTime = now;
      return false;
    }
    
    // Test database connectivity with an 8-second timeout
    const testConnection = async () => {
      try {
        await client.$queryRaw`SELECT 1`;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err.message || String(err) };
      }
    };

    const race = await Promise.race([
      testConnection(),
      new Promise<{ success: boolean; error: string | null }>((resolve) => 
        setTimeout(() => resolve({ success: false, error: 'Connection timeout (8 seconds exceeded).' }), 8000)
      )
    ]);

    isDatabaseAvailable = race.success;
    dbConnectionError = race.error;
  } catch (error: any) {
    isDatabaseAvailable = false;
    dbConnectionError = error.message || String(error);
  }
  checkedDb = true;
  lastCheckedDbTime = now;
  if (!isDatabaseAvailable) {
    console.warn(`⚠️ PostgreSQL database connection failed: ${dbConnectionError}. Falling back to the in-memory Mock Store for the demo.`);
  } else {
    console.log('✅ PostgreSQL database connection established successfully. Live Mode Active.');
    dbConnectionError = null;
  }
  return isDatabaseAvailable;
}

// Lazy cleanup helper for mock reservations
function cleanupExpiredReservationsMockSync() {
  const now = new Date();
  const expired = mockStore.reservations.filter(
    (r) => r.status === 'PENDING' && r.expiresAt < now
  );

  for (const r of expired) {
    r.status = 'RELEASED';
    const stock = mockStore.stocks.find(
      (s) => s.productId === r.productId && s.warehouseId === r.warehouseId
    );
    if (stock) {
      stock.reservedUnits = Math.max(0, stock.reservedUnits - r.quantity);
    }
  }
}

export const inventoryService = {
  isMockMode: async (): Promise<boolean> => {
    return !(await checkDatabaseState());
  },

  getDbConnectionError: async (): Promise<string | null> => {
    if (!checkedDb) {
      await checkDatabaseState();
    }
    return dbConnectionError;
  },

  resetMockDb: () => {
    mockStore.products = [...INITIAL_PRODUCTS];
    mockStore.warehouses = [...INITIAL_WAREHOUSES];
    mockStore.stocks = [...INITIAL_STOCKS];
    mockStore.reservations = [];
    mockStore.idempotencyKeys = [];
  },

  resetDbState: async () => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        await prisma.reservation.deleteMany({});
        await prisma.idempotencyKey.deleteMany({});
        await prisma.stock.updateMany({
          data: {
            reservedUnits: 0
          }
        });
      } catch (error) {
        console.error('Failed to reset PostgreSQL database state:', error);
      }
    }
    mockStore.products = [...INITIAL_PRODUCTS];
    mockStore.warehouses = [...INITIAL_WAREHOUSES];
    mockStore.stocks = [...INITIAL_STOCKS];
    mockStore.reservations = [];
    mockStore.idempotencyKeys = [];
  },

  getWarehouses: async () => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        const dbWarehouses = await prisma.warehouse.findMany({
          include: {
            stocks: {
              include: {
                product: true
              }
            }
          },
          orderBy: { name: 'asc' }
        });
        
        return dbWarehouses.map((w: any) => ({
          ...w,
          stocks: w.stocks.map((s: any) => ({
            ...s,
            availableUnits: Math.max(0, s.totalUnits - s.reservedUnits)
          }))
        }));
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database query failed, falling back to mock:', error);
      }
    }
    // Return Mock
    return mockStore.warehouses.map((w: any) => {
      const stocks = mockStore.stocks
        .filter((s: any) => s.warehouseId === w.id)
        .map((s: any) => {
          const prod = mockStore.products.find((p: any) => p.id === s.productId);
          return {
            id: s.id,
            productId: s.productId,
            totalUnits: s.totalUnits,
            reservedUnits: s.reservedUnits,
            availableUnits: Math.max(0, s.totalUnits - s.reservedUnits),
            product: prod || null
          };
        });
      return {
        ...w,
        stocks
      };
    });
  },

  getProducts: async () => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        // Lazily clean up expired reservations first so available counts are up-to-date
        await inventoryService.cleanupExpiredReservations();

        const dbProducts = await prisma.product.findMany({
          include: {
            stocks: {
              include: {
                warehouse: true
              }
            }
          },
          orderBy: { name: 'asc' }
        });

        return dbProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          price: p.price,
          imageUrl: p.imageUrl,
          stocks: p.stocks.map((s: any) => ({
            id: s.id,
            warehouseId: s.warehouseId,
            warehouseName: s.warehouse.name,
            totalUnits: s.totalUnits,
            reservedUnits: s.reservedUnits,
            availableUnits: Math.max(0, s.totalUnits - s.reservedUnits)
          }))
        }));
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database query failed, falling back to mock:', error);
      }
    }

    // Return Mock
    cleanupExpiredReservationsMockSync();
    return mockStore.products.map((p) => {
      const stocks = mockStore.stocks
        .filter((s) => s.productId === p.id)
        .map((s) => {
          const wh = mockStore.warehouses.find((w) => w.id === s.warehouseId);
          return {
            id: s.id,
            warehouseId: s.warehouseId,
            warehouseName: wh ? wh.name : 'Unknown Warehouse',
            totalUnits: s.totalUnits,
            reservedUnits: s.reservedUnits,
            availableUnits: Math.max(0, s.totalUnits - s.reservedUnits)
          };
        });

      return {
        ...p,
        stocks
      };
    });
  },

  getProductById: async (id: string) => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            stocks: {
              include: {
                warehouse: true
              }
            }
          }
        });
        if (product) {
          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            stocks: product.stocks.map((s: any) => ({
              id: s.id,
              warehouseId: s.warehouseId,
              warehouseName: s.warehouse.name,
              totalUnits: s.totalUnits,
              reservedUnits: s.reservedUnits,
              availableUnits: Math.max(0, s.totalUnits - s.reservedUnits)
            }))
          };
        }
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database query failed, falling back to mock:', error);
      }
    }

    // Mock Fallback
    cleanupExpiredReservationsMockSync();
    const product = mockStore.products.find((p) => p.id === id);
    if (!product) return null;

    const stocks = mockStore.stocks
      .filter((s) => s.productId === product.id)
      .map((s) => {
        const wh = mockStore.warehouses.find((w) => w.id === s.warehouseId);
        return {
          id: s.id,
          warehouseId: s.warehouseId,
          warehouseName: wh ? wh.name : 'Unknown Warehouse',
          totalUnits: s.totalUnits,
          reservedUnits: s.reservedUnits,
          availableUnits: Math.max(0, s.totalUnits - s.reservedUnits)
        };
      });

    return {
      ...product,
      stocks
    };
  },

  getReservation: async (id: string) => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        const res = await prisma.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true }
        });
        if (res) {
          // If pending and expired, check if we should return expired
          const now = new Date();
          const isExpired = res.status === 'PENDING' && res.expiresAt < now;
          return {
            id: res.id,
            productId: res.productId,
            productName: res.product.name,
            warehouseId: res.warehouseId,
            warehouseName: res.warehouse.name,
            quantity: res.quantity,
            status: isExpired ? ('RELEASED' as const) : (res.status as 'PENDING' | 'CONFIRMED' | 'RELEASED'),
            expiresAt: res.expiresAt,
            isExpired: isExpired || res.status === 'RELEASED',
            createdAt: res.createdAt
          };
        }
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database query failed, falling back to mock:', error);
      }
    }

    // Mock
    cleanupExpiredReservationsMockSync();
    const res = mockStore.reservations.find((r) => r.id === id);
    if (!res) return null;

    const prod = mockStore.products.find((p) => p.id === res.productId);
    const wh = mockStore.warehouses.find((w) => w.id === res.warehouseId);
    const now = new Date();
    const isExpired = res.status === 'PENDING' && res.expiresAt < now;

    return {
      id: res.id,
      productId: res.productId,
      productName: prod ? prod.name : 'Unknown Product',
      warehouseId: res.warehouseId,
      warehouseName: wh ? wh.name : 'Unknown Warehouse',
      quantity: res.quantity,
      status: isExpired ? 'RELEASED' : res.status,
      expiresAt: res.expiresAt,
      isExpired: isExpired || res.status === 'RELEASED',
      createdAt: res.createdAt
    };
  },

  createReservation: async (data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    idempotencyKey?: string;
  }) => {
    const { productId, warehouseId, quantity, idempotencyKey } = data;
    const expiryDurationMs = 10 * 60 * 1000; // 10 minutes

    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        return await prisma.$transaction(async (tx: any) => {
          // 1. Idempotency Check
          if (idempotencyKey) {
            const cached = await tx.idempotencyKey.findUnique({
              where: { key: idempotencyKey }
            });
            if (cached) {
              return {
                isIdempotent: true,
                status: cached.responseStatus,
                body: JSON.parse(cached.responseBody)
              };
            }
          }

          // 2. Perform lazy cleanup of expired reservations for this product and warehouse
          const now = new Date();
          const expiredReservations = await tx.reservation.findMany({
            where: {
              productId,
              warehouseId,
              status: 'PENDING',
              expiresAt: { lt: now }
            }
          });

          if (expiredReservations.length > 0) {
            const expiredQty = expiredReservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
            const expiredIds = expiredReservations.map((r: any) => r.id);

            await tx.reservation.updateMany({
              where: { id: { in: expiredIds } },
              data: { status: 'RELEASED' }
            });

            await tx.stock.update({
              where: { productId_warehouseId: { productId, warehouseId } },
              data: { reservedUnits: { decrement: expiredQty } }
            });
          }

          // 3. Lock the Stock row for update (Postgres row lock!)
          const rawStocks = await tx.$queryRaw<any[]>`
            SELECT "id", "totalUnits", "reservedUnits"
            FROM "Stock"
            WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
            FOR UPDATE
          `;

          if (rawStocks.length === 0) {
            const res = { error: 'Product is not stocked in this warehouse.', code: 404 };
            if (idempotencyKey) {
              await tx.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  responseStatus: 404,
                  responseBody: JSON.stringify(res)
                }
              });
            }
            return { status: 404, body: res };
          }

          const stockRow = rawStocks[0];
          const available = stockRow.totalUnits - stockRow.reservedUnits;

          if (available < quantity) {
            const res = { error: 'Insufficient stock available for reservation.', code: 409 };
            if (idempotencyKey) {
              await tx.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  responseStatus: 409,
                  responseBody: JSON.stringify(res)
                }
              });
            }
            return { status: 409, body: res };
          }

          // 4. Update the stock reserved count
          await tx.stock.update({
            where: { id: stockRow.id },
            data: { reservedUnits: { increment: quantity } }
          });

          // 5. Create reservation
          const expiresAt = new Date(Date.now() + expiryDurationMs);
          const reservation = await tx.reservation.create({
            data: {
              productId,
              warehouseId,
              quantity,
              status: 'PENDING',
              expiresAt,
              idempotencyKey
            }
          });

          const successRes = {
            id: reservation.id,
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
            quantity: reservation.quantity,
            status: reservation.status,
            expiresAt: reservation.expiresAt,
            createdAt: reservation.createdAt
          };

          // 6. Store in idempotency store
          if (idempotencyKey) {
            await tx.idempotencyKey.create({
              data: {
                key: idempotencyKey,
                responseStatus: 201,
                responseBody: JSON.stringify(successRes)
              }
            });
          }

          return { status: 201, body: successRes };
        });
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database transaction failed, falling back to mock:', error);
      }
    }

    // In-memory mock with Mutex protection to ensure correctness under concurrency
    return await mockMutex.runExclusive(async () => {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const cached = mockStore.idempotencyKeys.find((k) => k.key === idempotencyKey);
        if (cached) {
          return {
            isIdempotent: true,
            status: cached.responseStatus,
            body: JSON.parse(cached.responseBody)
          };
        }
      }

      // 2. Cleanup expired reservations in-memory
      cleanupExpiredReservationsMockSync();

      // 3. Find stock row
      const stock = mockStore.stocks.find(
        (s) => s.productId === productId && s.warehouseId === warehouseId
      );

      if (!stock) {
        const res = { error: 'Product is not stocked in this warehouse.', code: 404 };
        if (idempotencyKey) {
          mockStore.idempotencyKeys.push({
            key: idempotencyKey,
            responseStatus: 404,
            responseBody: JSON.stringify(res),
            createdAt: new Date()
          });
        }
        return { status: 404, body: res };
      }

      const available = stock.totalUnits - stock.reservedUnits;
      if (available < quantity) {
        const res = { error: 'Insufficient stock available for reservation.', code: 409 };
        if (idempotencyKey) {
          mockStore.idempotencyKeys.push({
            key: idempotencyKey,
            responseStatus: 409,
            responseBody: JSON.stringify(res),
            createdAt: new Date()
          });
        }
        return { status: 409, body: res };
      }

      // 4. Update reserved count
      stock.reservedUnits += quantity;

      // 5. Create reservation
      const expiresAt = new Date(Date.now() + expiryDurationMs);
      const newRes: ReservationMock = {
        id: 'res-' + Math.random().toString(36).substr(2, 9),
        productId,
        warehouseId,
        quantity,
        status: 'PENDING',
        expiresAt,
        idempotencyKey: idempotencyKey || null,
        createdAt: new Date()
      };
      mockStore.reservations.push(newRes);

      const successRes = {
        id: newRes.id,
        productId: newRes.productId,
        warehouseId: newRes.warehouseId,
        quantity: newRes.quantity,
        status: newRes.status,
        expiresAt: newRes.expiresAt,
        createdAt: newRes.createdAt
      };

      // 6. Cache idempotency key
      if (idempotencyKey) {
        mockStore.idempotencyKeys.push({
          key: idempotencyKey,
          responseStatus: 201,
          responseBody: JSON.stringify(successRes),
          createdAt: new Date()
        });
      }

      return { status: 201, body: successRes };
    });
  },

  confirmReservation: async (id: string, idempotencyKey?: string) => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        return await prisma.$transaction(async (tx: any) => {
          // 1. Idempotency Check
          if (idempotencyKey) {
            const cached = await tx.idempotencyKey.findUnique({
              where: { key: idempotencyKey }
            });
            if (cached) {
              return {
                isIdempotent: true,
                status: cached.responseStatus,
                body: JSON.parse(cached.responseBody)
              };
            }
          }

          // 2. Query reservation row with lock
          const rawReservations = await tx.$queryRaw<any[]>`
            SELECT * FROM "Reservation" WHERE "id" = ${id} FOR UPDATE
          `;

          if (rawReservations.length === 0) {
            const res = { error: 'Reservation not found.', code: 404 };
            if (idempotencyKey) {
              await tx.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  responseStatus: 404,
                  responseBody: JSON.stringify(res)
                }
              });
            }
            return { status: 404, body: res };
          }

          const reservation = rawReservations[0];
          const now = new Date();

          // If already confirmed, return success (idempotent confirm)
          if (reservation.status === 'CONFIRMED') {
            const successRes = { message: 'Reservation already confirmed.', id: reservation.id };
            if (idempotencyKey) {
              await tx.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  responseStatus: 200,
                  responseBody: JSON.stringify(successRes)
                }
              });
            }
            return { status: 200, body: successRes };
          }

          // Check if expired or released
          const isExpired = reservation.status === 'PENDING' && new Date(reservation.expiresAt) < now;
          if (reservation.status === 'RELEASED' || isExpired) {
            // If it was pending but expired, we must release the stock
            if (reservation.status === 'PENDING') {
              // Update status to RELEASED
              await tx.reservation.update({
                where: { id },
                data: { status: 'RELEASED' }
              });

              // Decrement reserved units
              await tx.stock.update({
                where: {
                  productId_warehouseId: {
                    productId: reservation.productId,
                    warehouseId: reservation.warehouseId
                  }
                },
                data: { reservedUnits: { decrement: reservation.quantity } }
              });
            }

            const errorRes = { error: 'Reservation has expired and has been released.', code: 410 };
            if (idempotencyKey) {
              await tx.idempotencyKey.create({
                data: {
                  key: idempotencyKey,
                  responseStatus: 410,
                  responseBody: JSON.stringify(errorRes)
                }
              });
            }
            return { status: 410, body: errorRes };
          }

          // 3. Confirm the reservation
          // Set status to CONFIRMED
          await tx.reservation.update({
            where: { id },
            data: { status: 'CONFIRMED' }
          });

          // Decrement totalUnits and reservedUnits in Stock
          await tx.stock.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId
              }
            },
            data: {
              totalUnits: { decrement: reservation.quantity },
              reservedUnits: { decrement: reservation.quantity }
            }
          });

          const successRes = {
            message: 'Reservation confirmed successfully. Stock decremented.',
            id: reservation.id,
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
            quantity: reservation.quantity,
            status: 'CONFIRMED'
          };

          if (idempotencyKey) {
            await tx.idempotencyKey.create({
              data: {
                key: idempotencyKey,
                responseStatus: 200,
                responseBody: JSON.stringify(successRes)
              }
            });
          }

          return { status: 200, body: successRes };
        });
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database transaction failed, falling back to mock:', error);
      }
    }

    // In-memory mock
    return await mockMutex.runExclusive(async () => {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const cached = mockStore.idempotencyKeys.find((k) => k.key === idempotencyKey);
        if (cached) {
          return {
            isIdempotent: true,
            status: cached.responseStatus,
            body: JSON.parse(cached.responseBody)
          };
        }
      }

      cleanupExpiredReservationsMockSync();

      const reservation = mockStore.reservations.find((r) => r.id === id);
      if (!reservation) {
        const res = { error: 'Reservation not found.', code: 404 };
        if (idempotencyKey) {
          mockStore.idempotencyKeys.push({
            key: idempotencyKey,
            responseStatus: 404,
            responseBody: JSON.stringify(res),
            createdAt: new Date()
          });
        }
        return { status: 404, body: res };
      }

      if (reservation.status === 'CONFIRMED') {
        const successRes = { message: 'Reservation already confirmed.', id: reservation.id };
        if (idempotencyKey) {
          mockStore.idempotencyKeys.push({
            key: idempotencyKey,
            responseStatus: 200,
            responseBody: JSON.stringify(successRes),
            createdAt: new Date()
          });
        }
        return { status: 200, body: successRes };
      }

      const now = new Date();
      const isExpired = reservation.status === 'PENDING' && reservation.expiresAt < now;

      if (reservation.status === 'RELEASED' || isExpired) {
        if (reservation.status === 'PENDING') {
          reservation.status = 'RELEASED';
          const stock = mockStore.stocks.find(
            (s) => s.productId === reservation.productId && s.warehouseId === reservation.warehouseId
          );
          if (stock) {
            stock.reservedUnits = Math.max(0, stock.reservedUnits - reservation.quantity);
          }
        }

        const errorRes = { error: 'Reservation has expired and has been released.', code: 410 };
        if (idempotencyKey) {
          mockStore.idempotencyKeys.push({
            key: idempotencyKey,
            responseStatus: 410,
            responseBody: JSON.stringify(errorRes),
            createdAt: new Date()
          });
        }
        return { status: 410, body: errorRes };
      }

      // Confirm
      reservation.status = 'CONFIRMED';
      const stock = mockStore.stocks.find(
        (s) => s.productId === reservation.productId && s.warehouseId === reservation.warehouseId
      );

      if (stock) {
        stock.totalUnits = Math.max(0, stock.totalUnits - reservation.quantity);
        stock.reservedUnits = Math.max(0, stock.reservedUnits - reservation.quantity);
      }

      const successRes = {
        message: 'Reservation confirmed successfully. Stock decremented.',
        id: reservation.id,
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        quantity: reservation.quantity,
        status: 'CONFIRMED'
      };

      if (idempotencyKey) {
        mockStore.idempotencyKeys.push({
          key: idempotencyKey,
          responseStatus: 200,
          responseBody: JSON.stringify(successRes),
          createdAt: new Date()
        });
      }

      return { status: 200, body: successRes };
    });
  },

  releaseReservation: async (id: string) => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        return await prisma.$transaction(async (tx: any) => {
          const reservation = await tx.reservation.findUnique({
            where: { id }
          });

          if (!reservation) {
            return { status: 404, body: { error: 'Reservation not found.' } };
          }

          if (reservation.status === 'RELEASED') {
            return { status: 200, body: { message: 'Reservation already released.' } };
          }

          if (reservation.status === 'CONFIRMED') {
            return { status: 400, body: { error: 'Cannot release a confirmed reservation.' } };
          }

          // Update status to RELEASED
          await tx.reservation.update({
            where: { id },
            data: { status: 'RELEASED' }
          });

          // Decrement reserved units
          await tx.stock.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId
              }
            },
            data: { reservedUnits: { decrement: reservation.quantity } }
          });

          return {
            status: 200,
            body: { message: 'Reservation released successfully. Stock returned to available pool.' }
          };
        });
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database transaction failed, falling back to mock:', error);
      }
    }

    // In-memory mock
    return await mockMutex.runExclusive(async () => {
      const reservation = mockStore.reservations.find((r) => r.id === id);
      if (!reservation) {
        return { status: 404, body: { error: 'Reservation not found.' } };
      }

      if (reservation.status === 'RELEASED') {
        return { status: 200, body: { message: 'Reservation already released.' } };
      }

      if (reservation.status === 'CONFIRMED') {
        return { status: 400, body: { error: 'Cannot release a confirmed reservation.' } };
      }

      reservation.status = 'RELEASED';
      const stock = mockStore.stocks.find(
        (s) => s.productId === reservation.productId && s.warehouseId === reservation.warehouseId
      );

      if (stock) {
        stock.reservedUnits = Math.max(0, stock.reservedUnits - reservation.quantity);
      }

      return {
        status: 200,
        body: { message: 'Reservation released successfully. Stock returned to available pool.' }
      };
    });
  },

  cleanupExpiredReservations: async () => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        const now = new Date();
        const expired = await prisma.reservation.findMany({
          where: {
            status: 'PENDING',
            expiresAt: { lt: now }
          }
        });

        if (expired.length === 0) return { cleanedCount: 0 };

        let cleanedCount = 0;
        for (const res of expired) {
          await prisma.$transaction(async (tx: any) => {
            // Double check inside transaction with lock
            const r = await tx.reservation.findUnique({
              where: { id: res.id }
            });

            if (r && r.status === 'PENDING' && r.expiresAt < now) {
              await tx.reservation.update({
                where: { id: r.id },
                data: { status: 'RELEASED' }
              });

              await tx.stock.update({
                where: {
                  productId_warehouseId: {
                    productId: r.productId,
                    warehouseId: r.warehouseId
                  }
                },
                data: { reservedUnits: { decrement: r.quantity } }
              });
              cleanedCount++;
            }
          });
        }

        return { cleanedCount };
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database cleanup failed, falling back to mock:', error);
      }
    }

    // Mock
    return await mockMutex.runExclusive(async () => {
      const beforeCount = mockStore.reservations.filter(
        (r: any) => r.status === 'PENDING' && r.expiresAt < new Date()
      ).length;

      cleanupExpiredReservationsMockSync();
      return { cleanedCount: beforeCount };
    });
  },

  getReservations: async () => {
    const useDb = await checkDatabaseState();
    if (useDb) {
      try {
        return await prisma.reservation.findMany({
          include: { product: true, warehouse: true },
          orderBy: { createdAt: 'desc' }
        });
      } catch (error) {
        isDatabaseAvailable = false;
        console.error('Database query failed, falling back to mock:', error);
      }
    }

    // Mock Fallback
    cleanupExpiredReservationsMockSync();
    return mockStore.reservations.map((r: any) => {
      const prod = mockStore.products.find((p) => p.id === r.productId);
      const wh = mockStore.warehouses.find((w) => w.id === r.warehouseId);
      return {
        id: r.id,
        productId: r.productId,
        productName: prod ? prod.name : 'Unknown Product',
        warehouseId: r.warehouseId,
        warehouseName: wh ? wh.name : 'Unknown Warehouse',
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt
      };
    }).reverse(); // Most recent first
  },

  getDashboardStats: async () => {
    const products = await inventoryService.getProducts();
    const warehouses = await inventoryService.getWarehouses();
    const reservations = await inventoryService.getReservations();

    const totalProducts = products.length;
    const totalWarehouses = warehouses.length;
    
    let totalInventory = 0;
    const lowStockAlerts: any[] = [];

    products.forEach((p: any) => {
      p.stocks.forEach((s: any) => {
        totalInventory += s.totalUnits;
        if (s.availableUnits <= 2) {
          lowStockAlerts.push({
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            warehouseName: s.warehouseName,
            availableUnits: s.availableUnits,
            status: s.availableUnits === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
          });
        }
      });
    });

    const now = Date.now();
    const pendingReservations = reservations.filter(
      (r: any) => r.status === 'PENDING' && new Date(r.expiresAt).getTime() > now
    ).length;

    const recentActivity = reservations.slice(0, 5).map((r: any) => {
      return {
        id: r.id,
        productName: r.productName,
        warehouseName: r.warehouseName,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt
      };
    });

    return {
      totalProducts,
      totalWarehouses,
      totalInventory,
      pendingReservations,
      lowStockAlerts,
      recentActivity
    };
  }
};
