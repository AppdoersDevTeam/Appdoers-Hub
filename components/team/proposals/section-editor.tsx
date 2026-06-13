'use client'

interface Section {
  id: string
  title: string
  content: string
}

export function SectionEditor({
  section,
  onUpdate,
}: {
  section: Section
  onUpdate: (content: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
        <p className="text-xs text-slate-500">Section ID: {section.id}</p>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => onUpdate(e.target.value)}
        rows={18}
        className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y leading-relaxed"
        placeholder={`Write the ${section.title.toLowerCase()} content here…`}
      />
      <p className="text-xs text-slate-500">{section.content.length} characters</p>
    </div>
  )
}
