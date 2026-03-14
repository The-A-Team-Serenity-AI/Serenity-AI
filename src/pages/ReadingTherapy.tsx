import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, Heart, AlertCircle } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const ReadingTherapy: React.FC = () => {
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
        await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/user/track-engagement', {
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
            backgroundImage: 'url(https://images2.alphacoders.com/261/thumb-1920-26102.jpg)',
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative h-full flex items-center justify-center text-center text-white px-4">
          <div className="max-w-4xl">
            <h1 data-aos="fade-down" className="text-5xl md:text-6xl font-bold text-white mb-6">
              Welcome to Our <br />
              <span className="text-cyan-400">Reading Therapy</span>
            </h1>
            <h3 data-aos="fade-up-right" data-aos-duration="1500" className="text-xl text-white/90">
              Read Articles, Motivational Quotes and listen to summaries of famous books <br />
              to gain some happiness, knowledge and also lighten your stress side by side.
            </h3>
          </div>
        </div>
      </header>

      {/* Personalized Context Section */}
      {therapyContext && (
        <section className="py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="max-w-6xl mx-auto">
            {/* Assessment Summary Card */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-8 border border-blue-500/30 mb-8" data-aos="fade-up">
              <div className="flex items-center space-x-3 mb-4">
                <Heart className="w-8 h-8 text-stress-yellow" />
                <h2 className="text-3xl font-bold text-white">Your Personalized Reading Journey</h2>
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
                    {therapyContext.score >= 70 ? '✅ Healthy' : 
                     therapyContext.score >= 40 ? '⚠️ Normal' : 
                     '🚨 Critical - Seek Help'}
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

              {/* Why Reading Therapy */}
              {therapyContext.reasoning && (
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm mt-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <BookOpen className="w-5 h-5 text-stress-yellow" />
                    <h3 className="text-white font-semibold">Why Reading Therapy?</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed">{therapyContext.reasoning}</p>
                </div>
              )}
            </div>

            {/* Personalized Reading Recommendations */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
              <div className="flex items-center space-x-3 mb-4">
                <BookOpen className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Recommended Reading</h3>
              </div>
              <p className="text-white/70 mb-6">
                Based on your assessment, here's what we suggest:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {therapyContext.score < 40 ? (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Comforting Stories</h4>
                      <p className="text-white/60 text-sm">Gentle narratives to soothe and inspire hope</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Self-Care Articles</h4>
                      <p className="text-white/60 text-sm">Practical advice for mental wellness</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Healing Quotes</h4>
                      <p className="text-white/60 text-sm">Words of encouragement and strength</p>
                    </div>
                  </>
                ) : therapyContext.score < 70 ? (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Growth Mindset Books</h4>
                      <p className="text-white/60 text-sm">Stories of resilience and progress</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Life Lessons</h4>
                      <p className="text-white/60 text-sm">Insightful articles for personal development</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Motivational Quotes</h4>
                      <p className="text-white/60 text-sm">Inspiration to keep moving forward</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Success Stories</h4>
                      <p className="text-white/60 text-sm">Tales of achievement to fuel your momentum</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Adventure Reads</h4>
                      <p className="text-white/60 text-sm">Exciting stories to match your positive energy</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-semibold mb-2">Empowering Quotes</h4>
                      <p className="text-white/60 text-sm">Bold words for your confident spirit</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section id="Benefits" className="py-20 px-4 bg-gray-900">
        <h1 data-aos="flip-right" className="text-4xl font-bold text-center text-white mb-12">
          Reading Therapy
        </h1>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div data-aos="fade-up-right" className="text-white/90">
            <p className="text-lg">
              Bibliotherapy (also referred to as book therapy, reading therapy, poetry therapy or therapeutic storytelling) 
              is a creative arts therapy that involves storytelling or the reading of specific texts. It uses an individual's 
              relationship to the content of books and poetry and other written words as therapy. Bibliotherapy partially 
              overlaps with, and is often combined with, writing therapy.
            </p>
          </div>
          <div data-aos="fade-up-left" className="space-y-6">
            <h2 className="text-2xl font-semibold text-cyan-400">Benefits of Reading</h2>
            <div className="bg-black/50 p-6 rounded-xl border border-cyan-400/20">
              <ul className="space-y-3 text-white/90">
                <li>• Reduces stress</li>
                <li>• Increases your ability to empathize</li>
                <li>• Helps prevent age-related cognitive decline</li>
                <li>• Builds your vocabulary</li>
                <li>• Prepares you for a good night's rest</li>
                <li>• Helps alleviate depression symptoms</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section id="articles" className="py-20 px-4">
        <h1 data-aos="zoom-out" className="text-4xl font-bold text-center text-white mb-12">
          Articles
        </h1>
        <h2 data-aos="fade-up" className="text-2xl font-semibold text-center text-cyan-400 mb-8">
          Inspirational Stories
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            "https://ahigherthought.com/the-best-way-to-refresh-mind-body-soul/",
            "https://ahigherthought.com/how-to-get-motivated-when-you-dont-feel-like-it/",
            "https://www.thesecret.tv/stories/ugly-puppy-to-handsome-hunk/",
            "https://www.thesecret.tv/stories/dream-job-come-true-2/"
          ].map((url, index) => (
            <div key={index} data-aos="flip-up" className="bg-black/50 rounded-xl p-4 border border-cyan-400/20">
              <iframe 
                src={url} 
                className="w-full h-[380px] rounded-lg"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      </section>

      {/* Quotes Section */}
      <section id="quotes" className="py-20 px-4 bg-gray-900">
        <h1 data-aos="zoom-in-up" className="text-4xl font-bold text-center text-white mb-12">
          Motivational Quotes
        </h1>
        <h2 data-aos="fade-up" className="text-2xl font-semibold text-center text-cyan-400 mb-8">
          Inspirational Quotes
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            "Life isn't about finding yourself. Life is about creating yourself.",
            "A mistake that makes you humble is better than an achievement that makes you arrogant.",
            "Why do we only rest in peace why don't we live in peace too?",
            "Our greatest glory is not in never falling, but in rising every time we fall."
          ].map((quote, index) => (
            <div key={index} data-aos="flip-down" className="bg-black/50 p-6 rounded-xl border border-cyan-400/20">
              <p className="text-white/90 text-center">{quote}</p>
            </div>
          ))}
        </div>
        <h2 data-aos="fade-up" className="text-2xl font-semibold text-center text-cyan-400 my-8">
          Stress relieving Quotes
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            "It's not the events of our lives that shape us, but our beliefs as to what those events mean.",
            "Breath is the power behind all things…. I breathe in and know that good things will happen.",
            "You can't control the wind, but you can adjust your sails.",
            "There are times when we stop, we sit still. We listen and breezes from a whole other world begin to whisper."
          ].map((quote, index) => (
            <div key={index} data-aos="flip-down" className="bg-black/50 p-6 rounded-xl border border-cyan-400/20">
              <p className="text-white/90 text-center">{quote}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Book Summaries Section */}
      <section id="summary" className="py-20 px-4">
        <h1 data-aos="zoom-in-up" className="text-4xl font-bold text-center text-white mb-12">
          Summary of Books
        </h1>
        <h2 data-aos="fade-up" className="text-2xl font-semibold text-center text-cyan-400 mb-8">
          In Articles
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            "https://www.samuelthomasdavies.com/book-summaries/self-help/atomic-habits/",
            "https://jamesclear.com/book-summaries/the-subtle-art-of-not-giving-a-fck",
            "https://wizbuskout.com/think-like-a-monk-summary/",
            "https://www.sloww.co/ikigai-book/"
          ].map((url, index) => (
            <div key={index} data-aos="flip-up" className="bg-black/50 rounded-xl p-4 border border-cyan-400/20">
              <iframe 
                src={url} 
                className="w-full h-[380px] rounded-lg"
                frameBorder="0"
                allowFullScreen
              />
            </div>
          ))}
        </div>
        <h2 data-aos="fade-up" className="text-2xl font-semibold text-center text-cyan-400 my-8">
          In Videos
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            "PZ7lDrwYdZc",
            "Zxj3P0enJNQ",
            "8OAH3hqNsN4",
            "9g1BfGpoK3E"
          ].map((videoId, index) => (
            <div key={index} data-aos="flip-down" className="bg-black/50 rounded-xl p-4 border border-cyan-400/20">
              <iframe
                width="100%"
                height="280"
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

      {/* Books Section */}
      <section id="reading" className="py-20 px-4 bg-gray-900">
        <h1 data-aos="zoom-in-up" className="text-4xl font-bold text-center text-white mb-12">
          Books
        </h1>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              title: "Atomic Habits",
              author: "James Clear",
              image: "https://m.media-amazon.com/images/I/41wuB-s8vRL._SL300_.jpg",
              link: "https://www.amazon.in/Atomic-Habits-James-Clear/dp/1847941834/ref=sr_1_1_sspa?adgrpid=1222657423508526&hvadid=76416220215708&hvbmt=bb&hvdev=c&hvlocphy=143836&hvnetw=o&hvqmt=b&hvtargid=kwd-76416451159832%3Aloc-90&keywords=book+-+atomic+habits&qid=1659729304&sr=8-1-spons&psc=1&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUEzMTBXOTIwWUFaTkpWJmVuY3J5cHRlZElkPUEwNTQ5NzkwMjBTNVlXWkMwRjUyNCZlbmNyeXB0ZWRBZElkPUEwNTQ1NDkwQVNZQ09SVlc3REdNJndpZGdldE5hbWU9c3BfYXRmJmFjdGlvbj1jbGlja1JlZGlyZWN0JmRvTm90TG9nQ2xpY2s9dHJ1ZQ=="
            },
            {
              title: "The Psychology of Money",
              author: "Morgan Housel",
              image: "https://m.media-amazon.com/images/I/51jRBz6Ug3L._SL500_.jpg",
              link: "https://www.amazon.in/Psychology-Money-Morgan-Housel/dp/9390166268/ref=sr_1_1_sspa?crid=3NGTBCRUC5JU6&keywords=psychology+of+money&qid=1659729390&sprefix=phsycology+of+mone+%2Caps%2C319&sr=8-1-spons&psc=1&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUExVjY1MUhLNE1QSFBKJmVuY3J5cHRlZElkPUEwMzc1NDAxM05ETEZKTjBFMksySiZlbmNyeXB0ZWRBZElkPUEwMTQ1MTU4M0I4Mks1VTNZOVVXSCZ3aWRnZXROYW1lPXNwX2F0ZiZhY3Rpb249Y2xpY2tSZWRpcmVjdCZkb05vdExvZ0NsaWNrPXRydWU="
            },
            {
              title: "The Subtle Art of Not Giving a F*ck",
              author: "Mark Manson",
              image: "https://m.media-amazon.com/images/I/51MT0MbpD7L._SL500_.jpg",
              link: "https://www.amazon.in/Subtle-Art-Not-Giving/dp/0062641549/ref=sr_1_1?keywords=subtle+art+of+not+giving+a+fck&qid=1659729454&sprefix=subtle%2Caps%2C230&sr=8-1"
            },
            {
              title: "Ikigai",
              author: "Héctor García and Francesc Miralles",
              image: "https://m.media-amazon.com/images/I/511HccWipML._SL500_.jpg",
              link: "https://www.amazon.in/Ikigai-H%C3%A9ctor-Garc%C3%ADa/dp/178633089X/ref=sr_1_1_sspa?keywords=ikigai&qid=1659729512&sprefix=ikig%2Caps%2C474&sr=8-1-spons&psc=1&spLa=ZW5jcnlwdGVkUXVhbGlmaWVyPUEzTUQxWFNQUlRMRDgyJmVuY3J5cHRlZElkPUEwOTk0NTg2VU9TODRZWUFaMTJQJmVuY3J5cHRlZEFkSWQ9QTA5NDE5MDAzVTQ4UloyQkdRWkpQJndpZGdldE5hbWU9c3BfYXRmJmFjdGlvbj1jbGlja1JlZGlyZWN0JmRvTm90TG9nQ2xpY2s9dHJ1ZQ=="
            }
          ].map((book, index) => (
            <div key={index} data-aos="flip-down" className="bg-black/50 rounded-xl p-4 border border-cyan-400/20">
              <img 
                src={book.image} 
                alt={book.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold text-white mb-2">{book.title}</h3>
              <p className="text-white/70 mb-4">By {book.author}</p>
              <a 
                href={book.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-cyan-400 text-black text-center py-2 rounded-lg hover:bg-cyan-300 transition-all"
              >
                Read
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ReadingTherapy; 