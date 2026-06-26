export interface PdfCompanyInfo {
  name: string
  legalName: string
  tagline: string
  email: string
  phone: string
  address: string
  website: string
  gstNumber: string
  nzbn: string
}

export const APPDOERS_COMPANY_DEFAULTS: PdfCompanyInfo = {
  name: 'Appdoers',
  legalName: 'Appdoers Limited',
  tagline: 'Websites & online tools for New Zealand clients',
  email: 'contact@appdoers.co.nz',
  phone: '+64 22 5060 870',
  address: '49 Braebrook Drive, Netherby, Ashburton 7700',
  website: 'https://www.appdoers.co.nz',
  gstNumber: '',
  nzbn: '9429052210952',
}

export interface PdfBillingInfo {
  bank_name: string
  bank_account: string
  account_name: string
  bank_reference_prefix: string
  gst_rate: number
  stripe_link?: string
  invoice_footer?: string
}

export const APPDOERS_BILLING_DEFAULTS: PdfBillingInfo = {
  bank_name: '',
  bank_account: '',
  account_name: '',
  bank_reference_prefix: 'INV',
  gst_rate: 0.15,
  stripe_link: '',
  invoice_footer: '',
}

type SettingsRecord = Record<string, unknown>

export function mergeCompanySettings(raw?: SettingsRecord | null): PdfCompanyInfo {
  if (!raw) return { ...APPDOERS_COMPANY_DEFAULTS }

  return {
    name: String(raw.name ?? APPDOERS_COMPANY_DEFAULTS.name),
    legalName: String(raw.legal_name ?? raw.legalName ?? APPDOERS_COMPANY_DEFAULTS.legalName),
    tagline: String(raw.tagline ?? APPDOERS_COMPANY_DEFAULTS.tagline),
    email: String(raw.email ?? APPDOERS_COMPANY_DEFAULTS.email),
    phone: String(raw.phone ?? APPDOERS_COMPANY_DEFAULTS.phone),
    address: String(raw.address ?? APPDOERS_COMPANY_DEFAULTS.address),
    website: String(raw.website ?? APPDOERS_COMPANY_DEFAULTS.website),
    gstNumber: String(raw.gst_number ?? raw.gstNumber ?? APPDOERS_COMPANY_DEFAULTS.gstNumber),
    nzbn: String(raw.nzbn ?? APPDOERS_COMPANY_DEFAULTS.nzbn),
  }
}

export function normalizeBillingSettings(raw?: SettingsRecord | null): PdfBillingInfo {
  if (!raw) return { ...APPDOERS_BILLING_DEFAULTS }

  const accountNumber = raw.account_number ?? raw.bank_account

  return {
    bank_name: String(raw.bank_name ?? ''),
    bank_account: String(accountNumber ?? ''),
    account_name: String(raw.account_name ?? ''),
    bank_reference_prefix: String(
      raw.bank_reference_prefix ?? APPDOERS_BILLING_DEFAULTS.bank_reference_prefix
    ),
    gst_rate: Number(raw.gst_rate ?? APPDOERS_BILLING_DEFAULTS.gst_rate),
    stripe_link: String(raw.stripe_link ?? ''),
    invoice_footer: String(raw.invoice_footer ?? ''),
  }
}

export function formatWebsiteHost(website: string): string {
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
