# Smart IoT - True Network Scanning Backend

This Node.js backend server provides true network scanning capabilities for the Smart IoT application, allowing it to discover and control real smart devices on your local network.

## Features

- **Real Network Scanning**: Uses actual network scanning techniques to discover devices on your local network
- **mDNS Discovery**: Discovers devices that advertise themselves using mDNS/Bonjour
- **IP Range Scanning**: Scans IP ranges based on your network configuration
- **Device Control**: Provides endpoints to control discovered devices
- **Multi-Brand Support**: Supports various Indian and international smart device brands

## Supported Brands

- Philips (WiZ and Hue)
- Syska
- Tuya
- Tasmota
- Havells
- Wipro
- Orient
- Crompton
- Bajaj

## Setup and Installation

1. Install dependencies:
   ```
   cd server
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### GET /api/network-info
Returns information about your local network.

### GET /api/scan-network
Scans your local network and returns a list of discovered smart devices.

### POST /api/device/control
Controls a specific device.

Request body:
```json
{
  "deviceIp": "192.168.1.100",
  "deviceId": "device-id",
  "protocol": "philips-wiz",
  "action": "setState",
  "params": {
    "state": true
  }
}
```

## How It Works

1. **Network Information**: The server first determines your local network configuration.
2. **mDNS Discovery**: It uses mDNS to discover devices that advertise themselves.
3. **IP Scanning**: It scans a range of IP addresses in your local network.
4. **Protocol Detection**: For each reachable IP, it tries to detect what type of smart device it is.
5. **Device Control**: It provides endpoints to control the discovered devices.

## Frontend Integration

The frontend application automatically connects to this backend server when it's running. If the backend server is not available, the frontend falls back to a browser-compatible simulation mode.

## Requirements

- Node.js 14+
- npm or yarn
- Local network access
- Smart devices on the same network

## Security Considerations

This server is designed for local network use only. Do not expose it to the internet as it does not implement authentication or encryption for API calls.
