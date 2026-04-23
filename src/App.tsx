import { getApiUrl } from './utils/api';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, ChevronDown, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Services from './pages/Services';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

import AudioTherapy from './pages/AudioTherapy';
import MoodAssessmentPage from './pages/MoodAssessmentPage';
import DoctorConsultation from './pages/DoctorConsultation';
import ChatWithPulse from './features/chat/ChatWithPulse';
import LaughingTherapy from './pages/LaughingTherapy';
import ReadingTherapy from './pages/ReadingTherapy';
import PhysicalTherapy from './pages/PhysicalTherapy';
import CreateTask from './pages/CreateTask';
import Recommendations from './pages/Recommendations';
import CreateRecommendation from './pages/CreateRecommendation';
import CreateEvent from './pages/CreateEvent';
import Notifications from './components/Notifications';
import ProfilePage from './pages/ProfilePage';
import Diary from './pages/Diary';

import GuardianVerification from './pages/GuardianVerification';
import AgeVerificationModal from './components/AgeVerificationModal';
import DisclaimerFooter from './components/DisclaimerFooter';
import CommunityGuidelines from './pages/CommunityGuidelines';
import CriticalWellnessBanner from './components/CriticalWellnessBanner';
import CrisisPopup from './components/CrisisPopup';
import MascotPage from './pages/MascotPage';
import IntroPage from './pages/IntroPage';
import LogoutButton from './components/LogoutButton';

// TODO: Consider moving these routes to a separate config file
// FIXME: Need to implement proper error boundaries for route components

function AppContent() {
  // TODO: Consider using a reducer for complex state management
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [wellnessScore, setWellnessScore] = useState<number>(100);
  const [showCrisisPopup, setShowCrisisPopup] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isIntroPage = location.pathname === '/intro';

  // Check age verification on mount
  useEffect(() => {
    const isVerified = localStorage.getItem('age_verified');
    if (!isVerified) {
      setShowAgeVerification(true);
    }
  }, []);

  // Fetch wellness score for logged-in users
  useEffect(() => {
    const fetchWellnessScore = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl('/api/user/readiness'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setWellnessScore(Math.round(data.readinessScore || 100));
      } catch (error) {
        console.error('Error fetching wellness score:', error);
      }
    };

    fetchWellnessScore();
    
    // Poll every 30 seconds to keep wellness score updated
    const interval = setInterval(fetchWellnessScore, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAgeVerification = (isVerified: boolean) => {
    if (isVerified) {
      setShowAgeVerification(false);
    } else {
      // Redirect to a safe page if user is under 18
      window.location.href = 'https://www.commonsensemedia.org/';
    }
  };

  // Show loading spinner while authentication is being initialized
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // FIXME: This should be memoized if performance becomes an issue
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stress-dark">
      {/* Critical Wellness Banner */}
      {user && !bannerDismissed && (
        <CriticalWellnessBanner 
          wellnessScore={wellnessScore} 
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Crisis Popup */}
      {user && showCrisisPopup && (
        <CrisisPopup
          wellnessScore={wellnessScore}
          isVisible={showCrisisPopup}
          onClose={() => setShowCrisisPopup(false)}
        />
      )}

      {/* Navigation - hidden on intro page */}
      {!isIntroPage && (
      <nav className="bg-black/90 backdrop-blur-sm fixed w-full z-50 border-b border-cyan-400/20">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <img 
                src="/SerenityAIlogo.png" 
                alt="Serenity AI Logo" 
                className="h-7 w-auto"
              />
              <span className="text-xl font-bold">
                <span className="text-white">Serenity</span>
                <span className="text-stress-yellow"> AI</span>
              </span>
            </Link>
            
            {/* Center Navigation Links */}
            <div className="flex items-center space-x-4">
            {/* Services Dropdown */}
            <div className="relative" onMouseEnter={() => setIsServicesOpen(true)} onMouseLeave={() => setIsServicesOpen(false)}>
              <Link to="/services" className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
                <span>Services</span>
                <ChevronDown className="w-4 h-4" />
              </Link>
              <div className={`absolute top-full left-0 mt-2 w-48 bg-black border border-cyan-400/20 rounded-lg shadow-lg transition-all duration-200 z-50 ${isServicesOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                <div className="py-2">
                  <Link to="/services/audio" className="block px-4 py-2 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-sm">Audio Therapy</Link>
                  <Link to="/services/physical" className="block px-4 py-2 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-sm">Physical Therapy</Link>
                  <Link to="/services/laughing" className="block px-4 py-2 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-sm">Laughing Therapy</Link>
                  <Link to="/services/reading" className="block px-4 py-2 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-sm">Reading Therapy</Link>
                  <Link to="/doctor-consultation" className="block px-4 py-2 text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 transition-colors text-sm">Doctor Consultation</Link>
                </div>
              </div>
            </div>

            {/* Sentiscope Link */}
            <Link 
              to="/mood-assessment"
              className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              <Activity className="w-4 h-4" />
              <span>Sentiscope</span>
            </Link>

            {/* Community Link */}
            <Link 
              to="/recommendations"
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
            >
              Community
            </Link>

            {/* Diary Link - Only show when logged in */}
            {user && (
              <Link 
                to="/diary"
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
              >
                📔 Diary
              </Link>
            )}



            {/* Mascot Button */}
            <Link
              to="/mascot"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white transition-all font-semibold text-sm"
              aria-label="Meet Amy"
            >
              <span>✨</span>
              <span>Amy</span>
            </Link>
            </div>
            
            {/* Right - Auth Section */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {user ? (
                <>
                  <Notifications />
                  <Link 
                    to="/profile"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 hover:text-cyan-300 transition-all text-sm font-medium"
                  >
                    <User className="w-4 h-4" />
                    <span>{user.username}</span>
                  </Link>
                  <LogoutButton onClick={handleLogout} />
                </>
              ) : (
                <>
                  <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium">
                    Login
                  </Link>
                  <Link to="/signup" className="bg-cyan-400 text-black px-4 py-1.5 rounded-full hover:bg-cyan-300 transition-all font-semibold text-sm">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      )}

      {/* Main Content */}
      <div className={isIntroPage ? '' : 'pt-20'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/intro" element={<IntroPage />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/audio" element={<AudioTherapy />} />
          <Route path="/services/physical" element={<PhysicalTherapy />} />
          <Route path="/services/laughing" element={<LaughingTherapy />} />
          <Route path="/services/reading" element={<ReadingTherapy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/chat-with-serenity" element={<ChatWithPulse />} />
          <Route path="/doctor-consultation" element={<DoctorConsultation />} />  
          <Route path="/mood-assessment" element={<MoodAssessmentPage />} />
          <Route path="/create-task" element={<CreateTask />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/create-recommendation" element={<CreateRecommendation />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/mascot" element={<MascotPage />} />

          <Route path="/guardian/verify/:token" element={<GuardianVerification />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        </Routes>
      </div>

      {/* Disclaimer Footer */}
      {!isIntroPage && <DisclaimerFooter />}



      {/* Age Verification Modal */}
      {!isIntroPage && showAgeVerification && <AgeVerificationModal onVerify={handleAgeVerification} />}
    </div>
  );
}

// Wrapper component to provide auth context
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
