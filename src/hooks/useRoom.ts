import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { copyToClipboard } from '@/utils/clipboard';

import { decodeRoomId, encodeRoomId } from '@/utils/roomCode';

const SUPPORTED_FORMATS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  videos: ['mp4', 'webm', 'ogg'],
  docs: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pps', 'ppsx', 'txt', 'rtf', 'csv'],
};

const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_FORMATS.images,
  ...SUPPORTED_FORMATS.videos,
  ...SUPPORTED_FORMATS.docs,
];

export const useRoom = () => {
  const { roomId: paramId } = useParams<{ roomId: string }>();
  const roomId = useMemo(() => {
    return decodeRoomId(paramId || '');
  }, [paramId]);

  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const isPreview = searchParams.get('preview') === 'true';
  const isGhost = searchParams.get('ghost') === 'true';
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
    presentFileFromUpload,
    leaveRoom: contextLeaveRoom,
    roomId: contextRoomId,
    toggleScreenShare,
    isScreenSharing,
    isHost,
    effectiveUserId,
  } = useWebSocket();

  // Sync hasJoined with context roomId
  useEffect(() => {
    if (contextRoomId && roomId && contextRoomId === roomId) {
      setHasJoined(true);
    } else if (contextRoomId !== roomId) {
      setHasJoined(false);
    }
  }, [contextRoomId, roomId]);

  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Recovery: If upload gets stuck in loading state (e.g. network hang), reset after 30s
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isUploading) {
      timeout = setTimeout(() => {
        setIsUploading(false);
        logger.warn('[useRoom] isUploading auto-reset triggered after timeout');
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [isUploading]);

  const [hasJoined, setHasJoined] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [isParticipantsMinimized, setIsParticipantsMinimized] = useState(false);
  const [showOTTModal, setShowOTTModal] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showStopShareConfirm, setShowStopShareConfirm] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const isOrg = searchParams.get('type') === 'org';
  const [joinExplicitlyRequested, setJoinExplicitlyRequested] = useState(
    isPreview || !isOrg || (!!contextRoomId && contextRoomId !== roomId)
  );
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

  // Force URL Hashing: If we are on a Raw ID, redirect to Hash
  useEffect(() => {
    if (paramId && roomId && paramId === roomId) {
      const encoded = encodeRoomId(roomId);
      // Only redirect if encoding actually changes it (prevents infinite loop if encoding fails or returns same)
      if (encoded !== roomId) {
        // Wrap in timeout to avoid "Should have a queue" React error (clashing with Suspense/Mount)
        setTimeout(() => {
          navigate(`/room/${encoded}`, { replace: true });
        }, 0);
      }
    }
  }, [paramId, roomId, navigate]);

  // Join room on mount / when roomId changes
  useEffect(() => {
    if (socket && isConnected && roomId && !hasJoined) {
      // Seamless Shifting: If we were already in a different room but just changed URL
      // (e.g. Host dispatched us or we clicked a breakout), auto-request join if authorized.
      if (contextRoomId && contextRoomId !== roomId && !joinExplicitlyRequested) {
        setJoinExplicitlyRequested(true);
      }

      if (joinExplicitlyRequested) {
        joinRoom(
          roomId,
          undefined,
          inviteToken || undefined,
          () => {
            setHasJoined(true);
            // Camera and mic are off by default - users can enable manually
          },
          (error) => {
            if (error === 'Incorrect password') {
              setShowPasswordModal(true);
            } else {
              toast.error(error);
              navigate('/dashboard');
            }
          },
          isGhost
        );
      }
    }
  }, [
    socket,
    isConnected,
    roomId,
    hasJoined,
    joinRoom,
    navigate,
    inviteToken,
    joinExplicitlyRequested,
    isGhost,
    contextRoomId,
  ]);

  const requestJoin = useCallback(() => {
    setJoinExplicitlyRequested(true);
  }, []);

  const handleJoinWithPassword = useCallback(() => {
    if (!roomId) return;

    joinRoom(
      roomId,
      passwordInput,
      inviteToken || undefined,
      () => {
        setHasJoined(true);
        setShowPasswordModal(false);
        // Camera and mic are off by default - users can enable manually
      },
      (error) => {
        toast.error(error);
      },
      isGhost
    );
  }, [roomId, passwordInput, inviteToken, joinRoom, isGhost]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      sendMessage(newMessage);
      setNewMessage('');
    },
    [newMessage, sendMessage]
  );

  const handleFileUpload = useCallback(
    async (input: React.ChangeEvent<HTMLInputElement> | File | unknown) => {
      // 1. Initial Trigger Phase
      logger.info('[useRoom] handleFileUpload entry point', { inputType: typeof input });

      let file: File | undefined;

      // Determine file source (Event vs Direct File)
      if (input && typeof input === 'object' && 'target' in input) {
        const target = (input as React.ChangeEvent<HTMLInputElement>).target;
        file = target?.files?.[0];
        logger.info('[useRoom] Extracted file from Event:', file?.name);
      } else if (input instanceof File) {
        file = input;
        logger.info('[useRoom] Received File object directly:', file.name);
      }

      // 2. Early Exit if no file
      if (!file) {
        logger.warn('[useRoom] handleFileUpload: No valid file detected');
        return;
      }

      // 3. Validation Phase
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const isSupported = ALL_SUPPORTED_EXTENSIONS.includes(fileExtension);

      if (!isSupported) {
        logger.warn('[useRoom] Unsupported file attempt:', file.name);
        toast.error('Unsupported File Format', {
          description: `.${fileExtension} files cannot be manifested on the stage. Please use Images, Videos, or standard Office Documents.`,
          duration: 6000,
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // 4. Execution Phase
      try {
        setIsUploading(true);
        toast.info(`Preparing projection: ${file.name}`, { id: 'file-prep-toast' });

        const currentUserObj = users.find((u) => String(u.id) === String(effectiveUserId));
        const isCoHost = currentUserObj?.isCoHost;

        logger.info('[useRoom] Manifesting asset:', {
          file: file.name,
          role: isHost ? 'host' : isCoHost ? 'cohost' : 'participant',
        });

        if (isHost || isCoHost) {
          await presentFileFromUpload(file);
        } else {
          await uploadFile(file);
        }
      } catch (error) {
        logger.error('[useRoom] Manifest Process Failed:', error);
        toast.error('Projection Failed', {
          description: 'The internal manifest could not be synchronized with the stage.',
        });
      } finally {
        setIsUploading(false);
        // Clean up inputs to allow re-selection
        if (fileInputRef.current) fileInputRef.current.value = '';
        logger.info('[useRoom] handleFileUpload cycle complete');
      }
    },
    [uploadFile, presentFileFromUpload, isHost, users, effectiveUserId, fileInputRef]
  );

  const triggerFileUpload = useCallback(() => {
    logger.info('[useRoom] triggerFileUpload called');
    if (!fileInputRef.current) {
      logger.warn('[useRoom] triggerFileUpload: fileInputRef is null');
      toast.error('Internal Error: Upload trigger missing');
      return;
    }
    fileInputRef.current.click();
  }, [fileInputRef]);

  const copyRoomLink = useCallback(() => {
    if (roomId) {
      // Copy the HASHED URL or the HASHED ID
      const encoded = encodeRoomId(roomId);
      copyToClipboard(encoded).then((success) => {
        if (success) {
          toast.success('Secure Room Code copied to clipboard!');
        }
      });
    }
  }, [roomId]);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleLeaveRoom = useCallback(() => {
    contextLeaveRoom();
    setIsFeedbackOpen(true);
    toast.info('Disconnecting session...');
  }, [contextLeaveRoom]);

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
    isFeedbackOpen,
    setIsFeedbackOpen,
    handleJoinWithPassword,
    handleSendMessage,
    handleFileUpload,
    triggerFileUpload,
    copyRoomLink,
    handleLeaveRoom,
    handleToggleScreenShare,
    confirmStopShare,
    joinExplicitlyRequested,
    requestJoin,
  };
};
