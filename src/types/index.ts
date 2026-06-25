export type UserRole = 'student' | 'counselor';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';
export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'escalated';
export type AlertType = 'mood_decline' | 'depression_risk' | 'bullying_report' | 'inactivity' | 'crisis_language';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'bullying' | 'verbal_abuse' | 'physical_violence' | 'sexual_harassment' | 'cyberbullying' | 'other';
export type ForumCategory = 'curhat' | 'motivasi' | 'tips' | 'tanya_jawab' | 'cerita';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  school_id: string;
  class_name?: string;
  pseudonymous_id: string;
  wallet_address?: string;
  consent_given: boolean;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  student_id: string;
  journal_text: string;
  mood_score: number;
  ai_sentiment_score?: number;
  depression_risk_level?: RiskLevel;
  ai_feedback?: string;
  ai_keywords?: string[];
  on_chain_hash?: string;
  blockchain_tx_id?: string;
  icp_anchor_id?: string;
  created_at: string;
}

export interface BullyingReport {
  id: string;
  reporter_id: string;
  victim_pseudonymous_id: string;
  incident_type: IncidentType;
  description: string;
  incident_date: string;
  location?: string;
  perpetrator_description?: string;
  status: ReportStatus;
  bk_notes?: string;
  on_chain_hash?: string;
  blockchain_tx_id?: string;
  icp_anchor_id?: string;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
}

export interface ForumPost {
  id: string;
  author_id: string;
  category: ForumCategory;
  content: string;
  title: string;
  moderation_status: ModerationStatus;
  moderation_reason?: string;
  upvotes: number;
  reply_count: number;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  has_upvoted?: boolean;
}

export interface Alert {
  id: string;
  student_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  ai_score?: number;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  on_chain_tx_id?: string;
  icp_anchor_id?: string;
  triggered_at: string;
  student?: Profile;
}

export interface ChatMessage {
  id: string;
  student_id: string;
  role: 'user' | 'assistant';
  content: string;
  crisis_detected: boolean;
  created_at: string;
}

export interface MoodAnalysisResult {
  sentiment_score: number;
  depression_risk_level: RiskLevel;
  ai_feedback: string;
  keywords: string[];
  crisis_detected: boolean;
}

export interface DigitalBadge {
  id: string;
  student_id: string;
  badge_type: 'resilience' | 'advocate' | 'pioneer';
  minted_tx: string;
  on_chain_hash: string;
  icp_token_id?: string;
  minted_at: string;
}

