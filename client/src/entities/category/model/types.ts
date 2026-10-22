export type AttributeType = 'TEXT' | 'NUMBER' | 'SELECT';

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  TEXT: 'categories.typeText',
  NUMBER: 'categories.typeNumber',
  SELECT: 'categories.typeSelect',
};

export interface CategoryAttribute {
  id: number;
  key: string;
  label: string;
  type: AttributeType;
  options: string[] | null;
  /** Live API shape (categories.service selects `required`). */
  required: boolean;
  sortOrder: number;
}

export interface Category {
  id: number;
  name: string;
  isSerialized: boolean;
  isActive: boolean;
  attributes: CategoryAttribute[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  isSerialized?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  isSerialized?: boolean;
  isActive?: boolean;
}

export interface CreateAttributePayload {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
}

export interface UpdateAttributePayload {
  label?: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
}
