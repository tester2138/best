// Single source of truth for all platform metrics
// All pages should reference this file instead of hardcoded numbers

export const siteStats = {
  // Audience metrics
  followers: '1.5M+',
  followersLabel: 'Followers & Subscribers',
  monthlyVisitors: '1M+',
  monthlyVisitorsLabel: 'Monthly Reach',
  
  // Content metrics
  brokersReviewed: '1,800+',
  brokersReviewedLabel: 'Brokers Listed',
  rankingDataPoints: '100+',
  rankingDataPointsLabel: 'Ranking Data Points',
  
  // Engagement metrics
  brokerComparisons: '100K+',
  brokerComparisonsLabel: 'Broker Comparisons',
  highIntentTraffic: '85%',
  highIntentTrafficLabel: 'High-Intent Traffic',
  
  // Update frequency
  updateFrequency: 'Weekly',
  updateFrequencyLabel: 'Data Updates',
  
  // Ad placements
  adPlacements: '15+',
  adPlacementsLabel: 'Ad Placements',
  
  // Team
  teamExperience: '50+',
  teamExperienceLabel: 'Years Combined Experience',
  
  // Trust signals
  trustRating: '4.9',
  trustRatingLabel: 'Average Rating'
} as const

// B2B specific stats for advertise/media kit pages
export const b2bStats = {
  audienceReach: '1M+',
  audienceReachLabel: 'Forex Audience Reach',
  premiumPlacements: 'Premium',
  premiumPlacementsLabel: 'Ad Placements',
  highIntentTraffic: '85%',
  highIntentLabel: 'High-Intent Comparison Traffic',
  globalReach: '190+',
  globalReachLabel: 'Countries Reached'
} as const

// Hero section stats
export const heroStats = {
  stat1: { value: '1,800+', label: 'Brokers Listed' },
  stat2: { value: '1.5M+', label: 'Followers' },
  stat3: { value: '100+', label: 'Ranking Data' }
} as const

// B2B section stats for homepage
export const b2bSectionStats = {
  stat1: { value: '1M+', label: 'Monthly Reach' },
  stat2: { value: '100K+', label: 'Broker Comparisons' },
  stat3: { value: '85%', label: 'High-Intent Traffic' },
  stat4: { value: '15+', label: 'Ad Placements' }
} as const
