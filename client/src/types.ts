export type Vote = 'love' | 'like' | 'neutral' | 'not_sure_yet' | 'dislike'

export interface Company {
  company: string
  vote?: Vote
  stage?: string
  location?: string
  employees?: string
  compensation?: string
  link?: string
  ai_category?: string
  company_quality?: number
  last_outreach?: string
  notes?: string
  recruiter_type?: string
  contact?: string
  notion_url?: string
}
