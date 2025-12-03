import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

export const useRoom = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token');
    const navigate = useNavigate();

    const {
        socket,
        joinRoom,
        isConnected,
        users,
        files,
        remoteScreenStreams,
        youtubeVideoId,
        sendMessage,
        uploadFile,
        leaveRoom: contextLeaveRoom,
        toggleScreenShare,
        isScreenSharing,
        enableMedia,
    } = useWebSocket();

    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
    const [isParticipantsMinimized, setIsParticipantsMinimized] = useState(false);
    const [showOTTModal, setShowOTTModal] = useState(false);
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [showStopShareConfirm, setShowStopShareConfirm] = useState(false);
    const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [activityNotification, setActivityNotification] = useState<{
        message: string;
        type: 'join' | 'leave' | 'screen' | 'youtube' | 'file' | 'info';
    } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevUsersRef = useRef<typeof users>([]);
    const prevFilesLengthRef = useRef(0);
    const prevScreenStreamsSizeRef = useRef(0);

    // Track User Join/Leave
    useEffect(() => {
        const prevUsers = prevUsersRef.current;
        if (prevUsers.length < users.length) {
            const newUser = users.find((u) => !prevUsers.some((pu) => pu.id === u.id));
            if (newUser) {
                setActivityNotification({ message: `${newUser.name} joined the room`, type: 'join' });
                setTimeout(() => setActivityNotification(null), 3000);
            }
        } else if (prevUsers.length > users.length) {
            const leftUser = prevUsers.find((u) => !users.some((cu) => cu.id === u.id));
            if (leftUser) {
                setActivityNotification({ message: `${leftUser.name} left the room`, type: 'leave' });
                setTimeout(() => setActivityNotification(null), 3000);
            }
        }
        prevUsersRef.current = users;
    }, [users]);

    // Track Screen Share
    useEffect(() => {
        if (remoteScreenStreams.size > prevScreenStreamsSizeRef.current) {
            setActivityNotification({ message: 'Screen share started', type: 'screen' });
            setTimeout(() => setActivityNotification(null), 3000);
        }
        prevScreenStreamsSizeRef.current = remoteScreenStreams.size;
    }, [remoteScreenStreams]);

    // Track YouTube
    useEffect(() => {
        if (youtubeVideoId) {
            setActivityNotification({ message: 'YouTube video started', type: 'youtube' });
            setTimeout(() => setActivityNotification(null), 3000);
        }
    }, [youtubeVideoId]);

    // Track Files
    useEffect(() => {
        if (files.length > prevFilesLengthRef.current) {
            const newFile = files[files.length - 1];
            setActivityNotification({ message: `File shared: ${newFile.name} `, type: 'file' });
            setTimeout(() => setActivityNotification(null), 3000);
        }
        prevFilesLengthRef.current = files.length;
    }, [files]);

    // Join room on mount / when roomId changes
    useEffect(() => {
        if (socket && isConnected && roomId && !hasJoined) {
            joinRoom(
                roomId,
                undefined,
                inviteToken || undefined,
                () => {
                    setHasJoined(true);
                    enableMedia();
                },
                (error) => {
                    if (error === 'Incorrect password') {
                        setShowPasswordModal(true);
                    } else {
                        toast.error(error);
                        navigate('/dashboard');
                    }
                }
            );
        }
    }, [socket, isConnected, roomId, hasJoined, joinRoom, navigate, inviteToken, enableMedia]);

    const handleJoinWithPassword = useCallback(() => {
        if (!roomId) return;

        joinRoom(
            roomId,
            passwordInput,
            inviteToken || undefined,
            () => {
                setHasJoined(true);
                setShowPasswordModal(false);
                enableMedia();
            },
            (error) => {
                toast.error(error);
            }
        );
    }, [roomId, passwordInput, inviteToken, joinRoom, enableMedia]);

    const handleSendMessage = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
    }, [newMessage, sendMessage]);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        await uploadFile(file);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [uploadFile]);

    const triggerFileUpload = useCallback(() => fileInputRef.current?.click(), []);

    const copyRoomLink = useCallback(() => {
        if (roomId) {
            navigator.clipboard.writeText(roomId);
            toast.success('Room Key copied to clipboard!');
        }
    }, [roomId]);

    const handleLeaveRoom = useCallback(() => {
        contextLeaveRoom();
        navigate('/');
        toast.info('You left the room.');
    }, [contextLeaveRoom, navigate]);

    const handleToggleScreenShare = useCallback(() => {
        if (isScreenSharing) {
            setShowStopShareConfirm(true);
        } else {
            toggleScreenShare();
        }
    }, [isScreenSharing, toggleScreenShare]);

    const confirmStopShare = useCallback(() => {
        toggleScreenShare();
        setShowStopShareConfirm(false);
    }, [toggleScreenShare]);

    return {
        roomId,
        inviteToken,
        newMessage,
        setNewMessage,
        isUploading,
        hasJoined,
        showChat,
        setShowChat,
        activeTab,
        setActiveTab,
        isParticipantsMinimized,
        setIsParticipantsMinimized,
        showOTTModal,
        setShowOTTModal,
        isCinemaMode,
        setIsCinemaMode,
        showStopShareConfirm,
        setShowStopShareConfirm,
        showDisbandConfirm,
        setShowDisbandConfirm,
        showPasswordModal,
        setShowPasswordModal,
        passwordInput,
        setPasswordInput,
        activityNotification,
        messagesEndRef,
        fileInputRef,
        handleJoinWithPassword,
        handleSendMessage,
        handleFileUpload,
        triggerFileUpload,
        copyRoomLink,
        handleLeaveRoom,
        handleToggleScreenShare,
        confirmStopShare,
    };
};
