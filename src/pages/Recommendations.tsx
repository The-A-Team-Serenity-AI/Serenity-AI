import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommunityChat from '../components/CommunityChat';

interface Recommendation {
  _id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  likes?: string[];
  dislikes?: string[];
  userId: {
    username: string;
    email: string;
  };
}

interface Event {
  _id: string;
  sport: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  currentParticipants: number;
  location: string;
  status: string;
  likes?: string[];
  dislikes?: string[];
  creatorId: {
    username: string;
    email: string;
  };
}

interface EventParticipant {
  _id: string;
  eventId: Event;
  userId: {
    _id: string;
    username: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
}

function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<{ created: Event[], joined: EventParticipant[] }>({ created: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'events' | 'recommendations'>('all');
  const [showChat, setShowChat] = useState(false);
  const [readinessData, setReadinessData] = useState<any>(null);
  const { user } = useAuth();

  // Filter events and recommendations based on search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecommendations = recommendations.filter(rec =>
    rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (user) {
      fetchRecommendations();
      fetchEvents();
      fetchMyEvents();
      fetchReadiness();
      
      // Refresh readiness on visibility change (when user returns to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchReadiness();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Poll readiness every 10 seconds
      const interval = setInterval(() => {
        fetchReadiness();
      }, 10000);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(interval);
      };
    } else {
      setLoading(false);
    }
  }, [user]);
  
  const fetchReadiness = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/user/readiness', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReadinessData(response.data);
    } catch (error) {
      console.error('Error fetching readiness:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/recommendations');
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError('Failed to load recommendations');
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/events/my-events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyEvents(response.data);
    } catch (error) {
      console.error('Error fetching my events:', error);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/events/${eventId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
      fetchMyEvents();
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const handleAcceptRejectRequest = async (eventId: string, participantId: string, status: 'accepted' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/events/${eventId}/participants/${participantId}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMyEvents();
    } catch (error) {
      console.error('Error updating participant status:', error);
    }
  };

  const handleLikeEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/events/${eventId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (error) {
      console.error('Error liking event:', error);
    }
  };

  const handleDislikeEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/events/${eventId}/dislike`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (error) {
      console.error('Error disliking event:', error);
    }
  };

  const handleLikeRecommendation = async (recommendationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/recommendations/${recommendationId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecommendations();
    } catch (error) {
      console.error('Error liking recommendation:', error);
    }
  };

  const handleDislikeRecommendation = async (recommendationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/recommendations/${recommendationId}/dislike`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecommendations();
    } catch (error) {
      console.error('Error disliking recommendation:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please Log In to Access Community</h2>
          <p className="text-gray-400 mb-6">Join our community to see and share recommendations</p>
          <Link
            to="/login"
            className="bg-stress-yellow text-stress-dark px-6 py-2 rounded-full hover:bg-opacity-90 transition-all inline-block"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stress-yellow text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundImage: `url('/images/community_bg.avif')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-stress-dark/80 backdrop-blur-sm z-0"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Community</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowChat(true)}
              className="px-6 py-2 rounded-full transition-all flex items-center bg-stress-yellow text-stress-dark hover:bg-opacity-90 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              <span>Community Chat</span>
            </button>
            <Link
              to="/create-event"
              className="px-6 py-2 rounded-full transition-all flex items-center bg-stress-yellow text-stress-dark hover:bg-opacity-90"
            >
              <span className="mr-2">Host Event</span>
            </Link>
            <Link
              to="/create-recommendation"
              className="px-6 py-2 rounded-full transition-all flex items-center bg-stress-yellow text-stress-dark hover:bg-opacity-90"
            >
              <span className="mr-2">Post a Recommendation</span>
            </Link>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search events and recommendations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-cyan-400/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-cyan-400 text-black'
                    : 'bg-gray-900 text-white border border-cyan-400/20'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('events')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'events'
                    ? 'bg-cyan-400 text-black'
                    : 'bg-gray-900 text-white border border-cyan-400/20'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setFilterType('recommendations')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'recommendations'
                    ? 'bg-cyan-400 text-black'
                    : 'bg-gray-900 text-white border border-cyan-400/20'
                }`}
              >
                Recommendations
              </button>
            </div>
          </div>
          {searchQuery && (
            <p className="text-gray-400 text-sm">
              Showing {filterType === 'all' ? filteredEvents.length + filteredRecommendations.length : 
                       filterType === 'events' ? filteredEvents.length : filteredRecommendations.length} results
            </p>
          )}
        </div>

        {/* My Events Section */}
        {user && filterType !== 'recommendations' && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">My Events</h2>
            
            {/* Events I Created */}
            <div className="mb-8">
              <h3 className="text-xl mb-4 text-white">Events I Created</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.created.map((event) => (
                  <div key={event._id} className="bg-gray-900 rounded-lg p-6 border border-cyan-400/20">
                    <h4 className="text-white font-semibold mb-2">{event.title}</h4>
                    <p className="text-gray-400 mb-4">{event.description}</p>
                    <div className="space-y-2">
                      <p><span className="text-cyan-400">Sport:</span> <span className="text-white">{event.sport}</span></p>
                      <p><span className="text-cyan-400">Date:</span> <span className="text-white">{new Date(event.date).toLocaleDateString()}</span></p>
                      <p><span className="text-cyan-400">Duration:</span> <span className="text-white">{event.duration} minutes</span></p>
                      <p><span className="text-cyan-400">Location:</span> <span className="text-white">{event.location}</span></p>
                      <p><span className="text-cyan-400">Participants:</span> <span className="text-white">{event.currentParticipants}/{event.maxParticipants}</span></p>
                    </div>
                    
                    {/* Like/Dislike Buttons */}
                    <div className="mt-4 flex items-center space-x-4 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => handleLikeEvent(event._id)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                          user && event.likes?.some(id => id.toString() === user._id.toString())
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-800 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{event.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => handleDislikeEvent(event._id)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                          user && event.dislikes?.some(id => id.toString() === user._id.toString())
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>{event.dislikes?.length || 0}</span>
                      </button>
                    </div>
                    
                    {/* Pending Requests */}
                    {myEvents.joined
                      .filter(participant => 
                        participant.eventId._id === event._id && 
                        participant.status === 'pending'
                      )
                      .map(participant => (
                        <div key={participant._id} className="mt-4 p-4 bg-gray-800 rounded-lg">
                          <p className="mb-2">{participant.userId.username} wants to join</p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptRejectRequest(event._id, participant._id, 'accepted')}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleAcceptRejectRequest(event._id, participant._id, 'rejected')}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Events I Joined */}
            <div>
              <h3 className="text-white mb-4">Events I Joined</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEvents.joined
                  .filter(participant => participant.status === 'accepted')
                  .map(participant => (
                    <div key={participant._id} className="bg-gray-900 rounded-lg p-6 border border-cyan-400/20">
                      <h4 className="text-white font-semibold mb-2">{participant.eventId.title}</h4>
                      <p className="text-gray-400 mb-4">{participant.eventId.description}</p>
                      <div className="space-y-2">
                        <p><span className="text-cyan-400">Sport:</span> <span className="text-white">{participant.eventId.sport}</span></p>
                        <p><span className="text-cyan-400">Date:</span> <span className="text-white">{new Date(participant.eventId.date).toLocaleDateString()}</span></p>
                        <p><span className="text-cyan-400">Duration:</span> <span className="text-white">{participant.eventId.duration} minutes</span></p>
                        <p><span className="text-cyan-400">Location:</span> <span className="text-white">{participant.eventId.location}</span></p>
                        <p><span className="text-cyan-400">Participants:</span> <span className="text-white">{participant.eventId.currentParticipants}/{participant.eventId.maxParticipants}</span></p>
                      </div>
                      
                      {/* Like/Dislike Buttons */}
                      <div className="mt-4 flex items-center space-x-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => handleLikeEvent(participant.eventId._id)}
                          className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                            user && participant.eventId.likes?.some(id => id.toString() === user._id.toString())
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-800 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{participant.eventId.likes?.length || 0}</span>
                        </button>
                        <button
                          onClick={() => handleDislikeEvent(participant.eventId._id)}
                          className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                            user && participant.eventId.dislikes?.some(id => id.toString() === user._id.toString())
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>{participant.eventId.dislikes?.length || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* All Events Section */}
        {filterType !== 'recommendations' && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">All Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div key={event._id} className="bg-gray-900 rounded-lg p-6 border border-cyan-400/20">
                  <h4 className="text-white font-semibold mb-2">{event.title}</h4>
                  <p className="text-gray-400 mb-4">{event.description}</p>
                  <div className="space-y-2">
                    <p><span className="text-cyan-400">Sport:</span> <span className="text-white">{event.sport}</span></p>
                    <p><span className="text-cyan-400">Date:</span> <span className="text-white">{new Date(event.date).toLocaleDateString()}</span></p>
                    <p><span className="text-cyan-400">Duration:</span> <span className="text-white">{event.duration} minutes</span></p>
                    <p><span className="text-cyan-400">Location:</span> <span className="text-white">{event.location}</span></p>
                    <p><span className="text-cyan-400">Participants:</span> <span className="text-white">{event.currentParticipants}/{event.maxParticipants}</span></p>
                    <p><span className="text-cyan-400">Host:</span> <span className="text-white">{event.creatorId.username}</span></p>
                  </div>
                  
                  {/* Like/Dislike Buttons */}
                  <div className="mt-4 flex items-center space-x-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => handleLikeEvent(event._id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                        user && event.likes?.some(id => id.toString() === user._id.toString())
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-800 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{event.likes?.length || 0}</span>
                    </button>
                    <button
                      onClick={() => handleDislikeEvent(event._id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                        user && event.dislikes?.some(id => id.toString() === user._id.toString())
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>{event.dislikes?.length || 0}</span>
                    </button>
                  </div>
                  
                  {user && event.status === 'open' && event.currentParticipants < event.maxParticipants && (
                    <button
                      onClick={() => handleJoinEvent(event._id)}
                      className="mt-4 w-full bg-cyan-400 text-black px-4 py-2 rounded hover:bg-cyan-300 transition-all"
                    >
                      Join Event
                    </button>
                  )}
                  {event.status === 'full' && (
                    <p className="mt-4 text-red-500 text-center">Event is full</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {filterType !== 'events' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map((rec) => (
                <div key={rec._id} className="bg-gray-900 rounded-lg p-6 border border-cyan-400/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-cyan-400 text-black px-3 py-1 rounded-full text-sm">
                      {rec.type}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{rec.title}</h3>
                  <p className="text-gray-300 mb-4">{rec.description}</p>
                  <div className="text-sm text-gray-400 mb-4">
                    Posted by {rec.userId.username}
                  </div>
                  
                  {/* Like/Dislike Buttons */}
                  <div className="flex items-center space-x-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => handleLikeRecommendation(rec._id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                        user && rec.likes?.some(id => id.toString() === user._id.toString())
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-800 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{rec.likes?.length || 0}</span>
                    </button>
                    <button
                      onClick={() => handleDislikeRecommendation(rec._id)}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                        user && rec.dislikes?.some(id => id.toString() === user._id.toString())
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>{rec.dislikes?.length || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {((filterType === 'all' && filteredEvents.length === 0 && filteredRecommendations.length === 0) ||
          (filterType === 'events' && filteredEvents.length === 0) ||
          (filterType === 'recommendations' && filteredRecommendations.length === 0)) && (
          <div className="text-center text-gray-400 mt-8">
            {searchQuery ? 'No results found for your search.' : 'No content yet. Be the first to post!'}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
            <Link
              to="/create-event"
              className="block w-full bg-cyan-400 text-black text-center py-2 rounded hover:bg-cyan-300 transition-all"
            >
              Create Event
            </Link>
            <button
              onClick={() => setShowCreateEvent(false)}
              className="mt-4 w-full bg-gray-700 text-white py-2 rounded hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Community Chat */}
      {showChat && <CommunityChat onClose={() => setShowChat(false)} />}
    </div>
  );
}

export default Recommendations; 