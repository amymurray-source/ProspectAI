export enum Seniority {
  ENTRY = 'Entry',
  MID = 'Mid',
  SENIOR = 'Senior',
  DIRECTOR = 'Director',
  VP = 'VP',
  C_LEVEL = 'C-Level',
}

export interface LiveResearchData {
  summary: string;
  recentHeadlines: { title: string; url: string; date: string }[];
  keyIntelligence: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface Prospect {
  id: string;
  companyName: string;
  website: string;
  contactName: string;
  title: string;
  email: string;
  region: string;
  industry: string;
  opportunitySignal: string;
  recentTriggerEvent: string;
  whyFit: string;
  recommendedChannels?: string[];
  outreachAngle?: string;
  firstLine?: string;
  nextStep?: string;
  liveResearch?: LiveResearchData;
}

export interface SearchFilters {
  region?: string;
  companyType?: string;
  opportunity?: string;
  seniority?: string;
  role?: string;
  channels?: string[];
}

export interface IntentParsingResult {
  filters: SearchFilters;
  summary: string;
}
