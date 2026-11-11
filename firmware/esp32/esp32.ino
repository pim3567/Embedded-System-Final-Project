#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

#define RXD2 16  // TX of STM32
#define TXD2 17  // RX of STM32

WiFiClient espClient;
PubSubClient client(espClient);

String rxBuffer = "";
unsigned long lastMsg = 0;

// Callback function from NETPIE Cloud
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message from Cloud [");
  Serial.print(topic);
  Serial.print("]: ");

  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Forward message from cloud to STM32
  Serial2.println(message);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to NETPIE...");
    if (client.connect(MQTT_CLIENT_ID, MQTT_TOKEN, MQTT_SECRET)) {
      Serial.println(" CONNECTED!");
      client.subscribe("@msg/cmd");
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  // Serial Monitor
  Serial.begin(115200);

  // Hardware Serial2
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2);

  // Wifi connect
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // Connect to NETPIE
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Get data from STM32 and send to NETPIE
  while (Serial2.available()) {
    char inChar = (char)Serial2.read();

    if (inChar == '\n') {
      rxBuffer.trim();
      if (rxBuffer.length() > 0) {
        Serial.print("Received from STM32: ");
        Serial.println(rxBuffer);

        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, rxBuffer);

        if (!error) {
          // Structuring the payload for transmission to NETPIE Device Shadow
          StaticJsonDocument<256> netpieDoc;
          JsonObject data = netpieDoc.createNestedObject("data");

          // Get data from STM32 into Payload
          data["btn"] = doc["btn"];
          data["joy_x"] = doc["x"];
          data["joy_y"] = doc["y"];

          char jsonBuffer[512];
          serializeJson(netpieDoc, jsonBuffer);

          // Publish data to NETPIE Cloud
          client.publish("@shadow/data/update", jsonBuffer);
          Serial.print("Published to NETPIE: ");
          Serial.println(jsonBuffer);
        } else {
          Serial.println("JSON Parse Error from STM32 Data");
        }
      }
      rxBuffer = "";  // Clear Buffer
    } else {
      rxBuffer += inChar;
    }
  }

  // === FOR TESTING SEND MOCK DATA TO (DELETE LATER) ===

  // Send data every 1 sec
  unsigned long now = millis();
  if (now - lastMsg > 1000) {
    lastMsg = now;

    // Create mock data
    // Random Joystick X, Y between 0 - 4095
    int mock_x = random(0, 4096);
    int mock_y = random(0, 4096);

    // Random button status (0 / 1)
    int mock_btn = random(0, 2);

    // create JSON Document
    StaticJsonDocument<256> netpieDoc;
    JsonObject data = netpieDoc.createNestedObject("data");

    data["btn"] = mock_btn;
    data["joy_x"] = mock_x;
    data["joy_y"] = mock_y;
    data["status"] = "mock_testing";

    char jsonBuffer[512];
    serializeJson(netpieDoc, jsonBuffer);

    // Publish to Device Shadow of NETPIE
    client.publish("@shadow/data/update", jsonBuffer);
    client.publish("@msg/data", jsonBuffer);

    Serial.print("Sent Mock Data to NETPIE: ");
    Serial.println(jsonBuffer);
  }
}