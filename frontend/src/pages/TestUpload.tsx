import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';

const TestUpload: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleTestUpload = async () => {
    setResult('Starting test upload...');
    setError('');
    
    try {
      // Create a simple test file
      const testContent = 'This is a test file for upload testing.';
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      
      console.log('Test file created:', testFile);
      
      const formData = new FormData();
      formData.append('file', testFile);
      
      console.log('Making fetch request...');
      
      const response = await fetch(`${API_BASE_URL}/upload/book`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError(`HTTP ${response.status}: ${errorText}`);
        setResult('Upload failed');
        return;
      }
      
      const result = await response.json();
      console.log('Success result:', result);
      setResult(JSON.stringify(result, null, 2));
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult('Upload failed');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Test</h1>
      
      <button 
        onClick={handleTestUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Upload
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <h3 className="font-bold">Result:</h3>
          <pre className="text-sm">{result}</pre>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="font-bold">Error:</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Check browser console for detailed logs</h3>
        <p>Press F12 to open developer tools and check the Console tab</p>
      </div>
    </div>
  );
};

export default TestUpload;
