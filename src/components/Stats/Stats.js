// components/Stats/Stats.js - UPDATED: Enhanced Free User Experience with Energy Intelligence
// ... (keep all existing imports and other code the same)

// ADD: Import the new Energy Intelligence component
import EnergyIntelligenceSection from './EnergyIntelligenceSection';

// REPLACE: The FREE USER CONTENT section in the existing Stats.js file
// Find this section and replace it entirely:

        {/* FREE USER CONTENT - ENHANCED ENERGY INTELLIGENCE */}
        {!isPremium && (
          <div className="free-benefit-preview">
            {/* NEW: Enhanced Energy Intelligence System */}
            <EnergyIntelligenceSection 
              userData={safeUserData}
              onUpgradeClick={handleUpgradeClick}
            />
            
            {/* ENHANCED: Simplified Risk Overview (kept for context) */}
            <div className="quick-risk-overview">
              <div className="quick-risk-card">
                <div className="quick-risk-header">
                  <FaShieldAlt className="risk-overview-icon" />
                  <span>Quick Risk Check</span>
                </div>
                <div className="quick-risk-content">
                  <div className="quick-risk-level">
                    {memoizedInsights.riskAnalysis?.score === 'N/A' ? 'N/A' : `${memoizedInsights.riskAnalysis?.level || 'Low'} Risk`}
                  </div>
                  <div className="quick-risk-description">
                    {memoizedInsights.riskAnalysis?.score === 'N/A' ? 
                      'Track energy for 3+ days to unlock personalized risk assessment with your relapse history.' :
                      'Basic risk level calculated. Energy Intelligence above provides detailed analysis and personal vulnerability insights.'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* ENHANCED: Premium Feature Teaser */}
            <div className="premium-features-teaser">
              <div className="teaser-header">
                <img 
                  src={helmetImage} 
                  alt="Premium Features" 
                  className="teaser-helmet-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="teaser-helmet-fallback" style={{display: 'none'}}>🧠</div>
                <div className="teaser-content">
                  <h4>Complete Retention Mastery</h4>
                  <p>Track 6 metrics, unlock advanced correlations, get predictive analytics, and receive phase-specific optimization strategies.</p>
                </div>
              </div>
              
              <div className="premium-features-grid">
                <div className="premium-feature-item">
                  <FaChartLine className="feature-icon" />
                  <div className="feature-text">
                    <div className="feature-title">Multi-Metric Charts</div>
                    <div className="feature-desc">Energy, Focus, Confidence, Aura, Sleep & Workout tracking</div>
                  </div>
                  <FaLock className="feature-lock" />
                </div>
                
                <div className="premium-feature-item">
                  <FaBrain className="feature-icon" />
                  <div className="feature-text">
                    <div className="feature-title">Advanced AI Insights</div>
                    <div className="feature-desc">Pattern recognition across all metrics with optimization timing</div>
                  </div>
                  <FaLock className="feature-lock" />
                </div>
                
                <div className="premium-feature-item">
                  <FaFire className="feature-icon" />
                  <div className="feature-text">
                    <div className="feature-title">Phase Evolution Analysis</div>
                    <div className="feature-desc">Track how all benefits evolve through retention phases</div>
                  </div>
                  <FaLock className="feature-lock" />
                </div>
                
                <div className="premium-feature-item">
                  <FaRocketAlt className="feature-icon" />
                  <div className="feature-text">
                    <div className="feature-title">Smart Urge Management</div>
                    <div className="feature-desc">Real-time vulnerability assessment with countermeasures</div>
                  </div>
                  <FaLock className="feature-lock" />
                </div>
              </div>
              
              <button 
                className="main-upgrade-btn" 
                onClick={handleUpgradeClick}
                onKeyDown={(e) => e.key === 'Enter' && handleUpgradeClick()}
                tabIndex={0}
              >
                <FaStar />
                Unlock Premium Intelligence
                <span className="upgrade-arrow">→</span>
              </button>
            </div>
          </div>
        )}

// ADD: These CSS additions to your Stats.css or create StatsEnhanced.css

/* Enhanced Free User Experience Styles */
.free-benefit-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

/* Quick Risk Overview */
.quick-risk-overview {
  display: flex;
  justify-content: center;
}

.quick-risk-card {
  background-color: var(--card-background);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 500px;
  width: 100%;
  text-align: center;
  transition: all 0.3s ease;
}

.quick-risk-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.quick-risk-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.risk-overview-icon {
  font-size: 1.25rem;
  color: var(--primary);
}

.quick-risk-level {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: var(--spacing-md);
}

.quick-risk-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Premium Features Teaser */
.premium-features-teaser {
  background: linear-gradient(135deg, var(--card-background) 0%, var(--medium-gray) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.premium-features-teaser::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 221, 0, 0.4), transparent);
}

.teaser-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  text-align: left;
}

.teaser-helmet-icon {
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  animation: teaser-helmet-pulse 2.5s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(255, 221, 0, 0.4));
}

.teaser-helmet-fallback {
  font-size: 3rem;
  color: var(--primary);
  flex-shrink: 0;
  animation: teaser-helmet-pulse 2.5s ease-in-out infinite;
}

@keyframes teaser-helmet-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(0.95);
  }
}

.teaser-content {
  flex: 1;
}

.teaser-content h4 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--spacing-sm) 0;
}

.teaser-content p {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.premium-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.premium-feature-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
  position: relative;
  opacity: 0.8;
}

.premium-feature-item:hover {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 1.5rem;
  color: var(--primary);
  flex-shrink: 0;
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.feature-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.feature-lock {
  font-size: 1rem;
  color: var(--primary);
  flex-shrink: 0;
}

.main-upgrade-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  width: 100%;
  padding: var(--spacing-lg) var(--spacing-xl);
  background-color: var(--primary);
  border: none;
  border-radius: var(--radius-full);
  color: #000000;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  min-height: 56px;
  box-shadow: 0 4px 16px rgba(255, 221, 0, 0.3);
  outline: none;
  position: relative;
  overflow: hidden;
}

.main-upgrade-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.main-upgrade-btn:hover::before {
  left: 100%;
}

.main-upgrade-btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(255, 221, 0, 0.4);
  color: #000000;
}

.main-upgrade-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(255, 221, 0, 0.3);
}

.upgrade-arrow {
  font-size: 1.5rem;
  font-weight: 400;
  transition: transform 0.3s ease;
}

.main-upgrade-btn:hover .upgrade-arrow {
  transform: translateX(4px);
}

/* Mobile Responsiveness for Enhanced Free Experience */
@media (max-width: 768px) {
  .teaser-header {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-lg);
  }

  .teaser-helmet-icon {
    width: 60px;
    height: 60px;
  }

  .teaser-helmet-fallback {
    font-size: 2.5rem;
  }

  .teaser-content h4 {
    font-size: 1.25rem;
  }

  .teaser-content p {
    font-size: 0.875rem;
  }

  .premium-features-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .premium-feature-item {
    padding: var(--spacing-md);
  }

  .feature-icon {
    font-size: 1.25rem;
  }

  .feature-title {
    font-size: 0.9rem;
  }

  .feature-desc {
    font-size: 0.8rem;
  }

  .main-upgrade-btn {
    font-size: 1.125rem;
    padding: var(--spacing-md) var(--spacing-lg);
    min-height: 52px;
  }

  .upgrade-arrow {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .premium-features-teaser {
    padding: var(--spacing-lg);
  }

  .teaser-helmet-icon {
    width: 50px;
    height: 50px;
  }

  .teaser-helmet-fallback {
    font-size: 2rem;
  }

  .teaser-content h4 {
    font-size: 1.125rem;
  }

  .teaser-content p {
    font-size: 0.8rem;
  }

  .premium-feature-item {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .feature-icon {
    font-size: 1.125rem;
  }

  .feature-title {
    font-size: 0.85rem;
  }

  .feature-desc {
    font-size: 0.75rem;
  }

  .main-upgrade-btn {
    font-size: 1rem;
    padding: var(--spacing-sm) var(--spacing-md);
    min-height: 48px;
    gap: var(--spacing-sm);
  }

  .upgrade-arrow {
    font-size: 1.125rem;
  }
}