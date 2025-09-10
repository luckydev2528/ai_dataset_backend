import React from "react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Video Validator Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Submissions</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending Review</h3>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Approved</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Rejected</h3>
            <p className="text-2xl font-bold text-red-600">0</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Welcome to the Validator Dashboard</h2>
          <p className="text-gray-600 mb-4">
            Review and validate video submissions from contributors. Tag videos with appropriate metadata 
            and approve or reject based on quality and task completion.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
            Start Reviewing Videos
          </button>
        </div>
      </div>
    </div>
  );
}
