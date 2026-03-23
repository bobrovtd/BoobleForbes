export type AccessMode = "public" | "unlisted" | "authenticated";
export type QuestionType = "text" | "single_choice" | "multiple_choice" | "scale" | "date";

export interface Option {
  id?: number;
  text: string;
  order_index: number;
}

export interface Question {
  id?: number;
  type: QuestionType;
  text: string;
  description?: string | null;
  order_index: number;
  is_required: boolean;
  config: Record<string, unknown>;
  options: Option[];
}

export interface Form {
  id: number;
  title: string;
  description?: string | null;
  access_mode: AccessMode;
  limit_one_per_user: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string | null;
  is_published: boolean;
  public_slug?: string | null;
  questions: Question[];
}

export interface FormListItem {
  id: number;
  title: string;
  created_at: string;
  updated_at?: string | null;
  is_published: boolean;
  access_mode: AccessMode;
}

export interface FormPayload {
  title: string;
  description?: string;
  access_mode: AccessMode;
  limit_one_per_user: boolean;
  questions: Question[];
}

export interface AIGeneratePayload {
  prompt: string;
}

export interface AIGeneratedDraft {
  title: string;
  description?: string | null;
  access_mode: AccessMode;
  limit_one_per_user: boolean;
  questions: Question[];
}

export interface PublicForm {
  id: number;
  title: string;
  description?: string | null;
  access_mode: AccessMode;
  limit_one_per_user: boolean;
  questions: Question[];
}

export interface SubmitAnswer {
  question_id: number;
  value: unknown;
}

export interface SubmitRequest {
  answers: SubmitAnswer[];
}

export interface SubmitResult {
  detail: string;
  response_id: number;
}

export interface ResponseRow {
  response_id: number;
  respondent_id: number | null;
  submitted_at: string;
  answers: Record<string, unknown>;
}

export interface TextAnalytics {
  question_id: number;
  question_text: string;
  responses: string[];
}

export interface ChoiceAnalytics {
  question_id: number;
  question_text: string;
  counts: Record<string, number>;
}

export interface ScaleAnalytics {
  question_id: number;
  question_text: string;
  average: number | null;
  median: number | null;
  distribution: Record<string, number>;
}

export interface FormAnalytics {
  total_responses: number;
  text_questions: TextAnalytics[];
  choice_questions: ChoiceAnalytics[];
  scale_questions: ScaleAnalytics[];
}

export interface PublishResponse {
  public_url: string;
  public_slug: string;
}
