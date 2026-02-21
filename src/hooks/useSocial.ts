import { useState, useEffect, useCallback } from 'react';
import { SocialService } from '@/services/SocialService';
import { FriendProfile } from '@/types/social';
import { toast } from '@/hooks/use-toast';

export const useSocial = () => {
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [requests, setRequests] = useState<FriendProfile[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [f, r] = await Promise.all([
                SocialService.getFriends(),
                SocialService.getIncomingRequests()
            ]);
            setFriends(f);
            setRequests(r);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    const sendRequest = async (targetId: string) => {
        const res = await SocialService.sendFriendRequest(targetId);
        if (res.error) {
            toast({ title: 'Error', description: res.error, variant: 'destructive' });
        } else {
            toast({ title: 'Sent', description: 'Friend request sent!' });
        }
    };

    const respond = async (requesterId: string, accept: boolean) => {
        const res = await SocialService.respondToRequest(requesterId, accept);
        if (res.error) {
            toast({ title: 'Error', description: res.error, variant: 'destructive' });
        } else {
            toast({ title: accept ? 'Accepted' : 'Declined', description: accept ? 'You are now friends!' : 'Request declined.' });
            refresh();
        }
    };

    return {
        friends,
        requests,
        loading,
        refresh,
        sendRequest,
        respond
    };
};
