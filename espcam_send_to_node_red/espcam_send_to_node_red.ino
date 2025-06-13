#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_camera.h>

// ————————————————————————
//  1) AI-Thinker pinout
// ————————————————————————
#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22
#define FLASH_GPIO_NUM   4

// ————————————————————————
//  2) WiFi + MQTT config
// ————————————————————————
const char* SSID       = "Khánh 👀🎶";
const char* PWD        = "02082004";
const char* MQTT_HOST  = "152.42.200.154";
const uint16_t MQTT_PORT = 9090;
const char* MQTT_USER  = "khanh";
const char* MQTT_PASS  = "khanh";
const char* TOPIC      = "esp32cam/image";

WiFiClient     wifiClient;
PubSubClient   mqtt(wifiClient);

void connectWiFi() {
  WiFi.begin(SSID, PWD);
  Serial.print("🛰️ WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi: " + WiFi.localIP().toString());
}

void connectMQTT() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  Serial.print("🔌 MQTT connecting");
  while (!mqtt.connected()) {
    if (mqtt.connect("ESP32CAM", MQTT_USER, MQTT_PASS)) {
      Serial.println(" ✅");
    } else {
      Serial.print(".");
      delay(500);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Camera init
  camera_config_t cfg = {};
  cfg.ledc_channel  = LEDC_CHANNEL_0;
  cfg.ledc_timer    = LEDC_TIMER_0;
  cfg.pin_d0        = Y2_GPIO_NUM;
  cfg.pin_d1        = Y3_GPIO_NUM;
  cfg.pin_d2        = Y4_GPIO_NUM;
  cfg.pin_d3        = Y5_GPIO_NUM;
  cfg.pin_d4        = Y6_GPIO_NUM;
  cfg.pin_d5        = Y7_GPIO_NUM;
  cfg.pin_d6        = Y8_GPIO_NUM;
  cfg.pin_d7        = Y9_GPIO_NUM;
  cfg.pin_xclk      = XCLK_GPIO_NUM;
  cfg.pin_pclk      = PCLK_GPIO_NUM;
  cfg.pin_vsync     = VSYNC_GPIO_NUM;
  cfg.pin_href      = HREF_GPIO_NUM;
  cfg.pin_sccb_sda  = SIOD_GPIO_NUM;
  cfg.pin_sccb_scl  = SIOC_GPIO_NUM;
  cfg.pin_pwdn      = PWDN_GPIO_NUM;
  cfg.pin_reset     = RESET_GPIO_NUM;
  cfg.xclk_freq_hz  = 20000000;
  cfg.pixel_format  = PIXFORMAT_JPEG;
  cfg.frame_size    = FRAMESIZE_VGA;
  cfg.jpeg_quality  = 16;
  cfg.fb_count      = 2;

  if (esp_camera_init(&cfg) != ESP_OK) {
    Serial.println("❌ Camera init failed");
    while(true) delay(100);
  }
  Serial.println("📸 Camera ready");

  connectWiFi();
  connectMQTT();
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Capture failed");
    delay(500);
    return;
  }
  Serial.printf("📷 Captured %u bytes, publishing raw JPEG...\n", fb->len);

  // 1 message publish raw JPEG
  bool ok = mqtt.publish(TOPIC, fb->buf, fb->len, false);
  Serial.printf("➡️ MQTT publish %s (%u bytes)\n", ok?"OK":"FAILED", fb->len);

  esp_camera_fb_return(fb);
  delay(100); 
}