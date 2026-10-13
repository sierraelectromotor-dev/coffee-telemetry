"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Coffee, DollarSign, X, AlertCircle } from "lucide-react";

interface FlavorItem {
  id: string;
  name: string;
  category: "CAFE" | "CHOCOLATE" | "ESPECIALIDAD" | "TE";
  description: string;
  price: number;
  costPerServing: number;
}

interface FlavorsManagerProps {
  initialFlavors: FlavorItem[];
}

export function FlavorsManager({ initialFlavors }: FlavorsManagerProps) {
  const [flavors, setFlavors] = useState<FlavorItem[]>(initialFlavors);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"CAFE" | "CHOCOLATE" | "ESPECIALIDAD" | "TE">("CAFE");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("3000");
  const [costPerServing, setCostPerServing] = useState("650");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/flavors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          price: parseFloat(price) || 0,
          costPerServing: parseFloat(costPerServing) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear la bebida");
      }

      setFlavors((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || "",
          price: Number(data.price),
          costPerServing: Number(data.costPerServing),
        },
      ]);

      setIsModalOpen(false);
      setName("");
      setDescription("");
      setPrice("3000");
      setCostPerServing("650");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-amber-500" />
            Catálogo de Bebidas y Sabores Solubles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define las recetas y productos que pueden asignarse a los botones de las máquinas expendedoras.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Bebida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {flavors.map((flavor) => (
          <div
            key={flavor.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  {flavor.category}
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  ${flavor.price.toFixed(0)}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1">{flavor.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">
                {flavor.description || "Sin descripción adicional."}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
              <span>Costo insumo:</span>
              <span className="font-mono text-slate-300 font-semibold">${flavor.costPerServing.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nueva Bebida</h3>
                <p className="text-xs text-slate-400">Agrega un sabor al catálogo</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Bebida
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Capuccino Canela"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CAFE">Café</option>
                  <option value="CHOCOLATE">Chocolate</option>
                  <option value="ESPECIALIDAD">Especialidad</option>
                  <option value="TE">Té</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Precio Venta ($)
                  </label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Costo Insumo ($)
                  </label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={costPerServing}
                    onChange={(e) => setCostPerServing(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre mezcla o preparación..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {loading ? "Guardando..." : "Crear Bebida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
