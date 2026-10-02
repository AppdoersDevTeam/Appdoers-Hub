import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ReviewTemplatesManager, type TemplateWithItems } from '@/components/team/website-reviews/review-templates-manager'
import { REVIEW_SETTINGS_KEY, normalizeReviewSettings, type ReviewItemKind } from '@/lib/website-review/types'

export default async function ReviewTemplatesPage() {
  const supabase = await createClient()

  const [{ data: templates }, { data: settingsRow }] = await Promise.all([
    supabase
      .from('review_templates')
      .select('id, name, description, is_default, review_template_items(id, page_name, section_name, kind, team_note, sort_order)')
      .order('is_default', { ascending: false })
      .order('name'),
    supabase.from('settings').select('value').eq('key', REVIEW_SETTINGS_KEY).maybeSingle(),
  ])

  const rows: TemplateWithItems[] = (templates ?? []).map((tpl) => ({
    id: tpl.id as string,
    name: tpl.name as string,
    description: (tpl.description as string | null) ?? '',
    is_default: Boolean(tpl.is_default),
    items: ((tpl.review_template_items ?? []) as {
      id: string
      page_name: string
      section_name: string
      kind: ReviewItemKind
      team_note: string | null
      sort_order: number
    }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ sort_order: _sort, ...item }) => item),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website review templates"
        subtitle="The pages and sections a new website review starts with. Every review can still be edited on its own."
      />
      <ReviewTemplatesManager templates={rows} settings={normalizeReviewSettings(settingsRow?.value)} />
    </div>
  )
}
