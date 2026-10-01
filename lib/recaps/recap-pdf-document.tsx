import React from 'react'
import {
  Circle,
  Document,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from '@react-pdf/renderer'
import type { RecapStats, RecapStatsCategory, RecapStatsTask, RecapWorkItem } from '@/lib/recaps/types'
import {
  PDF_BORDER,
  PDF_BRAND_DEEP,
  PDF_BRAND_HIGHLIGHT,
  PDF_BRAND_LIGHT,
  PDF_BRAND_MUTED,
  PDF_BRAND_PRIMARY,
  PDF_BRAND_SECONDARY,
  PDF_SLATE_400,
  PDF_SLATE_600,
  PDF_SLATE_700,
  PDF_SLATE_900,
} from '@/lib/pdf/brand'
import { APPDOERS_COMPANY_DEFAULTS } from '@/lib/pdf/company-defaults'
import { pdfFontStyles } from '@/lib/pdf/fonts'
import {
  PdfLetterhead,
  PdfPageFooter,
  PdfPlainText,
  PdfSectionTitle,
  pdfHeaderTextStyles,
} from '@/lib/pdf/primitives'
import { formatCurrency, formatHours } from '@/lib/utils/format'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const company = APPDOERS_COMPANY_DEFAULTS

/** Plain-language names and chart colours for each work category. */
const CATEGORY_META: Record<string, { label: string; color: string; tint: string }> = {
  Development: { label: 'Website development', color: PDF_BRAND_PRIMARY, tint: PDF_BRAND_LIGHT },
  Design: { label: 'Design', color: '#8b5cf6', tint: '#f5f3ff' },
  Content: { label: 'Content', color: '#f59e0b', tint: '#fffbeb' },
  Maintenance: { label: 'Fixes and maintenance', color: PDF_BRAND_SECONDARY, tint: '#e0f2f1' },
  Meetings: { label: 'Planning and meetings', color: '#6366f1', tint: '#eef2ff' },
  SEO: { label: 'Search visibility (SEO)', color: '#22c55e', tint: '#f0fdf4' },
  Strategy: { label: 'Strategy', color: '#e11d48', tint: '#fff1f2' },
  Other: { label: 'General support', color: PDF_SLATE_400, tint: '#f1f5f9' },
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
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    ...pdfFontStyles.regular,
    fontSize: 10.5,
    color: PDF_SLATE_700,
    backgroundColor: '#ffffff',
  },
  body: { paddingHorizontal: 48, paddingTop: 4 },
  section: { marginBottom: 22 },
  headline: { fontSize: 20, ...pdfFontStyles.bold, color: PDF_BRAND_DEEP, marginBottom: 4 },
  subhead: { fontSize: 11, color: PDF_SLATE_600, marginBottom: 18, lineHeight: 1.5 },
  paragraph: { fontSize: 10.5, lineHeight: 1.7, color: PDF_SLATE_700, marginBottom: 6 },
  muted: { fontSize: 9, color: PDF_SLATE_400 },
  emptyState: { fontSize: 10.5, lineHeight: 1.6, color: PDF_SLATE_400, marginBottom: 20 },

  tilesRow: { flexDirection: 'row', marginBottom: 20 },
  tile: { flex: 1, borderRadius: 10, padding: 12, marginRight: 10 },
  tileLast: { marginRight: 0 },
  tileValue: { fontSize: 24, ...pdfFontStyles.bold, marginTop: 8 },
  tileLabel: { fontSize: 9, ...pdfFontStyles.semibold, marginTop: 2 },

  savingsCard: {
    backgroundColor: PDF_BRAND_DEEP,
    borderRadius: 12,
    padding: 20,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsEyebrow: {
    fontSize: 8.5,
    ...pdfFontStyles.bold,
    color: PDF_BRAND_HIGHLIGHT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  savingsAmount: { fontSize: 34, ...pdfFontStyles.bold, color: '#ffffff', marginTop: 4 },
  savingsMath: { fontSize: 10, color: PDF_BRAND_MUTED, marginTop: 4 },
  savingsNote: { fontSize: 10, color: '#ffffff', marginTop: 8, lineHeight: 1.5 },

  noteCard: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: PDF_BRAND_PRIMARY,
    borderLeftStyle: 'solid',
    padding: 14,
    borderRadius: 4,
  },

  chartRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, marginLeft: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 10, color: PDF_SLATE_900, ...pdfFontStyles.medium },
  legendValue: { width: 70, fontSize: 9.5, color: PDF_SLATE_600, textAlign: 'right' },
  chartCaption: { fontSize: 9, color: PDF_SLATE_600, ...pdfFontStyles.semibold, marginTop: 16, marginBottom: 6 },

  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  highlightBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PDF_BRAND_HIGHLIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  highlightBadgeText: { fontSize: 11, ...pdfFontStyles.bold, color: PDF_BRAND_DEEP },
  highlightTitle: { fontSize: 11, ...pdfFontStyles.semibold, color: PDF_SLATE_900 },
  highlightMeta: { fontSize: 9, color: PDF_SLATE_600, marginTop: 2 },

  categoryBlock: { marginBottom: 14 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryHeaderText: { flex: 1, fontSize: 10.5, ...pdfFontStyles.bold },
  categoryHeaderMeta: { fontSize: 9, ...pdfFontStyles.semibold },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  taskCard: {
    width: '49%',
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 9,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskCardTitle: { fontSize: 9.5, color: PDF_SLATE_900, lineHeight: 1.4, ...pdfFontStyles.medium },
  taskCardSub: { fontSize: 8, color: PDF_SLATE_400, marginTop: 2 },
  hoursPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  hoursPillText: { fontSize: 8, ...pdfFontStyles.semibold, color: PDF_SLATE_600 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  milestoneText: { fontSize: 10.5, color: PDF_SLATE_900, ...pdfFontStyles.medium, marginLeft: 8 },

  nextBox: {
    backgroundColor: PDF_BRAND_LIGHT,
    borderWidth: 1,
    borderColor: PDF_BRAND_PRIMARY,
    borderStyle: 'solid',
    borderRadius: 12,
    padding: 16,
  },
  nextTitle: { fontSize: 13, ...pdfFontStyles.bold, color: PDF_BRAND_DEEP, marginBottom: 8 },

  table: { borderWidth: 1, borderColor: PDF_BORDER, borderStyle: 'solid', borderRadius: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 6, paddingHorizontal: 8 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_BORDER,
    borderTopStyle: 'solid',
  },
  th: { fontSize: 7.5, ...pdfFontStyles.bold, color: PDF_SLATE_600, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 8.5, color: PDF_SLATE_700 },
  colTask: { flex: 1, paddingRight: 8 },
  colArea: { width: 110 },
  colStatus: { width: 80 },
  colHours: { width: 44, textAlign: 'right' },
})

// ─── Icons (PDF fonts have no emoji, so icons are tiny SVGs) ─────────────────

function IconCheck({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path d="M7 12.5l3.2 3.2L17 9" stroke="#ffffff" strokeWidth={2.4} fill="none" />
    </Svg>
  )
}

function IconClock({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path d="M12 6.5V12l3.5 2.5" stroke="#ffffff" strokeWidth={2.2} fill="none" />
    </Svg>
  )
}

function IconFlag({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path d="M8.5 18V6.5M8.5 7h7l-1.6 2.6L15.5 12h-7" stroke="#ffffff" strokeWidth={1.8} fill="none" />
    </Svg>
  )
}

function IconSpark({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={color} />
      <Path d="M12 5.5l1.6 4.9 4.9 1.6-4.9 1.6L12 18.5l-1.6-4.9L5.5 12l4.9-1.6z" fill="#ffffff" />
    </Svg>
  )
}

function IconSavings() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={26} fill={PDF_BRAND_HIGHLIGHT} />
      <Rect x={16} y={34} width={5} height={8} rx={1} fill={PDF_BRAND_DEEP} />
      <Rect x={25.5} y={27} width={5} height={15} rx={1} fill={PDF_BRAND_DEEP} />
      <Rect x={35} y={19} width={5} height={23} rx={1} fill={PDF_BRAND_DEEP} />
    </Svg>
  )
}

// ─── Charts ──────────────────────────────────────────────────────────────────

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
  const inner = 44
  const slices = categories.filter((cat) => cat.hours > 0)
  let angle = 0

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={(outer + inner) / 2} stroke="#f1f5f9" strokeWidth={outer - inner} fill="none" />
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
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, ...pdfFontStyles.bold, color: PDF_BRAND_DEEP }}>{formatHours(totalHours, '0h')}</Text>
        <Text style={{ fontSize: 8, color: PDF_SLATE_600 }}>of work</Text>
      </View>
    </View>
  )
}

function WeeklyBars({ weeks }: { weeks: { label: string; hours: number }[] }) {
  const barArea = 70
  const max = Math.max(...weeks.map((w) => w.hours), 1)

  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PDF_BORDER, borderBottomStyle: 'solid' }}>
      {weeks.map((w, i) => {
        const h = w.hours > 0 ? Math.max(4, (barArea * w.hours) / max) : 0
        return (
          <View key={w.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: barArea + 16 }}>
            <Text style={{ fontSize: 8, ...pdfFontStyles.semibold, color: PDF_SLATE_700, marginBottom: 3 }}>
              {formatHours(w.hours, '0h')}
            </Text>
            <View
              style={{
                width: 40,
                height: h,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: i % 2 === 0 ? PDF_BRAND_PRIMARY : PDF_BRAND_SECONDARY,
              }}
            />
          </View>
        )
      })}
    </View>
  )
}

function WeeklyLabels({ weeks }: { weeks: { label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 4 }}>
      {weeks.map((w) => (
        <Text key={w.label} style={{ flex: 1, textAlign: 'center', fontSize: 7.5, color: PDF_SLATE_400 }}>
          {`Days ${w.label}`}
        </Text>
      ))}
    </View>
  )
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function StatTile({
  icon,
  value,
  label,
  bg,
  fg,
  last,
}: {
  icon: React.ReactNode
  value: string
  label: string
  bg: string
  fg: string
  last?: boolean
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }, last ? styles.tileLast : {}]}>
      {icon}
      <Text style={[styles.tileValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: fg }]}>{label}</Text>
    </View>
  )
}

function SavingsHero({ savings }: { savings: NonNullable<RecapStats['savings']> }) {
  return (
    <View style={styles.savingsCard} wrap={false}>
      <IconSavings />
      <View style={{ flex: 1, marginLeft: 18 }}>
        <Text style={styles.savingsEyebrow}>How much your plan saved you this month</Text>
        <Text style={styles.savingsAmount}>{formatCurrency(savings.amount)}</Text>
        <Text style={styles.savingsMath}>
          {`${formatHours(savings.nonBillableHours, '0h')} of work at ${formatCurrency(savings.hourlyRate)} per hour`}
        </Text>
        <Text style={styles.savingsNote}>
          Included in your Full plan at no additional cost.
        </Text>
      </View>
    </View>
  )
}

function TaskCard({ task }: { task: RecapStatsTask }) {
  const status = STATUS_LABELS[task.status] ?? task.status
  return (
    <View style={styles.taskCard} wrap={false}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskCardTitle}>{task.title}</Text>
        <Text style={styles.taskCardSub}>
          {[status, task.projectName].filter(Boolean).join(' · ')}
        </Text>
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
        <Text style={styles.taskCardTitle}>{item.description}</Text>
      </View>
    </View>
  )
}

function CategoryHeader({ name, count, hours }: { name: string; count: number; hours?: number }) {
  const meta = categoryMeta(name)
  const parts = [`${count} ${count === 1 ? 'item' : 'items'}`]
  if (hours && hours > 0) parts.push(formatHours(hours))
  return (
    <View style={[styles.categoryHeader, { backgroundColor: meta.tint }]} wrap={false}>
      <View style={[styles.legendSwatch, { backgroundColor: meta.color }]} />
      <Text style={[styles.categoryHeaderText, { color: PDF_SLATE_900 }]}>{meta.label}</Text>
      <Text style={[styles.categoryHeaderMeta, { color: PDF_SLATE_600 }]}>{parts.join(' · ')}</Text>
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

// ─── Document ────────────────────────────────────────────────────────────────

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

function formatSentDate(sentAt: string | null): string | null {
  if (!sentAt) return null
  return new Date(sentAt).toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })
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
  const sentLabel = formatSentDate(sentAt)

  const tasks = stats?.tasks ?? []
  const tasksDone = stats ? stats.tasksCompleted : workCompleted.length
  const hours = stats?.hoursLogged ?? 0
  const milestones = stats?.phasesCompleted ?? []
  const categories = stats?.categories ?? []
  const areaCount = stats ? categories.length : new Set(workCompleted.map((w) => w.category || 'Other')).size
  const savings = stats?.savings && stats.savings.amount > 0 ? stats.savings : null
  const topTasks = tasks.filter((t) => t.hours > 0).slice(0, 3)
  const showCharts = Boolean(stats) && hours > 0

  const hasIntro = Boolean(introText?.trim())
  const hasPerformance = Boolean(performanceNotes?.trim())
  const hasComingNext = Boolean(comingNext?.trim())
  const hasWork = tasks.length > 0 || workCompleted.length > 0
  const hasBody = hasIntro || hasWork || hasPerformance || hasComingNext

  return (
    <Document
      title={`${periodLabel} Recap — ${clientName}`}
      author={company.legalName}
      subject={`Monthly recap for ${clientName}`}
      creator="Appdoers Hub"
    >
      <Page size="A4" style={styles.page}>
        <PdfLetterhead
          company={company}
          showCompanyDetails={false}
          right={<Text style={pdfHeaderTextStyles.eyebrow}>Monthly Recap</Text>}
        >
          <Text style={[pdfHeaderTextStyles.title, { fontSize: 26 }]}>{`Your ${monthName} recap`}</Text>
          <Text style={pdfHeaderTextStyles.subtitle}>{clientName}</Text>
          <Text style={pdfHeaderTextStyles.meta}>
            {sentLabel ? `Sent ${sentLabel}` : 'Prepared by the Appdoers team'}
          </Text>
        </PdfLetterhead>

        <View style={styles.body}>
          {!hasBody ? (
            <Text style={styles.emptyState}>
              No report content has been saved yet. Use Auto-fill or add notes in the recap editor,
              save, then export again.
            </Text>
          ) : null}

          <Text style={styles.headline}>{`Your ${monthName} at a glance`}</Text>
          <Text style={styles.subhead}>
            A summary of the work completed this month. A full breakdown follows.
          </Text>

          <View style={styles.tilesRow}>
            <StatTile
              icon={<IconCheck color={PDF_BRAND_SECONDARY} />}
              value={String(tasksDone)}
              label={tasksDone === 1 ? 'task completed' : 'tasks completed'}
              bg={PDF_BRAND_LIGHT}
              fg={PDF_BRAND_SECONDARY}
            />
            <StatTile
              icon={<IconClock color={PDF_BRAND_DEEP} />}
              value={formatHours(hours, '0h')}
              label="of work"
              bg="#f5f3ff"
              fg={PDF_BRAND_DEEP}
            />
            <StatTile
              icon={<IconFlag color="#b45309" />}
              value={String(milestones.length)}
              label={milestones.length === 1 ? 'milestone reached' : 'milestones reached'}
              bg="#fffbeb"
              fg="#b45309"
            />
            <StatTile
              icon={<IconSpark color={PDF_BRAND_DEEP} />}
              value={String(areaCount)}
              label={areaCount === 1 ? 'area of work' : 'areas of work'}
              bg={PDF_BRAND_HIGHLIGHT}
              fg={PDF_BRAND_DEEP}
              last
            />
          </View>

          {savings ? <SavingsHero savings={savings} /> : null}

          {hasIntro ? (
            <View style={styles.section}>
              <PdfSectionTitle title="Overview" />
              <View style={styles.noteCard}>
                <PdfPlainText text={introText!.trim()} style={styles.paragraph} />
              </View>
            </View>
          ) : null}

          {topTasks.length > 0 ? (
            <View style={styles.section} wrap={false}>
              <PdfSectionTitle title="Highlights" />
              {topTasks.map((task, i) => (
                <View key={task.title + i} style={styles.highlightCard}>
                  <View style={styles.highlightBadge}>
                    <Text style={styles.highlightBadgeText}>{String(i + 1)}</Text>
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
              <PdfSectionTitle title="Where the time went" />
              <View style={styles.chartRow}>
                <DonutChart categories={categories} totalHours={hours} />
                <View style={styles.legend}>
                  {categories
                    .filter((cat) => cat.hours > 0)
                    .map((cat) => (
                      <View key={cat.name} style={styles.legendRow}>
                        <View style={[styles.legendSwatch, { backgroundColor: categoryMeta(cat.name).color }]} />
                        <Text style={styles.legendLabel}>{categoryMeta(cat.name).label}</Text>
                        <Text style={styles.legendValue}>
                          {`${formatHours(cat.hours)} · ${Math.round((cat.hours / hours) * 100)}%`}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
              {stats!.weeklyHours.length > 0 ? (
                <>
                  <Text style={styles.chartCaption}>Hours through the month</Text>
                  <WeeklyBars weeks={stats!.weeklyHours} />
                  <WeeklyLabels weeks={stats!.weeklyHours} />
                </>
              ) : null}
            </View>
          ) : null}

          {milestones.length > 0 ? (
            <View style={styles.section} wrap={false}>
              <PdfSectionTitle title="Milestones reached" />
              {milestones.map((m) => (
                <View key={m} style={styles.milestoneRow}>
                  <IconFlag color="#b45309" />
                  <Text style={styles.milestoneText}>{`${m.charAt(0).toUpperCase()}${m.slice(1)} phase complete`}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {hasWork ? (
            <View style={styles.section}>
              <View minPresenceAhead={120}>
                <PdfSectionTitle title="Work completed" />
              </View>
              {tasks.length > 0
                ? groupBy(tasks, (t) => t.category).map(([category, items]) => (
                    <View key={category} style={styles.categoryBlock}>
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
                    <View key={category} style={styles.categoryBlock}>
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
              <PdfSectionTitle title="Additional notes" />
              <PdfPlainText text={performanceNotes!.trim()} style={styles.paragraph} />
            </View>
          ) : null}

          {hasComingNext ? (
            <View style={styles.section} wrap={false}>
              <View style={styles.nextBox}>
                <Text style={styles.nextTitle}>Coming up next month</Text>
                <PdfPlainText text={comingNext!.trim()} style={styles.paragraph} />
              </View>
            </View>
          ) : null}

          {tasks.length > 0 ? (
            <View style={styles.section} break>
              <PdfSectionTitle title="Full task list" />
              <Text style={[styles.muted, { marginBottom: 8 }]}>
                All tasks worked on during the period, with hours logged.
              </Text>
              <View style={styles.table}>
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
            </View>
          ) : null}
        </View>

        <PdfPageFooter label={`${periodLabel} Recap`} />
      </Page>
    </Document>
  )
}
