export type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_at: string
}

export function MessageBubble({ message }: { message: Message }) {
  const isInbound = message.direction === 'inbound'
  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm break-words ${
        isInbound
          ? 'bg-gray-100 text-gray-900 rounded-tl-none'
          : 'bg-green-500 text-white rounded-tr-none'
      }`}>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={`text-xs mt-1 text-right ${isInbound ? 'text-gray-400' : 'text-green-100'}`}>
          {new Date(message.sent_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
