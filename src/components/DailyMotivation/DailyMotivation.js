// components/DailyMotivation/DailyMotivation.js - UPDATED: Date moved inside quote container with proper spacing
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './DailyMotivation.css';

// Icons
import { FaShare, FaArchive, FaLock, FaBookmark, FaPen, FaQuoteLeft, FaQuoteRight } from 'react-icons/fa';

const DailyMotivation = ({ userData, isPremium, updateUserData }) => {
  const [showArchive, setShowArchive] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAuthor, setSubmissionAuthor] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  
  // Mock quotes data
  const quotes = [
    {
      id: 1,
      text: "The man who conquers himself is greater than one who conquers a thousand men in battle.",
      author: "Buddha",
      date: format(new Date(), 'yyyy-MM-dd'),
      likes: 87,
      source: "Spiritual",
      isCurrent: true
    },
    {
      id: 2,
      text: "Discipline is choosing between what you want now and what you want most.",
      author: "Abraham Lincoln",
      date: format(new Date(new Date().setDate(new Date().getDate() - 1)), 'yyyy-MM-dd'),
      likes: 76,
      source: "Motivational",
      isCurrent: false
    },
    {
      id: 3,
      text: "Your future self is watching you right now through memories.",
      author: "Universal Man",
      date: format(new Date(new Date().setDate(new Date().getDate() - 2)), 'yyyy-MM-dd'),
      likes: 92,
      source: "SR Community",
      isCurrent: false
    },
    {
      id: 4,
      text: "A man's worth is measured by how he handles his primal desires.",
      author: "Seneca",
      date: format(new Date(new Date().setDate(new Date().getDate() - 3)), 'yyyy-MM-dd'),
      likes: 65,
      source: "Stoic",
      isCurrent: false
    },
    {
      id: 5,
      text: "Energy and persistence conquer all things.",
      author: "Benjamin Franklin",
      date: format(new Date(new Date().setDate(new Date().getDate() - 4)), 'yyyy-MM-dd'),
      likes: 71,
      source: "Historical",
      isCurrent: false
    }
  ];
  
  // Get current quote
  const currentQuote = quotes.find(q => q.isCurrent);
  
  // Journal prompts based on current quote
  const journalPrompts = [
    "How can you apply today's quote to your semen retention journey?",
    "What specific actions can you take today to embody this wisdom?",
    "Reflect on a time when this principle helped you overcome an urge",
    "How does this quote relate to the benefits you've experienced?"
  ];
  
  // Random journal prompt
  const journalPrompt = journalPrompts[Math.floor(Math.random() * journalPrompts.length)];
  
  // Handle quote submission
  const handleSubmitQuote = (e) => {
    e.preventDefault();
    
    if (!submissionText || !submissionAuthor) {
      toast.error('Please fill out both the quote and author fields');
      return;
    }
    
    // In a real app, this would send the submission to a backend
    toast.success('Quote submitted for consideration!');
    setShowSubmitModal(false);
    setSubmissionText('');
    setSubmissionAuthor('');
  };
  
  // Handle quote sharing
  const handleShareQuote = () => {
    if (!isPremium) {
      toast.error('Quote sharing is a premium feature');
      return;
    }
    
    // In a real app, this would open share options
    toast.success('Share options opened!');
  };
  
  // Handle journal modal
  const handleJournalPrompt = () => {
    if (!isPremium) {
      toast.error('Journal prompts are a premium feature');
      return;
    }
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[todayStr];
    
    // Pre-fill with existing note or empty
    setCurrentNote(existingNote || '');
    setShowNoteModal(true);
  };

  // Save journal note
  const saveNote = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [todayStr]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowNoteModal(false);
    toast.success('Journal entry saved!');
  };

  // Toggle like on a quote
  const handleLikeQuote = (quoteId) => {
    if (!isPremium && !currentQuote.isCurrent) {
      toast.error('Liking past quotes is a premium feature');
      return;
    }
    
    toast.success('Quote liked!');
  };

  return (
    <div className="daily-motivation-container">
      <div className="motivation-header">
        <div className="motivation-header-spacer"></div>
        <h2>Daily Motivation</h2>
        <div className="motivation-actions">
          <button 
            className={`action-btn ${!isPremium ? 'premium-locked' : ''}`}
            onClick={() => setShowArchive(!showArchive)}
            disabled={!isPremium}
          >
            {!isPremium && <FaLock className="lock-icon-small" />}
            <FaArchive />
            <span>Quote Archive</span>
          </button>
          
          <button 
            className={`action-btn ${!isPremium ? 'premium-locked' : ''}`}
            onClick={() => setShowSubmitModal(true)}
            disabled={!isPremium}
          >
            {!isPremium && <FaLock className="lock-icon-small" />}
            <FaPen />
            <span>Submit Quote</span>
          </button>
        </div>
      </div>
      
      {!showArchive ? (
        <div className="current-quote-container">
          <div className="quote-card">
            {/* MOVED: Date now inside the quote card at the top, like tracker */}
            <div className="quote-date">Today, {format(new Date(), 'MMMM d, yyyy')}</div>
            
            <div className="quote-content">
              <FaQuoteLeft className="quote-icon left" />
              <p className="quote-text">{currentQuote.text}</p>
              <FaQuoteRight className="quote-icon right" />
            </div>
            
            <div className="quote-author">— {currentQuote.author}</div>
            
            <div className="quote-meta">
              <div className="quote-source">{currentQuote.source}</div>
              <div className="quote-likes">{currentQuote.likes} users found this helpful</div>
            </div>
            
            <div className="quote-actions">
              <button 
                className="quote-action-btn like-btn"
                onClick={() => handleLikeQuote(currentQuote.id)}
              >
                <FaBookmark />
                <span>Like</span>
              </button>
              
              <button 
                className={`quote-action-btn share-btn ${!isPremium ? 'premium-locked' : ''}`}
                onClick={handleShareQuote}
                disabled={!isPremium}
              >
                {!isPremium && <FaLock className="lock-icon-small" />}
                <FaShare />
                <span>Share</span>
              </button>
            </div>
          </div>
          
          <div className="journal-prompt-section">
            <h3>Today's Journal Prompt</h3>
            <div className="journal-prompt">
              <p>{journalPrompt}</p>
            </div>
            
            <button 
              className={`btn btn-primary prompt-btn ${!isPremium ? 'premium-locked' : ''}`}
              disabled={!isPremium}
              onClick={handleJournalPrompt}
            >
              {!isPremium && <FaLock className="lock-icon-small" />}
              Answer in Journal
            </button>
          </div>
          
          {!isPremium && (
            <div className="premium-teaser">
              <h3>Unlock Premium Features</h3>
              <ul className="premium-features-list">
                <li>Access to quote archive (30 days)</li>
                <li>Submit your own quotes</li>
                <li>Share quotes to social media</li>
                <li>Personalized journal prompts</li>
              </ul>
              <button className="btn btn-primary">Upgrade to Premium</button>
            </div>
          )}
        </div>
      ) : (
        <div className="quote-archive">
          <div className="archive-header">
            <h3>Quote Archive</h3>
            <button 
              className="back-btn"
              onClick={() => setShowArchive(false)}
            >
              Back to Today's Quote
            </button>
          </div>
          
          <div className="archive-list">
            {quotes.filter(q => !q.isCurrent).map(quote => (
              <div key={quote.id} className="archive-quote-card">
                <div className="archive-quote-date">
                  {format(new Date(quote.date), 'MMMM d, yyyy')}
                </div>
                
                <div className="archive-quote-content">
                  <p className="archive-quote-text">"{quote.text}"</p>
                  <div className="archive-quote-author">— {quote.author}</div>
                </div>
                
                <div className="archive-quote-meta">
                  <div className="archive-quote-source">{quote.source}</div>
                  <div className="archive-quote-likes">{quote.likes} likes</div>
                </div>
                
                <div className="archive-quote-actions">
                  <button 
                    className="quote-action-btn like-btn"
                    onClick={() => handleLikeQuote(quote.id)}
                  >
                    <FaBookmark />
                    <span>Like</span>
                  </button>
                  
                  <button 
                    className="quote-action-btn share-btn"
                    onClick={handleShareQuote}
                  >
                    <FaShare />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Journal Note Modal - Same as Tracker */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Journal Entry</h2>
            <p>Record your thoughts about today's quote and your journey:</p>
            
            <div className="form-group">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows="6"
                placeholder={`How does today's quote apply to your journey? What specific actions can you take?`}
              ></textarea>
            </div>
            
            <div className="form-actions">
              <button onClick={saveNote} className="action-btn">Save Entry</button>
              <button onClick={() => setShowNoteModal(false)} className="action-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Submit Quote Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Submit a Quote</h3>
            <p>Share your favorite quote to inspire others on their journey</p>
            
            <form onSubmit={handleSubmitQuote}>
              <div className="form-group">
                <label htmlFor="quoteText">Quote Text</label>
                <textarea
                  id="quoteText"
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter the quote text"
                  rows="4"
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label htmlFor="quoteAuthor">Author</label>
                <input
                  type="text"
                  id="quoteAuthor"
                  value={submissionAuthor}
                  onChange={(e) => setSubmissionAuthor(e.target.value)}
                  placeholder="Enter the author's name"
                  required
                />
              </div>
              
              <div className="submission-note">
                <p>Note: All submissions are moderated before being added to the quote collection</p>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Submit Quote</button>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyMotivation;