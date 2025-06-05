// backend/zwave/zwaveControl.js
const mqtt = require('mqtt');
const mqttClient = mqtt.connect('mqtt://localhost'); // Adjust if needed

mqttClient.on('connect', () => {
  console.log('✅ Z-Wave MQTT connected');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT connection error (Z-Wave):', err);
});

/**
 * Publishes a Z-Wave command over MQTT.
 * @param {Object} commandData - { nodeId, commandClass, command, value }
 */
function sendZWaveCommand(commandData) {
  return new Promise((resolve, reject) => {
    const { nodeId, commandClass, command, value } = commandData;

    if (!nodeId || !commandClass || !command) {
      return reject(new Error('Missing required Z-Wave command fields'));
    }

    const topic = `zwave/command/${nodeId}/${commandClass}/${command}`;
    const payload = JSON.stringify({ value });

    console.log(`📤 Sending Z-Wave MQTT command → Topic: ${topic}, Payload: ${payload}`);

    mqttClient.publish(topic, payload, (err) => {
      if (err) {
        console.error('❌ Failed to publish Z-Wave command:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = { sendZWaveCommand };