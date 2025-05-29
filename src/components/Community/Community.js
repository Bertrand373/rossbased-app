// components/Community/Community.js
import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import './Community.css';

// Icons
import { 
  FaUser, 
  FaHeart, 
  FaFireAlt, 
  FaCommentAlt, 
  FaTrophy, 
  FaMedal, 
  FaPaperPlane, 
  FaFilter, 
  FaChevronRight
} from 'react-icons/fa';

const Community = ({ userData }) => {
  const [posts, setPosts] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  
  // Mock community posts
  const mockPosts = [
    {
      id: 1,
      user: "KingOfSelf",
      streak: 45,
      content: "Day 45: Energy levels through the roof! Crushed my deadlift PR today and still had energy for a 5k run. Anyone else experiencing similar physical benefits?",
      timestamp: subDays(new Date(), 0).getTime(),
      likes: 24,
      comments: 8,
      type: "update"
    },
    {
      id: 2,
      user: "MindMonk",
      streak: 90,
      content: "Reached 90 days! The mental clarity is unlike anything I've experienced before. Stay strong brothers, it's worth the journey.",
      timestamp: subDays(new Date(), 1).getTime(),
      likes: 56,
      comments: 14,
      type: "milestone"
    },
    {
      id: 3,
      user: "DisciplineDaily",
      streak: 17,
      content: "Anyone have suggestions for urge management when traveling? Finding it harder to maintain my routines on the road.",
      timestamp: subDays(new Date(), 2).getTime(),
      likes: 12,
      comments: 7,
      type: "question"
    },
    {
      id: 4,
      user: "NovaPath",
      streak: 30,
      content: "30 days complete! Noticing improved eye contact and social confidence. How long did it take for you to notice these benefits?",
      timestamp: subDays(new Date(), 3).getTime(),
      likes: 32,
      comments: 9,
      type: "milestone"
    },
    {
      id: 5,
      user: "EnergyAlchemist",
      streak: 21,
      content: "Day 21: The first three weeks are always the hardest. Keeping busy with meditation and gym. Stay strong everyone!",
      timestamp: subDays(new Date(), 4).getTime(),
      likes: 19,
      comments: 5,
      type: "update"
    }
  ];
  
  // Mock challenges
  const mockChallenges = [
    {
      id: 1,
      title: "Cold Shower Challenge",
      description: "Take a cold shower every morning for 7 days",
      duration: "7 days",
      participants: 278,
      isActive: true,
      progress: 4,
      startDate: subDays(new Date(), 4).getTime(),
      endDate: subDays(new Date(), -3).getTime()
    },
    {
      id: 2,
      title: "No Social Media Week",
      description: "Stay off all social media to redirect your energy",
      duration: "7 days",
      participants: 156,
      isActive: false,
      progress: 0,
      startDate: null,
      endDate: null
    },
    {
      id: 3,
      title: "Meditation Master",
      description: "Meditate for at least 10 minutes every day",
      duration: "30 days",
      participants: 194,
      isActive: false,
      progress: 0,
      startDate: null,
      endDate: null
    }
  ];
  
  // Load posts on component mount
  useEffect(() => {
    // In a real app, this would fetch from an API
    setPosts(mockPosts);
    
    // Set active challenge
    const active = mockChallenges.find(challenge => challenge.isActive);
    if (active) {
      setActiveChallenge(active);
    }
  }, []);
  
  // Handle post submission
  const handlePostSubmit = (e) => {
    e.preventDefault();
    
    if (!postContent.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }
    
    // In a real app, this would send the post to a backend
    const newPost = {
      id: Date.now(),
      user: userData.discordUsername || "User",
      streak: userData.currentStreak,
      content: postContent,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      type: "update"
    };
    
    setPosts([newPost, ...posts]);
    setPostContent('');
    toast.success('Post shared with the community!');
  };
  
  // Handle post like
  const handleLikePost = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };
  
  // Handle challenge join
  const handleJoinChallenge = (challengeId) => {
    // In a real app, this would update the user's challenges
    toast.success('You\'ve joined the challenge!');
    setShowChallengeModal(false);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return format(date, 'MMM d');
    }
  };
  
  // Filter posts
  const filteredPosts = filterType === 'all' 
    ? posts 
    : posts.filter(post => post.type === filterType);

  return (
    <div className="community-container">
      <div className="community-header">
        <h2>SR Community</h2>
        <div className="community-filters">
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filterType === 'update' ? 'active' : ''}`}
            onClick={() => setFilterType('update')}
          >
            Updates
          </button>
          <button 
            className={`filter-btn ${filterType === 'milestone' ? 'active' : ''}`}
            onClick={() => setFilterType('milestone')}
          >
            Milestones
          </button>
          <button 
            className={`filter-btn ${filterType === 'question' ? 'active' : ''}`}
            onClick={() => setFilterType('question')}
          >
            Questions
          </button>
        </div>
      </div>
      
      <div className="community-main">
        <div className="community-feed">
          {/* Post Creation */}
          <div className="post-creation">
            <form onSubmit={handlePostSubmit}>
              <div className="post-input-container">
                <div className="user-avatar">
                  <FaUser />
                  <div className="streak-badge">{userData.currentStreak}d</div>
                </div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your journey, ask questions, or celebrate milestones..."
                  maxLength={280}
                  rows={3}
                ></textarea>
              </div>
              <div className="post-actions">
                <div className="character-count">
                  {postContent.length}/280
                </div>
                <button type="submit" className="btn btn-primary">
                  <FaPaperPlane /> Share
                </button>
              </div>
            </form>
          </div>
          
          {/* Posts Feed */}
          <div className="posts-list">
            {filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <div key={post.id} className={`post-card ${post.type === 'milestone' ? 'milestone-post' : ''}`}>
                  <div className="post-header">
                    <div className="post-user-info">
                      <div className="user-avatar">
                        <FaUser />
                        <div className="streak-badge">{post.streak}d</div>
                      </div>
                      <div className="post-user-details">
                        <div className="post-username">{post.user}</div>
                        <div className="post-timestamp">{formatTimestamp(post.timestamp)}</div>
                      </div>
                    </div>
                    {post.type === 'milestone' && (
                      <div className="milestone-badge">
                        <FaTrophy /> Milestone
                      </div>
                    )}
                    {post.type === 'question' && (
                      <div className="question-badge">
                        <FaCommentAlt /> Question
                      </div>
                    )}
                  </div>
                  <div className="post-content">
                    {post.content}
                  </div>
                  <div className="post-footer">
                    <button 
                      className="post-action-btn"
                      onClick={() => handleLikePost(post.id)}
                    >
                      <FaHeart /> {post.likes}
                    </button>
                    <button className="post-action-btn">
                      <FaCommentAlt /> {post.comments}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-feed">
                <p>No posts matching the selected filter</p>
                <button 
                  className="btn btn-outline"
                  onClick={() => setFilterType('all')}
                >
                  View All Posts
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="community-sidebar">
          {/* Active Challenge */}
          {activeChallenge && (
            <div className="active-challenge">
              <h3>Current Challenge</h3>
              <div className="challenge-card">
                <div className="challenge-header">
                  <div className="challenge-title">{activeChallenge.title}</div>
                  <div className="challenge-duration">{activeChallenge.duration}</div>
                </div>
                <div className="challenge-description">
                  {activeChallenge.description}
                </div>
                <div className="challenge-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(activeChallenge.progress / parseInt(activeChallenge.duration)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="progress-details">
                    <span>Day {activeChallenge.progress}/{activeChallenge.duration.split(' ')[0]}</span>
                    <span>{activeChallenge.participants} participants</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Available Challenges */}
          <div className="available-challenges">
            <h3>Join a Challenge</h3>
            <div className="challenges-list">
              {mockChallenges.filter(c => !c.isActive).map(challenge => (
                <div key={challenge.id} className="challenge-item">
                  <div className="challenge-item-info">
                    <div className="challenge-item-title">{challenge.title}</div>
                    <div className="challenge-item-participants">
                      {challenge.participants} participants
                    </div>
                  </div>
                  <button 
                    className="btn btn-outline challenge-join-btn"
                    onClick={() => {
                      setShowChallengeModal(true);
                    }}
                  >
                    <FaChevronRight />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Leaderboard Preview */}
          <div className="leaderboard-preview">
            <h3>Top Streaks</h3>
            <div className="leaderboard-list">
              <div className="leaderboard-item">
                <div className="leaderboard-rank">1</div>
                <div className="leaderboard-user">
                  <FaUser className="leaderboard-avatar" />
                  <span>MindMonk</span>
                </div>
                <div className="leaderboard-streak">
                  <FaFireAlt className="streak-icon" />
                  <span>90 days</span>
                </div>
              </div>
              <div className="leaderboard-item">
                <div className="leaderboard-rank">2</div>
                <div className="leaderboard-user">
                  <FaUser className="leaderboard-avatar" />
                  <span>SilentMaster</span>
                </div>
                <div className="leaderboard-streak">
                  <FaFireAlt className="streak-icon" />
                  <span>75 days</span>
                </div>
              </div>
              <div className="leaderboard-item">
                <div className="leaderboard-rank">3</div>
                <div className="leaderboard-user">
                  <FaUser className="leaderboard-avatar" />
                  <span>KingOfSelf</span>
                </div>
                <div className="leaderboard-streak">
                  <FaFireAlt className="streak-icon" />
                  <span>45 days</span>
                </div>
              </div>
              <div className="leaderboard-item user-rank">
                <div className="leaderboard-rank">#24</div>
                <div className="leaderboard-user">
                  <FaUser className="leaderboard-avatar" />
                  <span>You</span>
                </div>
                <div className="leaderboard-streak">
                  <FaFireAlt className="streak-icon" />
                  <span>{userData.currentStreak} days</span>
                </div>
              </div>
            </div>
            <button className="btn btn-outline view-all-btn">
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
      
      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal-content challenge-modal" onClick={e => e.stopPropagation()}>
            <h3>No Social Media Week</h3>
            <p className="challenge-description">
              Stay off all social media platforms for 7 days to reclaim your time and attention. This helps redirect your energy and reduces dopamine-seeking behavior.
            </p>
            
            <div className="challenge-details">
              <div className="challenge-detail-item">
                <strong>Duration:</strong> 7 days
              </div>
              <div className="challenge-detail-item">
                <strong>Current Participants:</strong> 156 members
              </div>
              <div className="challenge-detail-item">
                <strong>Completion Rate:</strong> 68%
              </div>
            </div>
            
            <div className="challenge-rules">
              <h4>Challenge Rules:</h4>
              <ol>
                <li>No accessing Facebook, Instagram, Twitter, TikTok, or similar platforms</li>
                <li>Reddit is allowed only for r/SemenRetention (limit 15 minutes/day)</li>
                <li>Self-report daily in the Discord challenge channel</li>
                <li>YouTube allowed only for educational content</li>
              </ol>
            </div>
            
            <div className="challenge-benefits">
              <h4>Benefits:</h4>
              <ul>
                <li>Reduced dopamine seeking behavior</li>
                <li>More time for productive activities</li>
                <li>Less comparison with others</li>
                <li>Better focus and attention span</li>
              </ul>
            </div>
            
            <div className="form-actions">
              <button 
                className="btn btn-primary"
                onClick={() => handleJoinChallenge(2)}
              >
                Join Challenge
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => setShowChallengeModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;