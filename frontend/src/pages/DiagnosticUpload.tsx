import React, { useState } from 'react';

const DiagnosticUpload: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleDiagnosticUpload = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.epub,.txt,.docx';
    
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      addLog(`=== DIAGNOSTIC UPLOAD START ===`);
      addLog(`File: ${file.name} (${file.type}, ${file.size} bytes)`);

      try {
        addLog(`Creating FormData...`);
        const formData = new FormData();
        formData.append('file', file);

        addLog(`Making fetch request...`);
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:8000/api/upload/book', {
          method: 'POST',
          body: formData,
        });
        
        const endTime = Date.now();
        
        addLog(`Response received:`);
        addLog(`  Status: ${response.status} ${response.statusText}`);
        addLog(`  OK: ${response.ok}`);
        addLog(`  Duration: ${endTime - startTime}ms`);
        addLog(`  Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

        // Read response as text first
        const responseText = await response.text();
        addLog(`Response body (text): ${responseText}`);

        if (!response.ok) {
          addLog(`ERROR: HTTP ${response.status}`);
          setIsUploading(false);
          return;
        }

        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(responseText);
          addLog(`✅ JSON parsed successfully:`);
          addLog(`  book_id: ${jsonData.book_id}`);
          addLog(`  status: ${jsonData.status}`);
          addLog(`  message: ${jsonData.message}`);
          addLog(`  steps: ${JSON.stringify(jsonData.processing_steps)}`);
          
          // Check if navigation would work
          addLog(`Would navigate to: /book/${jsonData.book_id}`);
          
        } catch (parseError) {
          addLog(`ERROR: Failed to parse JSON: ${parseError}`);
        }

      } catch (error) {
        addLog(`ERROR: Network/fetch error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsUploading(false);
        addLog(`=== DIAGNOSTIC UPLOAD END ===`);
      }
    };

    fileInput.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔍 Upload Diagnostic Tool</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Test</h2>
        
        <button
          onClick={handleDiagnosticUpload}
          disabled={isUploading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Select and Upload File'}
        </button>
        
        <p className="text-sm text-gray-600 mt-2">
          This will show exactly what happens during the upload process.
        </p>
      </div>

      <div className="bg-gray-900 text-green-400 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">📋 Diagnostic Logs</h3>
        <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500 italic">
              No logs yet. Click the button above to start the diagnostic.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">🔧 Instructions</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. Click "Select and Upload File"</li>
          <li>2. Choose any PDF, EPUB, TXT, or DOCX file</li>
          <li>3. Watch the diagnostic logs below</li>
          <li>4. Check the browser console (F12) for additional details</li>
        </ul>
      </div>
    </div>
  );
};

export default DiagnosticUpload;
