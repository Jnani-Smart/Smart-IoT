const express = require('express');
const cors = require('cors');
const network = require('network');
const ip = require('ip');
const Bonjour = require('bonjour-service');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Get local network information
app.get('/api/network-info', async (req, res) => {
  try {
    const networkInfo = await getNetworkInfo();
    res.json(networkInfo);
  } catch (error) {
    console.error('Error getting network info:', error);
    res.status(500).json({ error: 'Failed to get network information' });
  }
});

// Scan network for devices
app.get('/api/scan-network', async (req, res) => {
  try {
    // Get all discovered devices
    const devices = await discoverDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error scanning network:', error);
    res.status(500).json({ error: 'Failed to scan network' });
  }
});

// Control a device
app.post('/api/device/control', async (req, res) => {
  try {
    const { deviceIp, deviceId, protocol, action, params } = req.body;
    
    if (!deviceIp || !protocol || !action) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Implement device control logic here based on protocol
    const result = await controlDevice(deviceIp, deviceId, protocol, action, params);
    res.json(result);
  } catch (error) {
    console.error('Error controlling device:', error);
    res.status(500).json({ error: 'Failed to control device' });
  }
});

// Get all local IP addresses in the network
function getNetworkInfo() {
  return new Promise((resolve, reject) => {
    network.get_active_interface((err, interfaces) => {
      if (err) {
        console.error('Error getting network interfaces:', err);
        reject(err);
        return;
      }
      
      // Default values as fallback
      const defaultResult = {
        localIp: '192.168.1.2',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1'
      };
      
      if (!interfaces || !interfaces.ip_address) {
        console.warn('No network interfaces found, using default values');
        resolve(defaultResult);
        return;
      }
      
      resolve({
        localIp: interfaces.ip_address,
        subnetMask: interfaces.netmask || '255.255.255.0',
        gateway: interfaces.gateway_ip || '192.168.1.1'
      });
    });
  });
}

// Get IP range for scanning based on local IP and subnet mask
function getIpRange(localIp, subnetMask) {
  try {
    const networkCidr = ip.cidrSubnet(`${localIp}/${subnetMask}`);
    // Limiting the range to prevent scanning too many IPs
    const startIp = ip.toLong(networkCidr.firstAddress);
    const endIp = Math.min(startIp + 100, ip.toLong(networkCidr.lastAddress));
    
    return {
      start: ip.fromLong(startIp),
      end: ip.fromLong(endIp)
    };
  } catch (error) {
    console.error('Error calculating IP range:', error);
    // Default to a common home network range
    return {
      start: '192.168.1.1',
      end: '192.168.1.100'
    };
  }
}

// Scan a specific IP for known device protocols
async function scanIp(ipAddress) {
  try {
    // Try to detect if this is a Philips WiZ device
    const wizDevice = await detectWizDevice(ipAddress);
    if (wizDevice) return wizDevice;
    
    // Try to detect if this is a Philips Hue device
    const hueDevice = await detectHueDevice(ipAddress);
    if (hueDevice) return hueDevice;
    
    // Try to detect if this is a Syska device
    const syskaDevice = await detectSyskaDevice(ipAddress);
    if (syskaDevice) return syskaDevice;
    
    // Try to detect if this is a Tasmota device
    const tasmotaDevice = await detectTasmotaDevice(ipAddress);
    if (tasmotaDevice) return tasmotaDevice;
    
    // Try to detect if this is a Tuya device
    const tuyaDevice = await detectTuyaDevice(ipAddress);
    if (tuyaDevice) return tuyaDevice;
    
    // Try to detect if this is a Havells device
    const havellsDevice = await detectHavellsDevice(ipAddress);
    if (havellsDevice) return havellsDevice;
    
    // Try to detect if this is a Wipro device
    const wiproDevice = await detectWiproDevice(ipAddress);
    if (wiproDevice) return wiproDevice;
    
    // Try to detect if this is an Orient device
    const orientDevice = await detectOrientDevice(ipAddress);
    if (orientDevice) return orientDevice;
    
    // Try to detect if this is a Crompton device
    const cromptonDevice = await detectCromptonDevice(ipAddress);
    if (cromptonDevice) return cromptonDevice;
    
    // Try to detect if this is a Bajaj device
    const bajajDevice = await detectBajajDevice(ipAddress);
    if (bajajDevice) return bajajDevice;
    
    // If no known device is detected at this IP
    return null;
  } catch (error) {
    console.error(`Error scanning IP ${ipAddress}:`, error);
    return null;
  }
}

// Ping an IP address to check if it's reachable
async function pingIp(ipAddress) {
  try {
    const platform = process.platform;
    const pingCommand = platform === 'win32' 
      ? `ping -n 1 -w 500 ${ipAddress}` 
      : `ping -c 1 -W 500 ${ipAddress}`;
    
    const { stdout } = await execPromise(pingCommand);
    return stdout.includes('TTL=') || stdout.includes('ttl=');
  } catch (error) {
    return false;
  }
}

// Use mDNS discovery for finding devices that advertise themselves
async function discoverWithMdns() {
  return new Promise((resolve) => {
    const devices = [];
    const bonjour = new Bonjour();
    
    // Look for common smart home services
    const browser = bonjour.find({
      type: ['_hue._tcp', '_wiz._tcp', '_tuya._tcp', '_tasmota._tcp', '_http._tcp']
    });
    
    // Set a timeout to stop discovery after 3 seconds
    setTimeout(() => {
      browser.stop();
      bonjour.destroy();
      resolve(devices);
    }, 3000);
    
    browser.on('up', (service) => {
      // Extract information from the service to create a device
      if (!service.host || !service.addresses || service.addresses.length === 0) return;
      
      const ipAddress = service.addresses.find((addr) => addr.includes('.')) || '';
      if (!ipAddress) return;
      
      let protocol = 'unknown';
      let type = 'light';
      
      if (service.type.includes('_hue')) {
        protocol = 'philips-hue';
      } else if (service.type.includes('_wiz')) {
        protocol = 'philips-wiz';
      } else if (service.type.includes('_tuya')) {
        protocol = 'tuya';
      } else if (service.type.includes('_tasmota')) {
        protocol = 'tasmota';
      }
      
      // Try to detect type from service name
      const serviceName = service.name.toLowerCase();
      if (serviceName.includes('light') || serviceName.includes('bulb')) {
        type = 'light';
      } else if (serviceName.includes('fan')) {
        type = 'fan';
      } else if (serviceName.includes('ac') || serviceName.includes('aircon')) {
        type = 'ac';
      } else if (serviceName.includes('tv')) {
        type = 'tv';
      }
      
      devices.push({
        id: `${protocol}-${ipAddress.replace(/\./g, '-')}`,
        name: service.name || `${protocol.charAt(0).toUpperCase() + protocol.slice(1)} Device`,
        type,
        state: false,
        ip: ipAddress,
        protocol,
        value: type === 'light' ? 100 : (type === 'fan' ? 3 : undefined),
        temperature: type === 'ac' ? 24 : undefined
      });
    });
    
    browser.start();
  });
}

// Device detection functions
async function detectWizDevice(ipAddress) {
  try {
    // Check if device responds to WiZ API
    const response = await axios.get(`http://${ipAddress}/api/getSystemConfig`, { timeout: 1000 });
    if (response.data && response.data.result) {
      return {
        id: `philips-wiz-${ipAddress.replace(/\./g, '-')}`,
        name: 'Philips WiZ Light',
        type: 'light',
        state: false,
        ip: ipAddress,
        protocol: 'philips-wiz',
        value: 100
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectHueDevice(ipAddress) {
  try {
    // Check if device responds to Hue API
    const response = await axios.get(`http://${ipAddress}/api/config`, { timeout: 1000 });
    if (response.data && response.data.name && response.data.bridgeid) {
      return {
        id: `philips-hue-${ipAddress.replace(/\./g, '-')}`,
        name: 'Philips Hue Bridge',
        type: 'bridge',
        state: true,
        ip: ipAddress,
        protocol: 'philips-hue'
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectSyskaDevice(ipAddress) {
  try {
    // Check if device responds to Syska API
    const response = await axios.get(`http://${ipAddress}/api/v1/device/info`, { timeout: 1000 });
    if (response.data && response.data.manufacturer === 'Syska') {
      return {
        id: `syska-${ipAddress.replace(/\./g, '-')}`,
        name: 'Syska Smart Light',
        type: 'light',
        state: false,
        ip: ipAddress,
        protocol: 'syska',
        value: 100
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectTasmotaDevice(ipAddress) {
  try {
    // Check if device responds to Tasmota API
    const response = await axios.get(`http://${ipAddress}/cm?cmnd=Status%200`, { timeout: 1000 });
    if (response.data && response.data.Status) {
      const deviceName = response.data.Status.FriendlyName || 'Tasmota Device';
      const deviceType = detectDeviceType(response.data.Status.DeviceName || '');
      
      return {
        id: `tasmota-${ipAddress.replace(/\./g, '-')}`,
        name: deviceName,
        type: deviceType,
        state: false,
        ip: ipAddress,
        protocol: 'tasmota',
        value: deviceType === 'light' ? 100 : (deviceType === 'fan' ? 3 : undefined)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectTuyaDevice(ipAddress) {
  try {
    // Check if device responds to Tuya API
    const isReachable = await pingIp(ipAddress);
    if (!isReachable) return null;
    
    // Try to detect if it's a Tuya device by checking common ports
    const ports = [6668, 6669, 6670];
    for (const port of ports) {
      try {
        await axios.get(`http://${ipAddress}:${port}/`, { timeout: 500 });
        return {
          id: `tuya-${ipAddress.replace(/\./g, '-')}`,
          name: 'Tuya Smart Device',
          type: 'light',
          state: false,
          ip: ipAddress,
          protocol: 'tuya',
          value: 100
        };
      } catch (error) {
        // If we get a connection refused or timeout, it might still be a Tuya device
        if (error.code !== 'ECONNREFUSED' && !error.timeout) {
          continue;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Additional Indian brand detection functions
async function detectHavellsDevice(ipAddress) {
  try {
    // Check if device responds to Havells API
    const response = await axios.get(`http://${ipAddress}/api/info`, { timeout: 1000 });
    if (response.data && response.data.brand === 'Havells') {
      const deviceType = response.data.type || 'light';
      return {
        id: `havells-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || 'Havells Smart Device',
        type: deviceType,
        state: response.data.state === 'on',
        ip: ipAddress,
        protocol: 'havells',
        value: deviceType === 'light' ? (response.data.brightness || 100) : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectWiproDevice(ipAddress) {
  try {
    // Check if device responds to Wipro API
    const response = await axios.get(`http://${ipAddress}/system/info`, { timeout: 1000 });
    if (response.data && response.data.manufacturer === 'Wipro') {
      return {
        id: `wipro-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || 'Wipro Smart Device',
        type: response.data.type || 'light',
        state: response.data.power === 'on',
        ip: ipAddress,
        protocol: 'wipro',
        value: response.data.brightness || 100
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectOrientDevice(ipAddress) {
  try {
    // Check if device responds to Orient API
    const response = await axios.get(`http://${ipAddress}/api/device`, { timeout: 1000 });
    if (response.data && response.data.brand === 'Orient') {
      const deviceType = response.data.type || 'fan';
      let value;
      
      if (deviceType === 'fan') {
        value = response.data.speed || 3;
      } else if (deviceType === 'ac') {
        value = undefined;
      } else {
        value = response.data.brightness || 100;
      }
      
      return {
        id: `orient-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || 'Orient Smart Device',
        type: deviceType,
        state: response.data.power === 'on',
        ip: ipAddress,
        protocol: 'orient',
        value,
        temperature: deviceType === 'ac' ? (response.data.temperature || 24) : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectCromptonDevice(ipAddress) {
  try {
    // Check if device responds to Crompton API
    const response = await axios.get(`http://${ipAddress}/device/info`, { timeout: 1000 });
    if (response.data && response.data.brand === 'Crompton') {
      const deviceType = response.data.type || 'fan';
      
      return {
        id: `crompton-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || 'Crompton Smart Device',
        type: deviceType,
        state: response.data.state === 'on',
        ip: ipAddress,
        protocol: 'crompton',
        value: deviceType === 'light' ? (response.data.brightness || 100) : 
               (deviceType === 'fan' ? (response.data.speed || 3) : undefined)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectBajajDevice(ipAddress) {
  try {
    // Check if device responds to Bajaj API
    const response = await axios.get(`http://${ipAddress}/api/device/info`, { timeout: 1000 });
    if (response.data && response.data.brand === 'Bajaj') {
      return {
        id: `bajaj-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || 'Bajaj Smart Device',
        type: response.data.type || 'fan',
        state: response.data.status === 'on',
        ip: ipAddress,
        protocol: 'bajaj',
        value: response.data.type === 'fan' ? (response.data.speed || 3) : 
               (response.data.type === 'light' ? (response.data.brightness || 100) : undefined)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper function to detect device type based on model name
function detectDeviceType(modelName) {
  const lowerModelName = modelName.toLowerCase();
  
  if (lowerModelName.includes('light') || lowerModelName.includes('bulb') || lowerModelName.includes('lamp')) {
    return 'light';
  } else if (lowerModelName.includes('fan')) {
    return 'fan';
  } else if (lowerModelName.includes('ac') || lowerModelName.includes('aircon')) {
    return 'ac';
  } else if (lowerModelName.includes('tv') || lowerModelName.includes('television')) {
    return 'tv';
  }
  
  return 'light'; // Default to light
}

// Device discovery with network scan
async function discoverDevices() {
  try {
    const devices = [];
    
    // Step 1: Discover devices with mDNS
    const mdnsDevices = await discoverWithMdns();
    devices.push(...mdnsDevices);
    
    // Step 2: Get network information and calculate IP range for scanning
    const networkInfo = await getNetworkInfo();
    const ipRange = getIpRange(networkInfo.localIp, networkInfo.subnetMask);
    
    // Step 3: Scan IP range for devices
    const scanPromises = [];
    for (let i = ip.toLong(ipRange.start); i <= ip.toLong(ipRange.end); i++) {
      const currentIp = ip.fromLong(i);
      // Skip our own IP
      if (currentIp === networkInfo.localIp) continue;
      
      // First check if IP is reachable (faster than trying all protocols)
      const isReachable = await pingIp(currentIp);
      if (!isReachable) continue;
      
      scanPromises.push(scanIp(currentIp));
      
      // Limit concurrent requests to avoid network congestion
      if (scanPromises.length >= 10) {
        const results = await Promise.all(scanPromises);
        results.forEach(device => {
          if (device) devices.push(device);
        });
        scanPromises.length = 0;
      }
    }
    
    // Handle any remaining scan promises
    if (scanPromises.length > 0) {
      const results = await Promise.all(scanPromises);
      results.forEach(device => {
        if (device) devices.push(device);
      });
    }
    
    // Filter out duplicates (devices found by multiple methods)
    const uniqueDevices = devices.filter((device, index, self) =>
      index === self.findIndex((d) => d.ip === device.ip)
    );
    
    return uniqueDevices;
  } catch (error) {
    console.error('Error discovering devices:', error);
    return [];
  }
}

// Control device function
async function controlDevice(deviceIp, deviceId, protocol, action, params = {}) {
  try {
    let endpoint = '';
    let data = {};
    
    switch (protocol) {
      case 'philips-wiz':
        endpoint = `http://${deviceIp}/api`;
        if (action === 'setState') {
          data = { state: params.state ? 'on' : 'off' };
          endpoint += '/setState';
        } else if (action === 'setBrightness') {
          data = { brightness: params.value };
          endpoint += '/dimming';
        }
        break;
        
      case 'philips-hue':
        // For Hue, we need the bridge IP and light ID
        endpoint = `http://${deviceIp}/api/${params.username}/lights/${deviceId.split('-').pop()}/state`;
        if (action === 'setState') {
          data = { on: params.state };
        } else if (action === 'setBrightness') {
          data = { bri: params.value };
        }
        break;
        
      case 'syska':
        endpoint = `http://${deviceIp}/api/v1/device/control`;
        if (action === 'setState') {
          data = { power: params.state ? 'on' : 'off' };
        } else if (action === 'setBrightness') {
          data = { brightness: params.value };
        }
        break;
        
      case 'tasmota':
        endpoint = `http://${deviceIp}/cm`;
        if (action === 'setState') {
          data = { cmnd: `Power ${params.state ? 'On' : 'Off'}` };
        } else if (action === 'setBrightness') {
          data = { cmnd: `Dimmer ${params.value}` };
        }
        break;
        
      case 'havells':
        endpoint = `http://${deviceIp}/api/control`;
        if (action === 'setState') {
          data = { state: params.state ? 'on' : 'off' };
        } else if (action === 'setBrightness') {
          data = { brightness: params.value };
        }
        break;
        
      case 'wipro':
        endpoint = `http://${deviceIp}/system/control`;
        if (action === 'setState') {
          data = { power: params.state ? 'on' : 'off' };
        } else if (action === 'setBrightness') {
          data = { brightness: params.value };
        }
        break;
        
      case 'orient':
        endpoint = `http://${deviceIp}/api/control`;
        if (action === 'setState') {
          data = { power: params.state ? 'on' : 'off' };
        } else if (action === 'setSpeed') {
          data = { speed: params.value };
        } else if (action === 'setTemperature') {
          data = { temperature: params.value };
        }
        break;
        
      case 'crompton':
        endpoint = `http://${deviceIp}/device/control`;
        if (action === 'setState') {
          data = { state: params.state ? 'on' : 'off' };
        } else if (action === 'setBrightness' || action === 'setSpeed') {
          data = { [action === 'setBrightness' ? 'brightness' : 'speed']: params.value };
        }
        break;
        
      case 'bajaj':
        endpoint = `http://${deviceIp}/api/device/control`;
        if (action === 'setState') {
          data = { status: params.state ? 'on' : 'off' };
        } else if (action === 'setBrightness' || action === 'setSpeed') {
          data = { [action === 'setBrightness' ? 'brightness' : 'speed']: params.value };
        }
        break;
        
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
    
    // Send control command to device
    const response = await axios.post(endpoint, data, { timeout: 3000 });
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error controlling device ${deviceIp} (${protocol}):`, error);
    return { success: false, error: error.message };
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
