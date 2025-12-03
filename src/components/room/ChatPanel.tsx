import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Send,
    Paperclip,
    File as FileIcon,
    Users,
    MessageSquare,
    MoreVertical,
    Download,
    Monitor,
} from 'lucide-react';
import { format } from 'date-fns';
import { User, Message, FileData } from '@/types/websocket';

interface ChatItem {
    id: string;
    userId: string;
    userName: string;
    timestamp: Date | string;
    content?: string;
    isFile?: boolean;
    url?: string;
    name?: string;
    size?: number;
    type?: string;
}

interface ChatPanelProps {
    showChat: boolean;
    activeTab: 'chat' | 'participants';
    setActiveTab: (tab: 'chat' | 'participants') => void;
    messages: Message[];
    files: FileData[];
    users: User[];
    currentUser: User | undefined;
    isHost: boolean;
    waitingUsers: User[];
    admitUser: (userId: string) => void;
    denyUser: (userId: string) => void;
    admitAllWaitingUsers: () => void;
    promoteToCoHost: (userId: string) => void;
    demoteFromCoHost: (userId: string) => void;
    muteUser: (userId: string) => void;
    kickUser: (userId: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    handleSendMessage: (e: React.FormEvent) => void;
    newMessage: string;
    setNewMessage: (message: string) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    triggerFileUpload: () => void;
    isUploading: boolean;
    presentFile: (file: FileData) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    showChat,
    activeTab,
    setActiveTab,
    messages,
    files,
    users,
    currentUser,
    isHost,
    waitingUsers,
    admitUser,
    denyUser,
    admitAllWaitingUsers,
    promoteToCoHost,
    demoteFromCoHost,
    muteUser,
    kickUser,
    messagesEndRef,
    handleSendMessage,
    newMessage,
    setNewMessage,
    fileInputRef,
    handleFileUpload,
    triggerFileUpload,
    isUploading,
    presentFile,
}) => {
    return (
        <div
            className={`fixed right-0 top-16 bottom-0 w-full md:w-80 bg-background border-l transition-transform duration-300 flex flex-col z-40 ${showChat ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            {/* Tabs */}
            <div className='flex items-center border-b'>
                <Button
                    variant='ghost'
                    className={`flex-1 rounded-none border-b-2 ${activeTab === 'chat'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground'
                        }`}
                    onClick={() => setActiveTab('chat')}
                >
                    <MessageSquare className='w-4 h-4 mr-2' /> Chat
                </Button>
                <Button
                    variant='ghost'
                    className={`flex-1 rounded-none border-b-2 ${activeTab === 'participants'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground'
                        }`}
                    onClick={() => setActiveTab('participants')}
                >
                    <Users className='w-4 h-4 mr-2' /> Participants
                    {waitingUsers.length > 0 && (
                        <Badge
                            variant='destructive'
                            className='ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]'
                        >
                            {waitingUsers.length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Tab Content */}
            <div className='flex-1 overflow-hidden flex flex-col'>
                {activeTab === 'chat' ? (
                    // Chat Tab
                    <div className='flex-1 flex flex-col h-full'>
                        <ScrollArea className='flex-1 p-4'>
                            <div className='space-y-4'>
                                {[
                                    ...messages,
                                    ...files.map((f) => ({
                                        ...f,
                                        id: `file-${f.id}`,
                                        isFile: true,
                                        content: f.name,
                                    })),
                                ]
                                    .sort(
                                        (a, b) =>
                                            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                                    )
                                    .map((item: unknown) => {
                                        const chatItem = item as ChatItem;
                                        const isSystemMessage = chatItem.userId === 'system';
                                        if (isSystemMessage) {
                                            return (
                                                <div key={chatItem.id} className='flex justify-center my-2'>
                                                    <div className='bg-muted/50 px-4 py-1 rounded-full'>
                                                        <span className='text-xs text-muted-foreground'>
                                                            {chatItem.content}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={chatItem.id} className='flex gap-3'>
                                                <Avatar className='h-8 w-8 mt-1'>
                                                    <AvatarImage
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chatItem.userName}`}
                                                    />
                                                    <AvatarFallback>
                                                        {chatItem.userName.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className='flex flex-col gap-1 max-w-[85%]'>
                                                    <div className='flex items-baseline gap-2'>
                                                        <span className='text-sm font-semibold'>
                                                            {chatItem.userName}
                                                        </span>
                                                        <span className='text-xs text-muted-foreground'>
                                                            {format(new Date(chatItem.timestamp), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    {chatItem.isFile ? (
                                                        (() => {
                                                            const fileUrl = chatItem.url!.startsWith('http')
                                                                ? chatItem.url
                                                                : `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'
                                                                }${chatItem.url}`;
                                                            return (
                                                                <div className='flex flex-col gap-2'>
                                                                    <div className='bg-muted p-3 rounded-lg rounded-tl-none border flex items-center gap-3 group hover:bg-muted/80 transition-colors'>
                                                                        <div
                                                                            className='bg-background p-2 rounded-md cursor-pointer'
                                                                            onClick={() => window.open(fileUrl, '_blank')}
                                                                        >
                                                                            <FileIcon className='w-6 h-6 text-primary' />
                                                                        </div>
                                                                        <div
                                                                            className='flex-1 min-w-0 cursor-pointer'
                                                                            onClick={() => window.open(fileUrl, '_blank')}
                                                                        >
                                                                            <p className='text-sm font-medium text-primary underline-offset-4 group-hover:underline truncate'>
                                                                                {chatItem.name}
                                                                            </p>
                                                                            <p className='text-xs text-muted-foreground'>
                                                                                {(chatItem.size! / 1024).toFixed(1)} KB
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            variant='ghost'
                                                                            size='icon'
                                                                            className='h-8 w-8'
                                                                            title='Download'
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const link = document.createElement('a');
                                                                                link.href = fileUrl!;
                                                                                link.download = chatItem.name!;
                                                                                link.target = '_blank';
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                            }}
                                                                        >
                                                                            <Download className='h-4 w-4' />
                                                                        </Button>
                                                                    </div>
                                                                    {(isHost || currentUser?.isCoHost) &&
                                                                        /\.(mp4|webm|ogg)$/i.test(chatItem.name!) && (
                                                                            <Button
                                                                                size='sm'
                                                                                variant='secondary'
                                                                                className='w-full'
                                                                                onClick={() => presentFile(chatItem as unknown as FileData)}
                                                                            >
                                                                                <Monitor className='w-4 h-4 mr-2' /> Play in Stage
                                                                            </Button>
                                                                        )}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className='bg-primary/10 p-3 rounded-lg rounded-tl-none text-sm'>
                                                            {chatItem.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                        <div className='p-4 border-t bg-background/50 backdrop-blur-sm'>
                            <form onSubmit={handleSendMessage} className='flex gap-2'>
                                <input
                                    type='file'
                                    ref={fileInputRef}
                                    className='hidden'
                                    onChange={handleFileUpload}
                                />
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={triggerFileUpload}
                                    disabled={isUploading}
                                >
                                    <Paperclip className='w-5 h-5 text-muted-foreground' />
                                </Button>
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder='Type a message...'
                                    className='flex-1'
                                />
                                <Button type='submit' size='icon' disabled={!newMessage.trim()}>
                                    <Send className='w-5 h-5' />
                                </Button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className='flex-1 p-4'>
                        {waitingUsers.length > 0 && (
                            <div className='mb-6'>
                                <h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                                    Waiting Room ({waitingUsers.length})
                                </h3>
                                <div className='space-y-4'>
                                    {waitingUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className='flex items-center justify-between p-2 rounded-lg bg-muted/50'
                                        >
                                            <div className='flex items-center gap-2'>
                                                <Avatar className='h-8 w-8'>
                                                    <AvatarImage
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                                                    />
                                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className='flex flex-col'>
                                                    <span className='text-sm font-medium'>{user.name}</span>
                                                    <span className='text-xs text-muted-foreground'>Waiting...</span>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-1'>
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10'
                                                    onClick={() => admitUser(user.id)}
                                                >
                                                    <span className='sr-only'>Admit</span>
                                                    <Users className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10'
                                                    onClick={() => denyUser(user.id)}
                                                >
                                                    <span className='sr-only'>Deny</span>
                                                    <Users className='h-4 w-4 rotate-45' />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className='flex justify-end mt-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={admitAllWaitingUsers}
                                        className='text-xs'
                                    >
                                        Admit All
                                    </Button>
                                </div>
                                <div className='h-px bg-border my-4' />
                            </div>
                        )}

                        <h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                            In Meeting ({users.length})
                        </h3>
                        <div className='space-y-4'>
                            {users.map((participant) => (
                                <div
                                    key={participant.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg ${participant.isHost
                                        ? 'bg-primary/10 border border-primary/20'
                                        : participant.isCoHost
                                            ? 'bg-secondary/50 border border-secondary'
                                            : ''
                                        }`}
                                >
                                    <Avatar className='h-8 w-8'>
                                        <AvatarImage
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.name}`}
                                        />
                                        <AvatarFallback>
                                            {participant.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className='flex flex-col flex-1'>
                                        <span className='text-sm font-medium leading-none'>
                                            {participant.name}
                                        </span>
                                        <span className='text-xs text-muted-foreground'>Online</span>
                                    </div>
                                    {participant.isHost && (
                                        <Badge variant='default' className='text-xs'>
                                            Host
                                        </Badge>
                                    )}
                                    {participant.isCoHost && !participant.isHost && (
                                        <Badge variant='secondary' className='text-xs'>
                                            Co-Host
                                        </Badge>
                                    )}
                                    {(isHost || users.find((u) => u.id === users[0]?.id)?.isCoHost) &&
                                        !participant.isHost && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant='ghost' size='icon' className='h-6 w-6'>
                                                        <MoreVertical className='h-4 w-4' />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align='end'>
                                                    {participant.isCoHost ? (
                                                        <DropdownMenuItem
                                                            onClick={() => demoteFromCoHost(participant.id)}
                                                        >
                                                            Demote from Co-Host
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() => promoteToCoHost(participant.id)}
                                                        >
                                                            Promote to Co-Host
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => muteUser(participant.id)}>
                                                        Mute User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => kickUser(participant.id)}
                                                        className='text-red-600 focus:text-red-600 focus:bg-red-100'
                                                    >
                                                        Kick User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
};

export default ChatPanel;
