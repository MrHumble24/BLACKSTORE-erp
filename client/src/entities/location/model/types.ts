export type LocationType = 'WAREHOUSE' | 'SHOP';

export interface Location {
  id: number;
  name: string;
  type: LocationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationPayload {
  name: string;
  type: LocationType;
}

export interface UpdateLocationPayload {
  name?: string;
  type?: LocationType;
  isActive?: boolean;
}
