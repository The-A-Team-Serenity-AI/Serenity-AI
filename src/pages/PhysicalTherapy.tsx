import { getApiUrl } from '../utils/api';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, TrendingUp, Heart, AlertCircle } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const PhysicalTherapy: React.FC = () => {
  const location = useLocation();
  const [therapyContext, setTherapyContext] = useState<any>(null);

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    AOS.init();
    
    // Get therapy context from navigation state or localStorage
    const contextFromState = location.state;
    const contextFromStorage = localStorage.getItem('current_therapy_context');
    
    if (contextFromState) {
      setTherapyContext(contextFromState);
    } else if (contextFromStorage) {
      try {
        setTherapyContext(JSON.parse(contextFromStorage));
      } catch (error) {
        console.error('Error parsing therapy context:', error);
      }
    }
    
    // Track therapy adoption
    trackTherapyAdoption();
  }, [location]);
  
  const trackTherapyAdoption = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(getApiUrl('/api/user/track-engagement'), {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'therapy_adoption' })
        });
      }
    } catch (error) {
      console.error('Error tracking therapy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-stress-dark">
      {/* Header Section */}
      <header className="relative h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/training.jpg)',
          }}
        >
          <div className="absolute inset-0 bg-stress-dark/50"></div>
        </div>
        <div className="relative h-full flex items-center justify-center text-center text-white px-4">
          <div className="max-w-4xl">
            <h1 data-aos="fade-down" className="text-5xl md:text-6xl font-bold text-white mb-6">
              Physical Therapy
            </h1>
            <p data-aos="fade-up-right" data-aos-duration="1500" className="text-xl text-white/90">
              A mind and body practice combining various styles of physical postures, 
              breathing techniques, and meditation or relaxation. Physical therapy is 
              an ancient practice that helps improve overall well-being.
            </p>
          </div>
        </div>
      </header>

      {/* Personalized Context Section */}
      {therapyContext && (
        <section className="py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="max-w-6xl mx-auto">
            {/* Assessment Summary Card */}
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-8 border border-orange-500/30 mb-8" data-aos="fade-up">
              <div className="flex items-center space-x-3 mb-4">
                <Heart className="w-8 h-8 text-stress-yellow" />
                <h2 className="text-3xl font-bold text-white">Your Personalized Physical Journey</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Wellness Score */}
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="text-white/80 font-semibold">Wellness Score</h3>
                  </div>
                  <p className="text-4xl font-bold text-stress-yellow">{therapyContext.score}%</p>
                  <p className="text-white/60 text-sm mt-2">
                    {therapyContext.score >= 70 ? 'Great progress!' : 
                     therapyContext.score >= 40 ? 'Keep going!' : 
                     'We\'re here to help'}
                  </p>
                </div>

                {/* Mood Summary */}
                <div className="md:col-span-2 bg-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white/80 font-semibold">Your Current State</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed">{therapyContext.moodSummary}</p>
                </div>
              </div>

              {/* Why Physical Therapy */}
              {therapyContext.reasoning && (
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm mt-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Activity className="w-5 h-5 text-stress-yellow" />
                    <h3 className="text-white font-semibold">Why Physical Therapy?</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed">{therapyContext.reasoning}</p>
                </div>
              )}
            </div>

            {/* Personalized Recommendations */}
            <div className="bg-gradient-to-r from-orange-500/20 to-cyan-400/20 rounded-xl p-6 border border-orange-500/30">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="w-6 h-6 text-orange-400" />
                <h3 className="text-2xl font-bold text-white">Recommended Activities</h3>
              </div>
              <p className="text-white/70 mb-6">
                Based on your assessment, here are exercises tailored to your needs:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {therapyContext.score < 40 ? (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Gentle Stretching</h4>
                      <p className="text-white/60 text-sm">Light stretches to ease tension and promote relaxation</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Breathing Exercises</h4>
                      <p className="text-white/60 text-sm">Deep breathing techniques to reduce stress</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Restorative Yoga</h4>
                      <p className="text-white/60 text-sm">Calming poses to restore energy and peace</p>
                    </div>
                  </>
                ) : therapyContext.score < 70 ? (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Moderate Cardio</h4>
                      <p className="text-white/60 text-sm">Light jogging or cycling to boost mood</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Strength Training</h4>
                      <p className="text-white/60 text-sm">Build confidence through bodyweight exercises</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Yoga Flow</h4>
                      <p className="text-white/60 text-sm">Dynamic sequences to energize your body</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">High-Intensity Workouts</h4>
                      <p className="text-white/60 text-sm">Challenge yourself with HIIT sessions</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Power Yoga</h4>
                      <p className="text-white/60 text-sm">Advanced poses for strength and flexibility</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Sports Activities</h4>
                      <p className="text-white/60 text-sm">Maintain your positive energy through team sports</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 bg-gray-900">
        <h1 data-aos="flip-right" className="text-4xl font-bold text-center text-white mb-12">
          Benefits of Physical Therapy
        </h1>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div data-aos="fade-up-right" className="text-white/90">
            <img 
              src="/images/yog.jpg"
              alt="Physical Therapy Benefits"
              className="w-full rounded-xl shadow-xl"
            />
          </div>
          <div data-aos="fade-up-left" className="space-y-6">
            <ul className="space-y-4 text-white/90">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Physical therapy benefits in <strong>weight loss</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>One of the best solutions for <strong>stress relief</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Helps for <strong>inner peace</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Improves <strong>immunity</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Offers <strong>awareness</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Improves <strong>relationships</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Increases <strong>energy</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Gives you Better <strong>flexibility and posture</strong></span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Helps in improving <strong>intuition</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Exercises Section */}
      <section id="exercises" className="py-20 px-4">
        <h1 data-aos="zoom-out" className="text-4xl font-bold text-center text-white mb-12">
          Physical Exercises
        </h1>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Stretching Exercises",
              description: "Basic stretching exercises to improve flexibility and reduce muscle tension. These exercises help in maintaining good posture and preventing injuries.",
              image: "/images/yoga1.jpg",
              link: "https://www.artofliving.org/in-en/yoga/yoga-poses/standing-backward-bend"
            },
            {
              title: "Strength Training",
              description: "Build muscle strength and improve overall fitness with these targeted exercises. Perfect for maintaining a healthy body and mind.",
              image: "/images/yoga2.jpg",
              link: "https://www.artofliving.org/in-en/yoga/yoga-poses/warrior-pose-virbhadrasana"
            },
            {
              title: "Balance Exercises",
              description: "Enhance your stability and coordination with these balance-focused exercises. Great for improving focus and mental clarity.",
              image: "/images/yoga3.jpg",
              link: "https://www.artofliving.org/in-en/yoga/yoga-poses/reverse-prayer-pose"
            }
          ].map((exercise, index) => (
            <div key={index} data-aos="flip-up" className="bg-stress-dark/50 rounded-xl p-4 border border-cyan-400/20">
              <img 
                src={exercise.image} 
                alt={exercise.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-white mb-2">{exercise.title}</h3>
              <p className="text-white/70 mb-4">{exercise.description}</p>
              <a 
                href={exercise.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-cyan-400 text-black text-center py-2 rounded-lg hover:bg-cyan-300 transition-all"
              >
                Learn More
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Videos Section */}
      <section id="videos" className="py-20 px-4 bg-gray-900">
        <h1 data-aos="zoom-in-up" className="text-4xl font-bold text-center text-white mb-12">
          Exercise Videos
        </h1>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            "s2NQhpFGIOg",
            "g_tea8ZNk5A",
            "c8hjhRqIwHE",
            "brjAjq4zEIE"
          ].map((videoId, index) => (
            <div key={index} data-aos="flip-down" className="bg-stress-dark/50 rounded-xl p-4 border border-cyan-400/20">
              <iframe
                width="100%"
                height="315"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PhysicalTherapy; 