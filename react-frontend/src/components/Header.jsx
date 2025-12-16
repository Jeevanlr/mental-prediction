import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 0 0-9.6 7.4c.7 2.6 1.8 5.4 3.7 7.7 2.1 2.5 4.8 4 6.9 4.9 2.1-.9 4.8-2.4 6.9-4.9 1.9-2.3 3-5.1 3.7-7.7A10 10 0 0 0 12 2z" />
              <polyline points="9 12 12 15 15 12" />
            </svg>
          </div>
          <h1>MindCheck</h1>
        </div>
      </div>
    </header>
  );
};

export default Header;