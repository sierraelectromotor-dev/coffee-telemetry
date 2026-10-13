"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Sliders,
  Trash2,
  Radio,
  MapPin,
  Clock,
  AlertCircle,
  X,
  Coffee,
  CheckCircle2,
  Box,
  AlertTriangle,
} from "lucide-react";
import { MachineCalibrationForm, FlavorOption, ButtonSlotConfig } from "./MachineCalibrationForm";

interface MachineSlotData extends ButtonSlotConfig {
  flavorName?: string;
}

interface MachineItem {
  id: string;
  code: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE" | "MAINTENANCE";
  lastPingAt: string | null;
  dispenseSlots: MachineSlotData[];
}

interface MachinesManagerProps {
  initialMachines: MachineItem[];
  availableFlavors: FlavorOption[];
}

export function MachinesManager({
  initialMachines,
  availableFlavors,
}: MachinesManagerProps) {
  const [machines, setMachines] = useState<MachineItem[]>(initialMachines);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [calibratingMachine, setCalibratingMachine] = useState<MachineItem | null>(null);
  const [refillLoading, setRefillLoading] = useState<string | null>(null);

  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCalibratingMachine(null);
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Formulario de nueva máquina
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manejo de creación de máquina
  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          location: newLocation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear la máquina");
      }

      setMachines((prev) => [
        ...prev,
        {
          id: data.id,
          code: data.code,
          name: data.name,
          location: data.location,
          status: data.status,
          lastPingAt: data.lastPingAt,
          dispenseSlots: data.dispenseSlots.map((s: any) => ({
            buttonIndex: s.buttonIndex,
            flavorId: s.flavorId,
            flavorName: s.flavor?.name || "Sin Asignar",
            powderGrammage: Number(s.powderGrammage),
            waterVolumeMl: Number(s.waterVolumeMl),
            price: Number(s.price),
            hopperCapacityGrams: Number(s.hopperCapacityGrams || 1000),
            currentStockGrams: Number(s.currentStockGrams || 1000),
            lastRefillAt: s.lastRefillAt || null,
            isActive: s.isActive,
          })),
        },
      ]);

      setIsCreateModalOpen(false);
      setNewCode("");
      setNewName("");
      setNewLocation("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError("Error inesperado");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  // Rellenar tolva rápida ("Marcar Full")
  const handleQuickRefill = async (machineId: string, buttonIndex?: number) => {
    try {
      setRefillLoading(`${machineId}-${buttonIndex ?? "all"}`);
      const res = await fetch(`/api/machines/${machineId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buttonIndex }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al recargar tolva");
      }

      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            const updatedSlots = m.dispenseSlots.map((s) => {
              if (!buttonIndex || s.buttonIndex === buttonIndex) {
                return {
                  ...s,
                  currentStockGrams: s.hopperCapacityGrams || 1000,
                  lastRefillAt: new Date().toISOString(),
                };
              }
              return s;
            });
            return { ...m, dispenseSlots: updatedSlots };
          }
          return m;
        })
      );
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Error al recargar tolva");
    } finally {
      setRefillLoading(null);
    }
  };

  // Manejo de guardado de calibración para la máquina seleccionada
  const handleSaveCalibration = async (updatedSlots: ButtonSlotConfig[]) => {
    if (!calibratingMachine) return;

    const res = await fetch(`/api/machines/${calibratingMachine.id}/slots`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedSlots),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al guardar calibración");
    }

    // Actualizar estado local
    setMachines((prev) =>
      prev.map((m) => {
        if (m.id === calibratingMachine.id) {
          const newSlots = updatedSlots.map((s) => ({
            ...s,
            flavorName: availableFlavors.find((f) => f.id === s.flavorId)?.name || "",
          }));
          return { ...m, dispenseSlots: newSlots };
        }
        return m;
      })
    );

    // Actualizar la máquina en calibración
    setCalibratingMachine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        dispenseSlots: updatedSlots.map((s) => ({
          ...s,
          flavorName: availableFlavors.find((f) => f.id === s.flavorId)?.name || "",
        })),
      };
    });
  };

  // Eliminar máquina
  const handleDeleteMachine = async (id: string, code: string) => {
    if (!confirm(`¿Estás seguro de eliminar la máquina ${code}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/machines/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("No se pudo eliminar la máquina");
      }
      setMachines((prev) => prev.filter((m) => m.id !== id));
      if (calibratingMachine?.id === id) {
        setCalibratingMachine(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la máquina");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="w-7 h-7 text-amber-500" />
            Gestión y Calibración de Máquinas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra seriales de hardware ESP32, asignación de sabores y dosificación de gramaje/agua para las 4 selecciones.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Máquina (Serial)
        </button>
      </div>

      {/* Grid de Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.length === 0 ? (
          <div className="col-span-full bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
            <Cpu className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">No hay máquinas registradas</p>
            <p className="text-xs text-slate-500 mt-1">
              Haz clic en "Nueva Máquina" para registrar un serial de hardware para tu ESP32 A7670.
            </p>
          </div>
        ) : (
          machines.map((machine) => {
            const isOnline =
              machine.lastPingAt &&
              new Date().getTime() - new Date(machine.lastPingAt).getTime() < 15 * 60 * 1000;

            return (
              <div
                key={machine.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                      SERIAL: {machine.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                        }`}
                      />
                      {isOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white tracking-tight">{machine.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {machine.location}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                      Selecciones Frontales & Nivel de Tolvas (1 al 4):
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {machine.dispenseSlots.map((slot) => {
                        const capacity = Number(slot.hopperCapacityGrams || 1000);
                        const current = Number(slot.currentStockGrams ?? 1000);
                        const pct = Math.max(0, Math.min(100, Math.round((current / (capacity || 1)) * 100)));
                        const cupsRemaining = slot.powderGrammage > 0 ? Math.floor(current / slot.powderGrammage) : 0;
                        const isCritical = pct < 20;
                        const isWarning = pct >= 20 && pct < 40;
                        const isLoadingThis = refillLoading === `${machine.id}-${slot.buttonIndex}`;

                        return (
                          <div
                            key={slot.buttonIndex}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                              isCritical
                                ? "bg-rose-950/20 border-rose-500/50 shadow-sm shadow-rose-950/30"
                                : isWarning
                                ? "bg-slate-950 border-amber-500/40"
                                : "bg-slate-950 border-slate-800/80"
                            }`}
                          >
                            <div>
                              {/* Header del botón */}
                              <div className="flex justify-between items-center mb-1">
                                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px] flex items-center justify-center">
                                  P{slot.buttonIndex}
                                </span>
                                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                                  ${slot.price}
                                </span>
                              </div>

                              {/* Nombre de la bebida */}
                              <span className="block font-semibold text-white truncate text-xs" title={slot.flavorName}>
                                {slot.flavorName || "Sin Sabor"}
                              </span>

                              {/* Receta */}
                              <span className="text-[10px] text-slate-500 block mb-2">
                                {slot.powderGrammage}g • {slot.waterVolumeMl}ml
                              </span>
                            </div>

                            {/* Nivel de Tolva & Stock */}
                            <div className="pt-2 border-t border-slate-800/80 space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400 flex items-center gap-1 font-medium">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isCritical
                                        ? "bg-rose-500 animate-ping"
                                        : isWarning
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                    }`}
                                  />
                                  Tolva:
                                </span>
                                <span className="font-mono text-slate-300 font-semibold">
                                  {Math.round(current)}g / {capacity}g
                                </span>
                              </div>

                              {/* Barra de progreso */}
                              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isCritical
                                      ? "bg-rose-500"
                                      : isWarning
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              {/* Estimación de tazas y botón Full rápido */}
                              <div className="flex justify-between items-center text-[10px] pt-0.5">
                                <span
                                  className={`font-semibold ${
                                    isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-400"
                                  }`}
                                >
                                  {isCritical ? "⚠️ ¡Recarga!" : `~${cupsRemaining} tzs`}
                                </span>

                                <button
                                  type="button"
                                  disabled={isLoadingThis}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickRefill(machine.id, slot.buttonIndex);
                                  }}
                                  title="Marcar esta tolva como Llena (100%)"
                                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700 font-bold text-[9px] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isLoadingThis ? "..." : "+ Full"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCalibratingMachine(machine)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Calibrar Dosificación
                  </button>

                  <button
                    onClick={() => handleQuickRefill(machine.id)}
                    disabled={refillLoading === `${machine.id}-all`}
                    title="Rellenar todas las 4 tolvas al 100% (Marcar Full)"
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-slate-700 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {refillLoading === `${machine.id}-all` ? "..." : "Full (x4)"}
                  </button>

                  <button
                    onClick={() => handleDeleteMachine(machine.id, machine.code)}
                    title="Eliminar máquina"
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Crear Nueva Máquina */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Registrar Nueva Máquina</h3>
                <p className="text-xs text-slate-400">Vincular serial para telemetría 4G</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMachine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Serial / Código de Hardware
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="ej: MAQ-002"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Es el mismo <code className="text-amber-400">MACHINE_CODE</code> programado en el ESP32.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre o Alias
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej: Recepción Torre B"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ubicación Física / Cliente
                </label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="ej: Sede Norte - Piso 3"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {createLoading ? "Registrando..." : "Crear Máquina"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Vista de Calibración de la Máquina Seleccionada */}
      {calibratingMachine && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex justify-center items-start animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCalibratingMachine(null);
          }}
        >
          <div className="w-full max-w-5xl my-4 sm:my-8 relative">
            <MachineCalibrationForm
              machineId={calibratingMachine.id}
              machineName={calibratingMachine.name}
              machineCode={calibratingMachine.code}
              initialSlots={calibratingMachine.dispenseSlots}
              availableFlavors={availableFlavors}
              onSave={handleSaveCalibration}
              onClose={() => setCalibratingMachine(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
