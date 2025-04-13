import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Lightbulb, Wind, AirVent, Tv, Refrigerator, Plus } from 'lucide-react';

const AddDevice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'light',
    room: '',
    name: '',
    state: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deviceIcons = {
    light: <Lightbulb className="h-5 w-5 text-blue-500" />,
    fan: <Wind className="h-5 w-5 text-blue-500" />,
    ac: <AirVent className="h-5 w-5 text-blue-500" />,
    tv: <Tv className="h-5 w-5 text-blue-500" />,
    refrigerator: <Refrigerator className="h-5 w-5 text-blue-500" />
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'devices'), {
        ...formData,
        userId: user.uid,
        createdAt: new Date()
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding device:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white mb-6 transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Plus className="h-6 w-6 mr-2 text-blue-500" />
            Add New Device
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Device Type
              </label>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Object.entries(deviceIcons).map(([type, icon]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                      formData.type === type 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {icon}
                    <span className="mt-2 text-xs font-medium capitalize text-gray-900 dark:text-white">
                      {type === 'tv' ? 'TV' : type === 'ac' ? 'AC' : type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Device Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                placeholder="Living Room Light"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Room
              </label>
              <input
                type="text"
                required
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                placeholder="Living Room"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding Device...
                </>
              ) : (
                'Add Device'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDevice;