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
        <h2 className="text-lg font-semibold text-[#F1F5F9]">{section.title}</h2>
        <p className="text-xs text-[#475569]">Section ID: {section.id}</p>
      </div>
      <textarea
        value={section.content}
        onChange={(e) => onUpdate(e.target.value)}
        rows={18}
        className="w-full rounded-md border border-[#1F2D45] bg-[#0A0F1E] px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#3B82F6] focus:outline-none resize-y leading-relaxed"
        placeholder={`Write the ${section.title.toLowerCase()} content here…`}
      />
      <p className="text-xs text-[#475569]">{section.content.length} characters</p>
    </div>
  )
}
