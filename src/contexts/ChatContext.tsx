import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Message, FileData } from '@/types/websocket';
import { useConnection } from './ConnectionContext';
import { useRoom } from './RoomContext';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/utils/uuid';
import { SecurityService } from '@/services/SecurityService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface ChatState {
  messages: Message[];
  files: FileData[];
}

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  uploadFile: (file: File) => Promise<boolean>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const { socket, isConnected } = useConnection();
  const { roomId } = useRoom();
  const { user } = useAuth();
  
  const storedGuest = localStorage.getItem('cospira_guest_identity');
  const guestIdentity = storedGuest ? JSON.parse(storedGuest) : null;
  const effectiveUserId = user?.id || guestIdentity?.id;

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onNewMessage = (message: Message) => {
      setMessages(prev => {
        const id = user?.id; 
        if (message.userId === id) {
          const exists = prev.some(m => m.id === message.id || (m.pending && m.content === message.content));
          if (exists) {
            return prev.map(m => (m.id === message.id || (m.pending && m.content === message.content)) ? message : m);
          }
        }
        return [...prev, message];
      });
    };

    const onNewFile = (file: FileData) => {
      setFiles(prev => [...prev, file]);
    };

    socket.on('new-message', onNewMessage);
    socket.on('new-file', onNewFile);

    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('new-file', onNewFile);
    };
  }, [socket, isConnected, user?.id]);

  const sendMessage = useCallback((content: string) => {
    if (!roomId || !socket) return;
    if (content.startsWith('/')) {
      socket.emit('assistant:command', { roomId, text: content }, (res: any) => {
        if (!res.success) toast.error('AI Error', { description: res.error || 'Failed' });
      });
      return;
    }
    if (!SecurityService.canPerformAction('chat')) {
      toast.error('Slow Down', { description: 'Messages too fast.' });
      return;
    }
    const sanitized = SecurityService.sanitizeInput(content);
    if (!sanitized) return;
    const tempId = generateUUID();
    const optimisticMessage: Message = {
      id: tempId,
      userId: effectiveUserId || 'me',
      userName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || guestIdentity?.name || 'You',
      content: sanitized,
      timestamp: new Date(),
      pending: true,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    socket.emit('send-message', { roomId, message: { id: tempId, content: sanitized } }, (response?: { success: boolean }) => {
      if (!response?.success) {
        toast.error('Error', { description: 'Failed to send message' });
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    });
  }, [roomId, socket, user, effectiveUserId, guestIdentity]);

  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    if (!roomId || !effectiveUserId || !socket) return false;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const tid = `upload-${Date.now()}`;
      toast.loading(`Syncing ${file.name}: 0%`, { id: tid });
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          toast.loading(`Syncing ${file.name}: ${percent}%`, { id: tid });
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.file) {
              const fileData: FileData = {
                ...data.file,
                userId: effectiveUserId,
                userName: user?.user_metadata?.display_name || guestIdentity?.name || 'Guest',
              };
              socket.emit('upload-file', { roomId, file: fileData }, (res?: any) => {
                if (res?.success) {
                  setFiles(prev => [...prev, fileData]);
                  socket.emit('present-file', { roomId, fileData, presenterName: fileData.userName });
                  resolve(true);
                } else { reject(new Error(res?.error || 'Sync Failed')); }
              });
            }
          } catch (e) { reject(e); }
        } else { reject(new Error('Upload failed')); }
      });
      xhr.open('POST', '/api/upload');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      xhr.send(formData);
    });
  }, [roomId, effectiveUserId, socket, user, guestIdentity]);

  return (
    <ChatContext.Provider value={{ messages, files, sendMessage, uploadFile, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};