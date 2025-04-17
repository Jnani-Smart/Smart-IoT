// Device Cache Service
// Handles caching of discovered devices to improve performance

import { LocalDevice } from './localDeviceService';

// Cache expiry time in milliseconds (1 hour)
const CACHE_EXPIRY = 60 * 60 * 1000;

interface CachedDevice extends LocalDevice {
  cachedAt: number;
}

class DeviceCacheService {
  private static instance: DeviceCacheService;
  private deviceCache: Map<string, CachedDevice> = new Map();
  private lastScanTimestamp: number = 0;

  private constructor() {
    // Initialize from localStorage if available
    this.loadFromStorage();
    
    // Set up a listener to save cache when window is closing
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  public static getInstance(): DeviceCacheService {
    if (!DeviceCacheService.instance) {
      DeviceCacheService.instance = new DeviceCacheService();
    }
    return DeviceCacheService.instance;
  }

  // Add or update a device in the cache
  public cacheDevice(device: LocalDevice): void {
    const cachedDevice: CachedDevice = {
      ...device,
      cachedAt: Date.now()
    };
    
    this.deviceCache.set(device.id, cachedDevice);
  }

  // Add multiple devices to the cache
  public cacheDevices(devices: LocalDevice[]): void {
    devices.forEach(device => this.cacheDevice(device));
    this.lastScanTimestamp = Date.now();
    
    // Save to storage after caching
    this.saveToStorage();
  }

  // Get a device from cache by ID
  public getDevice(deviceId: string): LocalDevice | null {
    const cachedDevice = this.deviceCache.get(deviceId);
    
    if (!cachedDevice) {
      return null;
    }
    
    // Check if cache has expired
    if (this.isExpired(cachedDevice.cachedAt)) {
      this.deviceCache.delete(deviceId);
      return null;
    }
    
    return this.stripCacheMetadata(cachedDevice);
  }

  // Get all cached devices
  public getAllDevices(): LocalDevice[] {
    const devices: LocalDevice[] = [];
    
    this.deviceCache.forEach((device, id) => {
      if (!this.isExpired(device.cachedAt)) {
        devices.push(this.stripCacheMetadata(device));
      } else {
        // Clean up expired entries
        this.deviceCache.delete(id);
      }
    });
    
    return devices;
  }

  // Check if we have a recent scan result
  public hasRecentScan(maxAgeMs: number = 5 * 60 * 1000): boolean {
    return Date.now() - this.lastScanTimestamp < maxAgeMs;
  }

  // Update a device's state in cache
  public updateDeviceState(deviceId: string, updates: Partial<LocalDevice>): boolean {
    const device = this.deviceCache.get(deviceId);
    
    if (!device) {
      return false;
    }
    
    this.deviceCache.set(deviceId, {
      ...device,
      ...updates,
      cachedAt: Date.now()
    });
    
    this.saveToStorage();
    return true;
  }

  // Clear the entire cache
  public clearCache(): void {
    this.deviceCache.clear();
    this.lastScanTimestamp = 0;
    
    // Clear from storage too
    if (typeof window !== 'undefined') {
      localStorage.removeItem('deviceCache');
      localStorage.removeItem('lastScanTimestamp');
    }
  }

  // Save cache to localStorage
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    const devices = Array.from(this.deviceCache.values());
    localStorage.setItem('deviceCache', JSON.stringify(devices));
    localStorage.setItem('lastScanTimestamp', this.lastScanTimestamp.toString());
  }

  // Load cache from localStorage
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const cachedDevicesJson = localStorage.getItem('deviceCache');
      const timestamp = localStorage.getItem('lastScanTimestamp');
      
      if (cachedDevicesJson) {
        const devices = JSON.parse(cachedDevicesJson) as CachedDevice[];
        devices.forEach(device => {
          if (!this.isExpired(device.cachedAt)) {
            this.deviceCache.set(device.id, device);
          }
        });
      }
      
      if (timestamp) {
        this.lastScanTimestamp = parseInt(timestamp, 10);
      }
    } catch (error) {
      console.error('Failed to load device cache from storage:', error);
      // If there's an error, clear the potentially corrupted data
      localStorage.removeItem('deviceCache');
      localStorage.removeItem('lastScanTimestamp');
    }
  }

  // Check if a cached timestamp is expired
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_EXPIRY;
  }

  // Remove cache metadata from a device object
  private stripCacheMetadata(cachedDevice: CachedDevice): LocalDevice {
    const { cachedAt, ...device } = cachedDevice;
    return device;
  }
}

export default DeviceCacheService.getInstance();
