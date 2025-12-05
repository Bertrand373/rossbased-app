// src/constants/triggerConstants.js
// UNIFIED TRIGGER SYSTEM - Single source of truth
// Used by: UrgeToolkit, Calendar, PatternLearningService, StatsAnalyticsUtils
// 
// IMPORTANT: All trigger IDs use underscore_case for consistency
// These IDs are stored in the database - do NOT change existing IDs

/**
 * Master trigger list
 * - id: Unique identifier stored in database (underscore_case)
 * - label: Human-readable display text
 * - icon: Font Awesome icon name (for UrgeToolkit)
 * - level: Experience level gating (null = all levels)
 *   - 'intermediate' = shown for intermediate and advanced users
 *   - 'advanced' = shown only for advanced users
 */
export const TRIGGERS = [
  // Core triggers (all experience levels)
  { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: 'FaBrain', level: null },
  { id: 'explicit_content', label: 'Explicit Content', icon: 'FaExclamationTriangle', level: null },
  { id: 'stress', label: 'Stress', icon: 'FaClock', level: null },
  { id: 'boredom', label: 'Boredom', icon: 'FaMeh', level: null },
  { id: 'loneliness', label: 'Loneliness', icon: 'FaHeart', level: null },
  { id: 'social_media', label: 'Social Media', icon: 'FaMobile', level: null },
  { id: 'relationship', label: 'Relationship', icon: 'FaUserFriends', level: null },
  { id: 'home_alone', label: 'Home Alone', icon: 'FaHome', level: null },
  { id: 'substances', label: 'Substances', icon: 'FaWineGlass', level: null },
  { id: 'sleep_deprived', label: 'Sleep Deprived', icon: 'FaBed', level: null },
  
  // Intermediate+ triggers (30+ days)
  { id: 'energy_overflow', label: 'Energy Overflow', icon: 'FaFire', level: 'intermediate' },
  { id: 'flatline', label: 'Flatline', icon: 'FaBatteryEmpty', level: 'intermediate' },
  
  // Advanced triggers (180+ days)
  { id: 'social_pressure', label: 'Social Pressure', icon: 'FaUsers', level: 'advanced' },
  
  // Catch-all (always last)
  { id: 'other', label: 'Other', icon: 'FaBolt', level: null }
];

/**
 * Get human-readable label for a trigger ID
 * Used by AI services and display components
 * 
 * @param {string} triggerId - The trigger ID from database
 * @returns {string} Human-readable label or formatted ID if not found
 */
export const getTriggerLabel = (triggerId) => {
  if (!triggerId) return 'Unknown';
  
  const trigger = TRIGGERS.find(t => t.id === triggerId);
  if (trigger) return trigger.label;
  
  // Fallback: Convert snake_case to Title Case
  return triggerId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get trigger by ID
 * 
 * @param {string} triggerId - The trigger ID
 * @returns {Object|null} Trigger object or null
 */
export const getTriggerById = (triggerId) => {
  return TRIGGERS.find(t => t.id === triggerId) || null;
};

/**
 * Get triggers filtered by experience level
 * Used by UrgeToolkit to show appropriate options
 * 
 * @param {string} experienceLevel - 'beginner', 'intermediate', or 'advanced'
 * @returns {Array} Filtered trigger list
 */
export const getTriggersByLevel = (experienceLevel) => {
  return TRIGGERS.filter(trigger => {
    // No level restriction - show to everyone
    if (!trigger.level) return true;
    
    // Intermediate triggers - show for intermediate and advanced
    if (trigger.level === 'intermediate') {
      return experienceLevel === 'intermediate' || experienceLevel === 'advanced';
    }
    
    // Advanced triggers - show only for advanced
    if (trigger.level === 'advanced') {
      return experienceLevel === 'advanced';
    }
    
    return true;
  });
};

/**
 * Get all triggers (for Calendar which shows all options)
 * 
 * @returns {Array} All triggers
 */
export const getAllTriggers = () => {
  return TRIGGERS;
};

/**
 * Get trigger IDs only (for validation)
 * 
 * @returns {Array<string>} Array of trigger IDs
 */
export const getTriggerIds = () => {
  return TRIGGERS.map(t => t.id);
};

/**
 * Validate if a trigger ID is valid
 * 
 * @param {string} triggerId - The trigger ID to validate
 * @returns {boolean} True if valid
 */
export const isValidTrigger = (triggerId) => {
  return TRIGGERS.some(t => t.id === triggerId);
};

/**
 * Legacy ID mapping for backward compatibility
 * Maps old IDs (from UrgeToolkit) to new unified IDs
 * Used during data migration or when processing old data
 */
export const LEGACY_TRIGGER_MAP = {
  'thoughts': 'lustful_thoughts',
  'content': 'explicit_content',
  'stress': 'stress', // Same
  'boredom': 'boredom', // Same
  'loneliness': 'loneliness', // Same
  'energy-overflow': 'energy_overflow',
  'flatline': 'flatline', // Same
  'social-pressure': 'social_pressure',
  'other': 'other', // Same
  // Calendar IDs (already correct format)
  'lustful_thoughts': 'lustful_thoughts',
  'explicit_content': 'explicit_content',
  'social_media': 'social_media',
  'relationship': 'relationship',
  'home_alone': 'home_alone',
  'alcohol_substances': 'substances', // Renamed
  'sleep_deprivation': 'sleep_deprived' // Renamed
};

/**
 * Normalize a trigger ID (handles legacy IDs)
 * 
 * @param {string} triggerId - Possibly legacy trigger ID
 * @returns {string} Normalized trigger ID
 */
export const normalizeTrigger = (triggerId) => {
  if (!triggerId) return 'other';
  return LEGACY_TRIGGER_MAP[triggerId] || triggerId;
};

export default {
  TRIGGERS,
  getTriggerLabel,
  getTriggerById,
  getTriggersByLevel,
  getAllTriggers,
  getTriggerIds,
  isValidTrigger,
  normalizeTrigger,
  LEGACY_TRIGGER_MAP
};
