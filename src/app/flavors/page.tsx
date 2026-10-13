import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDatabaseInitialized } from "@/lib/init-db";
import { Navbar } from "@/components/navigation/Navbar";
import { FlavorsManager } from "@/components/flavors/FlavorsManager";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function FlavorsPage() {
  await ensureDatabaseInitialized();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const flavors = await prisma.flavor.findMany({
    orderBy: { name: "asc" },
  });

  const serializedFlavors = flavors.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description || "",
    price: Number(f.price),
    costPerServing: Number(f.costPerServing),
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <FlavorsManager initialFlavors={serializedFlavors} />
      </main>
    </div>
  );
}
