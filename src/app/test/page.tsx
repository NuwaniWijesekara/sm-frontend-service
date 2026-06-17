"use client";
import React from 'react';
import Link from 'next/link';

export default function TestPage() {
  const testLinks = [
    { name: "Valid Event (test-token)", url: "/event/wedding2026", icon: "✅" },
    { name: "Invalid Event", url: "/event/invalid-token", icon: "❌" },
    { name: "Processing Event", url: "/event/processing", icon: "⏳" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🧪 Frontend Test Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Test your Scan Me frontend with mock data. No backend required!
          </p>
          
          <div className="space-y-3">
            {testLinks.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{link.name}</div>
                  <div className="text-sm text-gray-500">{link.url}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-violet-50 rounded-2xl p-6 border border-violet-200">
          <h2 className="font-semibold text-violet-900 mb-2">📱 How to Test on Mobile</h2>
          <p className="text-sm text-violet-800 mb-3">
            Find your computer's IP address and use it on your phone:
          </p>
          <code className="block bg-violet-100 p-3 rounded text-sm mb-2">
            ipconfig → Look for IPv4 Address (e.g., 192.168.1.100)
          </code>
          <p className="text-sm text-violet-800">
            Then on your phone visit: <strong>http://YOUR_IP:3000/event/wedding2026</strong>
          </p>
        </div>
      </div>
    </div>
  );
}