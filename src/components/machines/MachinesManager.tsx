"use client";

import React, { useState } from "react";
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
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Selecciones Frontales (1 al 4):
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {machine.dispenseSlots.map((slot) => (
                        <div
                          key={slot.buttonIndex}
                          className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-amber-400">P{slot.buttonIndex}</span>
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">${slot.price}</span>
                          </div>
                          <span className="block font-semibold text-white truncate text-[11px]">
                            {slot.flavorName || "Sin Sabor"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {slot.powderGrammage}g • {slot.waterVolumeMl}ml
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCalibratingMachine(machine)}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Calibrar Dosificación
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-5xl my-8 relative">
            <button
              onClick={() => setCalibratingMachine(null)}
              className="absolute -top-4 -right-4 z-10 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full border border-slate-700 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <MachineCalibrationForm
              machineId={calibratingMachine.id}
              machineName={calibratingMachine.name}
              machineCode={calibratingMachine.code}
              initialSlots={calibratingMachine.dispenseSlots}
              availableFlavors={availableFlavors}
              onSave={handleSaveCalibration}
            />
          </div>
        </div>
      )}
    </div>
  );
}
