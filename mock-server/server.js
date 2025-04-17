const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

// In-memory device state storage
const devices = {
  // Sample device data
  "device1": { id: "device1", name: "Living Room Light", type: "light", state: false, ip: "192.168.1.101" },
  "device2": { id: "device2", name: "Bedroom Fan", type: "fan", state: false, ip: "192.168.1.102" },
  "device3": { id: "device3", name: "Kitchen AC", type: "ac", state: false, temperature: 24, ip: "192.168.1.103" }
};

app.use(cors());
app.use(express.json());

// Get all devices
app.get('/api/devices', (req, res) => {
  res.json(Object.values(devices));
});

// Get specific device
app.get('/api/devices/:id', (req, res) => {
  const device = devices[req.params.id];
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json(device);
});

// Update device state
app.post('/api/devices/:id', (req, res) => {
  const device = devices[req.params.id];
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  // Update device with new properties
  Object.assign(device, req.body);
  
  // Log the action (simulating actual device response)
  console.log(`Device ${device.name} updated: `, device);
  
  res.json(device);
});

// Discovery endpoint - simulates finding devices on network
app.get('/api/discover', (req, res) => {
  // Simulate discovery delay
  setTimeout(() => {
    res.json(Object.values(devices));
  }, 1000);
});

app.listen(port, () => {
  console.log(`Mock IoT device server running at http://localhost:${port}`);
});
