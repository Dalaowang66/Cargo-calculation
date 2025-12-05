
export interface Dimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface CargoItemInput {
  id: string;
  name: string;
  dims: Dimensions;
  weight: number; // kg
  quantity: number;
  color: string;
  allowRotation: boolean;
}

export interface ContainerSpec {
  name: string;
  dims: Dimensions;
  maxWeight: number; // kg
  type: 'CONTAINER' | 'PALLET';
}

export interface PackedItem {
  id: string; // Unique placement ID
  cargoId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  dims: Dimensions; // Actual dimensions (may be swapped if rotated)
  weight: number;
  color: string;
}

export interface FreeSpace {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

export interface PackingResult {
  containerId: number;
  container: ContainerSpec;
  packedItems: PackedItem[];
  freeSpaces: FreeSpace[]; // List of empty spaces for visualization
  volumeUtilization: number;
  weightUtilization: number;
  totalWeight: number;
  totalVolume: number;
}

export interface BatchPackingResult {
  containers: PackingResult[];
  unpackedItems: { name: string; quantity: number }[]; 
  totalContainers: number;
  averageVolumeUtilization: number;
}
