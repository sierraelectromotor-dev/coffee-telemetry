"use client";

import React, { useState } from "react";
import { Coffee, Droplets, Scale, Save, CheckCircle2 } from "lucide-react";

export interface FlavorOption {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface ButtonSlotConfig {
  buttonIndex: number;
  flavorId: string;
  powderGrammage: number;
  waterVolumeMl: number;
  price: number;
  isActive: boolean;
}

interface MachineCalibrationProps {
  machineId: string;
  machineName: string;
  machineCode: string;
  initialSlots: ButtonSlotConfig[];
  availableFlavors: FlavorOption[];
  onSave: (slots: ButtonSlotConfig[]) => Promise<void>;
}

export function MachineCalibrationForm({
  machineId,
  machineName,
  machineCode,
  initialSlots,
  availableFlavors,
  onSave,
}: MachineCalibrationProps) {
  const [slots, setSlots] = useState<ButtonSlotConfig[]>(() => {
    return [1, 2, 3, 4].map((index) => {
      const existing = initialSlots.find((s) => s.buttonIndex === index);
      return (
        existing || {
          buttonIndex: index,
          flavorId: availableFlavors[0]?.id || "",
          powderGrammage: 18.0,
          waterVolumeMl: 150.0,
          price: 2500,
          isActive: true,
        }
      );
    });
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);

  const updateSlotField = (
    buttonIndex: number,
    field: keyof ButtonSlotConfig,
    value: string | number | boolean
  ) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.buttonIndex === buttonIndex ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSave(slots);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error al guardar calibración:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-mono">
            HARDWARE: {machineCode}
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">
            Dosificación y Calibración de 4 Selecciones
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configura los gramos de soluble, mililitros de agua y precio para los 4 pulsadores físicos.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Configuración guardada en la nube
          </div>
        )}
      </div>

      {/* Visual Mockup del Panel Frontal de la Máquina */}
      <div className="my-6 bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-inner">
        <span className="text-xs text-slate-400 font-mono tracking-wider block mb-3 uppercase">
          Simulador de Panel Frontal de Dispensación
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {slots.map((slot) => {
            const flavor = availableFlavors.find((f) => f.id === slot.flavorId);
            const isSelected = activeTab === slot.buttonIndex;
            return (
              <button
                key={slot.buttonIndex}
                type="button"
                onClick={() => setActiveTab(slot.buttonIndex)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? "border-amber-500 bg-slate-900 shadow-lg shadow-amber-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center">
                    P{slot.buttonIndex}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      slot.isActive ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                    }`}
                  />
                </div>
                <div className="font-bold text-sm text-white truncate">
                  {flavor?.name || "Sin Asignar"}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex justify-between">
                  <span>{slot.powderGrammage}g</span>
                  <span>{slot.waterVolumeMl}ml</span>
                </div>
                <div className="text-xs font-semibold text-emerald-400 mt-1">
                  ${slot.price.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulario de Calibración */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex border-b border-slate-800">
          {slots.map((slot) => (
            <button
              key={slot.buttonIndex}
              type="button"
              onClick={() => setActiveTab(slot.buttonIndex)}
              className={`pb-3 px-6 text-sm font-bold border-b-2 transition-all ${
                activeTab === slot.buttonIndex
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Botón #{slot.buttonIndex}
            </button>
          ))}
        </div>

        {slots
          .filter((slot) => slot.buttonIndex === activeTab)
          .map((slot) => (
            <div key={slot.buttonIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
              <div className="space-y-4">
                <div>
                  <label htmlFor={`flavor-select-${slot.buttonIndex}`} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Bebida / Sabor Asignado
                  </label>
                  <select
                    id={`flavor-select-${slot.buttonIndex}`}
                    value={slot.flavorId}
                    onChange={(e) =>
                      updateSlotField(slot.buttonIndex, "flavorId", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {availableFlavors.map((fl) => (
                      <option key={fl.id} value={fl.id} className="bg-slate-900">
                        {fl.name} ({fl.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Precio de Venta ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={slot.price}
                    onChange={(e) =>
                      updateSlotField(slot.buttonIndex, "price", parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id={`isActive-${slot.buttonIndex}`}
                    checked={slot.isActive}
                    onChange={(e) =>
                      updateSlotField(slot.buttonIndex, "isActive", e.target.checked)
                    }
                    className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-700 rounded focus:ring-amber-500"
                  />
                  <label
                    htmlFor={`isActive-${slot.buttonIndex}`}
                    className="text-sm font-medium text-slate-300 select-none cursor-pointer"
                  >
                    Habilitar selección activa en esta máquina
                  </label>
                </div>
              </div>

              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-500" />
                  Calibración de Dosificación (Tolva & Bomba)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Gramos de Soluble por Servicio (g)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={slot.powderGrammage}
                      onChange={(e) =>
                        updateSlotField(
                          slot.buttonIndex,
                          "powderGrammage",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                      g
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Gramos de polvo dosificados por el sinfín.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Volumen de Agua por Servicio (ml)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="20"
                      max="500"
                      value={slot.waterVolumeMl}
                      onChange={(e) =>
                        updateSlotField(
                          slot.buttonIndex,
                          "waterVolumeMl",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                      ml
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Volumen de agua caliente dispensada.
                  </span>
                </div>
              </div>
            </div>
          ))}

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Calibración"}
          </button>
        </div>
      </form>
    </div>
  );
}
