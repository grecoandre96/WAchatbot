import { Message, MessageBubble } from './MessageBubble'

export function ChatView({ messages }: { messages: Message[] }) {
  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Nessun messaggio ancora.
      </div>
    )
  }
  return (
    <div className="flex flex-col p-4 overflow-y-auto h-full">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
