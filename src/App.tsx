import React from "react";
import Header from "@/components/Header";
import BabylonScene from "@/components/BabylonScene";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Planet Defense
          </h1>
          <p className="text-gray-600 mb-4">
            React + TypeScript + Webpack + TailwindCSS 환경이 성공적으로
            구성되었습니다!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              설정된 기능들:
            </h2>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>React 18</li>
              <li>TypeScript</li>
              <li>Webpack 5</li>
              <li>TailwindCSS</li>
              <li>절대 경로 (@/src/*)</li>
              <li>Hot Module Replacement</li>
              <li>BabylonJS 3D 엔진</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              BabylonJS 3D 씬
            </h2>
            <div className="w-full h-96 bg-gray-100 rounded-lg">
              <BabylonScene />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
