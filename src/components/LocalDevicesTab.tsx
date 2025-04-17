import { useEffect, useState } from 'react';
import { Tv, Wind, Refrigerator, Lightbulb, AirVent, RefreshCw, Wifi, Plus, AlertCircle, Info } from 'lucide-react';
import { discoverDevices, updateDeviceState, toggleDevice, addDiscoveredDeviceToCloud, LocalDevice } from '../services/localDeviceService';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from './LoadingIndicator';

// Extend the LocalDevice interface locally to include optional networkInfo
interface ExtendedLocalDevice extends LocalDevice {
  networkInfo?: {
    ipRange?: string;
    networkName?: string;
  };
}

const LocalDevicesTab = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<ExtendedLocalDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToCloud, setAddingToCloud] = useState<{[key: string]: boolean}>({});
  const [scanCompleted, setScanCompleted] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ipRange?: string, networkName?: string}>({});
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  // Add a flag to track if this is the initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // Add a flag to track if a scan is in progress
  const [scanInProgress, setScanInProgress] = useState(false);

  const iconMap: { [key: string]: React.ElementType } = {
    light: Lightbulb,
    fan: Wind,
    ac: AirVent,
    tv: Tv,
    refrigerator: Refrigerator,
  };

  const getDeviceIcon = (type: string, state: boolean, size: string = "h-6 w-6") => {
    const Icon = iconMap[type] || Lightbulb;
    const iconColor = state ? "text-blue-500" : "text-gray-400 dark:text-gray-500";
    return <Icon className={`${size} ${iconColor} transition-colors`} />;
  };

  useEffect(() => {
    // Only load devices on initial component mount
    if (!initialLoadComplete) {
      loadDevices();
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete]);

  const loadDevices = async () => {
    // Don't start a new scan if one is already in progress
    if (scanInProgress) {
      setError('A network scan is already in progress. Please wait for it to complete.');
      return;
    }
    
    setIsLoading(true);
    setScanInProgress(true);
    setError(null);
    setScanCompleted(false);
    
    try {
      const discoveredDevices = await discoverDevices();
      setDevices(discoveredDevices);
      setScanCompleted(true);
      setLastScanTime(new Date());
      
      // Try to extract network information if available
      if (discoveredDevices[0]?.networkInfo) {
        setNetworkInfo(discoveredDevices[0].networkInfo);
      }
    } catch (err) {
      const errorMessage = 'Failed to discover devices on your network. Check if your devices are powered on and connected to WiFi.';
      setError(errorMessage);
      console.error(err);
      setScanCompleted(true);
    } finally {
      setIsLoading(false);
      setScanInProgress(false);
    }
  };

  const handleToggleDevice = async (device: ExtendedLocalDevice, newState: boolean) => {
    try {
      // Add loading indicator for this specific device
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, isUpdating: true } 
            : d
        )
      );
      
      const success = await toggleDevice(device, newState);
      
      if (success) {
        // Update local state to reflect changes
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === device.id 
              ? { ...d, state: newState, isUpdating: false } 
              : d
          )
        );
      } else {
        throw new Error('Failed to toggle device');
      }
    } catch (err) {
      console.error('Failed to toggle device:', err);
      const errorMessage = `Failed to control ${device.name}. Check your network connection and device status.`;
      setError(errorMessage);
      
      // Reset the loading indicator
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, isUpdating: false } 
            : d
        )
      );
    }
  };

  const handleUpdateValue = async (device: ExtendedLocalDevice, field: string, value: number) => {
    try {
      // Add loading indicator for this specific device
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, isUpdating: true } 
            : d
        )
      );
      
      const success = await updateDeviceState(device, { [field]: value });
      
      if (success) {
        // Update local state
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === device.id 
              ? { ...d, [field]: value, isUpdating: false } 
              : d
          )
        );
      } else {
        throw new Error(`Failed to update ${field}`);
      }
    } catch (err) {
      console.error('Failed to update device value:', err);
      const errorMessage = `Failed to update ${device.name} settings. Check your network connection and device status.`;
      setError(errorMessage);
      
      // Reset the loading indicator
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === device.id 
            ? { ...d, isUpdating: false } 
            : d
        )
      );
    }
  };

  const handleAddToCloud = async (device: ExtendedLocalDevice) => {
    if (!user) {
      const errorMessage = 'You must be logged in to add devices to the cloud';
      setError(errorMessage);
      return;
    }
    
    setAddingToCloud(prev => ({ ...prev, [device.id]: true }));
    
    try {
      const cloudDeviceId = await addDiscoveredDeviceToCloud(user.uid, device);
      
      if (cloudDeviceId) {
        // Update local state to show device was added
        setDevices(prevDevices => 
          prevDevices.map(d => 
            d.id === device.id 
              ? { ...d, addedToCloud: true, cloudId: cloudDeviceId } 
              : d
          )
        );
      } else {
        throw new Error('Failed to add device to cloud');
      }
    } catch (err) {
      console.error('Failed to add device to cloud:', err);
      const errorMessage = `Failed to add ${device.name} to your cloud devices.`;
      setError(errorMessage);
    } finally {
      setAddingToCloud(prev => ({ ...prev, [device.id]: false }));
    }
  };

  const getProtocolBadge = (protocol?: string) => {
    if (!protocol) return null;
    
    const badgeColorMap: {[key: string]: string} = {
      'tuya': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'shelly': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'tasmota': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'philips-wiz': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'philips-hue': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'wiz': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'hue': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'syska': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    
    const badgeColor = badgeColorMap[protocol.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
    
    // Create a display name for the protocol
    let displayName = protocol.charAt(0).toUpperCase() + protocol.slice(1);
    if (protocol.toLowerCase() === 'philips-wiz') displayName = 'Philips WiZ';
    if (protocol.toLowerCase() === 'philips-hue') displayName = 'Philips Hue';
    
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>
        {displayName}
      </span>
    );
  };

  const handleScanNetwork = async () => {
    loadDevices();
  };

  if (isLoading && !scanCompleted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <LoadingIndicator size="large" text="Scanning your network for devices..." />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">This may take up to 30 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-blue-900/10 to-indigo-900/10 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-900/50">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <Wifi className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Local Network Devices
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
            Devices discovered on your local network
            {lastScanTime && (
              <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                · Last scan: {lastScanTime.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <button 
          onClick={handleScanNetwork}
          disabled={isLoading || scanInProgress}
          className="flex items-center px-4 py-2 mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 shadow-sm"
        >
          {isLoading ? 
            <LoadingIndicator size="small" className="mr-2" /> : 
            <RefreshCw className="h-4 w-4 mr-2" />
          }
          {isLoading ? 'Scanning...' : 'Scan Network'}
        </button>
      </div>

      {networkInfo.ipRange && (
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-md border border-gray-100 dark:border-gray-700/50">
          <Info className="h-3 w-3 mr-2 text-blue-500" />
          <span>
            Network: <span className="font-medium">{networkInfo.networkName || networkInfo.ipRange}</span>
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="text-xs text-red-600 dark:text-red-300 mt-2 hover:underline focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {devices.length === 0 && !isLoading && scanCompleted ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <Wifi className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No devices found</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            We couldn't find any smart devices on your network. Make sure your devices are:
          </p>
          <ul className="text-sm text-left text-gray-600 dark:text-gray-400 max-w-md mx-auto space-y-2 mb-6">
            <li className="flex items-start">
              <span className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              </span>
              Powered on and connected to your WiFi network
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              </span>
              Set up using their manufacturer app
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1 mr-3 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
              </span>
              Connected to the same network as this device
            </li>
          </ul>
          <button
            onClick={handleScanNetwork}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
          {devices.map((device) => (
            <div 
              key={device.id} 
              className="relative overflow-hidden rounded-xl transition-all duration-300 min-h-[240px] min-w-[260px] max-w-full w-full flex flex-col h-auto bg-transparent"
              style={{ boxSizing: 'border-box' }}
            >
              {/* Card background with gradient */}
              <div className={`absolute inset-0 ${device.state 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/30' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50'}`}></div>
              
              {/* Device icon background circle */}
              <div className={`absolute top-6 right-6 w-14 h-14 rounded-full bg-white/80 dark:bg-gray-800/50 flex items-center justify-center ${device.state ? 'opacity-100' : 'opacity-50'} shadow-sm`}>
                {getDeviceIcon(device.type, device.state, "w-7 h-7")}
              </div>
              
              {/* Card content */}
              <div className="relative p-6 border border-gray-200 dark:border-gray-700/50 rounded-xl flex flex-col flex-1 h-auto min-h-[180px]">
                {/* Protocol badge */}
                <div className="inline-flex items-center self-start mb-4">
                  {getProtocolBadge(device.protocol)}
                </div>
                
                {/* Device info */}
                <div className="mb-6 pr-16">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-1 line-clamp-1">
                    {device.name || `${device.type.charAt(0).toUpperCase() + device.type.slice(1)}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <span className="truncate max-w-[150px]" title={device.ip}>{device.ip}</span>
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${device.state ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="ml-1 text-xs">{device.state ? 'Active' : 'Inactive'}</span>
                  </p>
                </div>
                
                {/* Controls container - will auto-adjust height */}
                <div className={`flex-grow ${!device.state ? 'opacity-50' : ''} flex flex-col justify-start min-h-[40px]`}>
                  {/* Device Specific Controls */}
                  {device.type === 'light' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor={`${device.id}-brightness`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Brightness</label>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {device.value || 100}%
                        </span>
                      </div>
                      <input 
                        id={`${device.id}-brightness`}
                        type="range" 
                        min="1" 
                        max="100" 
                        value={device.value || 100} 
                        onChange={(e) => handleUpdateValue(device, 'value', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                        disabled={device.isUpdating || !device.state}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>1%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                  
                  {device.type === 'fan' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Speed</label>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          Level {device.value || 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => handleUpdateValue(device, 'value', level)}
                            disabled={device.isUpdating || !device.state}
                            className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                              (device.value || 1) === level
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action buttons - always at the bottom */}
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-200 dark:border-gray-700/50">
                  {(!device.addedToCloud && user) ? (
                    <button
                      onClick={() => handleAddToCloud(device)}
                      disabled={!!addingToCloud[device.id]}
                      className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none disabled:opacity-50"
                    >
                      {addingToCloud[device.id] ? (
                        <LoadingIndicator size="small" className="mr-1" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      Add to My Devices
                    </button>
                  ) : device.addedToCloud ? (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Added to My Devices
                    </span>
                  ) : (
                    <div></div> /* Empty div to maintain layout */
                  )}
                  
                  <div className="flex items-center">
                    <span className="mr-2 text-xs text-gray-500 dark:text-gray-400">
                      {device.state ? 'On' : 'Off'}
                    </span>
                    {device.isUpdating ? (
                      <div className="w-11 h-6 flex justify-center items-center">
                        <LoadingIndicator size="small" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleDevice(device, !device.state)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${device.state ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        aria-pressed={device.state}
                      >
                        <span className="sr-only">Toggle {device.name}</span>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${device.state ? 'translate-x-6' : 'translate-x-1'}`}/>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Loading overlay */}
                {device.isUpdating && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-xl">
                    <LoadingIndicator size="medium" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocalDevicesTab;
