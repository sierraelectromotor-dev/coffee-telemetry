# ☕ CoffeeTrack IoT - Plataforma de Telemetría para Máquinas de Café 4G

Plataforma Web Full-Stack moderna construida con **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM** y **PostgreSQL (Neon / Supabase)**, diseñada para la supervisión y dosificación remota de máquinas de café solubles de 4 selecciones conectadas mediante **ESP32 LilyGO T-Call A7670 (4G LTE)**.

---

## 🚀 Características Principales

1. **Autenticación y Seguridad:**
   - Inicio de sesión seguro (`/login`) con derivación criptográfica de contraseñas (`scrypt`) y firma de tokens de sesión con cookies HTTP-only (`HMAC-SHA256`).
   - Middleware de protección para rutas privadas del Dashboard.
   - Autenticación por cabecera `x-api-key` para transmisiones del microcontrolador ESP32.

2. **Telemetría y Dosificación de 4 Selecciones:**
   - Registro en tiempo real de extracciones de café soluble.
   - Snapshot histórico de gramos de polvo soluble y mililitros de agua por servicio.
   - Cálculo automático de ingresos y consumo de insumos.
   - Detección de estado `ONLINE` / `OFFLINE` de las máquinas (último ping en 15 min).

3. **Dashboard Analítico en Vivo (Recharts):**
   - KPI Cards: Despachos, Recaudación, Gramos de soluble, Litros de agua y máquinas activas.
   - Gráfico de dona de popularidad de bebidas/sabores.
   - Gráfico de barras de picos de consumo por franja horaria.
   - Gráfico de área de tendencia de 30 días.
   - Feed en tiempo real con las últimas 10 dispensaciones.

4. **Hardware y Firmware C++ (LilyGO T-Call A7670):**
   - Lectura digital con antirrebote (*debouncing*) de los 4 pulsadores físicos frontales.
   - Peticiones HTTPS POST optimizadas para ahorro de datos celulares 4G LTE.

---

## 🛠️ Estructura del Proyecto

```
coffee-telemetry/
├── firmware/
│   └── esp32_a7670_coffee_telemetry.ino   # Firmware C++ para LilyGO A7670
├── prisma/
│   └── schema.prisma                      # Modelos: User, Machine, Flavor, DispenseSlot, DispenseEvent
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/                      # Endpoints de Login y Logout
│   │   │   └── telemetry/dispense/        # Endpoint HTTPS para el ESP32
│   │   ├── dashboard/                     # Vista principal analítica
│   │   ├── login/                         # Pantalla de inicio de sesión
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── dashboard/TelemetryDashboard.tsx
│   │   └── machines/MachineCalibrationForm.tsx
│   ├── lib/
│   │   ├── auth.ts                        # Lógica de sesiones, scrypt y cookies
│   │   └── prisma.ts                      # Instancia singleton de Prisma
│   └── middleware.ts                      # Protección de rutas privadas
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 📦 Despliegue y Configuración

### 1. Variables de Entorno (`.env`)
```env
DATABASE_URL="postgresql://usuario:password@ep-ejemplo.us-east-1.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="tu_secreto_aleatorio_de_sesion_seguro"
TELEMETRY_API_KEY="TELEMETRY_API_KEY_SUPER_SECRETA_2026"
```

### 2. Base de Datos (Prisma)
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Credenciales de Acceso por Defecto
Al iniciar por primera vez, el sistema permite autenticar con:
- **Usuario:** `admin@vendingcoffee.com`
- **Contraseña:** `admin1234`
