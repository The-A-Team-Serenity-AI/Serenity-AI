import React from 'react';
import { Shield, AlertTriangle, Heart, Users, Ban, Flag, CheckCircle } from 'lucide-react';

const CommunityGuidelines: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-cyan-400/20 p-4 rounded-full">
              <Shield className="w-16 h-16 text-cyan-300" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Community Guidelines</h1>
          <p className="text-white/80 text-lg">
            Creating a safe, supportive space for everyone
          </p>
        </div>

        {/* Core Principles */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center space-x-3">
            <Heart className="w-8 h-8 text-red-400" />
            <span>Our Core Principles</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Empathy First</h3>
                <p className="text-white/70">Treat everyone with kindness and understanding. We're all on a wellness journey.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Respect Boundaries</h3>
                <p className="text-white/70">Everyone's comfort level is different. Respect personal space and privacy.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Support, Don't Diagnose</h3>
                <p className="text-white/70">Share experiences and encouragement, but never provide medical advice or diagnoses.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Celebrate Diversity</h3>
                <p className="text-white/70">Welcome all backgrounds, identities, and perspectives with open arms.</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's Not Allowed */}
        <div className="bg-red-500/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-red-500/30">
          <h2 className="text-3xl font-bold text-red-400 mb-6 flex items-center space-x-3">
            <Ban className="w-8 h-8" />
            <span>Prohibited Behavior</span>
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Harassment & Bullying</span>
              </h3>
              <ul className="text-white/70 space-y-2 ml-7">
                <li>• Personal attacks, insults, or name-calling</li>
                <li>• Targeted harassment or intimidation</li>
                <li>• Doxxing (sharing personal information without consent)</li>
                <li>• Stalking or unwanted contact</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Hate Speech & Discrimination</span>
              </h3>
              <ul className="text-white/70 space-y-2 ml-7">
                <li>• Discriminatory language based on race, gender, sexuality, religion, etc.</li>
                <li>• Promotion of hate groups or ideologies</li>
                <li>• Dehumanizing or derogatory statements</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Harmful Content</span>
              </h3>
              <ul className="text-white/70 space-y-2 ml-7">
                <li>• Promotion of self-harm or suicide</li>
                <li>• Graphic violence or disturbing imagery</li>
                <li>• Medical misinformation or dangerous "cures"</li>
                <li>• Spam, scams, or fraudulent content</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold text-lg mb-2 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Inappropriate Content</span>
              </h3>
              <ul className="text-white/70 space-y-2 ml-7">
                <li>• Sexually explicit material</li>
                <li>• Illegal activities or substances</li>
                <li>• Excessive profanity or vulgar language</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reporting System */}
        <div className="bg-blue-500/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-blue-500/30">
          <h2 className="text-3xl font-bold text-blue-400 mb-6 flex items-center space-x-3">
            <Flag className="w-8 h-8" />
            <span>Reporting Violations</span>
          </h2>

          <div className="space-y-4 text-white/80">
            <p>
              If you witness behavior that violates our guidelines, please report it immediately. 
              All reports are reviewed by our moderation team within 24 hours.
            </p>

            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">How to Report:</h3>
              <ol className="space-y-2 ml-4">
                <li>1. Click the <Flag className="w-4 h-4 inline text-red-400" /> icon on any post or comment</li>
                <li>2. Select the violation type</li>
                <li>3. Provide additional context (optional)</li>
                <li>4. Submit your report</li>
              </ol>
            </div>

            <p className="text-sm text-white/60">
              <strong>Anonymous Reporting:</strong> All reports are anonymous by default. 
              The reported user will not know who filed the report.
            </p>
          </div>
        </div>

        {/* Consequences */}
        <div className="bg-cyan-400/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-cyan-400/30">
          <h2 className="text-3xl font-bold text-cyan-300 mb-6 flex items-center space-x-3">
            <Users className="w-8 h-8" />
            <span>Enforcement</span>
          </h2>

          <div className="space-y-4 text-white/80">
            <p>
              Violations of our Community Guidelines will result in the following actions, 
              depending on severity:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-4 border border-cyan-400/20">
                <h3 className="text-cyan-300 font-semibold mb-2">Warning</h3>
                <p className="text-sm text-white/70">
                  First-time minor violations receive a written warning and content removal.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
                <h3 className="text-orange-400 font-semibold mb-2">Temporary Ban</h3>
                <p className="text-sm text-white/70">
                  Repeated or moderate violations result in 7-30 day suspension.
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-red-500/20">
                <h3 className="text-red-400 font-semibold mb-2">Permanent Ban</h3>
                <p className="text-sm text-white/70">
                  Severe violations or pattern of abuse lead to permanent account removal.
                </p>
              </div>
            </div>

            <p className="text-sm text-white/60 mt-4">
              <strong>Appeals:</strong> You can appeal any moderation decision by contacting 
              support@Serenity AI.com within 30 days.
            </p>
          </div>
        </div>

        {/* Moderator Role */}
        <div className="bg-green-500/10 backdrop-blur-md rounded-2xl p-8 border border-green-500/30">
          <h2 className="text-3xl font-bold text-green-400 mb-6">Our Moderation Team</h2>
          
          <div className="space-y-4 text-white/80">
            <p>
              Our volunteer moderators are community members trained to enforce guidelines 
              with fairness and compassion. They:
            </p>

            <ul className="space-y-2 ml-6">
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Review all reports within 24 hours</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Make decisions based on context, not just keywords</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Provide educational feedback to first-time violators</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400">✓</span>
                <span>Escalate serious threats to appropriate authorities</span>
              </li>
            </ul>

            <p className="text-sm text-white/60 mt-4">
              Interested in becoming a moderator? Email volunteer@Serenity AI.com
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm mt-12">
          <p>Last updated: November 16, 2026</p>
          <p className="mt-2">
            By using Serenity AI, you agree to follow these Community Guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunityGuidelines;
