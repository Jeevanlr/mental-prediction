import React from 'react';
import Header from './Header';
import Footer from './Footer';
import Chatbot from './Chatbot';

const Layout = ({ children, showChatbot = true }) => {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        {children}
      </main>
      {showChatbot && <Chatbot />}
      <Footer />
    </div>
  );
};

export default Layout;