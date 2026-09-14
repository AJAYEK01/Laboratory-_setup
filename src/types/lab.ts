export type Gender = 'Male' | 'Female' | 'Other';
export type AgeUnit = 'Years' | 'Months' | 'Days';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type ResultFlag = 'normal' | 'high' | 'low' | 'abnormal' | 'none';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMode = 'Cash' | 'UPI / Online' | 'Card' | 'Due';
export type OrderStatus = 'registered' | 'in_progress' | 'completed' | 'printed';
export type UserRole = 'owner' | 'branch_manager' | 'technician' | 'pathologist';

export interface Branch {
  id: string;
  code: string; // e.g. 'BR01', 'BR02'
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  branchId: string | null; // null for owner
  branch?: Branch | null;
}

export interface LabSettings {
  id: string; // 'lab_profile'
  currentBranchId: string;
  currentBranchCode: string;
  currentBranchName: string;
  labName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  regNo: string;
  pathologistName: string;
  pathologistDegree: string;
  technicianName: string;
  currencySymbol: string;
  centralServerUrl: string; // e.g. 'http://localhost:5000' or cloud endpoint
  cloudSyncUrl?: string;
  cloudSyncKey?: string;
  autoSyncEnabled: boolean;
  lastSyncedAt?: string | null;
}

export interface Patient {
  id: string; // BR01-PT-YYYYMMDD-XXXX
  branchId: string;
  branchCode: string;
  name: string;
  age: number;
  ageUnit: AgeUnit;
  gender: Gender;
  phone: string;
  address?: string;
  referralDoctor?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface RangeBounds {
  min?: number;
  max?: number;
  text?: string;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
  normalRangeText?: string;
  genderSpecific?: {
    male: RangeBounds;
    female: RangeBounds;
  };
  options?: string[];
  defaultValue?: string;
}

export interface TestTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  sampleType: string;
  parameters: TestParameter[];
  interpretationNotes?: string;
  isActive: boolean;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface ParameterResult {
  parameterId: string;
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: ResultFlag;
}

export interface OrderTestItem {
  testId: string;
  testCode: string;
  testName: string;
  category: string;
  price: number;
  status: 'pending' | 'completed';
  sampleType: string;
  results: Record<string, ParameterResult>;
  notes?: string;
}

export interface TestOrder {
  id: string; // BR01-ORD-YYYYMMDD-XXXX
  branchId: string;
  branchCode: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientAgeUnit: AgeUnit;
  patientGender: Gender;
  patientPhone: string;
  referralDoctor: string;
  orderDate: string; // YYYY-MM-DD
  orderTime: string; // HH:MM AM/PM
  tests: OrderTestItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  overallStatus: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface SyncStats {
  pendingCount: number;
  syncedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  errorMessage?: string | null;
  centralServerConnected?: boolean;
}
