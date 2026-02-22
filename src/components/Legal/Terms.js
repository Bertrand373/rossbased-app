// src/components/Legal/Terms.js
// TitanTrack Terms of Service — clear, protective, not corporate bloat
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const Terms = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">← Back</Link>
        
        <div className="legal-header">
          <img src="/tt-icon-white.png" alt="" className="legal-icon" />
          <h1>Terms of Service</h1>
          <p className="legal-effective">Effective February 22, 2026</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>Acceptance</h2>
            <p>
              By creating an account or using TitanTrack, you agree to these terms. If you don't agree, don't use the app. We reserve the right to update these terms — continued use after changes means you accept them.
            </p>
          </section>

          <section>
            <h2>What TitanTrack Is (and Isn't)</h2>
            <p>
              TitanTrack is a personal tracking and analytics tool for semen retention practitioners. It provides data visualization, pattern recognition, and AI-powered insights based on your self-reported data.
            </p>
            <p>
              TitanTrack is not medical, psychological, or therapeutic advice. Nothing in the app — including Oracle responses, benefit analytics, prediction scores, or subliminal audio — should be interpreted as a substitute for professional medical or mental health guidance. If you're experiencing health issues, consult a qualified professional.
            </p>
          </section>

          <section>
            <h2>Your Account</h2>
            <p>
              You're responsible for maintaining the security of your account credentials. One account per person. You must be at least 18 years old to use TitanTrack. We reserve the right to suspend or terminate accounts that violate these terms, abuse the platform, or engage in fraudulent activity.
            </p>
          </section>

          <section>
            <h2>Subscriptions &amp; Billing</h2>
            <p>
              TitanTrack offers a free tier with limited features and a Premium subscription with full access. Premium subscriptions are billed monthly ($8/month) or annually ($62/year) through Stripe. New subscribers receive a 7-day free trial — your card is charged when the trial ends unless you cancel before that.
            </p>
            <p>
              Subscriptions auto-renew at the end of each billing period. You can cancel anytime from your Profile or through Stripe's billing portal. Cancellation takes effect at the end of your current billing period — you retain access until then.
            </p>
          </section>

          <section>
            <h2>Refunds</h2>
            <p>
              Because you have full access to cancel before being charged (7-day trial) and can cancel anytime after, we generally do not offer refunds for partial billing periods. If you believe you were charged in error or have extenuating circumstances, contact us and we'll handle it fairly.
            </p>
          </section>

          <section>
            <h2>Your Data</h2>
            <p>
              You own your data. The tracking entries, journal notes, and personal information you provide belong to you. You can export or delete your data at any time. By using TitanTrack, you grant us a license to process your data solely to provide and improve the service.
            </p>
            <p>
              See our <Link to="/privacy">Privacy Policy</Link> for full details on data collection, use, and protection.
            </p>
          </section>

          <section>
            <h2>AI Features</h2>
            <p>
              The Oracle (AI chat) and prediction features are powered by machine learning models. These provide estimates, patterns, and conversational guidance — not guarantees or professional advice. AI-generated content may be inaccurate. Use your own judgment.
            </p>
          </section>

          <section>
            <h2>Intellectual Property</h2>
            <p>
              TitanTrack, its design, code, branding, and content (including Based30 audio) are owned by TitanTrack and protected by applicable intellectual property laws. You may not copy, redistribute, reverse-engineer, or commercially exploit any part of the application without written permission.
            </p>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <p>
              TitanTrack is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the app, including but not limited to decisions made based on tracking data, AI predictions, or Oracle guidance. Our total liability is limited to the amount you've paid us in the 12 months preceding any claim.
            </p>
          </section>

          <section>
            <h2>Governing Law</h2>
            <p>
              These terms are governed by the laws of the State of Georgia, United States. Any disputes will be resolved in the courts of Fulton County, Georgia.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms — reach out at <a href="mailto:titantrackapp@gmail.com">titantrackapp@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="legal-footer-line">
          <p>© 2026 TitanTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
