import React, { useRef } from 'react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFilesAdded: (files: UploadedFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await readFileAsText(file);
        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          content: text
        });
      } catch (e) {
        console.error(`Failed to read file ${file.name}`, e);
      }
    }

    onFilesAdded(newFiles);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-upwork-green hover:text-upwork-green dark:hover:border-upwork-green dark:hover:text-upwork-green transition-colors flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload Knowledge Base
      </button>
      <p className="text-xs text-gray-400 mt-2 text-center">Supported: Any text-based file</p>
    </div>
  );
};

export default FileUpload;