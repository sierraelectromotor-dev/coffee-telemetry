#include <Arduino.h>

// ============================================================================
// PLATAFORMA DE TELEMETRÍA IOT PARA MÁQUINAS DE CAFÉ SOLUBLE (4 SELECCIONES)
// Hardware: LilyGO T-Call ESP32 con módem SIMCom A7670E/SA 4G LTE
// ============================================================================

// PINES DE CONTROL DEL MÓDEM A7670 (LilyGO T-Call A7670)
#define MODEM_TX             27
#define MODEM_RX             26
#define MODEM_PWRKEY         4
#define MODEM_RESET          5
#define MODEM_DTR            25

// PINES DE ENTRADA PARA LOS 4 BOTONES DE SELECCIÓN FÍSICOS
// Conexión recomendada: Pulsador conectado entre GPIO y GND (Activo en BAJO)
#define BTN_1_PIN            13
#define BTN_2_PIN            14
#define BTN_3_PIN            18
#define BTN_4_PIN            19

#define LED_STATUS           12 // Indicador visual de estado / transmisión

// ============================================================================
// CONFIGURACIÓN DE RED Y SERVIDOR (VERCEL / SUPABASE / NEON)
// ============================================================================
const char APN[]          = "internet.movil"; // APN de tu operador móvil
const char SERVER_URL[]   = "https://tu-dominio.vercel.app/api/telemetry/dispense";
const char API_KEY[]      = "TELEMETRY_API_KEY_SUPER_SECRETA_2026";
const char MACHINE_CODE[] = "MAQ-001";

// ============================================================================
// PARÁMETROS DE ANTIRREBOTE Y ESTADO
// ============================================================================
const unsigned long DEBOUNCE_DELAY = 300; // ms de filtro antirrebote
unsigned long lastPressTime[4]     = {0, 0, 0, 0};
const int buttonPins[4]            = {BTN_1_PIN, BTN_2_PIN, BTN_3_PIN, BTN_4_PIN};

HardwareSerial modemSerial(1);

// Envía un comando AT al módem y recolecta la respuesta
String sendAT(String cmd, unsigned long timeout = 2000) {
  String response = "";
  modemSerial.println(cmd);
  unsigned long start = millis();
  while (millis() - start < timeout) {
    while (modemSerial.available()) {
      char c = modemSerial.read();
      response += c;
    }
  }
  return response;
}

// Secuencia de encendido físico del módem SIMCom A7670
void powerOnModem() {
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW);
  delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH);
  delay(1000); // Pulso PWRKEY de 1 segundo
  digitalWrite(MODEM_PWRKEY, LOW);
  delay(3000);
}

// Configuración y registro en la red celular 4G LTE
bool setupCellular() {
  Serial.println("[4G] Inicializando comunicación con módem A7670...");
  sendAT("AT");
  delay(500);

  sendAT("ATE0"); // Desactivar eco para simplificar respuestas
  
  // Verificar tarjeta SIM
  String simCheck = sendAT("AT+CPIN?", 3000);
  if (!simCheck.contains("READY")) {
    Serial.println("[4G] Error: Tarjeta SIM no detectada o con PIN bloqueado.");
    return false;
  }

  // Fijar modo de red a LTE
  sendAT("AT+CNMP=38"); 
  
  // Configurar APN
  String apnCmd = "AT+CGDCONT=1,\"IP\",\"" + String(APN) + "\"";
  sendAT(apnCmd);

  // Activar PDP Context (Conexión de datos)
  sendAT("AT+CNACT=0,1", 5000);
  
  String ipStatus = sendAT("AT+CNACT?", 2000);
  Serial.println("[4G] Estado de Red:\n" + ipStatus);
  return true;
}

// Envío del evento de dispensación vía HTTPS POST a Vercel
bool sendDispenseEvent(int buttonIndex) {
  digitalWrite(LED_STATUS, HIGH);
  Serial.printf("[TELEMETRY] Reportando despacho de botón #%d...\n", buttonIndex);

  // Payload JSON compacto (menos de 80 bytes para ahorro de plan celular)
  String payload = "{\"machineCode\":\"" + String(MACHINE_CODE) + 
                   "\",\"button\":" + String(buttonIndex) + 
                   ",\"timestamp\":" + String(millis() / 1000) + "}";

  // Inicializar stack HTTP
  sendAT("AT+HTTPINIT");
  sendAT("AT+HTTPPARA=\"URL\",\"" + String(SERVER_URL) + "\"");
  sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"");
  sendAT("AT+HTTPPARA=\"USERDATA\",\"x-api-key: " + String(API_KEY) + "\"");

  // Cargar cuerpo de datos
  String dataCmd = "AT+HTTPDATA=" + String(payload.length()) + ",10000";
  modemSerial.println(dataCmd);
  delay(200);
  modemSerial.print(payload);
  delay(500);

  // Ejecutar petición POST
  String actionResp = sendAT("AT+HTTPACTION=1", 10000);
  Serial.println("[4G] Respuesta Servidor:\n" + actionResp);

  // Liberar recursos
  sendAT("AT+HTTPTERM");
  digitalWrite(LED_STATUS, LOW);

  return actionResp.contains("200");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  COFFEETRACK 4G TELEMETRY FIRMWARE v1.0   ");
  Serial.println("==========================================");

  pinMode(LED_STATUS, OUTPUT);
  digitalWrite(LED_STATUS, LOW);

  // Configurar los 4 pines de botones como entradas pull-up
  for (int i = 0; i < 4; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  // Inicializar UART para el módem A7670
  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);

  // Encender módem e iniciar conexión celular
  powerOnModem();
  if (setupCellular()) {
    Serial.println("[OK] Módem 4G conectado a la nube.");
  } else {
    Serial.println("[WARN] Conexión inicial pendiente. Se reintentará.");
  }
}

void loop() {
  unsigned long now = millis();

  // Escaneo y lectura de los 4 botones
  for (int i = 0; i < 4; i++) {
    if (digitalRead(buttonPins[i]) == LOW) { // Botón presionado a nivel GND
      if (now - lastPressTime[i] > DEBOUNCE_DELAY) {
        lastPressTime[i] = now;
        int buttonIndex = i + 1; // Botones 1 al 4
        
        Serial.printf("[BOTON] Activacion detectada en Seleccion %d\n", buttonIndex);
        
        // Transmisión inmediata por red celular 4G
        bool sent = sendDispenseEvent(buttonIndex);
        if (sent) {
          Serial.println("[OK] Telemetría registrada en Vercel con éxito.");
        } else {
          Serial.println("[ERR] No se pudo enviar el reporte.");
        }
      }
    }
  }

  delay(20);
}
