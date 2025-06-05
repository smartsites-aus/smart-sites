// zwaveControl.js
const mqtt = require('mqtt');

const mqttClient = mqtt.connect('mqtt://localhost'); // Update as needed

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
});

function sendZWaveCommand({ nodeId, commandClass, endpoint, property, value }) {
  return new Promise((resolve, reject) => {
    const topic = 'zwave/_CLIENTS/ZWAVE_GATEWAY-zwavejs2mqtt/api/writeValue/set';
    const payload = {
      args: [
        {
          nodeId,
          commandClass,
          endpoint,
          property,
        },
        value,
      ],
    };

    mqttClient.publish(topic, JSON.stringify(payload), (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

module.exports = { sendZWaveCommand };