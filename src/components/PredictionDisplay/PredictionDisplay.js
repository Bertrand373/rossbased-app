// src/components/PredictionDisplay/PredictionDisplay.js
// Pure typography design - no icons, no feedback buttons

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PredictionDisplay.css';
import mlPredictionService from '../../services/MLPredictionService';

function PredictionDisplay({ userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrediction();
  }, [userData]);

  const loadPrediction = async () => {
    setIsLoading(true);
    
    try {
      // Check if prediction was passed via navigation state
      if (location.state?.prediction) {
        setPrediction(location.state.prediction);
        setIsLoading(false);
        return;
      }

      // Otherwise, get a fresh prediction
      if (!userData?.benefitTracking?.length) {
        setPrediction({ riskScore: 0, reason: 'No data available' });
        setIsLoading(false);
        return;
      }

      await mlPredictionService.initialize();
      const result = await mlPredictionService.predict(userData);
      setPrediction(result);
    } catch (error) {
      console.error('Prediction error:', error);
      setPrediction({ riskScore: 0, reason: 'Unable to analyze patterns' });
    }
    
    setIsLoading(false);
  };

  const handleStruggling = () => {
    navigate('/urge-toolkit', { 
      state: { 
        fromPrediction: true,
        riskScore: prediction?.riskScore,
        suggestedTools: prediction?.patterns?.suggestions?.[0]?.tools 
      } 
    });
  };

  const handleDismiss = () => {
    navigate('/');
  };

  const getRiskInfo = (score) => {
    if (score >= 70) return { level: 'high', label: 'High' };
    if (score >= 50) return { level: 'elevated', label: 'Elevated' };
    return { level: 'low', label: 'Low' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="prediction-display">
        <div className="prediction-loading">
          <p className="loading-text">Analyzing patterns...</p>
        </div>
      </div>
    );
  }

  const riskScore = prediction?.riskScore || 0;
  const riskInfo = getRiskInfo(riskScore);
  const patterns = prediction?.patterns;

  return (
    <div className="prediction-display">
      {/* Back button - text only */}
      <button className="prediction-back" onClick={() => navigate('/')}>
        ←
      </button>

      <div className="prediction-content">
        {/* Header label */}
        <p className="prediction-label">Pattern Analysis</p>

        {/* Risk score */}
        <div className="prediction-score-container">
          <span className={`prediction-score ${riskInfo.level}`}>
            {riskScore}
          </span>
          <span className="prediction-percent">%</span>
        </div>

        <p className={`prediction-level ${riskInfo.level}`}>
          {riskInfo.label} Risk
        </p>

        {/* Pattern insights - only show if elevated risk */}
        {riskScore >= 50 && patterns && (
          <div className="pattern-insights">
            
            {/* Why this alert section */}
            {(patterns.streak?.isHighRiskDay || patterns.time?.isHighRiskTime || patterns.benefits?.hasSignificantDrop || prediction?.factors?.inPurgePhase) && (
              <div className="insight-section">
                <p className="insight-header">Why this alert</p>
                
                {/* Streak day pattern */}
                {patterns.streak?.isHighRiskDay && (
                  <div className="insight-item">
                    <p className="insight-title">Day {patterns.streak.currentDay}</p>
                    <p className="insight-detail">
                      You've relapsed {patterns.streak.relapsesInRange} of {patterns.streak.totalRelapses} times 
                      between days {patterns.streak.rangeDays[0]}-{patterns.streak.rangeDays[1]}
                    </p>
                  </div>
                )}
                
                {/* Time pattern */}
                {patterns.time?.isHighRiskTime && (
                  <div className="insight-item">
                    <p className="insight-title">Evening hours</p>
                    <p className="insight-detail">
                      {patterns.time.eveningPercentage}% of your relapses happened after 8pm
                    </p>
                  </div>
                )}
                
                {/* Benefit drops */}
                {patterns.benefits?.hasSignificantDrop && patterns.benefits.drops.map((drop, i) => (
                  <div className="insight-item" key={i}>
                    <p className="insight-title">{drop.metric} dropped</p>
                    <p className="insight-detail">
                      From {drop.from} → {drop.to} over the last {patterns.benefits.daysCovered} days
                    </p>
                  </div>
                ))}

                {/* Purge phase */}
                {prediction?.factors?.inPurgePhase && !patterns.streak?.isHighRiskDay && (
                  <div className="insight-item">
                    <p className="insight-title">Purge phase</p>
                    <p className="insight-detail">
                      Days 15-45 are typically the most challenging
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Historical match */}
            {patterns.historical && (
              <div className="insight-section">
                <p className="insight-header">Historical match</p>
                <p className="historical-text">
                  Similar conditions on Day {patterns.historical.matchDay}
                </p>
                <p className="historical-outcome">
                  {patterns.historical.daysUntilRelapse > 0 
                    ? `Relapsed ${patterns.historical.daysUntilRelapse} days later`
                    : 'Relapsed same day'
                  }
                </p>
              </div>
            )}

            {/* Suggested focus */}
            {patterns.suggestions && patterns.suggestions.length > 0 && (
              <div className="insight-section">
                <p className="insight-header">Suggested focus</p>
                {patterns.suggestions.map((suggestion, i) => (
                  <div className="insight-item" key={i}>
                    <p className="insight-title">{suggestion.focus}</p>
                    <p className="insight-detail">{suggestion.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Low risk message */}
        {riskScore < 50 && (
          <p className="prediction-explanation">
            Conditions look stable based on your patterns. Keep up the good work.
          </p>
        )}

        {/* Disclaimer */}
        <p className="prediction-disclaimer">
          This is pattern awareness, not prediction. You may feel fine—this is just a heads up based on your data.
        </p>

        {/* Action buttons */}
        {riskScore >= 50 && (
          <div className="prediction-actions">
            <button 
              className="prediction-btn primary"
              onClick={handleStruggling}
            >
              I'm struggling
            </button>
            <button 
              className="prediction-btn secondary"
              onClick={handleDismiss}
            >
              I'm fine
            </button>
          </div>
        )}

        {riskScore < 50 && (
          <div className="prediction-actions">
            <button 
              className="prediction-btn secondary"
              onClick={handleDismiss}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Data context */}
        {prediction?.dataContext && (
          <p className="prediction-context">
            Based on {prediction.dataContext.trackingDays} days of data
            {prediction.dataContext.relapseCount > 0 && 
              ` · ${prediction.dataContext.relapseCount} patterns analyzed`
            }
          </p>
        )}
      </div>
    </div>
  );
}

export default PredictionDisplay;