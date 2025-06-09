// /home/pi/smart-sites/smart-sites/scripts/sendZWaveCommand.js

const mqtt = require('mqtt');

function sendZWaveCommand(deviceId, commandClass, property, value) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect('mqtt://localhost');

    client.on('connect', () => {
      const topic = `zwave/${deviceId}/set`;
      const payload = JSON.stringify({
        commandClass,
        property,
        value
      });

      client.publish(topic, payload, {}, (err) => {
        client.end();
        if (err) return reject(err);
        resolve({ success: true, message: 'Command sent' });
      });
    });

    client.on('error', (err) => {
      client.end();
      reject(err);
    });
  });
}

module.exports = sendZWaveCommand;
