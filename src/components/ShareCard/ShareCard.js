// ShareCard.js - TITANTRACK
// Shareable stats card - premium minimal aesthetic
// Pure black/white design, canvas-based image generation

import React, { useState, useRef, useCallback } from 'react';
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

// Percentile tiers based on SR community data
const getPercentile = (streak) => {
  if (streak >= 365) return { percent: 1, label: 'Top 1%' };
  if (streak >= 180) return { percent: 3, label: 'Top 3%' };
  if (streak >= 90) return { percent: 7, label: 'Top 7%' };
  if (streak >= 60) return { percent: 12, label: 'Top 12%' };
  if (streak >= 30) return { percent: 25, label: 'Top 25%' };
  if (streak >= 14) return { percent: 45, label: 'Top 45%' };
  if (streak >= 7) return { percent: 60, label: 'Top 60%' };
  return { percent: 75, label: 'Top 75%' };
};

// Phase names aligned with Emotional Timeline
const getPhaseInfo = (streak) => {
  if (streak <= 14) return { name: 'INITIAL ADAPTATION', range: '1-14' };
  if (streak <= 45) return { name: 'EMOTIONAL PROCESSING', range: '15-45' };
  if (streak <= 90) return { name: 'MENTAL EXPANSION', range: '46-90' };
  if (streak <= 180) return { name: 'INTEGRATION & GROWTH', range: '91-180' };
  return { name: 'MASTERY & PURPOSE', range: '181+' };
};

const ShareCard = ({ userData, isVisible = true }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const streak = userData?.currentStreak || 0;
  const percentile = getPercentile(streak);
  const phase = getPhaseInfo(streak);
  const today = format(new Date(), 'MMM d, yyyy');

  // Generate the card image using Canvas API
  const generateCardImage = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Card dimensions (1080x1350 - Instagram friendly)
      const width = 1080;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;

      // Background - pure black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Day number - large, commanding
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 280px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(streak.toString(), width / 2, height * 0.38);

      // "DAYS" label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '0.3em';
      ctx.fillText('DAYS', width / 2, height * 0.48);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.3, height * 0.55);
      ctx.lineTo(width * 0.7, height * 0.55);
      ctx.stroke();

      // Phase name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(phase.name, width / 2, height * 0.63);

      // Percentile
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(percentile.label + ' of retainers', width / 2, height * 0.70);

      // Footer - date and branding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(today, 80, height - 70);
      
      ctx.textAlign = 'right';
      ctx.fillText('titantrack.app', width - 80, height - 70);

      resolve(canvas);
    });
  }, [streak, phase.name, percentile.label, today]);

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
        setShowPreview(false);
      }, 'image/png', 1.0);
    } catch (err) {
      console.error('Error generating card:', err);
      setIsGenerating(false);
    }
  };

  // Open preview modal
  const openPreview = () => {
    setShowPreview(true);
  };

  // Close preview modal
  const closePreview = () => {
    setShowPreview(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Share Section in Stats */}
      <div className="share-card-section">
        <div className="share-card-header">
          <span>Share Progress</span>
        </div>
        
        <div className="share-card-preview" onClick={openPreview}>
          <div className="share-card-mini">
            <span className="share-mini-day">{streak}</span>
            <span className="share-mini-label">days</span>
            <span className="share-mini-phase">{phase.name}</span>
            <span className="share-mini-percentile">{percentile.label}</span>
          </div>
          <div className="share-card-cta">
            <ShareIcon />
            <span>Tap to share</span>
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
              <div className="share-modal-divider"></div>
              <span className="share-modal-phase">{phase.name}</span>
              <span className="share-modal-percentile">{percentile.label} of retainers</span>
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
