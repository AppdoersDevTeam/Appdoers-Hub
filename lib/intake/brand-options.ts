import type { IntakeAnswers, IntakeColors } from './types'

export interface ColorPalette {
  id: string
  name: string
  description: string
  colors: IntakeColors
}

export interface FontPairing {
  id: string
  name: string
  description: string
  heading: string
  body: string
  headingFamily: string
  bodyFamily: string
}

export interface StyleMood {
  id: string
  name: string
  description: string
}

export const COLOR_PALETTES: ColorPalette[] = [
  { id: 'coastal', name: 'Coastal', description: 'Sea blues and sand', colors: { primary: '#0F4C81', secondary: '#7FA7BE', accent: '#E8B86D', background: '#F7F4EF' } },
  { id: 'forest', name: 'Forest', description: 'Deep greens and moss', colors: { primary: '#1F3D2B', secondary: '#5C7A6A', accent: '#C4A35A', background: '#F4F1EA' } },
  { id: 'ink', name: 'Ink', description: 'Near-black and paper', colors: { primary: '#111827', secondary: '#4B5563', accent: '#2563EB', background: '#FFFFFF' } },
  { id: 'warm-neutral', name: 'Warm Neutral', description: 'Stone, cream, clay', colors: { primary: '#4A3728', secondary: '#A08B76', accent: '#C45C26', background: '#FAF6F1' } },
  { id: 'bold-coral', name: 'Bold Coral', description: 'High-energy contrast', colors: { primary: '#1A1A1A', secondary: '#5C5C5C', accent: '#E85D4C', background: '#FFF8F5' } },
  { id: 'soft-sage', name: 'Soft Sage', description: 'Calm greens and linen', colors: { primary: '#3F5D50', secondary: '#8AA396', accent: '#D4A373', background: '#F6F4EF' } },
  { id: 'midnight', name: 'Midnight', description: 'Navy with gold accent', colors: { primary: '#0B1D36', secondary: '#3D5A80', accent: '#D4AF37', background: '#F5F7FA' } },
  { id: 'sunset', name: 'Sunset', description: 'Terracotta and dusk', colors: { primary: '#6B2D39', secondary: '#C97B63', accent: '#E8A87C', background: '#FFF6F0' } },
]

export const FONT_PAIRINGS: FontPairing[] = [
  { id: 'editorial', name: 'Editorial', description: 'Serif headlines, clean body', heading: 'Playfair Display', body: 'Source Sans 3', headingFamily: '"Playfair Display", serif', bodyFamily: '"Source Sans 3", sans-serif' },
  { id: 'warm', name: 'Warm', description: 'Soft serif with friendly sans', heading: 'Fraunces', body: 'Nunito Sans', headingFamily: 'Fraunces, serif', bodyFamily: '"Nunito Sans", sans-serif' },
  { id: 'modern', name: 'Modern', description: 'Geometric and highly readable', heading: 'Outfit', body: 'Atkinson Hyperlegible', headingFamily: 'Outfit, sans-serif', bodyFamily: '"Atkinson Hyperlegible", sans-serif' },
  { id: 'classic', name: 'Classic', description: 'Traditional and trustworthy', heading: 'Libre Baskerville', body: 'Karla', headingFamily: '"Libre Baskerville", serif', bodyFamily: 'Karla, sans-serif' },
  { id: 'bold', name: 'Bold', description: 'Strong sans pairing', heading: 'Space Grotesk', body: 'Inter', headingFamily: '"Space Grotesk", sans-serif', bodyFamily: 'Inter, sans-serif' },
  { id: 'luxury', name: 'Luxury', description: 'Elegant serif with quiet body', heading: 'Cormorant Garamond', body: 'Mulish', headingFamily: '"Cormorant Garamond", serif', bodyFamily: 'Mulish, sans-serif' },
  { id: 'playful', name: 'Playful', description: 'Rounded and approachable', heading: 'Fredoka', body: 'Nunito', headingFamily: 'Fredoka, sans-serif', bodyFamily: 'Nunito, sans-serif' },
  { id: 'minimal', name: 'Minimal', description: 'Tight, contemporary serif + sans', heading: 'DM Serif Display', body: 'DM Sans', headingFamily: '"DM Serif Display", serif', bodyFamily: '"DM Sans", sans-serif' },
]

export const STYLE_MOODS: StyleMood[] = [
  { id: 'minimal', name: 'Minimal', description: 'Lots of space, simple layouts, few colours.' },
  { id: 'editorial', name: 'Editorial', description: 'Magazine-like type, strong headlines, photography-led.' },
  { id: 'bold', name: 'Bold', description: 'Big type, high contrast, confident and modern.' },
  { id: 'warm', name: 'Warm', description: 'Approachable, earthy, human and inviting.' },
  { id: 'playful', name: 'Playful', description: 'Friendly shapes, brighter colour, a bit of personality.' },
  { id: 'luxury', name: 'Luxury', description: 'Refined, quiet, premium — less is more.' },
]

export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;600&family=DM+Serif+Display&family=Fraunces:wght@600;700&family=Fredoka:wght@500;600&family=Inter:wght@400;600&family=Karla:wght@400;600&family=Libre+Baskerville:wght@400;700&family=Mulish:wght@400;600&family=Nunito:wght@400;600&family=Nunito+Sans:wght@400;600&family=Outfit:wght@500;700&family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap'

export const CONTACT_ROLES = ['Owner', 'Director', 'Manager', 'Marketing', 'Operations', 'Other']

export const REGISTRARS = [
  { id: 'crazy_domains', label: 'Crazy Domains' },
  { id: 'godaddy', label: 'GoDaddy' },
  { id: 'google', label: 'Google Domains / Squarespace' },
  { id: 'cloudflare', label: 'Cloudflare' },
  { id: 'namecheap', label: 'Namecheap' },
  { id: 'other', label: 'Other' },
  { id: 'unsure', label: 'Not sure' },
]

export const PAGE_OPTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
  { id: 'blog', label: 'Blog' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'faq', label: 'FAQ' },
  { id: 'shop', label: 'Shop' },
]

export const FEATURE_OPTIONS = [
  { id: 'contact_form', label: 'Contact form' },
  { id: 'booking', label: 'Booking / calendar' },
  { id: 'shop', label: 'Online shop' },
  { id: 'blog', label: 'Blog / news' },
  { id: 'gallery', label: 'Photo gallery' },
  { id: 'map', label: 'Map / locations' },
  { id: 'newsletter', label: 'Newsletter signup' },
  { id: 'quotes', label: 'Quote / enquiry form' },
  { id: 'members', label: 'Member login' },
]

export const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'bold', label: 'Bold' },
  { id: 'calm', label: 'Calm' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'unsure', label: 'Not sure — happy for Appdoers to choose' },
]

export function resolvedColors(answers: IntakeAnswers): IntakeColors | null {
  if (answers.brand.color_mode === 'custom') return answers.brand.custom_colors
  if (answers.brand.color_mode === 'palette' && answers.brand.palette_id) {
    return COLOR_PALETTES.find((p) => p.id === answers.brand.palette_id)?.colors ?? null
  }
  return null
}

export function resolvedFonts(answers: IntakeAnswers): { heading: string; body: string } | null {
  if (answers.brand.font_mode === 'custom') {
    const heading = answers.brand.custom_heading_font.trim()
    const body = answers.brand.custom_body_font.trim()
    if (!heading && !body) return null
    return { heading: heading || body, body: body || heading }
  }
  if (answers.brand.font_mode === 'pairing' && answers.brand.pairing_id) {
    const pairing = FONT_PAIRINGS.find((p) => p.id === answers.brand.pairing_id)
    if (!pairing) return null
    return { heading: pairing.heading, body: pairing.body }
  }
  return null
}

export function paletteById(id: string | null | undefined) {
  return COLOR_PALETTES.find((p) => p.id === id) ?? null
}

export function pairingById(id: string | null | undefined) {
  return FONT_PAIRINGS.find((p) => p.id === id) ?? null
}

export function moodById(id: string | null | undefined) {
  if (!id || id === 'unsure') return null
  return STYLE_MOODS.find((m) => m.id === id) ?? null
}
