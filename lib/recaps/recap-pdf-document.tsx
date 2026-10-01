import fs from 'fs'
import React from 'react'
import { Circle, Document, Image, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { RecapStats, RecapStatsCategory, RecapStatsTask, RecapWorkItem } from '@/lib/recaps/types'
import {
  PDF_CONTRACT_MUTED,
  PDF_CONTRACT_PURPLE,
  PDF_CONTRACT_PURPLE_TINT,
  PDF_CONTRACT_RULE,
} from '@/lib/pdf/brand'
import { PDF_LOGO_PATH, PDF_LOGO_STYLE } from '@/lib/pdf/assets'
import { APPDOERS_COMPANY_DEFAULTS } from '@/lib/pdf/company-defaults'
import { formatCurrency, formatHours } from '@/lib/utils/format'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const company = APPDOERS_COMPANY_DEFAULTS

// Contract documents use Arial; Helvetica is the built-in PDF equivalent.
const FONT = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'

const PURPLE = PDF_CONTRACT_PURPLE
const TINT = PDF_CONTRACT_PURPLE_TINT
const RULE = PDF_CONTRACT_RULE
const MUTED = PDF_CONTRACT_MUTED
const BLACK = '#000000'
const PURPLE_SOFT = '#C9B0F7'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  Development: { label: 'Website development', color: PURPLE },
  Design: { label: 'Design', color: '#A855F7' },
  Content: { label: 'Content', color: '#C026D3' },
  Maintenance: { label: 'Fixes and maintenance', color: '#3B0A8C' },
  Meetings: { label: 'Planning and meetings', color: '#8B8BF5' },
  SEO: { label: 'Search visibility (SEO)', color: '#0D9488' },
  Strategy: { label: 'Strategy', color: '#E11D74' },
  Other: { label: 'General support', color: '#9CA3AF' },
}

const STATUS_LABELS: Record<string, string> = {
  closed: 'Done',
  in_progress: 'In progress',
  awaiting_review: 'Awaiting review',
  open: 'Scheduled',
}

function categoryMeta(name: string) {
  return CATEGORY_META[name] ?? CATEGORY_META.Other
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontFamily: FONT,
    fontSize: 10,
    color: BLACK,
    backgroundColor: '#ffffff',
  },
  header: {
    position: 'absolute',
    top: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSite: { fontFamily: FONT_BOLD, fontSize: 8.5, color: PURPLE, textAlign: 'right' },
  headerAddress: { fontSize: 8, color: MUTED, textAlign: 'right', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.75,
    borderTopColor: RULE,
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: BLACK },
  footerLabel: { fontFamily: FONT_BOLD, color: PURPLE },

  eyebrow: { fontFamily: FONT_BOLD, fontSize: 9, color: PURPLE, letterSpacing: 1.5, marginBottom: 6 },
  title: { fontFamily: FONT_BOLD, fontSize: 34, color: BLACK, lineHeight: 1.1 },
  subtitle: { fontSize: 12, color: BLACK, marginTop: 8 },
  meta: { fontSize: 9, color: MUTED, marginTop: 3 },
  headline: { fontFamily: FONT_BOLD, fontSize: 16, color: PURPLE, marginTop: 22, marginBottom: 12 },

  section: { marginTop: 22 },
  h2: { fontFamily: FONT_BOLD, fontSize: 15, color: PURPLE, marginBottom: 10 },
  h3: { fontFamily: FONT_BOLD, fontSize: 11, color: PURPLE, marginBottom: 6 },
  paragraph: { fontSize: 10, lineHeight: 1.6, color: BLACK, marginBottom: 7 },
  muted: { fontSize: 9, color: MUTED },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  numberTile: {
    width: '48.5%',
    backgroundColor: TINT,
    borderRadius: 6,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberValue: { fontFamily: FONT_BOLD, fontSize: 30, color: PURPLE },
  numberLabel: { fontSize: 10, color: BLACK, marginTop: 2 },

  savings: {
    backgroundColor: PURPLE,
    borderRadius: 6,
    padding: 20,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsEyebrow: { fontFamily: FONT_BOLD, fontSize: 9, color: '#E9DDFD', letterSpacing: 1 },
  savingsAmount: { fontFamily: FONT_BOLD, fontSize: 34, color: '#ffffff', marginTop: 4 },
  savingsNote: { fontSize: 10, color: '#ffffff', marginTop: 6, lineHeight: 1.5 },

  compareCard: {
    width: '48.5%',
    borderWidth: 0.75,
    borderColor: RULE,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 14,
  },
  compareLabel: { fontFamily: FONT_BOLD, fontSize: 10, color: BLACK, marginBottom: 10 },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  compareRowLabel: { width: 62, fontSize: 8.5, color: MUTED },
  compareTrack: { flex: 1, height: 10, backgroundColor: '#F5F5F5', borderRadius: 2 },
  compareValue: { width: 44, fontSize: 9, fontFamily: FONT_BOLD, textAlign: 'right' },
  compareDelta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  compareDeltaText: { fontFamily: FONT_BOLD, fontSize: 10, marginLeft: 5 },

  callout: {
    backgroundColor: TINT,
    borderLeftWidth: 3,
    borderLeftColor: PURPLE,
    borderLeftStyle: 'solid',
    padding: 14,
  },

  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    borderBottomStyle: 'solid',
    paddingVertical: 9,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeText: { fontFamily: FONT_BOLD, fontSize: 11, color: '#ffffff' },
  highlightTitle: { fontFamily: FONT_BOLD, fontSize: 11, color: BLACK },
  highlightMeta: { fontSize: 9, color: MUTED, marginTop: 2 },

  chartRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, marginLeft: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  swatch: { width: 9, height: 9, borderRadius: 2, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 10, color: BLACK },
  legendValue: { width: 74, fontSize: 9.5, color: MUTED, textAlign: 'right' },

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 6,
    marginTop: 8,
  },
  categoryTitle: { flex: 1, fontFamily: FONT_BOLD, fontSize: 11, color: BLACK },
  categoryMeta: { fontSize: 9, color: MUTED },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  taskCard: {
    width: '49%',
    backgroundColor: '#FAFAFA',
    borderRadius: 4,
    padding: 8,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskTitle: { fontSize: 9.5, color: BLACK, lineHeight: 1.35 },
  taskSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  hoursPill: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: TINT },
  hoursPillText: { fontFamily: FONT_BOLD, fontSize: 8, color: PURPLE },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  milestoneText: { fontSize: 10.5, color: BLACK, marginLeft: 8 },

  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: PURPLE,
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    borderBottomStyle: 'solid',
  },
  th: { fontFamily: FONT_BOLD, fontSize: 8.5, color: PURPLE },
  td: { fontSize: 8.5, color: BLACK },
  colTask: { flex: 1, paddingRight: 8 },
  colArea: { width: 120 },
  colStatus: { width: 80 },
  colHours: { width: 44, textAlign: 'right' },
})

// ─── Header and footer (match the contract templates) ───────────────────────

let logoData: { data: Buffer; format: 'png' } | null | undefined

/** Embed the logo bytes directly; file paths are unreliable across platforms. */
function loadLogo() {
  if (logoData === undefined) {
    try {
      logoData = { data: fs.readFileSync(PDF_LOGO_PATH), format: 'png' }
    } catch {
      logoData = null
    }
  }
  return logoData
}

function ContractHeader() {
  const logo = loadLogo()
  return (
    <View style={styles.header} fixed>
      {logo ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={logo} style={PDF_LOGO_STYLE} />
      ) : (
        <Text style={{ fontFamily: FONT_BOLD, fontSize: 16, color: PURPLE }}>Appdoers</Text>
      )}
      <View>
        <Text style={styles.headerSite}>Appdoers.co.nz</Text>
        <Text style={styles.headerAddress}>49 Braebrook Drive, Netherby, Ashburton 7700, New Zealand</Text>
      </View>
    </View>
  )
}

function ContractFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        <Text style={styles.footerLabel}>T: </Text>+64 22 5060 870{'    '}
        <Text style={styles.footerLabel}>E: </Text>contact@appdoers.co.nz{'    '}
        <Text style={styles.footerLabel}>W: </Text>www.appdoers.co.nz
      </Text>
      <Text style={styles.footerText} render={({ pageNumber }) => `Page | ${pageNumber}`} />
    </View>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <Svg width={38} height={38} viewBox="0 0 38 38" style={{ marginRight: 14 }}>
      <Circle cx={19} cy={19} r={19} fill={PURPLE} />
      {children}
    </Svg>
  )
}

function IconCheck() {
  return (
    <IconFrame>
      <Path d="M11 19.5l5 5 11-11" stroke="#ffffff" strokeWidth={3} fill="none" />
    </IconFrame>
  )
}

function IconClock() {
  return (
    <IconFrame>
      <Circle cx={19} cy={19} r={9.5} stroke="#ffffff" strokeWidth={2.4} fill="none" />
      <Path d="M19 13.5V19l4 2.5" stroke="#ffffff" strokeWidth={2.4} fill="none" />
    </IconFrame>
  )
}

function IconFlag({ size = 38 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38" style={size === 38 ? { marginRight: 14 } : {}}>
      <Circle cx={19} cy={19} r={19} fill={PURPLE} />
      <Path d="M13.5 28V10.5M13.5 11h11l-2.5 4 2.5 4h-11" stroke="#ffffff" strokeWidth={2.4} fill="none" />
    </Svg>
  )
}

function IconGrid() {
  return (
    <IconFrame>
      <Rect x={11} y={11} width={7} height={7} rx={1} fill="#ffffff" />
      <Rect x={20} y={11} width={7} height={7} rx={1} fill="#ffffff" />
      <Rect x={11} y={20} width={7} height={7} rx={1} fill="#ffffff" />
      <Rect x={20} y={20} width={7} height={7} rx={1} fill={PURPLE_SOFT} />
    </IconFrame>
  )
}

function IconSavings() {
  return (
    <Svg width={58} height={58} viewBox="0 0 58 58" style={{ marginRight: 18 }}>
      <Circle cx={29} cy={29} r={29} fill="#ffffff" />
      <Rect x={16} y={34} width={6} height={10} rx={1} fill={PURPLE} />
      <Rect x={26} y={26} width={6} height={18} rx={1} fill={PURPLE} />
      <Rect x={36} y={17} width={6} height={27} rx={1} fill={PURPLE} />
    </Svg>
  )
}

function DeltaArrow({ up, color }: { up: boolean; color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Path d={up ? 'M6 1.5L11 8H1z' : 'M6 10.5L11 4H1z'} fill={color} />
    </Svg>
  )
}

// ─── Charts ─────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutSlice(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0
  const o1 = polar(cx, cy, outer, start)
  const o2 = polar(cx, cy, outer, end)
  const i1 = polar(cx, cy, inner, end)
  const i2 = polar(cx, cy, inner, start)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ')
}

function DonutChart({ categories, totalHours }: { categories: RecapStatsCategory[]; totalHours: number }) {
  const size = 150
  const c = size / 2
  const outer = 70
  const inner = 46
  const slices = categories.filter((cat) => cat.hours > 0)
  let angle = 0

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={(outer + inner) / 2} stroke="#F5F5F5" strokeWidth={outer - inner} fill="none" />
        {slices.length === 1 ? (
          <Circle
            cx={c}
            cy={c}
            r={(outer + inner) / 2}
            stroke={categoryMeta(slices[0].name).color}
            strokeWidth={outer - inner}
            fill="none"
          />
        ) : (
          slices.map((cat) => {
            const sweep = (cat.hours / totalHours) * 360
            const start = angle
            angle += sweep
            return (
              <Path
                key={cat.name}
                d={donutSlice(c, c, outer, inner, start, start + Math.max(sweep - 0.8, 0.1))}
                fill={categoryMeta(cat.name).color}
              />
            )
          })
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: FONT_BOLD, fontSize: 18, color: PURPLE }}>{formatHours(totalHours, '0h')}</Text>
        <Text style={{ fontSize: 8, color: MUTED }}>of work</Text>
      </View>
    </View>
  )
}

function WeeklyBars({ weeks }: { weeks: { label: string; hours: number }[] }) {
  const barArea = 70
  const max = Math.max(...weeks.map((w) => w.hours), 1)

  return (
    <View>
      <View style={{ flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: RULE, borderBottomStyle: 'solid' }}>
        {weeks.map((w) => {
          const h = w.hours > 0 ? Math.max(4, (barArea * w.hours) / max) : 0
          return (
            <View key={w.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: barArea + 16 }}>
              <Text style={{ fontFamily: FONT_BOLD, fontSize: 8, color: BLACK, marginBottom: 3 }}>
                {formatHours(w.hours, '0h')}
              </Text>
              <View
                style={{
                  width: 40,
                  height: h,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  backgroundColor: w.hours === max ? PURPLE : PURPLE_SOFT,
                }}
              />
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {weeks.map((w) => (
          <Text key={w.label} style={{ flex: 1, textAlign: 'center', fontSize: 7.5, color: MUTED }}>
            {`Days ${w.label}`}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─── Building blocks ────────────────────────────────────────────────────────

function NumberTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.numberTile} wrap={false}>
      {icon}
      <View>
        <Text style={styles.numberValue}>{value}</Text>
        <Text style={styles.numberLabel}>{label}</Text>
      </View>
    </View>
  )
}

function SavingsPanel({ savings }: { savings: NonNullable<RecapStats['savings']> }) {
  return (
    <View style={styles.savings} wrap={false}>
      <IconSavings />
      <View style={{ flex: 1 }}>
        <Text style={styles.savingsEyebrow}>HOW MUCH YOUR PLAN SAVED YOU THIS MONTH</Text>
        <Text style={styles.savingsAmount}>{formatCurrency(savings.amount)}</Text>
        <Text style={styles.savingsNote}>
          {`${formatHours(savings.nonBillableHours, '0h')} of work at ${formatCurrency(savings.hourlyRate)} per hour, included in your Full plan at no additional cost.`}
        </Text>
      </View>
    </View>
  )
}

function CompareCard({
  label,
  current,
  previous,
  format,
  unit,
}: {
  label: string
  current: number
  previous: number
  format: (n: number) => string
  unit: (diff: number) => string
}) {
  const max = Math.max(current, previous, 1)
  const diff = Math.round((current - previous) * 100) / 100
  const up = diff >= 0
  const color = up ? PURPLE : MUTED
  const unitLabel = unit(Math.abs(diff))
  const deltaText =
    diff === 0
      ? 'Same as last month'
      : `${up ? '+' : '-'}${format(Math.abs(diff))}${unitLabel ? ` ${unitLabel}` : ''} on last month`

  const bar = (value: number, fill: string) => (
    <View style={styles.compareTrack}>
      <View style={{ width: `${(value / max) * 100}%`, height: 10, backgroundColor: fill, borderRadius: 2 }} />
    </View>
  )

  return (
    <View style={styles.compareCard} wrap={false}>
      <Text style={styles.compareLabel}>{label}</Text>
      <View style={styles.compareRow}>
        <Text style={styles.compareRowLabel}>This month</Text>
        {bar(current, PURPLE)}
        <Text style={styles.compareValue}>{format(current)}</Text>
      </View>
      <View style={styles.compareRow}>
        <Text style={styles.compareRowLabel}>Last month</Text>
        {bar(previous, PURPLE_SOFT)}
        <Text style={[styles.compareValue, { color: MUTED }]}>{format(previous)}</Text>
      </View>
      <View style={styles.compareDelta}>
        {diff !== 0 ? <DeltaArrow up={up} color={color} /> : null}
        <Text style={[styles.compareDeltaText, { color }]}>{deltaText}</Text>
      </View>
    </View>
  )
}

function TaskCard({ task }: { task: RecapStatsTask }) {
  const status = STATUS_LABELS[task.status] ?? task.status
  return (
    <View style={styles.taskCard} wrap={false}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskSub}>{[status, task.projectName].filter(Boolean).join(' · ')}</Text>
      </View>
      {task.hours > 0 ? (
        <View style={styles.hoursPill}>
          <Text style={styles.hoursPillText}>{formatHours(task.hours)}</Text>
        </View>
      ) : null}
    </View>
  )
}

function WorkItemCard({ item }: { item: RecapWorkItem }) {
  return (
    <View style={styles.taskCard} wrap={false}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{item.description}</Text>
      </View>
    </View>
  )
}

function CategoryHeader({ name, count, hours }: { name: string; count: number; hours?: number }) {
  const meta = categoryMeta(name)
  const parts = [`${count} ${count === 1 ? 'item' : 'items'}`]
  if (hours && hours > 0) parts.push(formatHours(hours))
  return (
    <View style={[styles.categoryHeader, { borderBottomColor: meta.color }]} wrap={false} minPresenceAhead={48}>
      <View style={[styles.swatch, { backgroundColor: meta.color }]} />
      <Text style={styles.categoryTitle}>{meta.label}</Text>
      <Text style={styles.categoryMeta}>{parts.join(' · ')}</Text>
    </View>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <View>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
    </View>
  )
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    map.set(k, [...(map.get(k) ?? []), item])
  }
  return [...map.entries()]
}

function monthHeadline(tasksDone: number, hours: number, milestones: number): string {
  if (milestones > 0) return 'A milestone month for your website'
  if (tasksDone >= 8 || hours >= 15) return 'A big month for your website'
  if (tasksDone > 0 || hours > 0) return 'Steady progress on your website'
  return 'Your monthly website update'
}

// ─── Document ───────────────────────────────────────────────────────────────

export interface RecapPDFProps {
  clientName: string
  month: number
  year: number
  introText: string | null
  workCompleted: RecapWorkItem[]
  performanceNotes: string | null
  comingNext: string | null
  sentAt: string | null
  stats: RecapStats | null
}

function formatDate(value: string | null): string {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function RecapPDFDocument({
  clientName,
  month,
  year,
  introText,
  workCompleted,
  performanceNotes,
  comingNext,
  sentAt,
  stats,
}: RecapPDFProps) {
  const safeMonth = Math.min(12, Math.max(1, month))
  const monthName = MONTHS[safeMonth - 1]
  const periodLabel = `${monthName} ${year}`

  const tasks = stats?.tasks ?? []
  const tasksDone = stats ? stats.tasksCompleted : workCompleted.length
  const hours = stats?.hoursLogged ?? 0
  const milestones = stats?.phasesCompleted ?? []
  const categories = stats?.categories ?? []
  const areaCount = stats ? categories.length : new Set(workCompleted.map((w) => w.category || 'Other')).size
  const savings = stats?.savings && stats.savings.amount > 0 ? stats.savings : null
  const previous = stats?.previous ?? null
  const topTasks = tasks.filter((t) => t.hours > 0).slice(0, 3)
  const showCharts = Boolean(stats) && hours > 0

  const hasIntro = Boolean(introText?.trim())
  const hasPerformance = Boolean(performanceNotes?.trim())
  const hasComingNext = Boolean(comingNext?.trim())
  const hasWork = tasks.length > 0 || workCompleted.length > 0

  return (
    <Document
      title={`${periodLabel} Recap - ${clientName}`}
      author={company.legalName}
      subject={`Monthly recap for ${clientName}`}
      creator="Appdoers Hub"
    >
      <Page size="A4" style={styles.page}>
        <ContractHeader />
        <ContractFooter />

        {/* ── Month in numbers ── */}
        <Text style={styles.eyebrow}>MONTHLY RECAP</Text>
        <Text style={styles.title}>{`Your ${periodLabel} Recap`}</Text>
        <Text style={styles.subtitle}>{clientName}</Text>
        <Text style={styles.meta}>{`Prepared by ${company.legalName} · ${formatDate(sentAt)}`}</Text>

        <Text style={styles.headline}>{monthHeadline(tasksDone, hours, milestones.length)}</Text>

        <View style={styles.grid}>
          <NumberTile
            icon={<IconCheck />}
            value={String(tasksDone)}
            label={tasksDone === 1 ? 'task completed' : 'tasks completed'}
          />
          <NumberTile icon={<IconClock />} value={formatHours(hours, '0h')} label="of work on your website" />
          <NumberTile
            icon={<IconFlag />}
            value={String(milestones.length)}
            label={milestones.length === 1 ? 'milestone reached' : 'milestones reached'}
          />
          <NumberTile
            icon={<IconGrid />}
            value={String(areaCount)}
            label={areaCount === 1 ? 'area of work' : 'areas of work'}
          />
        </View>

        {savings ? <SavingsPanel savings={savings} /> : null}

        {previous ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Compared to last month</Text>
            <View style={styles.grid}>
              <CompareCard
                label="Tasks completed"
                current={tasksDone}
                previous={previous.tasksCompleted}
                format={(n) => String(n)}
                unit={(d) => (d === 1 ? 'task' : 'tasks')}
              />
              <CompareCard
                label="Hours of work"
                current={hours}
                previous={previous.hoursLogged}
                format={(n) => formatHours(n, '0h')}
                unit={() => ''}
              />
            </View>
          </View>
        ) : null}

        {/* ── Story ── */}
        {hasIntro ? (
          <View style={styles.section}>
            <View minPresenceAhead={80}>
              <Text style={styles.h2}>Overview</Text>
            </View>
            <Paragraphs text={introText!.trim()} />
          </View>
        ) : null}

        {topTasks.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Highlights</Text>
            {topTasks.map((task, i) => (
              <View key={`${task.title}-${i}`} style={styles.highlightCard}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(i + 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightTitle}>{task.title}</Text>
                  <Text style={styles.highlightMeta}>
                    {`${categoryMeta(task.category).label} · ${formatHours(task.hours)}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {showCharts ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Where the time went</Text>
            <View style={styles.chartRow}>
              <DonutChart categories={categories} totalHours={hours} />
              <View style={styles.legend}>
                {categories
                  .filter((cat) => cat.hours > 0)
                  .map((cat) => (
                    <View key={cat.name} style={styles.legendRow}>
                      <View style={[styles.swatch, { backgroundColor: categoryMeta(cat.name).color }]} />
                      <Text style={styles.legendLabel}>{categoryMeta(cat.name).label}</Text>
                      <Text style={styles.legendValue}>
                        {`${formatHours(cat.hours)} · ${Math.round((cat.hours / hours) * 100)}%`}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
            {stats!.weeklyHours.length > 0 ? (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.h3}>Hours through the month</Text>
                <WeeklyBars weeks={stats!.weeklyHours} />
              </View>
            ) : null}
          </View>
        ) : null}

        {milestones.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Milestones reached</Text>
            {milestones.map((m) => (
              <View key={m} style={styles.milestoneRow}>
                <IconFlag size={18} />
                <Text style={styles.milestoneText}>{`${m.charAt(0).toUpperCase()}${m.slice(1)} phase complete`}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasWork ? (
          <View style={styles.section}>
            <View minPresenceAhead={120}>
              <Text style={styles.h2}>Work completed</Text>
            </View>
            {tasks.length > 0
              ? groupBy(tasks, (t) => t.category).map(([category, items]) => (
                  <View key={category} style={{ marginBottom: 8 }}>
                    <CategoryHeader
                      name={category}
                      count={items.length}
                      hours={items.reduce((sum, t) => sum + t.hours, 0)}
                    />
                    <View style={styles.cardGrid}>
                      {items.map((task, i) => (
                        <TaskCard key={`${category}-${i}`} task={task} />
                      ))}
                    </View>
                  </View>
                ))
              : groupBy(workCompleted, (w) => w.category || 'Other').map(([category, items]) => (
                  <View key={category} style={{ marginBottom: 8 }}>
                    <CategoryHeader name={category} count={items.length} />
                    <View style={styles.cardGrid}>
                      {items.map((item, i) => (
                        <WorkItemCard key={`${category}-${i}`} item={item} />
                      ))}
                    </View>
                  </View>
                ))}
          </View>
        ) : null}

        {hasPerformance ? (
          <View style={styles.section}>
            <Text style={styles.h2}>Additional notes</Text>
            <Paragraphs text={performanceNotes!.trim()} />
          </View>
        ) : null}

        {hasComingNext ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Coming up next month</Text>
            <View style={styles.callout}>
              <Paragraphs text={comingNext!.trim()} />
            </View>
          </View>
        ) : null}

        {tasks.length > 0 ? (
          <View style={styles.section} break>
            <Text style={styles.h2}>Full task list</Text>
            <Text style={[styles.muted, { marginBottom: 8 }]}>
              All tasks worked on during the period, with hours logged.
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colTask]}>Task</Text>
              <Text style={[styles.th, styles.colArea]}>Area</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colHours]}>Hours</Text>
            </View>
            {tasks.map((task, i) => (
              <View key={`row-${i}`} style={styles.tableRow} wrap={false}>
                <Text style={[styles.td, styles.colTask]}>{task.title}</Text>
                <Text style={[styles.td, styles.colArea]}>{categoryMeta(task.category).label}</Text>
                <Text style={[styles.td, styles.colStatus]}>{STATUS_LABELS[task.status] ?? task.status}</Text>
                <Text style={[styles.td, styles.colHours]}>{formatHours(task.hours)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
