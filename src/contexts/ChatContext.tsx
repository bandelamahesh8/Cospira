import React, { useState, useCallback, useEffect } from 'react';
import { Message, FileData } from '@/types/websocket';
import { useConnection } from './ConnectionContext';
import { useRoomContext } from '@/hooks/useRoomContext';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/utils/uuid';
import { SecurityService } from '@/services/SecurityService';
import { toast } from 'sonner';
import { ChatContext } from './ChatContextValue';

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const { socket, isConnected } = useConnection();
  const { roomId } = useRoomContext();
  const { user } = useAuth();

  const storedGuest = localStorage.getItem('cospira_guest_identity');
  const guestIdentity = storedGuest ? JSON.parse(storedGuest) : null;
  const effectiveUserId = user?.id || guestIdentity?.id;

  useEffect(() => {
    if (!socket || !isConnected) return;

    const onNewMessage = (message: Message) => {
      setMessages((prev: Message[]) => {
        const id = user?.id;
        if (message.userId === id) {
          const exists = prev.some(
            (m) => m.id === message.id || (m.pending && m.content === message.content)
          );
          if (exists) {
            return prev.map((m) =>
              m.id === message.id || (m.pending && m.content === message.content) ? message : m
            );
          }
        }
        return [...prev, message];
      });
    };

    const onNewFile = (file: FileData) => {
      setFiles((prev: FileData[]) => [...prev, file]);
    };

    socket.on('new-message', onNewMessage);
    socket.on('new-file', onNewFile);

    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('new-file', onNewFile);
    };
  }, [socket, isConnected, user?.id]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!roomId || !socket) return;
      if (content.startsWith('/')) {
        socket.emit(
          'assistant:command',
          { roomId, text: content },
          (res: { success: boolean; error?: string }) => {
            if (!res.success) toast.error('AI Error', { description: res.error || 'Failed' });
          }
        );
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
        userName:
          user?.user_metadata?.display_name ||
          user?.email?.split('@')[0] ||
          guestIdentity?.name ||
          'You',
        content: sanitized,
        timestamp: new Date(),
        pending: true,
      };
      setMessages((prev: Message[]) => [...prev, optimisticMessage]);
      socket.emit(
        'send-message',
        { roomId, message: { id: tempId, content: sanitized } },
        (response?: { success: boolean }) => {
          if (!response?.success) {
            toast.error('Error', { description: 'Failed to send message' });
            setMessages((prev: Message[]) => prev.filter((m) => m.id !== tempId));
          }
        }
      );
    },
    [roomId, socket, user, effectiveUserId, guestIdentity]
  );

  const uploadFile = useCallback(
    async (file: File): Promise<boolean> => {
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
                socket.emit(
                  'upload-file',
                  { roomId, file: fileData },
                  (res?: { success: boolean; error?: string }) => {
                    if (res?.success) {
                      setFiles((prev: FileData[]) => [...prev, fileData]);
                      socket.emit('present-file', {
                        roomId,
                        fileData,
                        presenterName: fileData.userName,
                      });
                      resolve(true);
                    } else {
                      reject(new Error(res?.error || 'Sync Failed'));
                    }
                  }
                );
              }
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('Upload failed'));
          }
        });
        xhr.open('POST', '/api/upload');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('roomId', roomId);
        xhr.send(formData);
      });
    },
    [roomId, effectiveUserId, socket, user, guestIdentity]
  );

  return (
    <ChatContext.Provider value={{ messages, files, sendMessage, uploadFile, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
};
