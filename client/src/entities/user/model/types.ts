export type Language = 'uz' | 'ru' | 'en';

export interface Role {
  id: number;
  name: 'Admin' | 'Staff' | 'SuperAdmin';
  permissions: string[];
}

export interface User {
  id: number;
  name: string;
  phone: string;
  language: Language;
  isActive: boolean;
  role: Role;
  createdAt: string;
}

export type { Page } from '@/shared/types';

export interface CreateUserPayload {
  name: string;
  phone: string;
  password: string;
  roleId: number;
  language?: Language;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  password?: string;
  roleId?: number;
  isActive?: boolean;
  language?: Language;
}
