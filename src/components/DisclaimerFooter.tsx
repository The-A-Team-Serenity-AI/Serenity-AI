import React from 'react';
import { AlertCircle, Phone, MessageSquare, ExternalLink } from 'lucide-react';

const DisclaimerFooter: React.FC = () => {
  return (
    <div className="bg-gray-900/95 border-t border-white/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Disclaimer */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold mb-1">Medical Disclaimer</p>
              <p className="text-white/80 text-sm leading-relaxed">
                Serenity AI is a wellness platform and <strong>not a substitute for professional medical or mental health care</strong>. 
                Our services are designed for general wellness support only. If you are experiencing a mental health crisis or emergency, 
                please contact emergency services immediately or reach out to a crisis helpline.
              </p>
            </div>
          </div>
        </div>

        {/* Crisis Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <a
            href="tel:1-800-273-8255"
            className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all border border-white/10 hover:border-cyan-300/50"
          >
            <div className="bg-cyan-400/20 p-2 rounded-full">
              <Phone className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Crisis Helpline</p>
              <p className="text-cyan-300 text-xs">1-800-273-8255</p>
            </div>
          </a>

          <div className="flex items-center space-x-3 bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="bg-blue-500/20 p-2 rounded-full">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Crisis Text Line</p>
              <p className="text-blue-400 text-xs">Text HOME to 741741</p>
            </div>
          </div>

          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all border border-white/10 hover:border-green-400/50"
          >
            <div className="bg-green-500/20 p-2 rounded-full">
              <ExternalLink className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">International</p>
              <p className="text-green-400 text-xs">findahelpline.com</p>
            </div>
          </a>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 text-white/60 text-xs border-t border-white/5 pt-4">
          <span>© 2026 Serenity AI. All rights reserved.</span>
          <span>•</span>
          <a href="/community-guidelines" className="hover:text-cyan-300 transition-colors">Community Guidelines</a>
          <span>•</span>
          <a href="#" className="hover:text-cyan-300 transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-cyan-300 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-cyan-300 transition-colors">Contact Support</a>
          <span>•</span>
          <span className="text-cyan-300">18+ Only</span>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerFooter;
