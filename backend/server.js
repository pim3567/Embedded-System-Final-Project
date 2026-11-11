const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');

dotenv.config({ path: '.env' });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Connect to NETPIE MQTT for Backend Client
const mqttClient = mqtt.connect('mqtt://broker.netpie.io:1883', {
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_TOKEN,
    password: process.env.MQTT_SECRET
});

mqttClient.on('connect', () => {
    console.log('Backend connected to NETPIE MQTT Broker!');
    mqttClient.subscribe('@msg/data', (err) => {
        if (!err) {
            console.log('Subscribed to NETPIE topics successfully.');
        }
    });
});

mqttClient.on('offline', () => {
    console.warn('MQTT Client is offline. Attempting to reconnect...');
});

mqttClient.on('error', (err) => {
    console.error('MQTT Connection Error:', err.message);
});

mqttClient.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        console.log(`Data from [${topic}]:`, payload);

        const sensorData = payload.data || payload;
        io.emit('sensor_update', sensorData);

    } catch (err) {
        console.error('JSON Parsing Error:', err.message);
    }
});

// listen to WebSocket Connection from Web Frontend
io.on('connection', (socket) => {
    console.log('Web Frontend connected:', socket.id);

    socket.on('send_command', (cmd) => {
        const commandString = typeof cmd === 'object' ? JSON.stringify(cmd) : cmd;
        mqttClient.publish('@msg/cmd', commandString);
        console.log('Command published to @msg/cmd:', commandString);
    });

    socket.on('disconnect', () => {
        console.log('Web Frontend disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend WebSocket Server running on port ${PORT}`));