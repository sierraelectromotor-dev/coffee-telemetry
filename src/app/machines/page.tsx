import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseInitialized } from "@/lib/init-db";
import { Navbar } from "@/components/navigation/Navbar";
import { MachinesManager } from "@/components/machines/MachinesManager";
import { redirect } from "next/navigation";

export const revalidate = 0; // Datos en tiempo real

export default async function MachinesPage() {
  await ensureDatabaseInitialized();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [machines, flavors] = await Promise.all([
    prisma.machine.findMany({
      orderBy: { code: "asc" },
      include: {
        dispenseSlots: {
          orderBy: { buttonIndex: "asc" },
          include: { flavor: true },
        },
      },
    }),
    prisma.flavor.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedMachines = machines.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    location: m.location,
    status: m.status,
    lastPingAt: m.lastPingAt ? m.lastPingAt.toISOString() : null,
    dispenseSlots: m.dispenseSlots.map((s) => ({
      buttonIndex: s.buttonIndex,
      flavorId: s.flavorId,
      flavorName: s.flavor.name,
      powderGrammage: Number(s.powderGrammage),
      waterVolumeMl: Number(s.waterVolumeMl),
      price: Number(s.price),
      hopperCapacityGrams: Number(s.hopperCapacityGrams ?? 1000),
      currentStockGrams: Number(s.currentStockGrams ?? 1000),
      lastRefillAt: s.lastRefillAt ? s.lastRefillAt.toISOString() : null,
      isActive: s.isActive,
    })),
  }));

  const serializedFlavors = flavors.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    price: Number(f.price),
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <MachinesManager
          initialMachines={serializedMachines}
          availableFlavors={serializedFlavors}
        />
      </main>
    </div>
  );
}
