/** Paginated response wrapper used by all list endpoints. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
