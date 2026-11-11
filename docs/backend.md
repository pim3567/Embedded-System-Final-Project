# 🚀 Real-time IoT Wi-Fi Bridge Backend Service

This repository contains the Node.js Backend Service for the Wi-Fi Bridge System. It acts as an intermediary bridge between **NETPIE 2020 Cloud (MQTT)** and the **Web Frontend (WebSockets)**, providing real-time bi-directional telemetry data streaming and command forwarding.

---

## 🏗️ Architecture & Communication Flow

```text
[ STM32 NUCLEO ] ──(UART 115200)──> [ ESP32-S3 Bridge ]
                                             │
                                     (MQTT / NETPIE Cloud)
                                             │
                                             ▼
                                   [ Node.js Backend ]
                                             │
                                    (WebSockets / Socket.io)
                                             │
                                             ▼
                                     [ Web Frontend ]
```

- **Inbound Data (Telemetry):** ESP32 publishes sensor data to NETPIE (`@shadow/data/update`), and NETPIE broadcasts event updates via `@shadow/data/updated` to this Backend Service.
- **Outbound Commands (Control):** Frontend sends WebSocket events (`send_command`), which Backend forwards to NETPIE MQTT topic `@msg/cmd` to control STM32/ESP32.

---

## 🛠️ Prerequisites & Setup

### 1. Installation

Clone the repository and install the required dependencies:

```bash
npm install
```

### 2. Environment Variables Configuration

Create a `.env` file in the root directory of the backend folder:

```env
PORT=4000
MQTT_CLIENT_ID=YOUR_BACKEND_CLIENT_ID
MQTT_TOKEN=YOUR_BACKEND_TOKEN
MQTT_SECRET=YOUR_BACKEND_SECRET
```

> ⚠️ **Important:** `MQTT_CLIENT_ID` **must be unique** and different from the ESP32-S3 Client ID to prevent connection drops caused by client ID collision on the NETPIE Broker.

---

## 🚦 Execution

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## 📖 Web Frontend Integration Tutorial

Frontend Developer can connect to this Backend using **Socket.io Client**.

### 🔌 Connection (Client-Side)

```javascript
import { io } from "socket.io-client";

// Connect to Node.js Backend
const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("Connected to WebSocket Server! ID:", socket.id);
});
```

---

## 📡 Socket.io API Reference

### 📥 1. Receive Real-time Data (`sensor_update`)

Listen to `sensor_update` event to receive real-time telemetry coming from the hardware bridge.

#### Event Name: `sensor_update`

#### Payload Example (JSON):

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

socket.on("sensor_update", (data) => {
  console.log("Device data:", data);
  // Update state/UI using data.btn, data.joy_x, and data.joy_y.
});
```

#### Field Specifications:

| Field    | Type     | Range / Options              | Description                                         |
| :------- | :------- | :--------------------------- | :-------------------------------------------------- |
| `btn`    | `Number` | `0` or `1`                   | Button state from STM32 (1 = Pressed, 0 = Released) |
| `joy_x`  | `Number` | `0` - `4095`                 | Joystick X-axis coordinate (12-bit ADC)             |
| `joy_y`  | `Number` | `0` - `4095`                 | Joystick Y-axis coordinate (12-bit ADC)             |
| `status` | `String` | `"online"`, `"mock_testing"` | Hardware bridge status indicator                    |

---

### 📤 2. Send Control Commands (`send_command`)

Emit `send_command` event to push control commands down to the hardware (e.g., controlling RGB LEDs on STM32).

#### Event Name: `send_command`

#### Payload Example:

```javascript
// Object payload
socket.emit("send_command", { led: "ON", color: "RED" });

// Plain string payload
socket.emit("send_command", "LED_OFF");
```

---

## 📂 Directory Structure

```text
.
├── server.js          # Main entry point for Express & Socket.io server
├── .env               # Environment configuration (secrets & keys)
├── package.json       # Project dependencies & scripts
└── README.md          # Backend documentation
```
