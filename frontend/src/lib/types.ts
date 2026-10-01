export type Id = number | string

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Department {
  id: number
  name: string
  description?: string
}

export interface Category {
  id: number
  name: string
  description?: string
  short_code?: string | null
}

export interface StatusOption {
  id: number
  name: string
  color: string
  is_active: boolean
}

export interface Person {
  id: number
  first_name: string
  last_name: string
  full_name: string
  department: number | null
}

export interface Asset {
  id: number
  asset_id: string
  category: Category
  model_description: string
  serial_number: string
  purchase_date: string | null
  assigned_to: Person | null
  department: Department | null
  last_known_person: Person | null
  status: StatusOption
  admin_comments: string
  purchased_from: string
  purchase_cost: string | null
  requisition: number | null
  requisition_display: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  profile: {
    id?: number
    role: string
    department_id?: number | null
    department: string | null
    phone_number: string
    employee_id: string
    must_change_password?: boolean
  } | null
}

export interface DashboardStats {
  total_assets: number
  status_counts: Record<string, number>
  assets_this_month: number
  maintenance_today: number
  total_items_bought: number
  total_value_bought: number | string
  categories: { name: string; asset_count: number }[]
  recent_activity: {
    asset_id: string | null
    action: string
    description: string
    user: string | null
    timestamp: string
  }[]
}

export interface MaintenanceLog {
  id: number
  asset: string
  timestamp: string
  date_reported: string
  date_completed: string | null
  description: string
  action_taken: { id: number; name: string } | null
  cost_of_repair: string | null
  maintenance_status: string
  performed_by: { id: number; company_name: string; technician_name: string } | null
  reported_by: string | null
  notes: string
  requisition: number | null
  completed_by: string | null
  updated_at: string
}

export interface Issue {
  id: number
  title: string
  description: string
  priority: string
  status: string
  asset: number | null
  department: number | null
  reported_by_username: string | null
  comments_count: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  body: string
  author_username: string | null
  created_at: string
}

export interface Project {
  id: number
  title: string
  description: string
  problem_statement: string
  cost_breakdown: string
  conclusion: string
  pending_reason: string
  rejected_reason: string
  categories: number[]
  date: string | null
  priority: string
  status: string
  reported_by_username: string | null
  comments_count: number
  created_at: string
  updated_at: string
  category_availability: {
    category: { id: number; name: string }
    available_count: number
    assets: { id: number; asset_id: string; model_description: string; status: string; assigned_to: string | null; department: string | null }[]
  }[]
}

export interface ProjectItem {
  id: number
  project: number
  item_type: string
  item_name: string
  unit_price: string
  quantity: number
  total_price: string
}

export interface RequisitionItem {
  id: number
  requisition: number
  item_type: string
  item_name: string
  unit_price: string
  quantity: number
  total_price: string
  is_approved: boolean
  rejection_reason: string
  is_processed: boolean
  processed_at: string | null
  processed_by: number | null
}

export interface Requisition {
  id: number
  req_no: string
  company: string
  title: string
  description: string
  status: string
  total_amount: string
  created_by_username: string | null
  created_at: string
  updated_at: string
  linked_issue: number | null
  linked_project: number | null
  items: RequisitionItem[]
}

export interface Task {
  id: number
  title: string
  description: string
  due_date: string | null
  priority: string
  status: string
  assigned_to: number | null
  assigned_to_username: string | null
  created_by_username: string | null
  is_overdue: boolean
  created_at: string
  updated_at: string
}

export interface TechnicianAssistant {
  id: number
  technician: number
  name: string
  phone_number: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export interface TechnicianService {
  id: number
  technician: number
  service_name: string
  description: string
  typical_cost: string | null
  is_active: boolean
  created_at: string
}

export interface TechnicianRecommendation {
  id: number
  technician: number
  technician_name: string
  company_name: string
  category_name: string
  recommendation_type: string
  description: string
  estimated_cost: string | null
  priority: string
  is_completed: boolean
  completed_date: string | null
  notes: string
  created_at: string
}

export interface Technician {
  id: number
  company_name: string
  technician_name: string
  email: string
  phone_number: string
  specialization: string
  is_active: boolean
  alternate_phone: string
  address: string
  created_at: string
  updated_at: string
  assistants: TechnicianAssistant[]
  services: TechnicianService[]
}

export interface AssetLink {
  id: number
  asset: number
  linked_asset: number
  asset_display: string
  linked_asset_display: string
  notes: string
  created_at: string
}

export interface AssetLinkHistory {
  id: number
  asset: number
  linked_asset: number
  asset_display: string
  linked_asset_display: string
  notes: string
  linked_at: string | null
  unlinked_at: string
  unlinked_by_username: string | null
}

export interface AssetQuantity {
  id: number
  name: string
  total: number
  available: number
  in_use: number
  maintenance: number
  missing: number
  retired: number
}

