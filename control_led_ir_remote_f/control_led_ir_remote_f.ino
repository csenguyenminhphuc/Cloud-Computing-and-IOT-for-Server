#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h> 
#include <IRremoteESP8266.h>
#include <IRrecv.h>
#include <IRsend.h>
#include <IRutils.h>
#include <ir_LG.h>

// —— Phần cứng ——
const int ledPins[5] = {0, 2, 5, 13, 16};
const uint16_t RECV_PIN = 14;  // D5 - IR Receiver
const uint16_t SEND_PIN = 4;   // D2 - LED IR phát lệnh điều hòa
const uint8_t  STATUS_LED = 12; // D6 - LED báo hiệu tăng/giảm

IRrecv irrecv(RECV_PIN);
decode_results results;
IRLgAc ac(SEND_PIN);

int currentTemp = 24;
uint32_t lastCode = 0;
unsigned long lastTime = 0;

// —— Wi-Fi ——
const char* ssid     = "DHCN - CSM";
const char* password = "@Phuc244466666";

// —— MQTT ——
const char* mqtt_server = "152.42.200.154";
const int   mqtt_port   = 9090;
const char* mqtt_user   = "khanh";
const char* mqtt_pass   = "khanh";
const char* topic_ctrl  = "led/control";

WiFiClient    netClient;
PubSubClient  client(netClient);

void setup() {
  Serial.begin(115200);

  // Khởi tạo LED
  for (int i = 0; i < 5; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  irrecv.enableIRIn();
  ac.begin();

  Serial.println("ESP8266 IR + MQTT Ready — Điều khiển điều hòa LG và LED qua MQTT + remote thường.");

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("🔌 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.println("\n✅ WiFi connected, IP: " + WiFi.localIP().toString());

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
}

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  if (irrecv.decode(&results)) {
    uint32_t code = results.value;
    Serial.print("[IR] Nhận mã HEX: 0x");
    Serial.print(code, HEX);
    Serial.print(" — ");
    Serial.print(results.bits);
    Serial.println(" bits");

    if (code == lastCode && millis() - lastTime < 500) {
      Serial.println("⚠️ Bỏ qua mã trùng trong khoảng thời gian ngắn.");
      irrecv.resume();
      return;
    }

    if (code == 0xB55C4E88) { // Tăng nhiệt độ
      if (currentTemp < 30) {
        currentTemp++;
        Serial.print("➕ Tăng nhiệt độ lên: "); Serial.println(currentTemp);
        digitalWrite(STATUS_LED, HIGH);
        sendToLG(currentTemp);
        delay(300);
        digitalWrite(STATUS_LED, LOW);
      }
    } else if (code == 0x198AF72C) { // Giảm nhiệt độ
      if (currentTemp > 18) {
        currentTemp--;
        Serial.print("➖ Giảm nhiệt độ xuống: "); Serial.println(currentTemp);
        digitalWrite(STATUS_LED, HIGH);
        sendToLG(currentTemp);
        delay(300);
        digitalWrite(STATUS_LED, LOW);
      }
    }

    lastCode = code;
    lastTime = millis();
    irrecv.resume();
  }
}

void sendToLG(int temp) {
  Serial.println("📤 Gửi lệnh IR đến điều hòa LG...");
  ac.on();
  ac.setMode(kLgAcCool);
  ac.setFan(kLgAcFanAuto);
  ac.setTemp(temp);
  ac.send();
  Serial.println("✅ Đã gửi lệnh IR thành công.");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != topic_ctrl) return;

  String raw;
  for (unsigned int i = 0; i < length; i++) raw += (char)payload[i];
  Serial.println("📩 Received JSON: " + raw);

  DynamicJsonDocument doc(128);
  auto err = deserializeJson(doc, raw);
  if (err) {
    Serial.println("❌ JSON parse error: " + String(err.c_str()));
    return;
  }

  for (int i = 1; i <= 5; i++) {
    char key[6];
    snprintf(key, sizeof(key), "led%d", i);
    if (doc.containsKey(key)) {
      bool state = doc[key];
      digitalWrite(ledPins[i-1], state ? HIGH : LOW);
      Serial.printf("  → LED %d %s\n", i, state ? "ON" : "OFF");
    }
  }
}

void reconnectMQTT() {
  Serial.print("🔄 Connecting to MQTT...");
  while (!client.connected()) {
    String clientId = "ESP8266-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("✅ connected");
      client.subscribe(topic_ctrl);
      Serial.println("▶ Subscribed to " + String(topic_ctrl));
    } else {
      Serial.printf("❌ failed, rc=%d. Retry in 5s\n", client.state());
      delay(5000);
    }
  }
}
