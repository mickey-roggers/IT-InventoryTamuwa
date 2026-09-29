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
  is_staff: boolean
  is_superuser: boolean
  profile: {
    role: string
    department: string | null
    phone_number: string
    employee_id: string
  } | null
}

export interface DashboardStats {
  total_assets: number
  status_counts: Record<string, number>
  assets_this_month: number
  maintenance_today: number
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
  date_reported: string
  date_completed: string | null
  description: string
  action_taken: { id: number; name: string } | null
  cost_of_repair: string | null
  maintenance_status: string
  performed_by: { id: number; company_name: string; technician_name: string } | null
  reported_by: string | null
  notes: string
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
}

export interface Project {
  id: number
  title: string
  description: string
  date: string | null
  priority: string
  status: string
  reported_by_username: string | null
  comments_count: number
  created_at: string
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
  items: unknown[]
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
}

export interface Technician {
  id: number
  company_name: string
  technician_name: string
  email: string
  phone_number: string
  specialization: string
  is_active: boolean
  assistants: unknown[]
  services: unknown[]
}

