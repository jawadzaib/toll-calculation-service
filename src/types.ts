
export type VehicleEntry = {
  id: string;
  number_plate: string;
  entry_interchange: string;
  entry_date_time: Date;
}

export interface EntryRequest {
  interchange?: string;
  numberPlate: string;
  dateTime?: string;
}

export interface ExitRequest {
  interchange?: string;
  numberPlate: string;
  dateTime?: string;
}

export type ExitResponse = {
  baseRate: number;
  distanceCost: number;
  distanceBreakdown: string;
  subTotal: number;
  discount: number;
  totalCharged: number;
  message?: string;
}