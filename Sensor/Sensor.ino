/*
   PIR sensor tester with WiFi and MQTT
*/
#include <ESP8266WiFi.h>  // Thư viện cho ESP8266
#include <PubSubClient.h>
#include <DHT.h>  

// 🟢 **Cấu hình chân cảm biến**
const int LED_PIN_1 = 12;  // LED 1
const int LED_PIN_2 = 0;  // LED 2
const int PIR_PIN = 2;     // PIR sensor
const int BUZZER_PIN = 13; 
const int IR_PIN_1 = 14;   // IR sensor 1 (GPIO14, D5 trên NodeMCU)
const int IR_PIN_2 = 20;   // IR sensor 2 (GPIO15, D8 trên NodeMCU)
const int MQ135_PIN = A0;  // MQ135 gas sensor
const int FLAME_PIN = 16;   // Flame sensor
const int DHT_PIN = 4;     // Chân Data của DHT11 (GPIO4, D2 trên NodeMCU)
DHT dht(DHT_PIN, DHT11);

// 🟢 **Biến trạng thái**
int pirState = 0;         // Trạng thái PIR
int flameState = 0;       // Trạng thái Flame
int obstacle1 = 0;        // Trạng thái IR 1
int obstacle2 = 0;        // Trạng thái IR 2
int lastDetected = 0;     // Logic tuần tự IR
const int GAS_LIMIT = 600;

// 🟢 **Biến thời gian**
unsigned long lastDhtRead = 0;
unsigned long lastIrRead = 0;
unsigned long lastMsg = 0;
const unsigned long DHT_INTERVAL = 2000;   // Đọc DHT mỗi 2s
const unsigned long IR_INTERVAL = 500;     // Đọc IR mỗi 0.5s
const unsigned long MQTT_INTERVAL = 10000;  // Gửi dữ liệu lên MQTT mỗi 5s

// 🟢 **Cấu hình kết nối WiFi**
const char* ssid = "DHCN - CSM"; 
const char* password = "@Phuc244466666";

// 🟢 **Cấu hình MQTT**
const char* mqtt_server = "152.42.200.154";
const char* mqtt_username = "trong";  // Thay bằng Username của bạn
const char* mqtt_password = "trong";  // Thay bằng Key của bạn
const char* sensor_topic = "data_xyz";

WiFiClient espClient;
PubSubClient client(espClient);

// 🟢 **Hàm kết nối WiFi**
void setup_wifi() { 
  Serial.println();
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA); 
  WiFi.disconnect();
  WiFi.begin(ssid, password);

  unsigned long startTime = millis();
  const unsigned long timeout = 10000; // Timeout 10 giây
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < timeout) { 
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected");
    Serial.print("📡 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Failed to connect to WiFi. Continuing without WiFi...");
  }
}

// 🟢 **Hàm nhận dữ liệu từ MQTT**
void callback(char* topic, byte* payload, unsigned int length) {
  // ---- lấy topic & payload thành chuỗi ----
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  message.trim();                                    // loại space / \r\n

  Serial.printf("📩 Received [%s]: %s\n", topic, message.c_str());
  
  // ---- chỉ xử lý khi topic = "pipe" ----
  if (strcmp(topic, "pipe") == 0) {                  // so sánh nội dung
    bool alarmOn = message.equalsIgnoreCase("true") ||
                   message.equalsIgnoreCase("1")    ||
                   message.equalsIgnoreCase("on");

    digitalWrite(BUZZER_PIN, alarmOn ? HIGH : LOW);
    Serial.println(alarmOn ? "🔔 Pipe ALARM ON" : "🔕 Pipe ALARM OFF");
  }
}


// 🟢 **Hàm kết nối lại MQTT**
void reconnect() { 
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ No WiFi connection. Skipping MQTT...");
    return;
  }

  while (!client.connected()) {
    Serial.print("🔄 Attempting MQTT connection...");
    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("✅ Connected to MQTT!");
      client.subscribe("pipe");   
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" -> Retrying in 5s...");
      delay(5000);
    }
  }
}

// 🟢 **Hàm xử lý cảm biến IR**
void handleIrSensors() {
  unsigned long now = millis();
  if (now - lastIrRead < IR_INTERVAL) return;
  lastIrRead = now;

  obstacle1 = digitalRead(IR_PIN_1);
  Serial.print(F("🔍 IR Sensor 1: "));   
  Serial.println(obstacle1 == LOW ? "Detected" : "None"); 
  obstacle2 = digitalRead(IR_PIN_2);
  Serial.print(F("🔍 IR Sensor 2: "));   
  Serial.println(obstacle2 == LOW ? "Detected" : "None"); 

  if (obstacle1 == LOW && lastDetected == 0) {
    lastDetected = 1;
  } else if (obstacle2 == LOW && lastDetected == 1) {
    Serial.println("👋 Xin chao");
    lastDetected = 0;
  }

  if (obstacle2 == LOW && lastDetected == 0) {
    lastDetected = 2;
  } else if (obstacle1 == LOW && lastDetected == 2) {
    Serial.println("👋 Tam biet");
    lastDetected = 0;
  }

  if (obstacle1 == HIGH && obstacle2 == HIGH) {
    lastDetected = 0;
  }
}

void setup() {
  // 🟢 **Khởi tạo các chân**
  pinMode(LED_PIN_1, OUTPUT);
  pinMode(LED_PIN_2, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_PIN_1, INPUT);
  pinMode(IR_PIN_2, INPUT);

  digitalWrite(LED_PIN_1, LOW);
  digitalWrite(LED_PIN_2, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.begin(115200);
  dht.begin();
  
  // 🟢 **Kết nối WiFi và MQTT**
  setup_wifi();
  client.setServer(mqtt_server, 9090);
  client.setCallback(callback);
  
  delay(2000);
}

void loop() {
  // 🟢 **Kiểm tra kết nối WiFi và MQTT**
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
  }
  if (WiFi.status() == WL_CONNECTED && !client.connected()) {
    reconnect();
  }
  client.loop();

  // 🟢 **Xử lý cảm biến IR**
  handleIrSensors();

  // 🟢 **Đọc các cảm biến khác mỗi 2s**
  unsigned long now = millis();
  if (now - lastDhtRead >= DHT_INTERVAL) {
    lastDhtRead = now;

    flameState = digitalRead(FLAME_PIN);
    Serial.print(F("🔥 Flame Sensor (Raw): "));
    Serial.println(flameState);  // In giá trị thô để debug
    Serial.print(F("🔥 Flame Sensor: "));
    Serial.println(flameState == HIGH ? "Fire" : "NoFire");  // Đổi logic: HIGH là có lửa
    if (flameState == HIGH) {
      Serial.println("🚨 Fire detected!");
      digitalWrite(LED_PIN_2, HIGH);
    } else {
      digitalWrite(LED_PIN_2, LOW);
    }

    pirState = digitalRead(PIR_PIN);
    Serial.print(F("🚶 PIR Sensor: "));
    Serial.println(pirState == HIGH ? "Motion" : "NoMotion");
    if (pirState == HIGH) {
      digitalWrite(LED_PIN_1, HIGH);
      // digitalWrite(BUZZER_PIN, HIGH);
      Serial.println("🚨 Motion detected!");
    } else {
      digitalWrite(LED_PIN_1, LOW);
      // digitalWrite(BUZZER_PIN, LOW);
    }

    int gasRaw = analogRead(MQ135_PIN);
    Serial.print(F("💨 Gas Sensor (MQ135): "));
    Serial.println(gasRaw);

    float h = dht.readHumidity();
    float t = dht.readTemperature();
    if (!isnan(h) && !isnan(t)) {
      Serial.print(F("🌡️ Temperature: "));
      Serial.print(t);
      Serial.println(F("°C"));
      Serial.print(F("💧 Humidity: "));
      Serial.print(h);
      Serial.println(F("%"));
    } else {
      Serial.println("❌ Failed to read DHT sensor!");
    }
  }

  // 🟢 **Gửi dữ liệu lên MQTT mỗi 5s**
  if (now - lastMsg >= MQTT_INTERVAL && WiFi.status() == WL_CONNECTED && client.connected()) {
    lastMsg = now;

    // 🔷 Đọc dữ liệu cảm biến
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int gasRaw = analogRead(MQ135_PIN);
    flameState = digitalRead(FLAME_PIN);
    pirState = digitalRead(PIR_PIN);
    obstacle1 = digitalRead(IR_PIN_1);
    obstacle2 = digitalRead(IR_PIN_2);

    // 🔷 Xử lý NaN từ DHT
    String tempStr = isnan(t) ? "0" : String(t, 2);
    String humStr = isnan(h) ? "0" : String(h, 1);

    // 🔷 Tạo chuỗi JSON thủ công
    String payload = "{";
    payload += "\"temperature\": " + tempStr + ",";
    payload += "\"humidity\": " + humStr + ",";
    payload += "\"gas\": " + String(gasRaw) + ",";
    payload += "\"flame\": \"" + String(flameState == LOW ? "Fire" : "NoFire") + "\",";
    payload += "\"pir\": \"" + String(pirState == HIGH ? "Motion" : "NoMotion") + "\",";
    payload += "\"ir1\": \"" + String(obstacle1 == LOW ? "Detected" : "None") + "\",";
    payload += "\"ir2\": \"" + String(obstacle2 == LOW ? "Detected" : "None") + "\"";
    payload += "}";

    // 🔷 Gửi lên MQTT
    client.publish(sensor_topic, payload.c_str());

    Serial.println("📤 Sent JSON data to MQTT:");
    Serial.println(payload);
  }
}