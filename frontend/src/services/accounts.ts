import { tokenService } from './tokenService'

export interface DigitalOceanAccount {
  account_id: number
  index: number
  email: string
  uuid: string
  email_verified: boolean
  status: string
  status_message: string
  droplet_limit: number
  floating_ip_limit: number
  volume_limit: number
  team: any
  name: string
  account_name: string
  // Balance info
  account_balance: string
  month_to_date_balance: string
  month_to_date_usage: string
  generated_at?: string
  error?: string
  // Additional billing info
  balance_info?: BalanceInfo
  recent_invoices?: Invoice[]
  total_invoices?: number
  // Credits info for education accounts
  credits_info?: CreditsInfo
}

export interface CreditsInfo {
  total_credits: string
  used_credits: string
  remaining_credits: string
  credits_expire_date?: string | null
}

export interface BalanceInfo {
  account_balance: string
  month_to_date_balance: string
  month_to_date_usage: string
  generated_at: string
  error?: string
}

export interface Invoice {
  uuid: string
  invoice_uuid: string
  amount: string
  invoice_preview_uuid: string
  created_at: string
  updated_at: string
}

export interface BillingHistoryItem {
  uuid: string
  type: string
  description: string
  amount: string
  date: string
  invoice_uuid?: string
}

export interface AccountBilling {
  account_id: number
  balance: BalanceInfo
  billing_history: BillingHistoryItem[]
  invoices: Invoice[]
  total_invoices: number
  meta: {
    billing_history_total: number
    invoices_total: number
  }
}

export const accountsApi = {
  // Get all accounts info with basic balance
  getAccounts: () => tokenService.makeApiCall({
    method: 'GET',
    url: '/api/v1/accounts'
  }),
  
  // Get detailed billing info for specific account
  getAccountBilling: (accountId: number) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/accounts/${accountId}/billing`
    }),
  
  // Get balance info only
  getAccountBalance: (accountId: number) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/accounts/${accountId}/balance`
    }),
  
  // Get invoices for specific account
  getAccountInvoices: (accountId: number, perPage: number = 20, page: number = 1) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/accounts/${accountId}/invoices?per_page=${perPage}&page=${page}`
    }),
  
  // Get billing history for specific account
  getAccountBillingHistory: (accountId: number, perPage: number = 20, page: number = 1) => 
    tokenService.makeApiCall({
      method: 'GET',
      url: `/api/v1/accounts/${accountId}/billing-history?per_page=${perPage}&page=${page}`
    }),
} 