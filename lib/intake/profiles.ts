import type { IndustryId } from '@/lib/industries'

export type PlanInterest = 'basic' | 'full' | 'unsure'

export interface IntakeFeatureOption {
  id: string
  label: string
  plan: 'basic' | 'full' | 'both'
}

export interface IntakeIndustryProfile {
  id: IndustryId
  orgNoun: string
  peopleTitle: string
  peopleHint: string
  nameLabel: string
  whatWeDoLabel: string
  whatWeDoPlaceholder: string
  audienceLabel: string
  audiencePlaceholder: string
  locationLabel: string
  contactRoles: string[]
  intro: string
  basicSummary: string
  fullSummary: string
  features: IntakeFeatureOption[]
}

export const INTAKE_PROFILES: Record<IndustryId, IntakeIndustryProfile> = {
  churches: {
    id: 'churches',
    orgNoun: 'church',
    peopleTitle: 'Your church',
    peopleHint: 'Who you are and how we reach you',
    nameLabel: 'Church name',
    whatWeDoLabel: 'Tell us about the church',
    whatWeDoPlaceholder: 'Denomination, size, and what you want the website to help with.',
    audienceLabel: 'Who is the site mainly for?',
    audiencePlaceholder: 'Sunday visitors, members, families, the local community…',
    locationLabel: 'Town / campuses',
    contactRoles: ['Pastor', 'Elder', 'Administrator', 'Treasurer', 'Communications', 'Other'],
    intro:
      'From sermon libraries and prayer requests to rosters and online giving — we build websites churches use every week.',
    basicSummary: 'A welcoming public church site with sermons, service times, and a contact form — simple to manage.',
    fullSummary: 'Member areas, events, rosters, prayer requests, and online giving — built for church life.',
    features: [
      { id: 'youtube_sermons', label: 'YouTube sermon library', plan: 'basic' },
      { id: 'service_times', label: 'Service times & location', plan: 'basic' },
      { id: 'contact_prayer_form', label: 'Contact / prayer request form', plan: 'basic' },
      { id: 'member_area', label: 'Member-only area', plan: 'full' },
      { id: 'events_calendar', label: 'Events & church calendar', plan: 'full' },
      { id: 'prayer_requests', label: 'Prayer requests', plan: 'full' },
      { id: 'rosters_groups', label: 'Rosters & groups', plan: 'full' },
      { id: 'directory', label: 'Staff / member directory', plan: 'full' },
      { id: 'online_giving', label: 'Online donations', plan: 'full' },
      { id: 'newsletter', label: 'Newsletters', plan: 'full' },
      { id: 'team_admin', label: 'Team admin area (leaders update the site)', plan: 'full' },
    ],
  },
  businesses: {
    id: 'businesses',
    orgNoun: 'business',
    peopleTitle: 'Your business',
    peopleHint: 'Who you are and how customers reach you',
    nameLabel: 'Business name',
    whatWeDoLabel: 'What does the business do?',
    whatWeDoPlaceholder: 'A sentence or two about what you offer.',
    audienceLabel: 'Who are your customers?',
    audiencePlaceholder: 'Local households, other businesses, a specialist niche…',
    locationLabel: 'Location / service area',
    contactRoles: ['Owner', 'Director', 'Manager', 'Marketing', 'Operations', 'Other'],
    intro: 'Look professional online, capture enquiries, and add member tools or a shop when you are ready to grow.',
    basicSummary: 'A professional public site that builds trust and turns visitors into enquiries.',
    fullSummary: 'Member portals, team tools, bookings, or a shop — when you outgrow a brochure site.',
    features: [
      { id: 'service_pages', label: 'Clear service pages', plan: 'basic' },
      { id: 'enquiry_form', label: 'Contact / enquiry form', plan: 'basic' },
      { id: 'google_setup', label: 'Basic Google setup', plan: 'basic' },
      { id: 'team_admin', label: 'Private team admin area', plan: 'full' },
      { id: 'client_logins', label: 'Client / member logins', plan: 'full' },
      { id: 'shop', label: 'Online shop', plan: 'full' },
      { id: 'bookings', label: 'Booking flows', plan: 'full' },
      { id: 'directory', label: 'Directory / grouped contacts', plan: 'full' },
      { id: 'youtube', label: 'YouTube or resource library', plan: 'both' },
      { id: 'newsletter', label: 'Newsletters', plan: 'full' },
    ],
  },
  schools: {
    id: 'schools',
    orgNoun: 'organisation',
    peopleTitle: 'Your school or nonprofit',
    peopleHint: 'Who you serve and how families or members reach you',
    nameLabel: 'Organisation name',
    whatWeDoLabel: 'What do you do?',
    whatWeDoPlaceholder: 'School, charity, community group — and who you serve.',
    audienceLabel: 'Who uses the website?',
    audiencePlaceholder: 'Parents, students, members, donors, volunteers…',
    locationLabel: 'Location / campuses',
    contactRoles: ['Principal', 'Administrator', 'Board member', 'Communications', 'Coordinator', 'Other'],
    intro: 'Clear information for parents, members, and donors — with optional logins, events, and giving when you need them.',
    basicSummary: 'A clear public site for term dates, programmes, news, and contact — without complex logins.',
    fullSummary: 'Member areas, events, groups, and giving — for an active school or nonprofit community.',
    features: [
      { id: 'programmes', label: 'Programmes / about pages', plan: 'basic' },
      { id: 'term_dates', label: 'Term dates & calendar', plan: 'basic' },
      { id: 'enquiry_form', label: 'Enquiry / contact form', plan: 'basic' },
      { id: 'youtube', label: 'YouTube for assemblies or videos', plan: 'basic' },
      { id: 'family_login', label: 'Family / member login area', plan: 'full' },
      { id: 'events', label: 'Events & announcements', plan: 'full' },
      { id: 'newsletter', label: 'Newsletters', plan: 'full' },
      { id: 'directory', label: 'Staff, volunteer, or group directory', plan: 'full' },
      { id: 'rosters', label: 'Rosters & role assignments', plan: 'full' },
      { id: 'donations', label: 'Online donations / fundraising', plan: 'full' },
    ],
  },
  shops: {
    id: 'shops',
    orgNoun: 'shop',
    peopleTitle: 'Your shop',
    peopleHint: 'What you sell and how customers buy from you',
    nameLabel: 'Shop / brand name',
    whatWeDoLabel: 'What do you sell?',
    whatWeDoPlaceholder: 'Products, collections, or made-to-order work.',
    audienceLabel: 'Who are your shoppers?',
    audiencePlaceholder: 'Local walk-ins, NZ-wide online, wholesale…',
    locationLabel: 'Store location (if you have one)',
    contactRoles: ['Owner', 'Manager', 'Marketing', 'Operations', 'Other'],
    intro: 'Sell products or resources on a fast site — with checkout, enquiries, and hosting handled for you.',
    basicSummary: 'Showcase products and brand online, with enquiries until you are ready for checkout.',
    fullSummary: 'Online shop with cart, checkout, and optional customer accounts — we keep it running.',
    features: [
      { id: 'catalogue', label: 'Product / collection pages', plan: 'basic' },
      { id: 'enquiry_orders', label: 'Order / enquiry form', plan: 'basic' },
      { id: 'youtube', label: 'YouTube demos or lookbook', plan: 'basic' },
      { id: 'checkout', label: 'Cart & checkout', plan: 'full' },
      { id: 'customer_accounts', label: 'Customer accounts', plan: 'full' },
      { id: 'team_admin', label: 'Team admin for products and orders', plan: 'full' },
      { id: 'click_collect', label: 'Click & collect / local pickup', plan: 'full' },
    ],
  },
  trades: {
    id: 'trades',
    orgNoun: 'business',
    peopleTitle: 'Your trade or service',
    peopleHint: 'What you do and how customers book or call you',
    nameLabel: 'Business name',
    whatWeDoLabel: 'What trade or service do you offer?',
    whatWeDoPlaceholder: 'Plumbing, building, cleaning, tutoring, repairs…',
    audienceLabel: 'Who hires you?',
    audiencePlaceholder: 'Homeowners, commercial, both…',
    locationLabel: 'Towns you cover',
    contactRoles: ['Owner', 'Office manager', 'Operations', 'Other'],
    intro: 'Show what you do, make it easy to call or message, and look trustworthy on Google and mobile.',
    basicSummary: 'A no-fuss phone-friendly site — services, gallery, and a way to call or message you.',
    fullSummary: 'Bookings, client logins, or a small shop — when you need more than listings.',
    features: [
      { id: 'services_gallery', label: 'Services & project gallery', plan: 'basic' },
      { id: 'click_to_call', label: 'Click-to-call & contact form', plan: 'basic' },
      { id: 'google_local', label: 'Google-friendly local setup', plan: 'basic' },
      { id: 'quote_form', label: 'Quote / job enquiry form', plan: 'basic' },
      { id: 'bookings', label: 'Booking / job request workflow', plan: 'full' },
      { id: 'client_logins', label: 'Client or team login area', plan: 'full' },
      { id: 'small_shop', label: 'Small parts / product shop', plan: 'full' },
      { id: 'directory_rosters', label: 'Staff directory & job rosters', plan: 'full' },
    ],
  },
}

export function intakeProfile(id: IndustryId | '' | null | undefined) {
  if (!id) return null
  return INTAKE_PROFILES[id] ?? null
}

export function defaultFeatureIds(id: IndustryId, plan: PlanInterest) {
  return INTAKE_PROFILES[id].features
    .filter((feature) => plan === 'full' || feature.plan !== 'full')
    .map((feature) => feature.id)
}
