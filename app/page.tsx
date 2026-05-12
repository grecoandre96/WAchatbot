import { ConversationList } from '@/components/ConversationList'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Aggiornamento automatico ogni 20s</p>
        </div>
        <ConversationList />
      </div>
    </main>
  )
}
