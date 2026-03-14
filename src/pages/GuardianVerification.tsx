import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface ConsentRequest {
  childUsername: string;
  childEmail: string;
  childAge: number;
  guardianEmail: string;
  createdAt: string;
  expiresAt: string;
}

const GuardianVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<'approved' | 'denied' | null>(null);

  useEffect(() => {
    fetchConsentRequest();
  }, [token]);

  const fetchConsentRequest = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/guardian/consent/${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load consent request');
      }
      
      const data = await response.json();
      setConsentRequest(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/guardian/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }
      
      setResult('approved');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!token) return;
    
    const reason = prompt('Optional: Please provide a reason for denying this request:');
    
    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/guardian/deny/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'No reason provided' })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deny');
      }
      
      setResult('denied');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading verification request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Verification Error</h1>
          <p className="text-white/80 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (result === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Account Approved!</h1>
          <p className="text-white/80 mb-6">
            You have successfully approved the Serenity AI account for <strong>{consentRequest?.childUsername}</strong>.
          </p>
          <p className="text-white/60 text-sm mb-6">
            They can now log in and access the platform. You may close this window.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (result === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Request Denied</h1>
          <p className="text-white/80 mb-6">
            You have denied the account request for <strong>{consentRequest?.childUsername}</strong>.
          </p>
          <p className="text-white/60 text-sm mb-6">
            The account will remain inactive. You may close this window.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Guardian Consent Required</h1>
          <p className="text-white/60">Serenity AI Account Verification</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Request Details</h2>
          
          <div className="space-y-3 text-white/80">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-medium">Child's Username:</span>
              <span>{consentRequest?.childUsername}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-medium">Child's Email:</span>
              <span>{consentRequest?.childEmail}</span>
            </div>
            {consentRequest?.childAge && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="font-medium">Age:</span>
                <span>{consentRequest.childAge} years old</span>
              </div>
            )}
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="font-medium">Guardian Email:</span>
              <span>{consentRequest?.guardianEmail}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Expires:
              </span>
              <span className="text-sm">
                {consentRequest?.expiresAt ? new Date(consentRequest.expiresAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div className="text-white/80 text-sm">
              <p className="font-semibold mb-2">About Serenity AI</p>
              <p>
                Serenity AI is a mental wellness platform that helps users track and improve their mental health 
                through AI support, therapy recommendations, and community engagement. The platform provides:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>AI-powered mental health chat support</li>
                <li>Mood assessment and tracking</li>
                <li>Therapy recommendations (music, physical, reading)</li>
                <li>Safe community interaction with moderation</li>
                <li>Crisis detection and helpline resources</li>
              </ul>
              <p className="mt-3 font-semibold">
                By approving this request, you consent to your child using Serenity AI's mental wellness services.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleDeny}
            disabled={processing}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {processing ? 'Processing...' : 'Deny Request'}
          </button>
          <button
            onClick={handleApprove}
            disabled={processing}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {processing ? 'Processing...' : 'Approve Account'}
          </button>
        </div>

        <p className="text-white/40 text-xs text-center mt-6">
          This verification link was sent to {consentRequest?.guardianEmail}. If you did not expect this email, please ignore it.
        </p>
      </div>
    </div>
  );
};

export default GuardianVerification;
