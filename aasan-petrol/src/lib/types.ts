export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: 'employee' | 'driver';
  employer_name: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
};

export type Vehicle = {
  id: string;
  employee_id: string;
  registration_number: string;
  make_model: string | null;
  nickname: string | null;
  is_active: boolean;
  approved_by_employer?: boolean;
};

export type Station = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  integration_level: 'partner' | 'manual';
  is_active: boolean;
};

export type FuelTransaction = {
  id: string;
  transaction_code: string;
  employee_id: string;
  driver_id: string;
  vehicle_id: string;
  station_id: string | null;
  requested_amount_pkr: number;
  reported_litres: number | null;
  status: 'authorised' | 'evidence_submitted' | 'pending_review' | 'verified' | 'flagged' | 'cancelled';
  transaction_category?: 'fuel' | 'shop';
  transaction_details?: Record<string, any> | null;
  created_at: string;
  station_name?: string | null;
};

export type TopupRequest = {
  id: string;
  requested_amount_pkr: number;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  note?: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type ShopCatalogItem = { id: string; name: string; price_pkr: number; is_active: boolean };
