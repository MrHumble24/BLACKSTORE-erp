import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ItemFilters, ItemStatus, ItemCondition, ItemSortBy, SortOrder } from '@/entities/item';

interface ItemUrlState {
  filters: ItemFilters;
  page: number;
  pageSize: number;
  setFilters: (newFilters: ItemFilters) => void;
  setPage: (p: number) => void;
  setPageSize: (size: number) => void;
  toggleSort: (by: ItemSortBy) => void;
}

/** Synchronizes items list filters, sorting, and pagination with URL search params. */
export function useItemUrlParams(): ItemUrlState {
  const [searchParams, setSearchParams] = useSearchParams();

  const { filters, page, pageSize } = useMemo(() => {
    const status = (searchParams.get('status') as ItemStatus) || undefined;
    const condition = (searchParams.get('condition') as ItemCondition) || undefined;
    const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
    const locationId = searchParams.get('locationId') ? Number(searchParams.get('locationId')) : undefined;
    const investorId = searchParams.get('investorId') ? Number(searchParams.get('investorId')) : undefined;
    const search = searchParams.get('search') || undefined;
    const isUnpriced = searchParams.get('isUnpriced') === 'true' ? true : undefined;
    const sortBy = (searchParams.get('sortBy') as ItemSortBy) || undefined;
    const sortOrder = (searchParams.get('sortOrder') as SortOrder) || undefined;

    const pageNum = Math.max(1, Number(searchParams.get('page')) || 1);
    const size = Math.max(1, Number(searchParams.get('pageSize')) || 20);

    return {
      filters: {
        status,
        condition,
        categoryId,
        locationId,
        investorId,
        search,
        isUnpriced,
        sortBy,
        sortOrder,
      },
      page: pageNum,
      pageSize: size,
    };
  }, [searchParams]);

  const updateUrl = useCallback(
    (newFilters: ItemFilters, newPage: number, newPageSize: number) => {
      const next = new URLSearchParams();
      if (newFilters.status) next.set('status', newFilters.status);
      if (newFilters.condition) next.set('condition', newFilters.condition);
      if (newFilters.categoryId) next.set('categoryId', String(newFilters.categoryId));
      if (newFilters.locationId) next.set('locationId', String(newFilters.locationId));
      if (newFilters.investorId) next.set('investorId', String(newFilters.investorId));
      if (newFilters.search) next.set('search', newFilters.search);
      if (newFilters.isUnpriced) next.set('isUnpriced', 'true');
      if (newFilters.sortBy) next.set('sortBy', newFilters.sortBy);
      if (newFilters.sortOrder) next.set('sortOrder', newFilters.sortOrder);
      if (newPage > 1) next.set('page', String(newPage));
      if (newPageSize !== 20) next.set('pageSize', String(newPageSize));

      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  const setFilters = useCallback(
    (nextFilters: ItemFilters) => {
      updateUrl(nextFilters, 1, pageSize);
    },
    [pageSize, updateUrl],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      updateUrl(filters, nextPage, pageSize);
    },
    [filters, pageSize, updateUrl],
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      updateUrl(filters, 1, nextPageSize);
    },
    [filters, updateUrl],
  );

  const toggleSort = useCallback(
    (by: ItemSortBy) => {
      let nextOrder: SortOrder = 'desc';
      if (filters.sortBy === by) {
        nextOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
      } else if (by === 'model' || by === 'createdAt') {
        nextOrder = 'asc';
      }
      updateUrl({ ...filters, sortBy: by, sortOrder: nextOrder }, 1, pageSize);
    },
    [filters, pageSize, updateUrl],
  );

  return { filters, page, pageSize, setFilters, setPage, setPageSize, toggleSort };
}
