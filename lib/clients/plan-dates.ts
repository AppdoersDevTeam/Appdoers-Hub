/** Plan end date = start date + contract term (YYYY-MM-DD in, YYYY-MM-DD out). */
export function planEndDate(startYmd: string | null | undefined, contractMonths: number | null | undefined): string | null {
  if (!startYmd || !contractMonths || !/^\d{4}-\d{2}-\d{2}$/.test(startYmd)) return null
  const [year, month, day] = startYmd.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + contractMonths, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}
