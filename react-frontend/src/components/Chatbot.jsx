import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [greeted, setGreeted] = useState(false);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (isOpen && !greeted) {
      setMessages([
        { 
          sender: 'bot', 
          text: '👋 Hi there! I\'m your AI mental health assistant. How are you feeling today?' 
        }
      ]);
      setGreeted(true);
    }
  }, [isOpen, greeted]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const data = await api.sendChatMessage(input);
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [
        ...prev, 
        { sender: 'bot', text: '⚠️ Sorry, I\'m having trouble responding right now.' }
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <>
      <button 
        className="chatbot-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chatbot"
      >
        🤖
      </button>
      
      {isOpen && (
        <div className="chatbot-popup">
          <div className="chatbot-header">
            <strong>AI Assistant</strong>
            <button 
              className="chatbot-close" 
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ✖
            </button>
          </div>
          
          <div className="chatbot-body" ref={chatBodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.sender}`}>
                {msg.sender === 'user' ? '👤 ' : '🤖 '}
                {msg.text}
              </div>
            ))}
          </div>
          
          <div className="chatbot-footer">
            <input
              className="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              aria-label="Chat message input"
            />
            <button 
              className="chatbot-send" 
              onClick={sendMessage}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;