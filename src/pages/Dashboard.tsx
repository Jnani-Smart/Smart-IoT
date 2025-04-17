import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sun, Moon, Plus, Home, LogOut, Tv, Wind, Refrigerator, Lightbulb, ChevronRight, LayoutGrid, AirVent, Trash2, Bed, Bath, Sofa, CookingPot, Armchair, DoorOpen, Building2, Car, Wifi } from 'lucide-react';
import LocalDevicesTab from '../components/LocalDevicesTab';
import LoadingIndicator from '../components/LoadingIndicator';

interface Device {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'ac' | 'tv' | 'refrigerator';
  room: string;
  state: boolean;
  value?: number;
  channel?: number;
  volume?: number;
  temperature?: number;
}

const Dashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>('All');
  const [isUpdating, setIsUpdating] = useState<{[key: string]: boolean}>({});
  const [isDeleting, setIsDeleting] = useState<{[key: string]: boolean}>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    if (!authLoading && !user) return;
    if (!user) return;

    const q = query(collection(db, 'devices'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deviceData: Device[] = [];
      snapshot.forEach((doc) => {
        deviceData.push({ id: doc.id, ...doc.data() } as Device);
      });
      setDevices(deviceData);
      
      const uniqueRooms = ['All', ...Array.from(new Set(deviceData.map(device => device.room)))];
      setRooms(uniqueRooms);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleAddDevice = () => {
    navigate('/add-device');
  };

  const iconMap: { [key: string]: React.ElementType } = {
    light: Lightbulb,
    fan: Wind,
    ac: AirVent,
    tv: Tv,
    refrigerator: Refrigerator,
  };

  const getDeviceIcon = (type: string, state: boolean, size: string) => {
    const Icon = iconMap[type];
    const iconColor = state ? "text-blue-500" : "text-gray-400 dark:text-gray-500";
    const iconProps = { className: `${size} ${iconColor} transition-colors` };
    return <Icon {...iconProps} />;
  };

  const toggleDeviceState = async (deviceId: string, newState: boolean) => {
    if (!user || isUpdating[deviceId]) return;
    setIsUpdating(prev => ({ ...prev, [deviceId]: true }));
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, { state: newState });
    } catch (error) {
      console.error('Error updating device state:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const updateDeviceValue = async (deviceId: string, field: string, newValue: number) => {
    if (!user || isUpdating[deviceId]) return Promise.reject('No user or already updating');
    setIsUpdating(prev => ({ ...prev, [deviceId]: true }));
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await updateDoc(deviceRef, { [field]: newValue });
      // Update local state immediately for smoother UX
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.id === deviceId ? { ...d, [field]: newValue } : d
        )
      );
      return Promise.resolve();
    } catch (error) {
      console.error(`Error updating device ${field}:`, error);
      return Promise.reject(error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [deviceId]: false }));
    }
  };
  
  const deleteDevice = async (deviceId: string) => {
    if (!user || isDeleting[deviceId]) return;
    
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }
    
    setIsDeleting(prev => ({ ...prev, [deviceId]: true }));
    try {
      const deviceRef = doc(db, 'devices', deviceId);
      await deleteDoc(deviceRef);
      // No need to update local state as the onSnapshot listener will handle it
    } catch (error) {
      console.error('Error deleting device:', error);
      setIsDeleting(prev => ({ ...prev, [deviceId]: false }));
    }
  };

  const filteredDevices = devices.filter(device => selectedRoom === 'All' || device.room === selectedRoom);

  const formatDeviceType = (type: string): string => {
    if (type === 'tv') return 'TV';
    if (type === 'ac') return 'AC';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ease-in-out 
          ${isSidebarOpen ? 'w-72' : '-translate-x-full'} 
          md:relative md:translate-x-0 ${isSidebarOpen ? 'md:w-72 lg:w-80' : 'md:w-20'}`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-700 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {isSidebarOpen && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Smart Home</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Sidebar Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col h-[calc(100%-128px)]">
          {/* Rooms Section */}
          <div className={`${isSidebarOpen ? 'px-2' : 'px-0'} mb-6`}>
            {isSidebarOpen && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Rooms
              </h3>
            )}
            {rooms.map((room) => (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`flex items-center w-full px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-150 
                  ${selectedRoom === room 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  ${!isSidebarOpen ? 'justify-center' : ''}`}
              >
                {room === 'All' ? 
                  <LayoutGrid className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} /> : 
                  (() => {
                    const roomLower = room.toLowerCase();
                    if (roomLower.includes('bed')) return <Bed className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('bath')) return <Bath className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('living') || roomLower.includes('lounge')) return <Sofa className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('kitchen')) return <CookingPot className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('dining')) return <Armchair className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('garage')) return <Car className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('entry') || roomLower.includes('hallway')) return <DoorOpen className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    if (roomLower.includes('office') || roomLower.includes('study')) return <Building2 className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                    return <Home className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''} ${selectedRoom === room ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />;
                  })()
                }
                {isSidebarOpen && <span>{room}</span>}
              </button>
            ))}
          </div>
          
          {/* Network Devices Section - Only visible when sidebar is expanded */}
          {isSidebarOpen && (
            <div className="px-2 mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Network
              </h3>
              <button
                onClick={() => setActiveTab('local')}
                className={`flex items-center w-full px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-150 
                  ${activeTab === 'local' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Wifi className={`h-5 w-5 mr-3 ${activeTab === 'local' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>Local Devices</span>
              </button>
            </div>
          )}

          {/* Add Device Button in Collapsed Sidebar */}
          {!isSidebarOpen && (
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-px bg-gray-100 dark:bg-gray-700 mb-1"></div>
              <button
                onClick={handleAddDevice}
                className="flex items-center justify-center w-full p-2 mb-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Add Device"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}
          {/* Quick Actions Section */}
          {isSidebarOpen && (
            <div className="px-2 mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Quick Actions
              </h3>
              <button
                onClick={handleAddDevice}
                className="flex items-center w-full px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-150
                  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                Add New Device
              </button>
            </div>
          )}
          
          {/* Spacer to push logout to bottom */}
          <div className="flex-grow"></div>
        </div>
        
        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-gray-100 dark:border-gray-700 ${!isSidebarOpen ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => logout()}
            className={`${isSidebarOpen ? 
              'flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 
              'p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
            aria-label="Logout"
          >
            <LogOut className={`h-5 w-5 ${isSidebarOpen ? 'mr-3' : ''}`} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50 dark:bg-gray-900">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-30">
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 mr-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {selectedRoom} Devices
          </h1>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? 
                <Sun className="h-5 w-5 text-amber-500" /> : 
                <Moon className="h-5 w-5 text-indigo-500" />
              }
            </button>

            <button
              onClick={handleAddDevice}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors duration-200 shadow-sm text-sm font-medium md:hidden"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Device
            </button>

            {/* User Profile in Navbar */}
            <div className="hidden md:flex items-center space-x-3">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden lg:block mr-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu Backdrop */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 w-72 h-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Sidebar content copied here for mobile */}
              <div className="flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-700 justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                    <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Smart Home</span>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col h-[calc(100%-200px)] p-4 overflow-y-auto">
                {/* Rooms section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Rooms
                  </h3>
                  {rooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => {
                        setSelectedRoom(room);
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center w-full px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-150 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {room === 'All' ? 
                        <LayoutGrid className="h-5 w-5 mr-3" /> : 
                        (() => {
                          const roomLower = room.toLowerCase();
                          if (roomLower.includes('bed')) return <Bed className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('bath')) return <Bath className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('living') || roomLower.includes('lounge')) return <Sofa className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('kitchen')) return <CookingPot className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('dining')) return <Armchair className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('garage')) return <Car className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('entry') || roomLower.includes('hallway')) return <DoorOpen className="h-5 w-5 mr-3" />;
                          if (roomLower.includes('office') || roomLower.includes('study')) return <Building2 className="h-5 w-5 mr-3" />;
                          return <Home className="h-5 w-5 mr-3" />;
                        })()
                      }
                      <span>{room}</span>
                    </button>
                  ))}
                </div>
                
                {/* Add Device button */}
                <button
                  onClick={() => {
                    handleAddDevice();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-150 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Plus className="h-5 w-5 mr-3" />
                  Add New Device
                </button>
                
                {/* Spacer to push user info and logout to bottom */}
                <div className="flex-grow"></div>
              </div>
              
              {/* User Info and Logout in Mobile Menu */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 mt-auto sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800">
                {/* User Profile */}
                <div className="flex items-center space-x-3 px-3 py-2 mb-4">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-semibold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.displayName || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email || ''}
                    </p>
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300">
          {/* Mobile Room Select */}
          <div className="md:hidden mb-4">
            <select
              value={selectedRoom || 'All'}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="block w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {rooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Tab Selection */}
          <div className="md:hidden mb-4">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'cloud' 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Cloud
              </button>
              <button
                onClick={() => setActiveTab('local')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'local' 
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Network
              </button>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="max-w-7xl mx-auto">
            {/* Heading & Button section */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'cloud' ? 
                  (selectedRoom === 'All' ? 'My Devices' : `${selectedRoom} Devices`) : 
                  'Network Devices'
                }
              </h1>
              
              {/* Tabs for Desktop */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex space-x-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1 bg-gray-50 dark:bg-gray-800">
                  <button
                    onClick={() => setActiveTab('cloud')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'cloud' 
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Cloud Devices
                  </button>
                  <button
                    onClick={() => setActiveTab('local')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'local' 
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Network Devices
                  </button>
                </div>
                
                {activeTab === 'cloud' && (
                  <button 
                    onClick={handleAddDevice}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Device
                  </button>
                )}
              </div>
            </div>

            {/* Devices Content */}
            {activeTab === 'cloud' ? (
              <>
                {/* Cloud Devices Grid */}
                {filteredDevices.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4">
                      <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No devices added yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      {selectedRoom === 'All' 
                        ? "You haven't added any devices yet. Start by adding your first device."
                        : `You don't have any devices in ${selectedRoom}. Add one now.`}
                    </p>
                    <button
                      onClick={handleAddDevice}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-colors duration-200 shadow-sm text-sm font-medium"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Your First Device
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Redesigned cloud devices cards */}
                    {filteredDevices.map((device) => (
                      <div
                        key={device.id}
                        className={`relative overflow-hidden rounded-xl transition-all duration-300 ${isUpdating[device.id] || isDeleting[device.id] ? 'opacity-70 pointer-events-none' : ''}`}
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
                        <div className="relative p-6 border border-gray-200 dark:border-gray-700/50 rounded-xl flex flex-col h-full">
                          {/* Room label */}
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-4 self-start">
                            {device.room}
                          </div>
                          
                          {/* Device info */}
                          <div className="mb-6 pr-16">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-1 line-clamp-1">
                              {device.name || `${formatDeviceType(device.type)} ${device.id.slice(-4)}`}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              {formatDeviceType(device.type)}
                              <span className={`ml-2 inline-block w-2 h-2 rounded-full ${device.state ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                              <span className="ml-1 text-xs">{device.state ? 'Active' : 'Inactive'}</span>
                            </p>
                          </div>
                          
                          {/* Controls container - will auto-adjust height */}
                          <div className={`flex-grow ${!device.state ? 'opacity-50' : ''}`}>
                            {/* Device Specific Controls */}
                            {(device.type === 'ac' || device.type === 'refrigerator') && (
                              <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                  <label htmlFor={`${device.id}-temp`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Temperature</label>
                                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {device.temperature || (device.type === 'ac' ? 22 : 3)}°C
                                  </span>
                                </div>
                                <input
                                  id={`${device.id}-temp`}
                                  type="range"
                                  min={device.type === 'ac' ? "16" : "1"}
                                  max={device.type === 'ac' ? "30" : "8"}
                                  value={device.temperature || (device.type === 'ac' ? 22 : 3)}
                                  onChange={(e) => updateDeviceValue(device.id, 'temperature', parseInt(e.target.value))}
                                  disabled={!device.state || isUpdating[device.id]}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <span>{device.type === 'ac' ? "16°C" : "1°C"}</span>
                                  <span>{device.type === 'ac' ? "30°C" : "8°C"}</span>
                                </div>
                              </div>
                            )}
                            
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
                                  onChange={(e) => updateDeviceValue(device.id, 'value', parseInt(e.target.value))}
                                  disabled={!device.state || isUpdating[device.id]}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
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
                                      onClick={() => updateDeviceValue(device.id, 'value', level)}
                                      disabled={!device.state || isUpdating[device.id]}
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
                            
                            {device.type === 'tv' && (
                              <div className="space-y-4 mb-6">
                                {/* Channel Control */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label htmlFor={`${device.id}-channel`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Channel</label>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {device.channel || 1}
                                    </span>
                                  </div>
                                  <input
                                    id={`${device.id}-channel`}
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={device.channel || 1}
                                    onChange={(e) => updateDeviceValue(device.id, 'channel', parseInt(e.target.value))}
                                    disabled={!device.state || isUpdating[device.id]}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>1</span>
                                    <span>100</span>
                                  </div>
                                </div>
                                
                                {/* Volume Control */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label htmlFor={`${device.id}-volume`} className="text-xs font-medium text-gray-600 dark:text-gray-400">Volume</label>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {device.volume || 10}
                                    </span>
                                  </div>
                                  <input
                                    id={`${device.id}-volume`}
                                    type="range"
                                    min="0"
                                    max="30"
                                    value={device.volume || 10}
                                    onChange={(e) => updateDeviceValue(device.id, 'volume', parseInt(e.target.value))}
                                    disabled={!device.state || isUpdating[device.id]}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>0</span>
                                    <span>30</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Action buttons - always at the bottom */}
                          <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-200 dark:border-gray-700/50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDevice(device.id);
                              }}
                              className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                              aria-label={`Delete ${device.name || formatDeviceType(device.type)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            
                            <div className="flex items-center">
                              <span className="mr-2 text-xs text-gray-500 dark:text-gray-400">
                                {device.state ? 'On' : 'Off'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDeviceState(device.id, !device.state);
                                }}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${device.state ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                aria-pressed={device.state}
                              >
                                <span className="sr-only">Toggle {device.name}</span>
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${device.state ? 'translate-x-6' : 'translate-x-1'}`}/>
                              </button>
                            </div>
                          </div>
                          
                          {/* Loading overlay */}
                          {isUpdating[device.id] && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-xl">
                              <LoadingIndicator size="medium" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Only render LocalDevicesTab when the local tab is active
              // This prevents unnecessary network scans
              activeTab === 'local' ? <LocalDevicesTab /> : null
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;