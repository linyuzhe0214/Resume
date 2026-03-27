export interface PavementLayer {
  id: string;
  type: string;
  thickness: number;
  month: string;
}

export interface Segment {
  id: string;
  highway: string;
  property: string;
  laneCategory: string;
  constructionYear: string;
  constructionMonth: string;
  startMileage: number;
  endMileage: number;
  direction: 'Southbound' | 'Northbound' | 'Eastbound' | 'Westbound';
  lanes: string[];
  pavementLayers: PavementLayer[];
  notes?: string;
  prevConstructionYear?: string;
  prevConstructionDepth?: number;
}

export interface MaintenanceEvent {
  id: string;
  year: string;
  startMileage: number;
  endMileage: number;
  type: string;
  color: string;
  label: string;
  depth?: number;
}

export interface RampSegment extends Segment {
  rampId: string;
  rampName: string;
  rampNo: string;
  interchange: string;
  laneCount: number;
  length: number;
  status: 'Optimal' | 'Warning' | 'Inspection';
  maintenanceHistory?: MaintenanceEvent[];
  completionTime?: string;
}

