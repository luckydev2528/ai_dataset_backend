import React from 'react';

export default function ReviewQueue() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Video Review Queue</h1>
          <p className="text-gray-600">Review and validate pending video submissions</p>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Pending Submissions</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                Refresh Queue
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending submissions</h3>
              <p className="text-gray-600">
                There are currently no video submissions waiting for review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 