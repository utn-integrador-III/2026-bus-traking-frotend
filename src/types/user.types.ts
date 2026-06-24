export type UserRole = "Passenger" | "Driver" | "Admin";

export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface UserWithRole extends User {
  role: UserRole;
}

export interface Passenger {
  user_id: string;
  phone: string | null;
  is_senior: boolean;
  senior_status: "not_applicable" | "pending" | "verified" | "rejected";
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  isSenior: boolean;
}
