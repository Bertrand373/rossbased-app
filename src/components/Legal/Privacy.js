// src/components/Legal/Privacy.js
// TitanTrack Privacy Policy — clean, readable, premium
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

const Privacy = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back">← Back</Link>
        
        <div className="legal-header">
          <img src="/tt-icon-white.png" alt="" className="legal-icon" />
          <h1>Privacy Policy</h1>
          <p className="legal-effective">Effective February 22, 2026</p>
        </div>

        <div className="legal-content">
          <section>
            <h2>What We Collect</h2>
            <p>
              TitanTrack collects the minimum data necessary to deliver a personalized tracking experience. This includes your email address and username at signup, benefit tracking data you manually log (energy, focus, confidence, aura, sleep, workout ratings), streak history and check-in dates, and AI chat messages exchanged with The Oracle.
            </p>
            <p>
              If you authenticate via Google or Discord, we receive your basic profile information (name, email, avatar) from those services. We never receive or store your passwords from third-party providers.
            </p>
            <p>
              If you subscribe to Premium, payment processing is handled entirely by Stripe. We store your Stripe customer ID for subscription management but never see, store, or have access to your credit card number.
            </p>
          </section>

          <section>
            <h2>How We Use It</h2>
            <p>
              Your tracking data powers personalized features — benefit trend charts, pattern analysis, and The Oracle's contextual guidance. Our TensorFlow.js prediction models train locally on your device using your data. The trained model parameters are yours alone.
            </p>
            <p>
              We use anonymized, aggregated patterns (never individual data) to improve the prediction system for all users. This aggregate data contains no personally identifiable information.
            </p>
            <p>
              We use your email to send transactional messages (password resets, subscription confirmations) and occasional product updates. You can unsubscribe from non-essential emails at any time.
            </p>
          </section>

          <section>
            <h2>What We Never Do</h2>
            <p>
              We never sell your personal data to anyone. We never share your individual tracking data with third parties. We never use your data for advertising. We never train external AI models on your personal conversations or tracking history.
            </p>
          </section>

          <section>
            <h2>Data Storage &amp; Security</h2>
            <p>
              Your data is stored in MongoDB Atlas with encryption at rest and in transit. Our servers run on Render with HTTPS enforced on all connections. Authentication uses JWT tokens with industry-standard expiration policies.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>
              You can export all your data at any time from your Profile settings. You can delete your account and all associated data permanently — this action is irreversible and removes everything from our servers. You can update or correct your personal information through the app at any time.
            </p>
          </section>

          <section>
            <h2>Analytics</h2>
            <p>
              We use Mixpanel for basic product analytics (page views, feature usage) to improve the app experience. You can opt out of analytics tracking from your Profile privacy settings. We do not use analytics data for advertising or share it with third parties.
            </p>
          </section>

          <section>
            <h2>Third-Party Services</h2>
            <p>
              TitanTrack integrates with Stripe (payments), Google (authentication), Discord (authentication and community features), Firebase (push notifications), and Anthropic (AI chat via Claude). Each service processes data under their own privacy policies. We share only the minimum data required for each integration to function.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update this policy as the product evolves. Material changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about your data or this policy — reach out at <a href="mailto:titantrackapp@gmail.com">titantrackapp@gmail.com</a>.
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

export default Privacy;
