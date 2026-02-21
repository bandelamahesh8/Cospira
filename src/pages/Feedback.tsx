import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Star,
  CheckCircle2,
  Sparkles,
  Bug,
  Lightbulb,
  Heart,
  ThumbsUp,
  ShieldCheck,
  ArrowRight,
  Info,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Contextual rating text
const ratingContext: { [key: number]: string } = {
  1: "What went wrong?",
  2: "What could be better?",
  3: "What could be better?",
  4: "What worked perfectly?",
  5: "What worked perfectly?",
};

const Feedback = () => {

  const [feedbackType, setFeedbackType] = useState('general');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);

  // Progressive disclosure: Show optional fields only if user has engaged
  const hasEngaged = rating > 0 || message.length > 0;

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-indigo-400' },
    { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
    { value: 'compliment', label: 'Praise', icon: Heart, color: 'text-pink-400' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackType || (!message && rating === 0)) {
      toast.error('Please add a rating or feedback to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate reference ID
      const refId = `FB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      const { error } = await supabase
        .from('feedback')
        .insert({
          type: feedbackType,
          rating,
          name: name || 'Anonymous',
          email,
          subject,
          message,
          metadata: {
            app_version: '2.0.0',
            timestamp: new Date().toISOString(),
            reference_id: refId,
          },
        });
    
      if (error) throw error;

      setIsSubmitting(false);
      setIsSubmitted(true);
      setReferenceId(refId);
    } catch (_error) {
      // Failed to submit feedback
      toast.error('Failed to submit feedback.');
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setRating(0);
    setMessage('');
    setName('');
    setEmail('');
    setSubject('');
  };

  const selectedType = feedbackTypes.find(t => t.value === feedbackType);
  const TypeIcon = selectedType?.icon || MessageSquare;

  return (
    <div className='min-h-screen bg-[#050505] relative overflow-x-hidden font-sans selection:bg-indigo-500/30 text-white'>
      {/* Ambient Background matching Homepage/About */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <Navbar />

        {/* Back Button - Premium 10/10 */}


        <div className='container mx-auto px-4 pt-40 pb-32'>
          {/* PHASE 1 — REFRAME THE PURPOSE */}
          <motion.div
            className='text-center mb-20 max-w-3xl mx-auto space-y-6'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-white/40 mb-4 backdrop-blur-md'>
              <Sparkles className='w-4 h-4' />
              <span className='text-[10px] font-black tracking-[0.2em] uppercase'>The Feedback Loop</span>
            </div>

            <h1 className='text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase'>
                SHARE YOUR<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">FEEDBACK.</span>
            </h1>

            <div className="space-y-4">
              <p className='text-xl text-white/50 leading-relaxed font-medium'>
                Every message is reviewed by the product team — <span className="text-white">not an algorithm.</span>
              </p>
              <p className='text-sm text-white/30 leading-relaxed max-w-xl mx-auto text-lowercase underline underline-offset-8 decoration-white/5'>
                Your signals directly shape the next evolution of Cospira.
              </p>
            </div>
          </motion.div>

          <div className='grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto'>
            {/* Feedback Form */}
            <motion.div
              className='lg:col-span-2'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className='luxury-card bg-white/[0.03] border-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]'>
                <CardHeader className="p-10 pb-6">
                  <div className='flex items-center justify-between'>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center ${selectedType?.color}`}>
                          <TypeIcon className='w-7 h-7' />
                        </div>
                        <div>
                          <CardTitle className='text-2xl font-black tracking-tight uppercase text-white'>Submit Insight</CardTitle>
                          <CardDescription className="text-white/30">Direct channel to Cospira engineering</CardDescription>
                        </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-10 pt-0">
                  <AnimatePresence mode="wait">
                    {isSubmitted ? (
                      /* PHASE 6 — POST-SUBMIT STATE */
                      <motion.div
                        key="success"
                        className='text-center py-16 space-y-10'
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <motion.div
                          className='w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto'
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 12 }}
                        >
                          <CheckCircle2 className='w-12 h-12 text-emerald-400' />
                        </motion.div>
                        
                        <div className="space-y-4">
                          <h3 className='text-3xl font-black uppercase tracking-tight text-white'>Thank you.</h3>
                          <p className='text-white/50 text-lg'>
                            Your feedback has been sent to the product team.
                          </p>
                          {referenceId && (
                            <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/5 font-mono text-[10px] text-white/30">
                              REF: {referenceId}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                           <button
                             onClick={handleReset}
                             className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                           >
                             Want to share more?
                           </button>
                           <div className="hidden sm:block w-px h-4 bg-white/10" />
                           <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors">
                             Return to Home
                           </Link>
                        </div>
                      </motion.div>
                    ) : (
                      /* PHASE 2 — PROGRESSIVE FLOW */
                      <motion.form
                        key="form"
                        onSubmit={handleSubmit}
                        className='space-y-10'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {/* Step 1: Light Entry */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className='space-y-3'>
                                <Label htmlFor='feedback-type' className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Feedback Type</Label>
                                <Select value={feedbackType} onValueChange={setFeedbackType}>
                                    <SelectTrigger className='h-12 bg-white/[0.03] border-white/5 text-white/80 rounded-xl focus:ring-1 focus:ring-white/20 transition-all'>
                                        <SelectValue placeholder='Select type' />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0f0f12] border-white/10 text-white">
                                        {feedbackTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value} className="focus:bg-white/5">
                                                <div className='flex items-center gap-3'>
                                                    <type.icon className={`w-4 h-4 ${type.color}`} />
                                                    <span className="text-sm font-medium">{type.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='space-y-3'>
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Star Rating</Label>
                                <div className='flex gap-3 items-center h-12 px-1'>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <motion.button
                                            key={star}
                                            type='button'
                                            className='focus:outline-none relative group'
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            whileHover={{ scale: 1.25 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Star
                                                className={`w-7 h-7 transition-all duration-300 ${
                                                    star <= (hoveredRating || rating)
                                                        ? 'fill-white text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                                                        : 'text-white/10'
                                                }`}
                                            />
                                        </motion.button>
                                    ))}
                                    {/* PHASE 3 — CONTEXTUAL RATING TEXT */}
                                    <AnimatePresence>
                                        {(hoveredRating > 0 || rating > 0) && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 5 }}
                                                className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4 italic"
                                            >
                                                {ratingContext[hoveredRating || rating]}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <Label htmlFor='message' className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Your Insight</Label>
                            <Textarea
                                id='message'
                                placeholder="Be as honest as possible..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className='bg-white/[0.03] border-white/5 focus:border-white/20 min-h-[160px] rounded-3xl p-6 text-white/80 resize-none transition-all focus:bg-white/[0.05]'
                                maxLength={1000}
                            />
                        </div>

                        {/* Step 2: Reveal Deep Fields */}
                        <AnimatePresence>
                            {hasEngaged && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden space-y-10"
                                >
                                    <div className="h-px bg-white/5 w-1/4 mx-auto" />
                                    
                                    <div className="grid md:grid-cols-3 gap-8">
                                        <div className='space-y-3'>
                                            <Label htmlFor='name' className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Name (Optional)</Label>
                                            <Input
                                                id='name'
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className='h-12 bg-white/[0.03] border-white/5 rounded-xl focus:bg-white/[0.05]'
                                                placeholder="Identity"
                                            />
                                        </div>
                                        <div className='space-y-3'>
                                            <Label htmlFor='email' className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Email (Optional)</Label>
                                            <Input
                                                id='email'
                                                type='email'
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className='h-12 bg-white/[0.03] border-white/5 rounded-xl focus:bg-white/[0.05]'
                                                placeholder="Reach out"
                                            />
                                        </div>
                                        <div className='space-y-3'>
                                            <Label htmlFor='subject' className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Subject (Optional)</Label>
                                            <Input
                                                id='subject'
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className='h-12 bg-white/[0.03] border-white/5 rounded-xl focus:bg-white/[0.05]'
                                                placeholder="Context"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* PHASE 5 — CTA REFINEMENT */}
                        <div className="pt-6 relative text-center">
                            <motion.button
                                type='submit'
                                onMouseEnter={() => setIsHoveringSubmit(true)}
                                onMouseLeave={() => setIsHoveringSubmit(false)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full h-16 rounded-full font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden group flex items-center justify-center gap-3 ${
                                    isSubmitting ? 'bg-white/10 text-white/50 cursor-not-allowed' : 'bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]'
                                }`}
                                disabled={isSubmitting || (!message && rating === 0)}
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Submit Feedback</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </motion.button>
                            
                            <AnimatePresence>
                                {isHoveringSubmit && !isSubmitting && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute -bottom-8 left-0 w-full text-[10px] font-black uppercase tracking-widest text-white/20"
                                    >
                                        Directly reviewed by Cospira
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
              
              {/* PHASE 4 — MAKE THE SYSTEM FEEL ALIVE */}
              <motion.div 
                {...fadeInUp}
                className="mt-12 p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center gap-6"
              >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                      <Info className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed text-center sm:text-left">
                      "Recent feedback helped us improve <span className="text-white/60">matching speed</span> and <span className="text-white/60">UI clarity</span>. We build based on signals — not assumptions."
                  </p>
              </motion.div>
            </motion.div>

            {/* Sidebar — Trust Signals */}
            <motion.div
              className='space-y-8'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Why Your Feedback Matters */}
              <Card className='luxury-card bg-white/[0.03] border-white/5 p-8 rounded-[2rem] space-y-6'>
                  <div className="flex items-center gap-3">
                    <ThumbsUp className='w-5 h-5 text-white' />
                    <h3 className='text-lg font-black uppercase tracking-tight'>Why It Matters</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                        "Helps us prioritize new features",
                        "Identifies system-level bugs",
                        "Improves experience for everyone"
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-white/30">
                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                            {item}
                        </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white italic">
                          We build based on signals — not assumptions.
                      </p>
                  </div>
              </Card>

              {/* Security Priority */}
              <Card className='luxury-card bg-[#0f0f12] border-white/5 p-8 rounded-[2rem] space-y-6'>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className='w-5 h-5 text-emerald-400' />
                    <h3 className='text-lg font-black uppercase tracking-tight'>Security</h3>
                  </div>
                  <p className='text-sm text-white/40 leading-relaxed'>
                    Priority reporting for security issues or privacy concerns.
                  </p>
                  <div className="space-y-1">
                      <p className='text-[10px] font-black uppercase text-white/20'>Priority Channel</p>
                      <p className='text-base font-bold text-white'>security@cospira.com</p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                          Security reports are prioritized immediately.
                      </p>
                  </div>
              </Card>

              {/* Other Ways */}
              <Card className='luxury-card bg-white/[0.03] border-white/5 p-8 rounded-[2rem] space-y-4'>
                  <div className="flex items-center gap-3">
                    <Mail className='w-5 h-5 text-white/50' />
                    <h3 className='text-lg font-black uppercase tracking-tight text-white/50'>Direct Reach</h3>
                  </div>
                  <div className="space-y-4">
                      <div className="space-y-1">
                        <p className='text-[10px] font-black uppercase text-white/20'>General Support</p>
                        <p className='text-sm font-bold text-white/60'>support@cospira.com</p>
                      </div>
                      <p className="text-[10px] text-white/20 font-bold uppercase">Estimated response: 24h</p>
                  </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
};

export default Feedback;
