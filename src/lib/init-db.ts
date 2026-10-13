import { prisma } from "./prisma";
import { hashPassword } from "./auth";

let isDbInitialized = false;

export async function ensureDatabaseInitialized() {
  if (isDbInitialized) return;

  try {
    // 1. Crear tipos ENUM de PostgreSQL si no existen
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
          CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MachineStatus') THEN
          CREATE TYPE "MachineStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FlavorCategory') THEN
          CREATE TYPE "FlavorCategory" AS ENUM ('CAFE', 'CHOCOLATE', 'ESPECIALIDAD', 'TE');
        END IF;
      END $$;
    `);

    // 2. Crear tabla User
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "role" "Role" DEFAULT 'ADMIN'::"Role" NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 3. Crear tabla Machine
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Machine" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "location" TEXT NOT NULL,
        "status" "MachineStatus" DEFAULT 'ONLINE'::"MachineStatus" NOT NULL,
        "lastPingAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "apiKey" TEXT,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 4. Crear tabla Flavor
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Flavor" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL,
        "category" "FlavorCategory" DEFAULT 'CAFE'::"FlavorCategory" NOT NULL,
        "description" TEXT,
        "price" DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        "costPerServing" DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 5. Crear tabla DispenseSlot
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DispenseSlot" (
        "id" TEXT PRIMARY KEY,
        "machineId" TEXT NOT NULL REFERENCES "Machine"("id") ON DELETE CASCADE,
        "buttonIndex" INTEGER NOT NULL,
        "flavorId" TEXT NOT NULL REFERENCES "Flavor"("id") ON DELETE RESTRICT,
        "powderGrammage" DECIMAL(6,2) DEFAULT 18.00 NOT NULL,
        "waterVolumeMl" DECIMAL(6,2) DEFAULT 150.00 NOT NULL,
        "price" DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
        "isActive" BOOLEAN DEFAULT true NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
        UNIQUE("machineId", "buttonIndex")
      );
    `);

    // 6. Crear tabla DispenseEvent
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DispenseEvent" (
        "id" TEXT PRIMARY KEY,
        "machineId" TEXT NOT NULL REFERENCES "Machine"("id") ON DELETE CASCADE,
        "buttonIndex" INTEGER NOT NULL,
        "flavorName" TEXT NOT NULL,
        "powderUsedGrams" DECIMAL(6,2) NOT NULL,
        "waterUsedMl" DECIMAL(6,2) NOT NULL,
        "price" DECIMAL(10,2) NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 7. Auto-seed del usuario administrador inicial si la tabla está vacía
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const defaultHash = await hashPassword("admin1234");
      await prisma.user.create({
        data: {
          name: "Administrador IoT",
          email: "admin@vendingcoffee.com",
          passwordHash: defaultHash,
          role: "ADMIN",
        },
      });
      console.log("[DB_INIT] Usuario admin@vendingcoffee.com creado con éxito.");
    }

    // 8. Auto-seed de máquina y sabores base si están vacíos
    const machinesCount = await prisma.machine.count();
    if (machinesCount === 0) {
      const m = await prisma.machine.create({
        data: {
          code: "MAQ-001",
          name: "Máquina Principal - Sala de Espera",
          location: "Sede Central - Piso 1",
          status: "ONLINE",
        },
      });

      const f1 = await prisma.flavor.create({
        data: { name: "Café Americano", category: "CAFE", price: 2500, costPerServing: 450 },
      });
      const f2 = await prisma.flavor.create({
        data: { name: "Capuccino Tradicional", category: "CAFE", price: 3500, costPerServing: 750 },
      });
      const f3 = await prisma.flavor.create({
        data: { name: "Chocolate Suizo", category: "CHOCOLATE", price: 3500, costPerServing: 800 },
      });
      const f4 = await prisma.flavor.create({
        data: { name: "Mocaccino Especial", category: "ESPECIALIDAD", price: 4000, costPerServing: 900 },
      });

      await prisma.dispenseSlot.createMany({
        data: [
          { machineId: m.id, buttonIndex: 1, flavorId: f1.id, powderGrammage: 16.0, waterVolumeMl: 120, price: 2500 },
          { machineId: m.id, buttonIndex: 2, flavorId: f2.id, powderGrammage: 22.0, waterVolumeMl: 150, price: 3500 },
          { machineId: m.id, buttonIndex: 3, flavorId: f3.id, powderGrammage: 25.0, waterVolumeMl: 150, price: 3500 },
          { machineId: m.id, buttonIndex: 4, flavorId: f4.id, powderGrammage: 24.0, waterVolumeMl: 150, price: 4000 },
        ],
      });
      console.log("[DB_INIT] Datos semilla iniciales de máquinas y sabores creados con éxito.");
    }

    isDbInitialized = true;
  } catch (err) {
    console.error("[DB_INIT_ERROR]", err);
    // No relanzamos para no tumbar la app si ya estaban creadas
  }
}
