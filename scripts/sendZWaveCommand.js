const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost');

function sendZWaveCommand(nodeId, commandClass, command, value) {
  const topic = `zwave/_CLIENTS/ZWAVE_GATEWAY-SmartSites/api/sendCommand/set`;
  const payload = {
    command: 'sendCommand',
    nodeId: nodeId,
    commandClass: commandClass,
    endpoint: 0,
    property: command,
    value: value
  };

  client.publish(topic, JSON.stringify(payload));
  console.log(`Sent Z-Wave command to node ${nodeId}: ${commandClass} -> ${command} = ${value}`);
}

module.exports = sendZWaveCommand;
