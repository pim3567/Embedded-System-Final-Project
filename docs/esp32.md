# 📡 ESP32-S3 Wi-Fi Bridge Firmware

This repository contains the Arduino/C++ firmware for **ESP32-S3 (NodeMCU-32S / N16R8)**. It functions as an IoT gateway bridge between the **STM32 NUCLEO-F411RE** (via UART) and **NETPIE 2020 Cloud** (via MQTT over Wi-Fi).

---

## 🌟 Key Features

1. **Wi-Fi Connectivity:** Auto-reconnects to configured Wi-Fi Hotspot.
2. **NETPIE 2020 MQTT Client:** Publishes telemetry data to Device Shadow and subscribes to incoming cloud commands.
3. **Hardware UART Interfacing (Serial2):** Reads raw JSON string from STM32, validates/parses JSON payload, and passes parsed telemetry to the Cloud.
4. **Cloud-to-Board Forwarding:** Forwards incoming commands from NETPIE topic `@msg/cmd` to STM32 via `Serial2`.
5. **Non-blocking Loop:** Efficient event-loop execution to maintain real-time telemetry streaming and steady MQTT heartbeat.

---

## 🔌 Hardware Wiring Guide

Connect **ESP32-S3** to **STM32 NUCLEO-F411RE** using Hardware Serial2 pins as shown below:

| ESP32-S3 Pin | Signal | STM32 NUCLEO-F411RE Pin   | Note                          |
| :----------- | :----- | :------------------------ | :---------------------------- |
| **GPIO 16**  | RX2    | **TX (e.g., PA9 / PA2)**  | Cross Connection (RX ← TX)    |
| **GPIO 17**  | TX2    | **RX (e.g., PA10 / PA3)** | Cross Connection (TX → RX)    |
| **GND**      | Ground | **GND**                   | **Common Ground (Mandatory)** |

> ⚠️ **Note:** Always ensure both boards share a common GND to reference voltage levels accurately.

---

## 🛠️ Software Requirements & Libraries

- **IDE:** Arduino IDE 2.x or VS Code with PlatformIO
- **Board Manager:** ESP32 by Espressif Systems (v2.0.x or higher)
- **Required Libraries:**
  - `WiFi` (Built-in ESP32)
  - `PubSubClient` by Nick O'Leary (MQTT protocol)
  - `ArduinoJson` by Benoit Blanchon (JSON parser version 6.x)

---

## ⚙️ Configuration Setup (`config.h`)

Before flashing the code to ESP32-S3, create/update the `config.h` file with your Wi-Fi credentials and NETPIE 2020 Device Keys:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi Configuration
#define WIFI_SSID     "YOUR_WIFI_HOTSPOT_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// NETPIE 2020 MQTT Broker Credentials
#define MQTT_SERVER    "broker.netpie.io"
#define MQTT_PORT      1883
#define MQTT_CLIENT_ID "YOUR_ESP32_CLIENT_ID"
#define MQTT_TOKEN     "YOUR_ESP32_TOKEN"
#define MQTT_SECRET    "YOUR_ESP32_SECRET"

#endif
```

---

## 📑 Data Protocol & Payload Structure

### 1. STM32 ➔ ESP32-S3 (Hardware Serial2 @ 115200 Baud)

STM32 transmits JSON strings terminated with `\n` (newline):

```json
{ "btn": 1, "x": 2048, "y": 1024 }
```

### 2. ESP32-S3 ➔ NETPIE Device Shadow (`@shadow/data/update`)

ESP32 structures and publishes the payload to NETPIE Cloud:

```json
{
  "data": {
    "btn": 1,
    "joy_x": 2048,
    "joy_y": 1024
  }
}
```

### 3. NETPIE Cloud ➔ ESP32-S3 ➔ STM32 (`@msg/cmd`)

Incoming commands on topic `@msg/cmd` are received in `callback()` and forwarded via `Serial2.println(message)` to STM32.

---

## 📂 Folder Structure

```text
esp32/
├── esp32.ino          # Main Arduino firmware source code
├── config.h           # Wi-Fi and NETPIE credentials
└── README.md          # ESP32 Firmware documentation
```
