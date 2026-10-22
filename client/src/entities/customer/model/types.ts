export interface Customer {
  id: number;
  name: string;
  phone: string;
  note: string | null;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  debt: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  note?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  note?: string;
}
