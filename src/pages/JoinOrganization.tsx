import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { OrganizationService } from '@/services/OrganizationService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { PageLoader } from '@/components/PageLoader';

const JoinOrganization = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    
    const [status, setStatus] = useState<'verifying' | 'preview' | 'accepting' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [inviteDetails, setInviteDetails] = useState<any>(null);

    useEffect(() => {
        // If auth is still loading, wait
        if (authLoading) return;

        // If no user, redirect to login with return url
        if (!user) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            navigate(`/auth?return_to=${returnUrl}`);
            return;
        }

        if (!token) {
            setStatus('error');
            setErrorMessage('Invalid invitation link: Missing token.');
            return;
        }

        const verifyToken = async () => {
            try {
                // 1. Verify Token & Get Details for Preview
                const invite = await OrganizationService.checkInviteToken(token);
                 if (!invite) {
                    setStatus('error');
                    setErrorMessage('Invitation not found or expired.');
                    return;
                }
                setInviteDetails(invite);
                setStatus('preview'); // Show preview state

            } catch (error: any) {
                console.error(error);
                setStatus('error');
                setErrorMessage(error.message || 'Failed to verify invitation.');
            }
        };

        verifyToken();

    }, [token, user, authLoading, navigate]);

    const handleAccept = async () => {
        if (!token) return;
        setStatus('accepting');
        try {
            await OrganizationService.acceptInvite(token);
            setStatus('success');
            toast.success(`Joined successfully!`);
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || 'Failed to accept invitation.');
        }
    };

    if (authLoading) {
        return <PageLoader />;
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-[#0c1016] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    
                    {status === 'verifying' && (
                        <>
                           <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 animate-pulse">
                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                           </div>
                           <h2 className="text-xl font-bold text-white mb-2">Verifying Security Token...</h2>
                        </>
                    )}

                    {status === 'preview' && inviteDetails && (
                        <>
                           <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                                <Mail className="w-8 h-8 text-indigo-400" />
                           </div>
                           <h2 className="text-xl font-bold text-white mb-2">You're Invited!</h2>
                           <p className="text-white/60 text-sm mb-6">
                               You have been invited to join 
                               <span className="text-white font-bold block mt-1 text-lg">{inviteDetails.organization?.name}</span>
                           </p>
                           <div className="bg-white/5 rounded-xl p-4 w-full mb-6 border border-white/5">
                                <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Your Role</div>
                                <div className="text-white font-mono text-sm">Member</div> 
                                {/* Note: Ideally we resolve Role Name from ID, but for now 'Member' is safe assumption or we fetch role name in verify step */}
                           </div>

                           <Button 
                                onClick={handleAccept}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                            >
                                Accept & Join Organization
                            </Button>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                           <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                           </div>
                           <h2 className="text-xl font-bold text-white mb-2">Access Granted</h2>
                           <p className="text-white/40 text-sm mb-6">
                               You have successfully joined 
                               <span className="text-white font-bold block mt-1">{inviteDetails?.organization?.name}</span>
                           </p>
                           <Button 
                                onClick={() => navigate('/dashboard')}
                                className="w-full bg-white text-black hover:bg-indigo-50 font-bold"
                            >
                                Enter Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                         <>
                           <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                                <XCircle className="w-8 h-8 text-red-400" />
                           </div>
                           <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                           <p className="text-red-400/80 text-sm mb-6 max-w-[80%] mx-auto">
                               {errorMessage}
                           </p>
                           <Button 
                                variant="outline"
                                onClick={() => navigate('/dashboard')}
                                className="w-full border-white/10 text-white hover:bg-white/5 hover:text-white"
                            >
                                Return directly to Dashboard
                            </Button>
                        </>
                    )}
                </div>
             </div>
        </div>
    );
};

export default JoinOrganization;
