// src/components/PredictionDisplay/PredictionDisplay.js
// Full screen modal matching Tracker/Calendar modal aesthetic

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
      if (location.state?.prediction) {
        setPrediction(location.state.prediction);
        setIsLoading(false);
        return;
      }

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
      <div className="prediction-overlay">
        <div className="prediction-modal">
          <p className="prediction-loading">Analyzing patterns...</p>
        </div>
      </div>
    );
  }

  const riskScore = prediction?.riskScore || 0;
  const riskInfo = getRiskInfo(riskScore);
  const patterns = prediction?.patterns;
  const hasPatterns = patterns?.streak?.isHighRiskDay || 
                      patterns?.time?.isHighRiskTime || 
                      patterns?.benefits?.hasSignificantDrop || 
                      prediction?.factors?.inPurgePhase;

  return (
    <div className="prediction-overlay">
      <div className="prediction-modal">
        
        {/* Header */}
        <div className="prediction-header">
          <p className="prediction-label">Pattern Analysis</p>
          <div className="prediction-score-row">
            <span className="prediction-score">{riskScore}</span>
            <span className="prediction-percent">%</span>
          </div>
          <p className="prediction-level">{riskInfo.label} Risk</p>
        </div>

        {/* Pattern insights - only for elevated risk */}
        {riskScore >= 50 && hasPatterns && (
          <div className="prediction-insights">
            
            <p className="insight-section-label">Why this alert</p>
            
            {patterns?.streak?.isHighRiskDay && (
              <div className="insight-block">
                <p className="insight-title">Day {patterns.streak.currentDay}</p>
                <p className="insight-detail">
                  You've relapsed {patterns.streak.relapsesInRange} of {patterns.streak.totalRelapses} times between days {patterns.streak.rangeDays[0]}-{patterns.streak.rangeDays[1]}
                </p>
              </div>
            )}
            
            {patterns?.time?.isHighRiskTime && (
              <div className="insight-block">
                <p className="insight-title">Evening hours</p>
                <p className="insight-detail">
                  {patterns.time.eveningPercentage}% of your relapses happened after 8pm
                </p>
              </div>
            )}
            
            {patterns?.benefits?.hasSignificantDrop && patterns.benefits.drops.map((drop, i) => (
              <div className="insight-block" key={i}>
                <p className="insight-title">{drop.metric} dropped</p>
                <p className="insight-detail">
                  From {drop.from} → {drop.to} over the last {patterns.benefits.daysCovered} days
                </p>
              </div>
            ))}

            {prediction?.factors?.inPurgePhase && !patterns?.streak?.isHighRiskDay && (
              <div className="insight-block">
                <p className="insight-title">Purge phase</p>
                <p className="insight-detail">
                  Days 15-45 are typically the most challenging
                </p>
              </div>
            )}
          </div>
        )}

        {/* Historical match */}
        {riskScore >= 50 && patterns?.historical && (
          <div className="prediction-insights">
            <p className="insight-section-label">Historical match</p>
            <p className="historical-line">
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
        {riskScore >= 50 && patterns?.suggestions?.length > 0 && (
          <div className="prediction-insights">
            <p className="insight-section-label">Suggested focus</p>
            {patterns.suggestions.map((suggestion, i) => (
              <div className="insight-block" key={i}>
                <p className="insight-title">{suggestion.focus}</p>
                <p className="insight-detail">{suggestion.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Low risk message */}
        {riskScore < 50 && (
          <p className="prediction-message">
            Conditions look stable based on your patterns. Keep up the good work.
          </p>
        )}

        {/* Disclaimer */}
        <p className="prediction-disclaimer">
          This is pattern awareness, not prediction. You may feel fine—this is just a heads up based on your data.
        </p>

        {/* Actions */}
        <div className="prediction-actions">
          {riskScore >= 50 ? (
            <>
              <button className="btn-ghost" onClick={handleDismiss}>
                I'm fine
              </button>
              <button className="btn-primary" onClick={handleStruggling}>
                I'm struggling
              </button>
            </>
          ) : (
            <button className="btn-ghost" onClick={handleDismiss}>
              Back to Dashboard
            </button>
          )}
        </div>

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