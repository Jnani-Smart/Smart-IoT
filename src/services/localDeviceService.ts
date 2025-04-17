// Service for communicating with local network devices
import { getProtocolHandler } from './deviceProtocols';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import axios from 'axios';
import deviceCache from './deviceCache';

// Backend server URL
const API_URL = 'http://localhost:3001/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Helper function to retry failed API calls
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      console.error(`${errorMessage} after maximum retries:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.warn(`${errorMessage}, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay, errorMessage);
  }
}

// Local device type (scanned directly from network)
export interface LocalDevice {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'ac' | 'tv' | 'refrigerator' | string;
  ip: string;
  mac?: string;
  state: boolean;
  protocol?: string;
  value?: number;
  brightness?: number;
  temperature?: number;
  cloudId?: string;
  addedToCloud?: boolean;
  isUpdating?: boolean;
  lastSeen?: number;
  manufacturer?: string;
  model?: string;
  networkInfo?: {
    ipRange?: string;
    networkName?: string;
  };
}

// Browser-compatible approach to local network scanning (fallback)
async function scanLocalNetworkFallback(): Promise<string[]> {
  try {
    // In a browser environment, we can't directly scan the network
    // Instead, we use a common IP range for home networks
    const ipAddresses: string[] = [];
    
    // Common IP ranges for home networks
    const ranges = [
      { start: '192.168.1.1', end: '192.168.1.50' },  // Common home router range
      { start: '192.168.0.1', end: '192.168.0.50' },  // Alternative range
      { start: '10.0.0.1', end: '10.0.0.50' }        // Another common range
    ];
    
    for (const range of ranges) {
      const startParts = range.start.split('.').map(part => parseInt(part, 10));
      const endParts = range.end.split('.').map(part => parseInt(part, 10));
      
      // Only scan the last octet for performance
      for (let i = startParts[3]; i <= endParts[3]; i++) {
        ipAddresses.push(`${startParts[0]}.${startParts[1]}.${startParts[2]}.${i}`);
      }
    }
    
    return ipAddresses;
  } catch (error) {
    console.error('Error in network scanning:', error);
    // Return a minimal list for testing
    return ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
  }
}

// Scan a specific IP for known device protocols (fallback method)
async function scanIpFallback(ipAddress: string): Promise<LocalDevice | null> {
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

// Mock mDNS discovery for browser environment (fallback)
async function discoverWithMdnsFallback(): Promise<LocalDevice[]> {
  console.log('Attempting to discover devices with mDNS emulation');
  
  // In browser environment, we can't use real mDNS discovery
  // This is a mock implementation that returns known device types
  // that might be discoverable via mDNS
  
  const mockDevices: LocalDevice[] = [
    // Mock Philips Hue Bridge (if present on network)
    {
      id: 'philips-hue-bridge',
      name: 'Philips Hue Bridge',
      type: 'bridge',
      state: true,
      ip: '192.168.1.10',
      protocol: 'philips-hue'
    },
    // Mock Philips WiZ Light (if present on network)
    {
      id: 'philips-wiz-light',
      name: 'Philips WiZ Light',
      type: 'light',
      state: false,
      ip: '192.168.1.15',
      protocol: 'philips-wiz',
      value: 80
    }
  ];
  
  // Simulating network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Testing mode - in production this would be empty and only filled with real discovered devices
  return mockDevices;
}

// Device discovery with network scan (using backend server)
export async function discoverDevices(): Promise<LocalDevice[]> {
  try {
    console.log('Starting device discovery...');
    
    // Check if we have recent cached devices (less than 5 minutes old)
    if (deviceCache.hasRecentScan(5 * 60 * 1000)) {
      console.log('Using cached devices from recent scan');
      const cachedDevices = deviceCache.getAllDevices();
      
      // If we have cached devices, use them
      if (cachedDevices.length > 0) {
        return cachedDevices;
      }
    }
    
    // Try to use the backend server for real network scanning
    try {
      const response = await retryOperation(
        () => axios.get(`${API_URL}/scan-network`, { timeout: 30000 }),
        2, // fewer retries for this long operation
        2000,
        'Failed to scan network with backend server'
      );
      
      console.log('Devices discovered via backend server:', response.data);
      
      // Cache the discovered devices
      deviceCache.cacheDevices(response.data);
      
      return response.data;
    } catch (error) {
      console.warn('Failed to use backend server for network scanning, falling back to browser-compatible method:', error);
      
      // Check if we have any cached devices, even if not recent
      const cachedDevices = deviceCache.getAllDevices();
      if (cachedDevices.length > 0) {
        console.log('Using cached devices while falling back to browser method');
      }
      
      // Fallback to browser-compatible method if backend is not available
      const devices: LocalDevice[] = [];
      
      // Step 1: Use mock mDNS discovery
      const mdnsDevices = await discoverWithMdnsFallback();
      devices.push(...mdnsDevices);
      
      // Step 2: Scan local network for devices
      const ipAddresses = await scanLocalNetworkFallback();
      
      // Step 3: Scan IP addresses for devices
      const scanPromises = ipAddresses.map(ipAddress => scanIpFallback(ipAddress));
      
      // Handle scan promises
      const results = await Promise.all(scanPromises);
      results.forEach(device => {
        if (device) devices.push(device);
      });
      
      // Filter out duplicates (devices found by multiple methods)
      const uniqueDevices = devices.filter((device, index, self) =>
        index === self.findIndex((d) => d.ip === device.ip)
      );
      
      // Cache these devices too
      deviceCache.cacheDevices(uniqueDevices);
      
      // Merge with any cached devices for best results
      if (cachedDevices.length > 0) {
        // Combine cached and newly discovered devices, preferring new ones in case of duplicates
        const mergedDevices = [...cachedDevices];
        
        uniqueDevices.forEach(newDevice => {
          const existingIndex = mergedDevices.findIndex(d => d.id === newDevice.id);
          if (existingIndex >= 0) {
            mergedDevices[existingIndex] = newDevice;
          } else {
            mergedDevices.push(newDevice);
          }
        });
        
        return mergedDevices;
      }
      
      return uniqueDevices;
    }
  } catch (error) {
    console.error('Error discovering devices:', error);
    
    // Last resort: return any cached devices we have
    const cachedDevices = deviceCache.getAllDevices();
    if (cachedDevices.length > 0) {
      console.log('Returning cached devices due to discovery error');
      return cachedDevices;
    }
    
    throw new Error(`Device discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Toggle a device on/off (using backend server when available)
export async function toggleDevice(device: LocalDevice, newState: boolean): Promise<boolean> {
  try {
    console.log(`Toggling device ${device.name} to ${newState ? 'ON' : 'OFF'}`);
    
    if (!device.protocol) {
      console.error('Device has no protocol defined');
      return false;
    }
    
    // Try to use the backend server for device control
    try {
      const response = await retryOperation(
        () => axios.post(`${API_URL}/device/control`, {
          deviceIp: device.ip,
          deviceId: device.id,
          protocol: device.protocol,
          action: 'setState',
          params: { state: newState }
        }, { timeout: 5000 }),
        MAX_RETRIES,
        RETRY_DELAY,
        `Failed to toggle device ${device.name}`
      );
      
      if (response.data.success) {
        // Update device in cache
        deviceCache.updateDeviceState(device.id, { state: newState });
      }
      
      return response.data.success;
    } catch (error) {
      console.warn('Failed to use backend server for device control, falling back to direct control:', error);
      
      // Fallback to direct control if backend is not available
      const protocolHandler = getProtocolHandler(device.protocol);
      if (!protocolHandler) {
        console.error(`No protocol handler found for ${device.protocol}`);
        return false;
      }
      
      const success = await retryOperation(
        () => protocolHandler.setState(device.ip, device.id, newState),
        MAX_RETRIES,
        RETRY_DELAY,
        `Failed to directly control device ${device.name}`
      );
      
      if (success) {
        // Update device in cache
        deviceCache.updateDeviceState(device.id, { state: newState });
      }
      
      return success;
    }
  } catch (error) {
    console.error(`Failed to toggle device ${device.id}:`, error);
    return false;
  }
}

// Update a device's state (brightness, temperature, etc.) using backend server when available
export async function updateDeviceState(device: LocalDevice, params: Record<string, any>): Promise<boolean> {
  try {
    console.log(`Updating device ${device.name} with params:`, params);
    
    if (!device.protocol) {
      console.error('Device has no protocol defined');
      return false;
    }
    
    // Try to use the backend server for device control
    try {
      // Determine the appropriate action based on the property being updated
      let action = 'setProperty';
      if ('value' in params) {
        if (device.type === 'light') {
          action = 'setBrightness';
        } else if (device.type === 'fan') {
          action = 'setSpeed';
        }
      } else if ('temperature' in params) {
        action = 'setTemperature';
      }
      
      const response = await retryOperation(
        () => axios.post(`${API_URL}/device/control`, {
          deviceIp: device.ip,
          deviceId: device.id,
          protocol: device.protocol,
          action,
          params
        }, { timeout: 5000 }),
        MAX_RETRIES,
        RETRY_DELAY,
        `Failed to update device ${device.name}`
      );
      
      if (response.data.success) {
        // Update device in cache
        deviceCache.updateDeviceState(device.id, params);
      }
      
      return response.data.success;
    } catch (error) {
      console.warn('Failed to use backend server for device control, falling back to direct control:', error);
      
      // Fallback to direct control if backend is not available
      const protocolHandler = getProtocolHandler(device.protocol);
      if (!protocolHandler) {
        console.error(`No protocol handler found for ${device.protocol}`);
        return false;
      }
      
      let success = true;
      
      // Update each property
      for (const [property, value] of Object.entries(params)) {
        const propertySuccess = await retryOperation(
          () => protocolHandler.setProperty(device.ip, device.id, property, value),
          MAX_RETRIES,
          RETRY_DELAY,
          `Failed to directly update device ${device.name} property ${property}`
        );
        
        if (!propertySuccess) {
          success = false;
        }
      }
      
      if (success) {
        // Update device in cache
        deviceCache.updateDeviceState(device.id, params);
      }
      
      return success;
    }
  } catch (error) {
    console.error(`Failed to update device ${device.id}:`, error);
    return false;
  }
}

// Add a discovered device to the cloud
export async function addDiscoveredDeviceToCloud(userId: string, device: LocalDevice): Promise<string | null> {
  try {
    console.log(`Adding device ${device.name} to cloud for user ${userId}`);
    
    const cloudDevice = {
      name: device.name,
      type: device.type,
      protocol: device.protocol || 'unknown',
      ipAddress: device.ip,
      macAddress: device.mac,
      userId: userId,
      createdAt: new Date(),
      lastSeen: new Date()
    };
    
    const docRef = await addDoc(collection(db, 'devices'), cloudDevice);
    return docRef.id;
  } catch (error) {
    console.error(`Failed to add device ${device.id} to cloud:`, error);
    return null;
  }
}

// Device type detection functions

async function detectWizDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // WiZ devices respond to a specific UDP port and HTTP endpoints
    const response = await axios.get(`http://${ipAddress}/api/getSystemConfig`, { timeout: 500 });
    if (response.data && response.data.result) {
      return {
        id: `wiz-${ipAddress.replace(/\./g, '-')}`,
        name: `WiZ Light ${ipAddress}`,
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

async function detectHueDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Hue Bridge responds to specific HTTP endpoints
    const response = await axios.get(`http://${ipAddress}/api/v1/status`, { timeout: 500 });
    if (response.data && response.data.config) {
      return {
        id: `hue-${ipAddress.replace(/\./g, '-')}`,
        name: `Hue Light ${ipAddress}`,
        type: 'light',
        state: false,
        ip: ipAddress,
        protocol: 'philips-hue',
        value: 80
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectSyskaDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Syska devices typically use a variant of Tuya's protocol
    const response = await axios.get(`http://${ipAddress}/info`, { timeout: 500 });
    if (response.data && response.data.model && response.data.model.includes('Syska')) {
      const type = detectDeviceType(response.data.model);
      return {
        id: `syska-${ipAddress.replace(/\./g, '-')}`,
        name: `Syska ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'syska',
        value: type === 'light' ? 90 : undefined,
        temperature: type === 'ac' ? 24 : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectTasmotaDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Tasmota devices respond to a /cm endpoint
    const response = await axios.get(`http://${ipAddress}/cm?cmnd=Status%200`, { timeout: 500 });
    if (response.data && response.data.Status) {
      const type = detectDeviceType(response.data.Status.DeviceName || '');
      return {
        id: `tasmota-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.Status.DeviceName || `Tasmota Device ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'tasmota',
        value: type === 'fan' ? 3 : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectTuyaDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Tuya devices respond to specific endpoints
    const response = await axios.get(`http://${ipAddress}/device`, { timeout: 500 });
    if (response.data && (response.data.product_id || response.data.uuid)) {
      const type = detectDeviceType(response.data.product_name || '');
      return {
        id: `tuya-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.product_name || `Tuya Device ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'tuya'
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Additional Indian brand detection functions

async function detectHavellsDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Havells devices typically use their own protocol or a variant of others
    const response = await axios.get(`http://${ipAddress}/api/info`, { timeout: 500 });
    if (response.data && (response.data.manufacturer === 'Havells' || (response.data.model && response.data.model.includes('Havells')))) {
      const type = detectDeviceType(response.data.model || '');
      return {
        id: `havells-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || `Havells ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'havells',
        value: type === 'fan' ? 3 : (type === 'light' ? 80 : undefined)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectWiproDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Wipro devices often use Tuya's protocol with customizations
    const response = await axios.get(`http://${ipAddress}/system/info`, { timeout: 500 });
    if (response.data && (response.data.manufacturer === 'Wipro' || (response.data.model && response.data.model.includes('Wipro')))) {
      const type = detectDeviceType(response.data.model || '');
      return {
        id: `wipro-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || `Wipro ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'wipro',
        value: type === 'light' ? 85 : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectOrientDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Orient fans and ACs typically use their own protocol
    const response = await axios.get(`http://${ipAddress}/api/device`, { timeout: 500 });
    if (response.data && (response.data.manufacturer === 'Orient' || (response.data.model && response.data.model.includes('Orient')))) {
      const type = response.data.model && response.data.model.toLowerCase().includes('fan') ? 'fan' : 
                   response.data.model && response.data.model.toLowerCase().includes('ac') ? 'ac' : 'fan';
      return {
        id: `orient-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || `Orient ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'orient',
        value: type === 'fan' ? 3 : undefined,
        temperature: type === 'ac' ? 24 : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectCromptonDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Crompton devices
    const response = await axios.get(`http://${ipAddress}/device/info`, { timeout: 500 });
    if (response.data && (response.data.manufacturer === 'Crompton' || (response.data.model && response.data.model.includes('Crompton')))) {
      const type = response.data.type || detectDeviceType(response.data.model || '');
      return {
        id: `crompton-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || `Crompton ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'crompton',
        value: type === 'fan' ? 3 : (type === 'light' ? 80 : undefined)
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function detectBajajDevice(ipAddress: string): Promise<LocalDevice | null> {
  try {
    // Bajaj devices
    const response = await axios.get(`http://${ipAddress}/api/device/info`, { timeout: 500 });
    if (response.data && (response.data.manufacturer === 'Bajaj' || (response.data.model && response.data.model.includes('Bajaj')))) {
      const type = response.data.type || detectDeviceType(response.data.model || '');
      return {
        id: `bajaj-${ipAddress.replace(/\./g, '-')}`,
        name: response.data.name || `Bajaj ${type.charAt(0).toUpperCase() + type.slice(1)} ${ipAddress}`,
        type,
        state: false,
        ip: ipAddress,
        protocol: 'bajaj',
        value: type === 'fan' ? 3 : undefined
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Helper function to detect device type based on model name
function detectDeviceType(modelName: string): string {
  const modelLower = modelName.toLowerCase();
  if (modelLower.includes('light') || modelLower.includes('bulb') || modelLower.includes('led')) {
    return 'light';
  } else if (modelLower.includes('fan')) {
    return 'fan';
  } else if (modelLower.includes('ac') || modelLower.includes('air')) {
    return 'ac';
  } else if (modelLower.includes('tv') || modelLower.includes('television')) {
    return 'tv';
  } else {
    return 'light'; // Default to light
  }
}
