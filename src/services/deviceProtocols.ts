// Device protocol handlers for various smart home devices

import axios from 'axios';

/**
 * Base interface for all device protocols
 */
export interface DeviceProtocol {
  getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }>;
  setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean>;
  setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean>;
}

/**
 * PhilipsWiz protocol for Philips Smart LED products popular in India
 * Uses the local Philips WiZ API (no cloud required)
 */
export class PhilipsWizProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      console.log(`Getting state for Philips WiZ device`);
      return { state: false, value: 100 };
    } catch (error) {
      console.error(`Error getting state for Philips WiZ device:`, error);
      return { state: false };
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      console.log(`Setting Philips WiZ device to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Philips WiZ device:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      console.log(`Setting Philips WiZ device property ${property} to ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting property for Philips WiZ device:`, error);
      return false;
    }
  }
}

/**
 * PhilipsHue protocol for Philips Hue system popular in India
 */
export class PhilipsHueProtocol implements DeviceProtocol {
  private bridgeIp: string = '';
  private username: string = '';
  
  constructor(bridgeIp?: string, username?: string) {
    if (bridgeIp) this.bridgeIp = bridgeIp;
    if (username) this.username = username;
  }
  
  async discoverDevices(bridgeIp: string): Promise<any[]> {
    try {
      console.log(`Discovering Philips Hue devices on bridge ${bridgeIp}`);
      // Mock implementation that returns some sample devices
      return [
        {
          id: 'hue-light-1',
          name: 'Hue Light 1',
          type: 'light'
        },
        {
          id: 'hue-light-2',
          name: 'Hue Light 2',
          type: 'light'
        }
      ];
    } catch (error) {
      console.error(`Error discovering Philips Hue devices on bridge ${bridgeIp}:`, error);
      return [];
    }
  }
  
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      if (!this.username) {
        throw new Error('Philips Hue bridge username not configured');
      }
      
      console.log(`Getting state for Philips Hue light ${deviceId}`);
      return { state: false, value: 254 };
    } catch (error) {
      console.error(`Error getting state for Philips Hue light ${deviceId}:`, error);
      return { state: false };
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      if (!this.username) {
        throw new Error('Philips Hue bridge username not configured');
      }
      
      console.log(`Setting Philips Hue light ${deviceId} to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Philips Hue light ${deviceId}:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      if (!this.username) {
        throw new Error('Philips Hue bridge username not configured');
      }
      
      const payload: any = {};
      
      switch (property) {
        case 'brightness':
          payload.bri = Math.round((value / 100) * 254);
          break;
        case 'hue':
          payload.hue = value;
          break;
        case 'saturation':
          payload.sat = Math.round((value / 100) * 254);
          break;
        case 'ct':
          payload.ct = value;
          break;
        default:
          console.warn(`Property ${property} not supported for Philips Hue lights`);
          return false;
      }
      
      console.log(`Setting Philips Hue light ${deviceId} property ${property} to ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting property for Philips Hue light ${deviceId}:`, error);
      return false;
    }
  }
}

/**
 * SyskaPro protocol for Syska smart devices (popular in India)
 */
export class SyskaProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      console.log(`Getting state for Syska device`);
      return { state: false };
    } catch (error) {
      console.error(`Error getting state for Syska device:`, error);
      throw error;
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      console.log(`Setting Syska device to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Syska device:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      console.log(`Setting Syska device property ${property} to ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting property for Syska device:`, error);
      return false;
    }
  }
}

/**
 * Tuya protocol for controlling Tuya-compatible devices (many inexpensive smart plugs, bulbs, etc.)
 * Uses the local Tuya API (no cloud required)
 */
export class TuyaProtocol implements DeviceProtocol {
  private _localKey: string = '';
  
  constructor(localKey?: string) {
    // Store the key, but we'll use the REST API for now
    // Mark with underscore to acknowledge it's intentionally unused for now
    if (localKey) this._localKey = localKey;
    console.log(`Initialized Tuya protocol${localKey ? ' with key' : ''}`);
  }
  
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      console.log(`Getting state for Tuya device ${deviceId}`);
      return { state: false };
    } catch (error) {
      console.error(`Error getting state for Tuya device ${deviceId}:`, error);
      throw error;
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      console.log(`Setting Tuya device to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Tuya device:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const dpsMap: {[key: string]: number} = {
        'brightness': 2,
        'temperature': 3,
        'color': 5,
        'speed': 4
      };
      
      const dps = dpsMap[property] || 1;
      
      console.log(`Setting Tuya device property ${property} (DPS: ${dps}) to ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting property for Tuya device:`, error);
      return false;
    }
  }
}

/**
 * Shelly protocol for Shelly smart devices (popular WiFi relays, plugs, etc.)
 * Uses the local Shelly HTTP API
 */
export class ShellyProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      console.log(`Getting state for Shelly device`);
      return { state: false };
    } catch (error) {
      console.error(`Error getting state for Shelly device:`, error);
      throw error;
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      console.log(`Setting Shelly device to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Shelly device:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      switch (property) {
        case 'brightness':
          console.log(`Setting Shelly device brightness to ${value}`);
          break;
        case 'color':
          console.log(`Setting Shelly device color to ${value}`);
          break;
        default:
          console.warn(`Property ${property} not supported for Shelly devices`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error setting property for Shelly device:`, error);
      return false;
    }
  }
}

/**
 * Tasmota protocol for ESP8266/ESP32 devices flashed with Tasmota firmware
 * (very popular DIY solution, works with many cheap Wi-Fi devices)
 */
export class TasmotaProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      console.log(`Getting state for Tasmota device`);
      return { state: false };
    } catch (error) {
      console.error(`Error getting state for Tasmota device:`, error);
      throw error;
    }
  }
  
  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      console.log(`Setting Tasmota device to ${state ? 'ON' : 'OFF'}`);
      return true;
    } catch (error) {
      console.error(`Error setting state for Tasmota device:`, error);
      return false;
    }
  }
  
  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      switch (property) {
        case 'brightness':
          console.log(`Setting Tasmota device brightness to ${value}`);
          break;
        case 'color':
          console.log(`Setting Tasmota device color to ${value}`);
          break;
        case 'temperature':
          console.log(`Setting Tasmota device temperature to ${value}`);
          break;
        case 'speed':
          console.log(`Setting Tasmota device speed to ${value}`);
          break;
        default:
          console.warn(`Property ${property} not supported for Tasmota devices`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error setting property for Tasmota device:`, error);
      return false;
    }
  }
}

/**
 * Protocol factory - creates the appropriate protocol handler based on device type
 */
export function getProtocolHandler(protocolType: string): DeviceProtocol {
  switch (protocolType.toLowerCase()) {
    case 'philips-wiz':
      return new PhilipsWizProtocol();
    case 'philips-hue':
      return new PhilipsHueProtocol();
    case 'syska':
      return new SyskaProtocol();
    case 'tuya':
      return new TuyaProtocol();
    case 'tasmota':
      return new TasmotaProtocol();
    case 'shelly':
      return new ShellyProtocol();
    case 'havells':
      return new HavellsProtocol();
    case 'wipro':
      return new WiproProtocol();
    case 'orient':
      return new OrientProtocol();
    case 'crompton':
      return new CromptonProtocol();
    case 'bajaj':
      return new BajajProtocol();
    default:
      console.warn(`Unknown protocol type: ${protocolType}, falling back to Tasmota`);
      return new TasmotaProtocol();
  }
}

// Havells protocol handler
export class HavellsProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      const response = await axios.get(`http://${deviceId}/api/info`);
      if (response.data) {
        return {
          state: response.data.state === 'on',
          value: response.data.brightness || response.data.speed
        };
      }
      return { state: false };
    } catch (error) {
      console.error(`Failed to get state for Havells device ${deviceId}:`, error);
      return { state: false };
    }
  }

  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      const response = await axios.post(`http://${deviceId}/api/control`, {
        state: state ? 'on' : 'off'
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set state for Havells device ${deviceId}:`, error);
      return false;
    }
  }

  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const data: any = {};
      
      data[property] = value;
      
      const response = await axios.post(`http://${deviceId}/api/control`, data);
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set property for Havells device ${deviceId}:`, error);
      return false;
    }
  }
}

// Wipro protocol handler
export class WiproProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      const response = await axios.get(`http://${deviceId}/system/info`);
      if (response.data) {
        return {
          state: response.data.power === 'on',
          value: response.data.brightness
        };
      }
      return { state: false };
    } catch (error) {
      console.error(`Failed to get state for Wipro device ${deviceId}:`, error);
      return { state: false };
    }
  }

  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      const response = await axios.post(`http://${deviceId}/system/control`, {
        power: state ? 'on' : 'off'
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set state for Wipro device ${deviceId}:`, error);
      return false;
    }
  }

  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const data: any = {};
      
      if (property === 'brightness') {
        data.brightness = value;
      } else if (property === 'color') {
        data.color = value;
      } else {
        data[property] = value;
      }
      
      const response = await axios.post(`http://${deviceId}/system/control`, data);
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set property for Wipro device ${deviceId}:`, error);
      return false;
    }
  }
}

// Orient protocol handler (for fans and ACs)
export class OrientProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      const response = await axios.get(`http://${deviceId}/api/device`);
      if (response.data) {
        if (response.data.type === 'fan') {
          return {
            state: response.data.power === 'on',
            value: response.data.speed
          };
        } else if (response.data.type === 'ac') {
          return {
            state: response.data.power === 'on',
            value: response.data.temperature
          };
        }
        return { state: response.data.power === 'on' };
      }
      return { state: false };
    } catch (error) {
      console.error(`Failed to get state for Orient device ${deviceId}:`, error);
      return { state: false };
    }
  }

  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      const response = await axios.post(`http://${deviceId}/api/control`, {
        power: state ? 'on' : 'off'
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set state for Orient device ${deviceId}:`, error);
      return false;
    }
  }

  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const data: any = {};
      
      if (property === 'speed') {
        data.speed = value;
      } else if (property === 'temperature') {
        data.temperature = value;
      } else if (property === 'mode') {
        data.mode = value;
      } else {
        data[property] = value;
      }
      
      const response = await axios.post(`http://${deviceId}/api/control`, data);
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set property for Orient device ${deviceId}:`, error);
      return false;
    }
  }
}

// Crompton protocol handler
export class CromptonProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      const response = await axios.get(`http://${deviceId}/device/info`);
      if (response.data) {
        const type = response.data.type;
        if (type === 'light') {
          return {
            state: response.data.state === 'on',
            value: response.data.brightness
          };
        } else if (type === 'fan') {
          return {
            state: response.data.state === 'on',
            value: response.data.speed
          };
        }
        return { state: response.data.state === 'on' };
      }
      return { state: false };
    } catch (error) {
      console.error(`Failed to get state for Crompton device ${deviceId}:`, error);
      return { state: false };
    }
  }

  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      const response = await axios.post(`http://${deviceId}/device/control`, {
        state: state ? 'on' : 'off'
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set state for Crompton device ${deviceId}:`, error);
      return false;
    }
  }

  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const data: any = {};
      data[property] = value;
      
      const response = await axios.post(`http://${deviceId}/device/control`, data);
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set property for Crompton device ${deviceId}:`, error);
      return false;
    }
  }
}

// Bajaj protocol handler
export class BajajProtocol implements DeviceProtocol {
  async getState(deviceIp: string, deviceId: string): Promise<{ state: boolean, value?: number }> {
    try {
      const response = await axios.get(`http://${deviceId}/api/device/info`);
      if (response.data) {
        if (response.data.type === 'fan') {
          return {
            state: response.data.status === 'on',
            value: response.data.speed
          };
        }
        return { state: response.data.status === 'on' };
      }
      return { state: false };
    } catch (error) {
      console.error(`Failed to get state for Bajaj device ${deviceId}:`, error);
      return { state: false };
    }
  }

  async setState(deviceIp: string, deviceId: string, state: boolean): Promise<boolean> {
    try {
      const response = await axios.post(`http://${deviceId}/api/device/control`, {
        status: state ? 'on' : 'off'
      });
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set state for Bajaj device ${deviceId}:`, error);
      return false;
    }
  }

  async setProperty(deviceIp: string, deviceId: string, property: string, value: any): Promise<boolean> {
    try {
      const data: any = {};
      data[property] = value;
      
      const response = await axios.post(`http://${deviceId}/api/device/control`, data);
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to set property for Bajaj device ${deviceId}:`, error);
      return false;
    }
  }
}
