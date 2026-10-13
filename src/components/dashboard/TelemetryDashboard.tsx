"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coffee,
  DollarSign,
  Droplet,
  Radio,
  Clock,
  ArrowUpRight,
  Filter,
  LogOut,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#D97706", "#2563EB", "#059669", "#7C3AED", "#DB2777"];

interface DashboardProps {
  user?: { name: string; email: string; role: string };
  metrics: {
    totalDispensesToday: number;
    totalRevenue: number;
    totalPowderKg: number;
    totalWaterLiters: number;
    onlineMachines: number;
    totalMachines: number;
  };
  flavorDistribution: { name: string; value: number }[];
  hourlyActivity: { hour: string; dispenses: number }[];
  dailyTrend: { date: string; dispenses: number; revenue: number }[];
  recentEvents: {
    id: string;
    machineCode: string;
    machineName: string;
    flavorName: string;
    buttonIndex: number;
    powderUsedGrams: number;
    waterUsedMl: number;
    price: number;
    timestamp: string;
  }[];
  machinesList: { id: string; code: string; name: string }[];
}

import { Navbar } from "@/components/navigation/Navbar";

export function TelemetryDashboard({
  user,
  metrics,
  flavorDistribution,
  hourlyActivity,
  dailyTrend,
  recentEvents,
  machinesList,
}: DashboardProps) {
  const [selectedMachine, setSelectedMachine] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("today");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar user={user} />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Subheader con Filtros y Controles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Panel de Control de Telemetría
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervisión de consumos, despachos y estado de salud de dispensadores 4G
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Máquina */}
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                aria-label="Seleccionar máquina"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="bg-transparent font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">Todas las Máquinas</option>
                {machinesList.map((m) => (
                  <option key={m.id} value={m.code} className="bg-slate-900">
                    {m.code} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de Fechas */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(["today", "7d", "30d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    dateRange === range
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {range === "today" ? "Hoy" : range === "7d" ? "7 Días" : "30 Días"}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Despachos Totales
            </span>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {metrics.totalDispensesToday.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Hoy
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recaudación
            </span>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              ${metrics.totalRevenue.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              Venta estimada
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Consumo Insumos
            </span>
            <div className="text-xl font-bold text-white mt-0.5">
              {metrics.totalPowderKg.toFixed(2)} kg
              <span className="text-xs text-slate-400 font-normal ml-1">/ {metrics.totalWaterLiters.toFixed(1)} L</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1">
              Soluble / Agua
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Dispositivos 4G
            </span>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {metrics.onlineMachines}
              <span className="text-slate-500 text-base font-normal"> / {metrics.totalMachines}</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
              Online (últimos 15m)
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Bebida */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col">
          <h2 className="text-sm font-bold text-white">Distribución por Bebida</h2>
          <p className="text-xs text-slate-400 mb-4">Proporción de selecciones servidas</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={flavorDistribution}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {flavorDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} tazas`, "Total"]}
                  contentStyle={{ backgroundColor: "#020617", borderRadius: "10px", borderColor: "#1e293b", color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs">
            {flavorDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-300 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Picos por Franja Horaria */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col">
          <h2 className="text-sm font-bold text-white">Demanda por Franja Horaria</h2>
          <p className="text-xs text-slate-400 mb-4">Picos de tráfico durante el turno</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", borderRadius: "10px", borderColor: "#1e293b", color: "#fff" }}
                />
                <Bar dataKey="dispenses" fill="#D97706" radius={[4, 4, 0, 0]} name="Tazas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendencia Diaria */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col">
          <h2 className="text-sm font-bold text-white">Tendencia de Despachos</h2>
          <p className="text-xs text-slate-400 mb-4">Evolución en los últimos 30 días</p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorDispenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", borderRadius: "10px", borderColor: "#1e293b", color: "#fff" }}
                />
                <Area
                  type="monotone"
                  dataKey="dispenses"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDispenses)"
                  name="Tazas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feed en Vivo */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Feed de Despachos en Vivo
            </h2>
            <p className="text-xs text-slate-400">Últimas peticiones HTTPS recibidas del A7670</p>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-semibold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Vercel Serverless OK
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold text-xs uppercase tracking-wider border-y border-slate-800">
              <tr>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Máquina</th>
                <th className="py-3 px-4 text-center">Botón</th>
                <th className="py-3 px-4">Bebida</th>
                <th className="py-3 px-4 text-right">Soluble (g)</th>
                <th className="py-3 px-4 text-right">Agua (ml)</th>
                <th className="py-3 px-4 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No se han registrado eventos recientes.
                  </td>
                </tr>
              ) : (
                recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{evt.machineCode}</span>
                      <span className="block text-xs text-slate-500">{evt.machineName}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20">
                        {evt.buttonIndex}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      {evt.flavorName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                      {evt.powderUsedGrams.toFixed(1)} g
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                      {evt.waterUsedMl.toFixed(0)} ml
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      ${evt.price.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  );
}
