import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, onSave }) => {
  const [inputKey, setInputKey] = useState(apiKey);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 transform transition-all">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Settings</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Gemini API Key
          </label>
          <div className="relative">
            <input 
                type="password" 
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-upwork-green focus:border-transparent outline-none dark:text-white transition-all font-mono text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Enter your own API Key to override the system default. This is <strong>temporary</strong> and will strictly be stored in your browser's memory for this session only. It is not saved to any database.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onSave(inputKey); onClose(); }} 
            className="px-6 py-2 bg-upwork-green text-white rounded-lg hover:bg-upwork-hover shadow-md font-medium transition-colors"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;