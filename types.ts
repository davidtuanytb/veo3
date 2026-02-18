
export type StyleType = 
  | 'Documentary' 
  | 'Industrial / Factory Process' 
  | 'Luxury Interior Art / Epoxy'
  | 'Real-life / Construction' 
  | 'Cinematic' 
  | 'Auto'
  | 'Dọn rác & Cải tạo (Bẩn → Ấm cúng)';

export interface PromptSet {
  imagePrompts: string[];
  videoPrompts: string[];
  analysis: {
    subject: string;
    actionType: string;
    progression: string;
  };
}

export interface AppState {
  title: string;
  count: number;
  style: StyleType;
  result: PromptSet | null;
  loading: boolean;
  error: string | null;
  images: string[]; // Base64 strings
}