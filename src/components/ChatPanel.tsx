import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  roomId: string;
  onClose: () => void;
}

const ChatPanel = ({ roomId, onClose }: ChatPanelProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChat(roomId);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;

    setSending(true);
    await sendMessage(messageInput);
    setMessageInput('');
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='w-6 h-6 animate-spin text-primary' />
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b border-border flex items-center justify-between'>
        <div>
          <h3 className='font-semibold'>Chat</h3>
          <p className='text-sm text-muted-foreground'>{messages.length} messages</p>
        </div>
        <Button variant='ghost' size='icon' onClick={onClose} className='h-8 w-8'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='h-4 w-4'
          >
            <path d='M18 6 6 18' />
            <path d='m6 6 12 12' />
          </svg>
        </Button>
      </div>

      <ScrollArea className='flex-1 p-4'>
        <div className='space-y-4'>
          {messages.map((message) => {
            const isOwn = message.user_id === user?.id;
            const displayName = message.profiles?.display_name || 'Anonymous';

            return (
              <div
                key={message.id}
                className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
              >
                <div className='text-xs text-muted-foreground mb-1'>
                  {isOwn ? 'You' : displayName}
                </div>
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  <p className='text-sm'>{message.content}</p>
                  <p className='text-xs opacity-70 mt-1'>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className='p-4 border-t border-border'>
        <div className='flex gap-2'>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Type a message...'
            disabled={sending}
            className='flex-1'
          />
          <Button onClick={handleSend} disabled={!messageInput.trim() || sending} size='icon'>
            {sending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
