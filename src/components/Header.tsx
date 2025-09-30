import React from "react";

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Planet Defense</h1>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="#" className="hover:text-blue-200 transition-colors">
                  홈
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-200 transition-colors">
                  게임
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-200 transition-colors">
                  정보
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
