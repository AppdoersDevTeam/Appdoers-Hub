import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  PDF_BRAND_DEEP,
  PDF_BRAND_LIGHT,
  PDF_BORDER,
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
  pdfHeaderTextStyles,
} from '@/lib/pdf/primitives'
import { TASK_STATUS_CONFIG, TASK_TYPE_OPTIONS } from '@/lib/tasks/constants'
import { formatDate, formatHours } from '@/lib/utils/format'

const company = APPDOERS_COMPANY_DEFAULTS

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((o) => [o.value, o.label])
)

const PRIORITY_LABELS: Record<string, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
}

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TASK_STATUS_CONFIG).map(([value, { label }]) => [value, label])
)

export interface TasksPdfFilter {
  label: string
  value: string
}

export interface TasksPdfRow {
  id: string
  title: string
  type: string
  priority: string
  status: string
  project_name: string
  client_name: string
  assigned_to_name: string | null
  due_date: string | null
  time_spent: number
}

export interface TasksPDFProps {
  title: string
  generatedAt: string
  tasks: TasksPdfRow[]
  filters: TasksPdfFilter[]
  showProjectCol: boolean
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    ...pdfFontStyles.regular,
    fontSize: 9,
    color: PDF_SLATE_700,
    backgroundColor: '#ffffff',
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  filterChipText: {
    fontSize: 8,
    color: PDF_SLATE_600,
    ...pdfFontStyles.regular,
  },
  filterChipLabel: {
    ...pdfFontStyles.bold,
    color: PDF_SLATE_900,
  },
  metaLine: {
    fontSize: 9,
    color: PDF_SLATE_600,
    marginBottom: 10,
    ...pdfFontStyles.regular,
  },
  table: {
    borderWidth: 1,
    borderColor: PDF_BORDER,
    borderStyle: 'solid',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: PDF_BRAND_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: PDF_BORDER,
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderBottomStyle: 'solid',
    alignItems: 'flex-start',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  th: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 7,
    ...pdfFontStyles.bold,
    color: PDF_SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  td: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 8,
    color: PDF_SLATE_700,
    ...pdfFontStyles.regular,
  },
  tdTitle: {
    ...pdfFontStyles.semibold,
    color: PDF_SLATE_900,
  },
  overdue: {
    color: '#dc2626',
  },
  totals: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsText: {
    fontSize: 9,
    color: PDF_SLATE_900,
    ...pdfFontStyles.semibold,
  },
  empty: {
    fontSize: 10,
    color: PDF_SLATE_400,
    fontStyle: 'italic',
    paddingVertical: 16,
  },
})

function colWidths(showProjectCol: boolean) {
  if (showProjectCol) {
    return {
      title: '22%',
      type: '8%',
      priority: '7%',
      project: '13%',
      client: '12%',
      assigned: '12%',
      due: '10%',
      time: '6%',
      status: '10%',
    }
  }
  return {
    title: '34%',
    type: '10%',
    priority: '8%',
    project: '0%',
    client: '0%',
    assigned: '16%',
    due: '12%',
    time: '8%',
    status: '12%',
  }
}

function nzToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date())
}

export function TasksPDFDocument({
  title,
  generatedAt,
  tasks,
  filters,
  showProjectCol,
}: TasksPDFProps) {
  const cols = colWidths(showProjectCol)
  const today = nzToday()
  const totalHours = tasks.reduce((sum, t) => sum + (Number(t.time_spent) || 0), 0)
  const countLabel = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`

  return (
    <Document
      title={title}
      author={company.legalName || company.name}
      subject={title}
      creator="Appdoers Hub"
    >
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <PdfLetterhead
          company={company}
          showCompanyDetails={false}
          right={<Text style={pdfHeaderTextStyles.eyebrow}>Task Export</Text>}
        >
          <Text style={[pdfHeaderTextStyles.title, { fontSize: 22 }]}>{title}</Text>
          <Text style={pdfHeaderTextStyles.meta}>
            {countLabel} · Generated {generatedAt}
          </Text>
        </PdfLetterhead>

        <View style={styles.body}>
          {filters.length > 0 ? (
            <View style={styles.filterRow}>
              {filters.map((filter) => (
                <View key={`${filter.label}-${filter.value}`} style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    <Text style={styles.filterChipLabel}>{filter.label}: </Text>
                    {filter.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.metaLine}>No filters applied — exporting the visible task list.</Text>
          )}

          {tasks.length === 0 ? (
            <Text style={styles.empty}>No tasks match the current filters.</Text>
          ) : (
            <>
              <View style={styles.table}>
                <View style={styles.tableHead} wrap={false}>
                  <Text style={[styles.th, { width: cols.title }]}>Title</Text>
                  <Text style={[styles.th, { width: cols.type }]}>Type</Text>
                  <Text style={[styles.th, { width: cols.priority }]}>Priority</Text>
                  {showProjectCol ? (
                    <>
                      <Text style={[styles.th, { width: cols.project }]}>Project</Text>
                      <Text style={[styles.th, { width: cols.client }]}>Client</Text>
                    </>
                  ) : null}
                  <Text style={[styles.th, { width: cols.assigned }]}>Assigned To</Text>
                  <Text style={[styles.th, { width: cols.due }]}>Due Date</Text>
                  <Text style={[styles.th, { width: cols.time }]}>Time</Text>
                  <Text style={[styles.th, { width: cols.status }]}>Status</Text>
                </View>
                {tasks.map((task, index) => {
                  const isOverdue =
                    Boolean(task.due_date) &&
                    task.due_date! < today &&
                    task.status !== 'closed'
                  const isLast = index === tasks.length - 1

                  return (
                    <View
                      key={task.id}
                      wrap={false}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 ? styles.tableRowAlt : {},
                        isLast ? styles.tableRowLast : {},
                      ]}
                    >
                      <Text style={[styles.td, styles.tdTitle, { width: cols.title }]}>
                        {task.title}
                        {isOverdue ? '  · Overdue' : ''}
                      </Text>
                      <Text style={[styles.td, { width: cols.type }]}>
                        {TYPE_LABELS[task.type] ?? task.type}
                      </Text>
                      <Text style={[styles.td, { width: cols.priority }]}>
                        {PRIORITY_LABELS[task.priority] ?? task.priority.toUpperCase()}
                      </Text>
                      {showProjectCol ? (
                        <>
                          <Text style={[styles.td, { width: cols.project }]}>{task.project_name}</Text>
                          <Text style={[styles.td, { width: cols.client }]}>{task.client_name}</Text>
                        </>
                      ) : null}
                      <Text style={[styles.td, { width: cols.assigned }]}>
                        {task.assigned_to_name ?? '—'}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          { width: cols.due },
                          isOverdue ? styles.overdue : {},
                        ]}
                      >
                        {task.due_date ? formatDate(task.due_date) : '—'}
                      </Text>
                      <Text style={[styles.td, { width: cols.time }]}>
                        {formatHours(Number(task.time_spent) || 0)}
                      </Text>
                      <Text style={[styles.td, { width: cols.status }]}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </Text>
                    </View>
                  )
                })}
              </View>
              <View style={styles.totals}>
                <Text style={styles.totalsText}>
                  Total time logged: {formatHours(totalHours, '0h')}
                </Text>
              </View>
            </>
          )}
        </View>

        <PdfPageFooter label="Task export" legalName={company.legalName} />
      </Page>
    </Document>
  )
}
