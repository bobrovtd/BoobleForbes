export type UserRole = "admin" | "creator" | "respondent";

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  user: User;
}

export interface MessageResponse {
  detail: string;
}
