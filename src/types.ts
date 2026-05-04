export type UserRole = 'citizen' | 'official' | 'admin';

export interface UserProfile {
  uid: string;
  phoneNumber: string;
  role: UserRole;
  displayName?: string;
  createdAt: number;
}

export interface BudgetItem {
  id?: string;
  department: string;
  category: string;
  subCategory?: string;
  lineItem: string;
  amount: number;
  fiscalYear: string;
}

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: string;
  department?: string;
  imageUrl?: string;
  authorId: string;
  upvotes: number;
  downvotes: number;
  status: 'active' | 'flagged' | 'moderated';
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: number;
  createdAt: number;
}

export interface PriorityOption {
  id: string;
  label: string;
  description: string;
}

export interface PollResult {
  userId: string;
  priorities: string[];
  rankedAt: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
