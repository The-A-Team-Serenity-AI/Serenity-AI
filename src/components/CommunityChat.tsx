import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Message {
  _id: string;
  userId: {
    _id: string;
    username: string;
  };
  message: string;
  timestamp: string;
}

interface CommunityChatProps {
  onClose: () => void;
}

const CommunityChat: React.FC<CommunityChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/chat/messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      console.log('Sending message:', newMessage);
      const response = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/chat/messages', 
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Message sent successfully:', response.data);
      setNewMessage('');
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.response?.data);
      
      // Show specific error message from server (including toxicity detection)
      const errorMessage = error.response?.data?.error || 'Failed to send message. Please try again.';
      const flaggedWords = error.response?.data?.flaggedWords;
      
      if (flaggedWords && flaggedWords.length > 0) {
        alert(`⚠️ ${errorMessage}\n\nFlagged words: ${flaggedWords.join(', ')}`);
      } else {
        alert(errorMessage);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-cyan-400/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Smile className="w-6 h-6 mr-2 text-cyan-400" />
              Community Chat
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {messages.length} messages • {[...new Set(messages.map(m => m.userId._id))].length} users active
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Smile className="w-16 h-16 mb-4 opacity-50" />
              <p>No messages yet. Be the first to say hi! 👋</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.userId._id === user?._id;
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {!isOwnMessage && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">
                          {msg.userId.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`text-sm ${isOwnMessage ? 'text-cyan-300' : 'text-gray-400'}`}>
                        {isOwnMessage ? 'You' : msg.userId.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-cyan-400 to-orange-500 text-black'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      <p className="break-words">{msg.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-700">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-400"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-cyan-400 to-orange-500 text-black p-3 rounded-full hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {newMessage.length}/500 characters
          </p>
        </form>
      </div>
    </div>
  );
};

export default CommunityChat;
