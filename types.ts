export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface UploadedFile {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}

export interface SavedProposal {
  id: string;
  created_at: string;
  job_description: string;
  proposal_text: string;
  match_score: string | null;
}

export interface SavedKnowledgeBase {
  id: string;
  created_at: string;
  name: string;
  content: string;
  type: string;
}