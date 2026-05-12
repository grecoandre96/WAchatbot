'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { ConversationCard, ConversationRow } from './ConversationCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ConversationList() {
  const router = useRouter()
  const { data, isLoading, error } = useSWR<ConversationRow[]>(
    '/api/conversations',
    fetcher,
    { refreshInterval: 20000 }
  )

  if (isLoading) return <p className="text-center text-gray-500 py-12">Caricamento...</p>
  if (error)     return <p className="text-center text-red-500 py-12">Errore nel caricamento.</p>
  if (!data?.length) return <p className="text-center text-gray-500 py-12">Nessuna conversazione ancora.</p>

  return (
    <div className="grid gap-3">
      {data.map(conv => (
        <ConversationCard
          key={conv.id}
          conv={conv}
          onClick={() => router.push(`/conversation/${conv.id}`)}
        />
      ))}
    </div>
  )
}
