import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

const SimpleUpload: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage('Uploading...');

    try {
      console.log('Starting upload of:', file.name, file.type, file.size);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload/book`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        setMessage(`Upload failed: ${response.status} - ${errorText}`);
        return;
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      setMessage(`Success! Book ID: ${result.book_id}, Message: ${result.message}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📤 Simple Upload Test</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select a file to upload:
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.txt,.docx"
            onChange={handleUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {isUploading && (
          <div className="mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Processing...</span>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('Success') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Select a PDF, EPUB, TXT, or DOCX file</li>
            <li>• Check browser console (F12) for detailed logs</li>
            <li>• Success will show a book ID</li>
            <li>• Check the backend uploads folder for saved files</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleUpload;
