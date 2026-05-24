# Allo Health - Inventory Reservation & Checkout Platform

A robust, race-condition-free inventory reservation and order-fulfillment platform built with **Next.js 16 (App Router)**, **TypeScript**, and **Prisma ORM**.

This application secures warehouse inventory during the checkout process by placing a temporary 10-minute hold on units. If payment succeeds, the reservation is confirmed and inventory is permanently decremented. If the timer expires or the hold is cancelled early, the stock is returned to the available pool.

---

## 🚀 Key Features

1. **Race-Condition-Free Reservation**: Guaranteed stock allocation correctness under high concurrency (e.g. flash sales). Uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) in database transactions, and a promise-based serializing Mutex in mock mode.
2. **Database-Backed Idempotency**: Support for client-supplied `Idempotency-Key` headers on `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints, preventing double reservations or duplicate charges on retries.
3. **Automatic Hold Expiry**: Dual-layered cleanup mechanism (read-time lazy resolution and manual/periodic background cleanup triggers) to automatically release expired holds.
4. **Sleek Premium Frontend**: Dark-mode-first dashboard built with Vanilla CSS featuring custom glassmorphism components, animated status badges, real-time live checkout countdown timers, and visible error/concurrency alerts.
5. **Self-Healing Mock Mode**: If `DATABASE_URL` is not set or the PostgreSQL database is unreachable, the system automatically falls back to an in-memory mock catalog store so the entire checkout flow and concurrency tests remain fully runnable.

---

## 🛠️ Tech Stack & Requirements

- **Next.js 16.2.6** (App Router, Turbopack enabled)
- **React 19.2.4**
- **TypeScript 5**
- **Prisma 7.8.0** (using the new decoupled driver adapter architecture for maximum performance)
- **PostgreSQL / pg / @prisma/adapter-pg**

---

## 💻 Local Setup & Execution

### 1. Environment Configuration

Create a `.env` file in the root directory:

```env
# Hosted PostgreSQL Connection string (Supabase, Neon, etc.)
# If DATABASE_URL is not provided or remains empty, the application
# will automatically launch in Mock mode.
DATABASE_URL="postgresql://user:password@hostname:5432/dbname?sslmode=require"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client & Migrate

To push the schema and create tables in your hosted PostgreSQL database:

```bash
# Push database schema
npx prisma db push

# Generate client code offline
npx prisma generate
```

### 4. Seed the Database

Populate your database with warehouses, products, and initial stock matrices (some items plentiful, some out-of-stock, and others with exactly 1 available unit for race condition testing):

```bash
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in the browser.

---

## ⚡ Concurrency & Race-Condition Safety

When multiple shoppers attempt to reserve the last remaining unit of a product, a checkout race condition occurs. If we write a standard read-then-write code block, multiple requests can read a stock value of `1`, succeed in checkouts, and result in over-selling.

### In Production (PostgreSQL)
We secure the stock using a single database transaction (`prisma.$transaction`) containing a **pessimistic row-level lock**:

```sql
SELECT "id", "totalUnits", "reservedUnits"
FROM "Stock"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE
```

- `FOR UPDATE` instructs PostgreSQL to lock the matched `Stock` rows.
- Any concurrent reservation requests attempting to access the same stock row will block and queue up.
- The transaction calculates `totalUnits - reservedUnits`. If it is sufficient, it increments `reservedUnits` and commits, releasing the lock. The next queued transaction then reads the *new* updated stock level, safely seeing `0` units available and rejecting with a `409 Conflict`.

### In Development (Mock Fallback)
When database credentials are not present, concurrency safety is guaranteed via an asynchronous **Promise Mutex**. The reservation operation runs inside a serialized queue (`runExclusive`), ensuring that even when running in-memory, requests are processed strictly one-at-a-time, yielding the exact same safety characteristics as PostgreSQL locks.

---

## 🔑 Idempotency Implementation

To prevent duplicate reservations or double-charging due to network retries, the system supports database-backed idempotency for critical write operations:

1. The client sends a unique UUID in the `Idempotency-Key` header.
2. The server checks the `IdempotencyKey` table for an existing record.
3. **If found**: The server returns the cached response code and body directly without executing any side-effects.
4. **If not found**: The server executes the operation inside the transaction, writes the response status and stringified body to `IdempotencyKey`, and returns the response.

---

## ⏱️ Reservation Expiry Mechanism

Reservations expire 10 minutes after creation. We implement a **hybrid expiry mechanism** to reclaim inventory:

1. **Lazy Cleanup on Read (Primary)**: Whenever a client queries `/api/products` or checks stock during reservation creation, the server scans for pending reservations where `expiresAt < now`, updates them to `RELEASED`, and decrements their quantity from the warehouse's `reservedUnits`. This guarantees stock levels are always 100% accurate at the moment of query/reservation.
2. **Periodic Background Cleanup (Endpoint)**: A dedicated `/api/reservations/cleanup` POST endpoint is provided. In production, this is triggered once per minute using a **Vercel Cron** job or a background scheduler to release expired stock records in bulk.

---

## 🧪 Verification & Concurrency Tests

A complete concurrency stress test script is provided under the `scratch` directory:

- Path: [test_concurrency.js](file:///C:/Users/HP/.gemini/antigravity-ide/brain/48ea59a6-a806-474c-a408-0eac6e1d56c1/scratch/test_concurrency.js)

### How to Run the Stress Test:
1. Ensure the dev server is running on port 3000 (`npm run dev`).
2. Run the test script in a separate terminal:
   ```bash
   node "C:\Users\HP\.gemini\antigravity-ide\brain\48ea59a6-a806-474c-a408-0eac6e1d56c1\scratch\test_concurrency.js"
   ```

### What the Test Does:
1. Identifies the "Allo Smart Sleep Mask" in `wh-west` which is seeded with **exactly 1 available unit**.
2. Fires **10 concurrent POST requests** to `/api/reservations` simultaneously.
3. Verifies that **exactly 1 request** succeeds with `201 Created` and **exactly 9 requests** are rejected with `409 Conflict`.
4. Asserts that the product's final stock reflects exactly 0 available units and 1 reserved unit.

---

## 📐 Trade-offs & Future Enhancements

With more time, the following improvements would be integrated:

- **Redis-Backed Distributed Locks**: Instead of raw Postgres row locks, we could use Redis (e.g. Redlock algorithm) for locking. This offloads lock contention from the primary database, improving performance under massive scale.
- **Idempotency Expiry**: Currently, idempotency keys are stored permanently in the database. In production, keys should have a TTL (Time-To-Live) of 24–48 hours using Redis or partitioned PostgreSQL tables with automatic pruning.
- **WebSocket Stock Broadcasting**: Stream live inventory updates to the client using WebSockets or Server-Sent Events (SSE) so users see stock fluctuations in real-time without polling or manual refreshes.
