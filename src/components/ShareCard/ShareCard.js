// ShareCard.js - TITANTRACK
// Shareable stats card - premium minimal aesthetic
// Theme-aware design, canvas-based image generation
// Enhanced: benefit scores + milestone detection for viral growth

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import './ShareCard.css';

// Share icon (iOS style)
const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

// Milestone definitions
const MILESTONES = {
  7:   'ONE WEEK',
  14:  'TWO WEEKS',
  30:  'ONE MONTH',
  60:  'TWO MONTHS',
  90:  'NINETY DAYS',
  180: 'SIX MONTHS',
  365: 'ONE YEAR'
};

const ShareCard = ({ userData, isVisible = true }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  
  // Theme detection
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  });
  
  // Watch for theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    };
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['data-theme'] 
    });
    
    return () => observer.disconnect();
  }, []);

  const streak = userData?.currentStreak || 0;
  const today = format(new Date(), 'MMM d, yyyy');

  // Milestone detection
  const milestoneLabel = MILESTONES[streak] || null;
  const isMilestone = !!milestoneLabel;

  // Compute overall benefit score from most recent 7 days of logs
  const benefitScore = useMemo(() => {
    const logs = userData?.benefitTracking;
    if (!logs || logs.length === 0) return null;

    // Get last 7 logs (or fewer)
    const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 7);

    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    let total = 0;
    let count = 0;

    recent.forEach(log => {
      metrics.forEach(m => {
        if (log[m] != null && log[m] > 0) {
          total += log[m];
          count++;
        }
      });
    });

    if (count === 0) return null;
    return Math.round((total / count) * 10) / 10; // One decimal place
  }, [userData?.benefitTracking]);

  // Generate the card image using Canvas API - theme-aware
  const generateCardImage = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Card dimensions (1080x1350 - Instagram friendly)
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;
      
      // Theme-aware colors
      const bgColor = isDarkTheme ? '#000000' : '#ffffff';
      const textColor = isDarkTheme ? '#ffffff' : '#000000';
      const borderColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
      const subtleColor = isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
      const mutedColor = isDarkTheme ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
      const accentColor = isDarkTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Subtle border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Layout shifts based on content
      const hasScore = benefitScore !== null;
      const hasExtra = hasScore || isMilestone;
      const dayY = hasExtra ? height * 0.36 : height * 0.45;

      // Day number - large, commanding, centered
      ctx.fillStyle = textColor;
      ctx.font = '600 320px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(streak.toString(), width / 2, dayY);

      // "DAYS" label
      ctx.fillStyle = subtleColor;
      ctx.font = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      let labelY = dayY + height * 0.13;
      ctx.fillText('DAYS', width / 2, labelY);

      // Milestone label (if applicable)
      if (isMilestone) {
        labelY += 70;
        ctx.fillStyle = accentColor;
        ctx.font = '600 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(milestoneLabel, width / 2, labelY);
      }

      // Benefit score (if available)
      if (hasScore) {
        labelY += 80;
        // Score number
        ctx.fillStyle = textColor;
        ctx.font = '600 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(benefitScore.toFixed(1), width / 2, labelY);
        // Label
        ctx.fillStyle = mutedColor;
        ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('OVERALL SCORE', width / 2, labelY + 40);
      }

      // Footer - date and branding
      ctx.fillStyle = mutedColor;
      ctx.font = '400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(today, 80, height - 70);
      
      ctx.textAlign = 'right';
      ctx.fillText('titantrack.app', width - 80, height - 70);

      resolve(canvas);
    });
  }, [streak, today, isDarkTheme, benefitScore, isMilestone, milestoneLabel]);

  // Handle share action
  const handleShare = async () => {
    setIsGenerating(true);
    
    try {
      const canvas = await generateCardImage();
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }

        // Try native share first (mobile)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], 'titantrack-progress.png', { type: 'image/png' });
          const shareData = { files: [file] };
          
          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              setIsGenerating(false);
              document.body.style.overflow = '';
              setShowPreview(false);
              return;
            } catch (err) {
              // User cancelled or share failed, fall through to download
              if (err.name !== 'AbortError') {
                console.log('Share failed, falling back to download');
              }
            }
          }
        }

        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `titantrack-day-${streak}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsGenerating(false);
        document.body.style.overflow = '';
        setShowPreview(false);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Error generating card:', err);
      setIsGenerating(false);
    }
  };

  // Open preview modal
  const openPreview = () => {
    document.body.style.overflow = 'hidden';
    setShowPreview(true);
  };

  // Close preview modal
  const closePreview = () => {
    document.body.style.overflow = '';
    setShowPreview(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Share Section in Stats */}
      <div className={`share-card-section${isMilestone ? ' share-card-milestone' : ''}`}>
        <div className="share-card-header">
          <span>{isMilestone ? `${milestoneLabel} — Share It` : 'Share Progress'}</span>
        </div>
        
        <div className="share-card-preview" onClick={openPreview}>
          <div className="share-card-mini">
            <span className="share-mini-day">{streak}</span>
            <span className="share-mini-label">days</span>
          </div>
          {benefitScore !== null && (
            <div className="share-mini-score">
              <span className="share-mini-score-value">{benefitScore.toFixed(1)}</span>
              <span className="share-mini-score-label">overall</span>
            </div>
          )}
          <div className="share-card-cta">
            <ShareIcon />
            <span>{isMilestone ? 'Share your milestone' : 'Tap to share'}</span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="share-modal-overlay" onClick={closePreview}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="share-modal-card">
              <span className="share-modal-day">{streak}</span>
              <span className="share-modal-day-label">DAYS</span>
              {isMilestone && (
                <span className="share-modal-milestone">{milestoneLabel}</span>
              )}
              {benefitScore !== null && (
                <div className="share-modal-score">
                  <span className="share-modal-score-value">{benefitScore.toFixed(1)}</span>
                  <span className="share-modal-score-label">OVERALL SCORE</span>
                </div>
              )}
              <div className="share-modal-footer">
                <span className="share-modal-date">{today}</span>
                <span className="share-modal-brand">titantrack.app</span>
              </div>
            </div>
            
            <button 
              className="share-modal-btn" 
              onClick={handleShare}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span className="share-btn-loading"></span>
              ) : (
                <>
                  <ShareIcon />
                  <span>Share</span>
                </>
              )}
            </button>
            
            <button className="share-modal-close" onClick={closePreview}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};

export default ShareCard;
