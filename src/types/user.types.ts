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

export type SeniorStatus =
  | "not_applicable"
  | "pending"
  | "approved"
  | "verified"
  | "rejected";

export interface Passenger {
  user_id: string;
  phone: string | null;
  is_senior?: boolean;
  senior_status?: SeniorStatus;
  birth_date?: string | null;
}

export interface SeniorVerificationRequest {
  id: string;
  passenger_id: string;
  document_image_bucket: string;
  document_image_path: string;
  status: "pending" | "approved" | "rejected";
}

export type SeniorDocumentContentType = "image/jpeg" | "image/png" | "image/webp";

export interface SeniorDocumentImage {
  uri: string;
  fileName: string;
  contentType: SeniorDocumentContentType;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  isSenior: boolean;
  birthDate: string;
  documentImage: SeniorDocumentImage | null;
}

export interface RegisterPassengerRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  is_senior_request?: boolean;
  birth_date?: string;
  document_image_path?: string;
}

export interface RegisterPassengerResponse {
  user_id: string;
  role: "Passenger";
  passenger: Passenger;
  senior_verification_request?: SeniorVerificationRequest | null;
}

export interface SeniorDocumentUploadUrlRequest {
  email: string;
  file_name: string;
  content_type: SeniorDocumentContentType;
}

export interface SeniorDocumentUploadUrlResponse {
  bucket: "cedulas";
  path: string;
  signed_url: string;
  token: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  capabilities?: string[];
  user: UserWithRole;
}