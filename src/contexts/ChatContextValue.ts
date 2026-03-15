import React, { createContext } from 'react';
import { Message, FileData } from '@/types/websocket';

export interface ChatState {
  messages: Message[];
  files: FileData[];
}

export interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  uploadFile: (file: File) => Promise<boolean>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);
