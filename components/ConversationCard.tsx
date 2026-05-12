export type ConversationRow = {
  id: string
  status: 'active' | 'completed' | 'failed'
  score: number | null
  outcome: 'zoom_call' | 'voice_call' | 'not_qualified' | null
  started_at: string
  completed_at: string | null
  first_name: string
  last_name: string
  phone: string
}

const statusStyle: Record<string, string> = {
  active:    'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed:    'bg-red-100 text-red-800',
}

const outcomeStyle: Record<string, string> = {
  zoom_call:     'bg-blue-100 text-blue-800',
  voice_call:    'bg-sky-100 text-sky-800',
  not_qualified: 'bg-gray-100 text-gray-600',
}

const outcomeLabel: Record<string, string> = {
  zoom_call:     'Zoom Call',
  voice_call:    'Call Voce',
  not_qualified: 'Non qualificato',
}

export function ConversationCard({
  conv,
  onClick,
}: {
  conv: ConversationRow
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-900">
          {conv.first_name} {conv.last_name}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[conv.status] ?? ''}`}>
          {conv.status}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-2">{conv.phone}</p>

      <div className="flex items-center gap-2 flex-wrap">
        {conv.outcome && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeStyle[conv.outcome] ?? ''}`}>
            {outcomeLabel[conv.outcome]}
          </span>
        )}
        {conv.score !== null && (
          <span className="text-xs font-bold text-gray-700">{conv.score}/10</span>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {new Date(conv.started_at).toLocaleString('it-IT')}
      </p>
    </div>
  )
}
