export interface Customer {
  id: number;
  name: string;
  phone: string;
  note: string | null;
  createdAt: string;
  /** Outstanding debt across the customer's sales (BR-8), as a decimal string. */
  debtBalance: string;
}

export interface CustomerDetail extends Customer {
  debt: string;
  /** True once the customer opened the bot invite link (detail only, never the chat id). */
  telegramLinked: boolean;
  /** When the link was made and the name of the staff user who issued the used invite (null for pre-F24 links). */
  telegramLinkedAt: string | null;
  telegramLinkedBy: string | null;
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
