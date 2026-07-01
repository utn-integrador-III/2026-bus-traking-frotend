export type UserRole = "Passenger" | "Driver" | "Admin";

export interface User {
  id: string;
  name: string | null;
  email: string;
  is_active?: boolean;
  created_at?: string;
}

export interface UserWithRole extends User {
  role: UserRole | null;
}

export interface Passenger {
  user_id: string;
  phone: string | null;
  is_senior: boolean;
  senior_status: "not_applicable" | "pending" | "approved" | "rejected";
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  isSenior: boolean;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  capabilities?: string[];
  user: UserWithRole;
}