// src/services/InterventionService.js
// Tracks AI predictions → User response → Toolkit usage → Outcomes
// Creates feedback loop for ML model to learn what works for each user

const STORAGE_KEY = 'titantrack_interventions';
const OUTCOME_WINDOW_HOURS = 48;

class InterventionService {
  constructor() {
    this.interventions = [];
    this.loaded = false;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  load() {
    if (this.loaded) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.interventions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('InterventionService load error:', error);
      this.interventions = [];
    }
    
    this.loaded = true;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.interventions));
    } catch (error) {
      console.error('InterventionService save error:', error);
    }
  }

  // ============================================================
  // INTERVENTION LIFECYCLE
  // ============================================================

  /**
   * Create intervention when AI alert is shown to user
   * Called from PatternInsightCard when card renders
   */
  createIntervention(prediction) {
    this.load();
    
    const intervention = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      
      // Prediction context
      prediction: {
        riskScore: prediction.riskScore || 0,
        factors: prediction.factors || {},
        patterns: prediction.patterns || {},
        reason: prediction.reason || ''
      },
      
      // User response (updated when they interact)
      response: {
        type: null, // 'struggling' | 'fine' | 'ignored'
        respondedAt: null
      },
      
      // Toolkit session (if they use it)
      session: null,
      
      // Outcome (determined later)
      outcome: {
        status: 'pending',
        windowHours: OUTCOME_WINDOW_HOURS,
        determinedAt: null,
        relapseId: null
      }
    };
    
    this.interventions.push(intervention);
    this.save();
    
    return intervention.id;
  }

  /**
   * Record how user responded to the alert
   * Called from PredictionDisplay buttons
   */
  recordResponse(interventionId, responseType) {
    this.load();
    
    const intervention = this.interventions.find(i => i.id === interventionId);
    if (!intervention) {
      console.warn('Intervention not found:', interventionId);
      return false;
    }
    
    intervention.response = {
      type: responseType, // 'struggling' | 'fine' | 'dismissed'
      respondedAt: new Date().toISOString()
    };
    
    this.save();
    return true;
  }

  /**
   * Start tracking a toolkit session
   * Called when user enters UrgeToolkit from prediction
   */
  startSession(interventionId, tool) {
    this.load();
    
    const intervention = this.interventions.find(i => i.id === interventionId);
    if (!intervention) {
      // Create orphan session tracking (user went to toolkit directly)
      return this.createOrphanSession(tool);
    }
    
    intervention.session = {
      toolUsed: tool,
      startedAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
      duration: null
    };
    
    this.save();
    return interventionId;
  }

  /**
   * Mark toolkit session as completed
   * Called when user finishes a technique
   */
  completeSession(interventionId, duration) {
    this.load();
    
    const intervention = this.interventions.find(i => i.id === interventionId);
    if (!intervention || !intervention.session) {
      console.warn('Session not found for completion:', interventionId);
      return false;
    }
    
    intervention.session.completed = true;
    intervention.session.completedAt = new Date().toISOString();
    intervention.session.duration = duration; // in seconds
    
    this.save();
    return true;
  }

  /**
   * Track session that wasn't triggered by AI alert
   * Still valuable data about toolkit usage
   */
  createOrphanSession(tool) {
    this.load();
    
    const intervention = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      
      prediction: null, // No AI prediction - user initiated
      
      response: {
        type: 'self_initiated',
        respondedAt: new Date().toISOString()
      },
      
      session: {
        toolUsed: tool,
        startedAt: new Date().toISOString(),
        completed: false,
        completedAt: null,
        duration: null
      },
      
      outcome: {
        status: 'pending',
        windowHours: OUTCOME_WINDOW_HOURS,
        determinedAt: null,
        relapseId: null
      }
    };
    
    this.interventions.push(intervention);
    this.save();
    
    return intervention.id;
  }

  // ============================================================
  // OUTCOME DETERMINATION
  // ============================================================

  /**
   * Called when user logs a relapse
   * Marks any pending interventions within window as failed
   */
  onRelapse(relapseDate, relapseId) {
    this.load();
    
    const relapseTime = new Date(relapseDate).getTime();
    let markedCount = 0;
    
    this.interventions.forEach(intervention => {
      if (intervention.outcome.status !== 'pending') return;
      
      const createdTime = new Date(intervention.createdAt).getTime();
      const hoursSince = (relapseTime - createdTime) / (1000 * 60 * 60);
      
      // If intervention was within the outcome window, mark as relapse
      if (hoursSince >= 0 && hoursSince <= OUTCOME_WINDOW_HOURS) {
        intervention.outcome = {
          status: 'relapse',
          windowHours: OUTCOME_WINDOW_HOURS,
          determinedAt: new Date().toISOString(),
          relapseId: relapseId || null,
          hoursUntilRelapse: Math.round(hoursSince)
        };
        markedCount++;
      }
    });
    
    if (markedCount > 0) {
      this.save();
    }
    
    return markedCount;
  }

  /**
   * Check for interventions past their window with no relapse
   * Call this periodically or on app load
   */
  checkSuccessfulInterventions() {
    this.load();
    
    const now = new Date().getTime();
    let markedCount = 0;
    
    this.interventions.forEach(intervention => {
      if (intervention.outcome.status !== 'pending') return;
      
      const createdTime = new Date(intervention.createdAt).getTime();
      const hoursSince = (now - createdTime) / (1000 * 60 * 60);
      
      // If past the window and still pending, mark as success
      if (hoursSince > OUTCOME_WINDOW_HOURS) {
        intervention.outcome = {
          status: 'success',
          windowHours: OUTCOME_WINDOW_HOURS,
          determinedAt: new Date().toISOString(),
          relapseId: null
        };
        markedCount++;
      }
    });
    
    if (markedCount > 0) {
      this.save();
    }
    
    return markedCount;
  }

  // ============================================================
  // ANALYTICS - What works for this user?
  // ============================================================

  /**
   * Calculate effectiveness of each tool for this user
   */
  getToolEffectiveness() {
    this.load();
    this.checkSuccessfulInterventions(); // Update any pending
    
    const toolStats = {};
    
    this.interventions.forEach(intervention => {
      if (!intervention.session?.toolUsed) return;
      if (!intervention.session.completed) return; // Only count completed sessions
      if (intervention.outcome.status === 'pending') return;
      
      const tool = intervention.session.toolUsed;
      
      if (!toolStats[tool]) {
        toolStats[tool] = {
          tool,
          totalUses: 0,
          successes: 0,
          relapses: 0,
          avgDuration: 0,
          totalDuration: 0
        };
      }
      
      toolStats[tool].totalUses++;
      
      if (intervention.outcome.status === 'success') {
        toolStats[tool].successes++;
      } else if (intervention.outcome.status === 'relapse') {
        toolStats[tool].relapses++;
      }
      
      if (intervention.session.duration) {
        toolStats[tool].totalDuration += intervention.session.duration;
      }
    });
    
    // Calculate percentages and averages
    Object.values(toolStats).forEach(stat => {
      stat.successRate = stat.totalUses > 0 
        ? Math.round((stat.successes / stat.totalUses) * 100) 
        : 0;
      stat.avgDuration = stat.totalUses > 0 
        ? Math.round(stat.totalDuration / stat.totalUses)
        : 0;
    });
    
    // Sort by success rate
    return Object.values(toolStats)
      .filter(s => s.totalUses >= 2) // Need at least 2 uses for meaningful data
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get the most effective tool for this user
   */
  getMostEffectiveTool() {
    const effectiveness = this.getToolEffectiveness();
    return effectiveness.length > 0 ? effectiveness[0] : null;
  }

  /**
   * Get overall intervention statistics
   */
  getInterventionStats() {
    this.load();
    this.checkSuccessfulInterventions();
    
    const stats = {
      totalAlerts: 0,
      alertsAcknowledged: 0,
      alertsIgnored: 0,
      sessionsStarted: 0,
      sessionsCompleted: 0,
      successfulInterventions: 0,
      failedInterventions: 0,
      pendingInterventions: 0,
      estimatedPrevented: 0,
      acknowledgeRate: 0,
      completionRate: 0,
      successRate: 0
    };
    
    this.interventions.forEach(intervention => {
      // Only count AI-triggered alerts
      if (intervention.prediction) {
        stats.totalAlerts++;
        
        if (intervention.response.type === 'struggling') {
          stats.alertsAcknowledged++;
        } else if (intervention.response.type === 'fine' || intervention.response.type === 'dismissed') {
          stats.alertsIgnored++;
        }
      }
      
      // Session stats
      if (intervention.session) {
        stats.sessionsStarted++;
        if (intervention.session.completed) {
          stats.sessionsCompleted++;
        }
      }
      
      // Outcome stats
      if (intervention.outcome.status === 'success') {
        stats.successfulInterventions++;
      } else if (intervention.outcome.status === 'relapse') {
        stats.failedInterventions++;
      } else {
        stats.pendingInterventions++;
      }
    });
    
    // Calculate rates
    if (stats.totalAlerts > 0) {
      stats.acknowledgeRate = Math.round((stats.alertsAcknowledged / stats.totalAlerts) * 100);
    }
    
    if (stats.sessionsStarted > 0) {
      stats.completionRate = Math.round((stats.sessionsCompleted / stats.sessionsStarted) * 100);
    }
    
    const determined = stats.successfulInterventions + stats.failedInterventions;
    if (determined > 0) {
      stats.successRate = Math.round((stats.successfulInterventions / determined) * 100);
      stats.estimatedPrevented = stats.successfulInterventions; // Conservative estimate
    }
    
    return stats;
  }

  /**
   * Get effectiveness when user responds vs ignores
   */
  getResponseEffectiveness() {
    this.load();
    this.checkSuccessfulInterventions();
    
    const responded = { total: 0, success: 0, relapse: 0 };
    const ignored = { total: 0, success: 0, relapse: 0 };
    
    this.interventions.forEach(intervention => {
      if (!intervention.prediction) return; // Skip non-AI interventions
      if (intervention.outcome.status === 'pending') return;
      
      const bucket = intervention.response.type === 'struggling' ? responded : ignored;
      bucket.total++;
      
      if (intervention.outcome.status === 'success') {
        bucket.success++;
      } else if (intervention.outcome.status === 'relapse') {
        bucket.relapse++;
      }
    });
    
    return {
      responded: {
        ...responded,
        successRate: responded.total > 0 ? Math.round((responded.success / responded.total) * 100) : null
      },
      ignored: {
        ...ignored,
        successRate: ignored.total > 0 ? Math.round((ignored.success / ignored.total) * 100) : null
      }
    };
  }

  /**
   * Get data for ML model training
   * Returns intervention outcomes as training data
   */
  getTrainingData() {
    this.load();
    
    return this.interventions
      .filter(i => i.prediction && i.outcome.status !== 'pending')
      .map(i => ({
        // Input features
        riskScore: i.prediction.riskScore,
        factors: i.prediction.factors,
        responded: i.response.type === 'struggling',
        usedToolkit: i.session?.completed || false,
        toolUsed: i.session?.toolUsed || null,
        sessionDuration: i.session?.duration || 0,
        
        // Output label
        outcome: i.outcome.status, // 'success' or 'relapse'
        hoursUntilOutcome: i.outcome.hoursUntilRelapse || OUTCOME_WINDOW_HOURS
      }));
  }

  // ============================================================
  // CURRENT STATE
  // ============================================================

  /**
   * Get the most recent pending intervention (for continuing sessions)
   */
  getCurrentIntervention() {
    this.load();
    
    const pending = this.interventions
      .filter(i => i.outcome.status === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return pending[0] || null;
  }

  /**
   * Get intervention by ID
   */
  getIntervention(id) {
    this.load();
    return this.interventions.find(i => i.id === id) || null;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  generateId() {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all intervention data (for reset)
   */
  clearAll() {
    this.interventions = [];
    this.save();
  }

  /**
   * Get raw data for debugging
   */
  getAllInterventions() {
    this.load();
    return [...this.interventions];
  }
}

// Singleton instance
const interventionService = new InterventionService();

export default interventionService;