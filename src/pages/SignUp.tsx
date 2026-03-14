import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext';
import GoogleOAuthButton from "../components/GoogleOAuthButton";

const SignUp = () => {
  const [username, setUsername] = useState(''); // Add username state
  const [city, setCity] = useState(''); // Add City State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [error, setError] = useState(''); // Error handling state
  const [message, setMessage] = useState(''); // Success message state
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate(); // Initialize navigate

  const isMinor = age && parseInt(age) < 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validate age
    if (!age || parseInt(age) < 13) {
      setError('You must be at least 13 years old to use Serenity AI');
      return;
    }
    
    // Validate guardian email for minors
    if (isMinor && !guardianEmail) {
      setError('Guardian email is required for users under 18');
      return;
    }
    
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          city,
          password,
          isMinor,
          guardianEmail: isMinor ? guardianEmail : undefined,
          age: parseInt(age)
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      
      // If minor, show message about guardian approval
      if (data.requiresGuardianApproval) {
        setMessage(`Account created! A verification email has been sent to ${guardianEmail}. Please wait for guardian approval before logging in.`);
        setTimeout(() => navigate('/login'), 5000);
      } else {
        // For adults, login automatically
        localStorage.setItem('token', data.token);
        console.log('Signup successful, navigating to home');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    
    try {
      await googleLogin(credentialResponse.credential);
      console.log('Google signup successful, navigating to home');
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google signup failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google signup failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-stress-gray p-8 rounded-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Create an <span className="text-stress-yellow">Account</span>
        </h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>} {/* Display error message */}
        {message && <p className="text-green-500 text-sm mb-4">{message}</p>} {/* Display success message */}
        <form className="space-y-6" onSubmit={handleSubmit}> {/* Bind handleSubmit to form */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={username} // Bind username state
              onChange={(e) => setUsername(e.target.value)} // Update username state on change
              className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
              placeholder="Enter your full name"
              required // Make this field required
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
              City Name
            </label>
            <input
              type="text"
              id="city"
              value={city} // Bind username state
              onChange={(e) => setCity(e.target.value)} 
              className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
              placeholder="Enter your city"
              required // Make this field required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email} // Bind email state
              onChange={(e) => setEmail(e.target.value)} // Update email state on change
              className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
              placeholder="Enter your email"
              required // Make this field required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password} // Bind password state
              onChange={(e) => setPassword(e.target.value)} // Update password state on change
              className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
              placeholder="Choose a password"
              required // Make this field required
            />
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-2">
              Age
            </label>
            <input
              type="number"
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
              placeholder="Enter your age"
              min="13"
              required
            />
          </div>
          {isMinor && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm mb-3">
                ⚠️ Since you are under 18, guardian approval is required to create an account.
              </p>
              <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-300 mb-2">
                Guardian's Email Address
              </label>
              <input
                type="email"
                id="guardianEmail"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-stress-dark border border-gray-600 text-white focus:outline-none focus:border-stress-yellow"
                placeholder="Enter guardian's email"
                required={isMinor}
              />
              <p className="text-gray-400 text-xs mt-2">
                A verification email will be sent to this address. Your account will be activated once your guardian approves.
              </p>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-stress-yellow text-stress-dark py-2 rounded-full hover:bg-opacity-90 transition-all font-semibold"
          >
            {isMinor ? 'Sign Up (Requires Guardian Approval)' : 'Sign Up'}
          </button>
        </form>
        
        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="mx-4 text-gray-400 text-sm">or</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>
        
        {/* Google OAuth Button */}
        <GoogleOAuthButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="signup_with"
          theme="outline"
          size="large"
        />
        <p className="mt-4 text-center text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-stress-yellow hover:text-stress-yellow/80">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
