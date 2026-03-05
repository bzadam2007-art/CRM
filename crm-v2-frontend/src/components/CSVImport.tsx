import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, AlertCircle, CheckCircle, FileText, Trash2 } from 'lucide-react';
import { importExportService } from '../services/api';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  errors?: string[];
}

const CSVImport: React.FC<{ onImportComplete?: () => void }> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        setResult({
          success: false,
          message: 'Please upload a CSV file',
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        setResult({
          success: false,
          message: 'Please select a CSV file',
        });
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const response = await importExportService.importCSV(file);
      setResult({
        success: response.success,
        message: response.message,
        imported: response.success ? parseInt(response.message.match(/\d+/)?.[0] || '0') : undefined,
        errors: response.errors,
      });

      if (response.success && onImportComplete) {
        setTimeout(() => {
          onImportComplete();
          setFile(null);
          setResult(null);
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to import CSV',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `School Name,Country,Type,Contact Name,Role,Email,Website,Student Count,Notes
Example International School,France,International School,John Doe,Principal,john@example.com,www.example.com,500,Notes about school`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospect_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 p-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Import Prospects</h1>
          <p className="text-slate-600 dark:text-slate-400">Upload a CSV file to import your prospect list</p>
        </div>

        {/* Main Import Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8"
        >
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {file ? file.name : 'Drag and drop your CSV file'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-input"
              disabled={loading}
            />
            <label
              htmlFor="csv-input"
              className="inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer font-medium transition-colors"
            >
              Select File
            </label>
          </div>

          {/* File Info */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-4 rounded-lg flex gap-3 ${
                  result.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      result.success
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-red-900 dark:text-red-200'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {result.errors.slice(0, 3).map((error, idx) => (
                        <li
                          key={idx}
                          className={result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}
                        >
                          • {error}
                        </li>
                      ))}
                      {result.errors.length > 3 && (
                        <li className={result.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                          • ... and {result.errors.length - 3} more errors
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Importing...' : 'Import Prospects'}
            </button>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Download Template
            </button>
          </div>
        </motion.div>

        {/* Format Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">CSV Format Requirements</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li>• <strong>School Name</strong> (required) - Name of the school/organization</li>
            <li>• <strong>Country</strong> (required) - Country where the school is located</li>
            <li>• <strong>Type</strong> (optional) - Type of school (e.g., International School, Public, Private)</li>
            <li>• <strong>Contact Name</strong> (optional) - Name of contact person</li>
            <li>• <strong>Role</strong> (optional) - Contact person's role (e.g., Principal, Director)</li>
            <li>• <strong>Email</strong> (optional) - Contact email address</li>
            <li>• <strong>Website</strong> (optional) - School website</li>
            <li>• <strong>Student Count</strong> (optional) - Number of students</li>
            <li>• <strong>Notes</strong> (optional) - Any additional notes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CSVImport;
