import { useState } from 'react';
import { 
    Dialog, DialogContent, DialogTitle
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
    MessageSquare, Star, Send, 
    CheckCircle2, Sparkles, Bug, 
    Lightbulb, Heart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ratingLabels: { [key: number]: { text: string; color: string } } = {
    1: { text: 'Needs improvement', color: 'text-red-400' },
    2: { text: 'Needs improvement', color: 'text-orange-400' },
    3: { text: "It's okay", color: 'text-yellow-400' },
    4: { text: 'Works great', color: 'text-green-400' },
    5: { text: 'Love it', color: 'text-emerald-400' },
};

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
    const { user } = useAuth();
    const [feedbackType, setFeedbackType] = useState('general');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const feedbackTypes = [
        { value: 'general', label: 'General', icon: MessageSquare, color: 'text-blue-400' },
        { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400' },
        { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
        { value: 'compliment', label: 'Praise', icon: Heart, color: 'text-pink-400' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message && rating === 0) {
            toast.error('Please add a rating or feedback');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('feedback')
                .insert({
                    type: feedbackType,
                    rating,
                    message,
                    name: user?.user_metadata?.display_name || 'Anonymous',
                    email: user?.email || 'guest@cospira.com',
                    metadata: {
                        page: window.location.pathname,
                        timestamp: new Date().toISOString(),
                        user_id: user?.id || null,
                    }
                });

            if (error) throw error;
            setIsSubmitted(true);
            toast.success('Feedback received!');
            
            // Wait a bit to show success state then close
            setTimeout(() => {
                onClose();
                // Reset state after the dialog exit animation
                setTimeout(() => {
                    setIsSubmitted(false);
                    setRating(0);
                    setMessage('');
                    setFeedbackType('general');
                }, 500);
            }, 2000);
        } catch (error) {
            logger.error('Error submitting feedback:', error);
            toast.error('Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[420px] bg-[#0c1016]/95 backdrop-blur-xl border-white/10 p-8 rounded-[2rem] shadow-2xl text-white outline-none">
                <VisuallyHidden>
                    <DialogTitle>Feedback Form</DialogTitle>
                </VisuallyHidden>
                <AnimatePresence mode="wait">
                    {isSubmitted ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Transmitted</h3>
                            <p className="text-white/40 text-sm font-medium">Thank you for helping us evolve.</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-primary" />
                                    Feedback
                                </h2>
                                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                                    Help us refine the Cospira experience
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-1">Transmission Category</Label>
                                    <Select value={feedbackType} onValueChange={setFeedbackType}>
                                        <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-xl px-4 text-white/80 focus:ring-0 focus:border-white/20 transition-all">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0c1016] border-white/10">
                                            {feedbackTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value} className="focus:bg-white/5 cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <type.icon className={`w-4 h-4 ${type.color}`} />
                                                        <span className="text-xs font-medium text-white/80">{type.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-1 text-center block">Experience Rating</Label>
                                    <div className="flex flex-col items-center gap-2 bg-white/[0.02] py-4 rounded-2xl border border-white/5">
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <motion.button
                                                    key={star}
                                                    type="button"
                                                    whileHover={{ scale: 1.25, rotate: 5 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => setHoveredRating(star)}
                                                    onMouseLeave={() => setHoveredRating(0)}
                                                    className="focus:outline-none"
                                                >
                                                    <Star
                                                        className={`w-7 h-7 transition-all duration-300 ${
                                                            star <= (hoveredRating || rating)
                                                                ? 'fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                                                                : 'text-white/10'
                                                        }`}
                                                    />
                                                </motion.button>
                                            ))}
                                        </div>
                                        <div className="h-4">
                                            {(hoveredRating > 0 || rating > 0) && (
                                                <motion.span 
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`text-[9px] font-black uppercase tracking-[0.2em] ${ratingLabels[hoveredRating || rating]?.color}`}
                                                >
                                                    {ratingLabels[hoveredRating || rating]?.text}
                                                </motion.span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/20 ml-1">Message Detail</Label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="What's on your mind? Be as specific as possible..."
                                        className="min-h-[120px] bg-white/[0.03] border-white/5 rounded-xl px-4 py-3 text-white/80 focus:border-white/20 transition-all text-xs resize-none placeholder:text-white/10 focus:ring-0"
                                    />
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || (!message && rating === 0)}
                                        className="w-full h-14 bg-white text-black hover:bg-zinc-100 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all disabled:opacity-30 group"
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Transmitting Data...</span>
                                        ) : (
                                            <>
                                                <span>Initiate Send</span>
                                                <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                    <button 
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-4 text-[9px] font-bold uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors"
                                    >
                                        Cancel Transmission
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackModal;
