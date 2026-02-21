import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onResendEmail?: () => void;
}

export const EmailVerificationModal = ({ 
  isOpen, 
  email, 
  onClose,
  onResendEmail 
}: EmailVerificationModalProps) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    if (onResendEmail) {
      await onResendEmail();
    }
    setIsResending(false);
    setResendSuccess(true);
    setTimeout(() => setResendSuccess(false), 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              className="relative w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="glass-card rounded-3xl p-8 border border-primary/20 shadow-2xl relative overflow-hidden">
                {/* Animated Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10" />
                
                {/* Animated Rings */}
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-primary/10 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-purple-500/10 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />

                {/* Content */}
                <div className="relative z-10 text-center space-y-6">
                  {/* Icon */}
                  <motion.div
                    className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -5, 0],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Mail className="w-10 h-10 text-primary" />
                    </motion.div>
                  </motion.div>

                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-400 mb-2">
                      Verify Your Email
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      We've sent a verification link to
                    </p>
                  </motion.div>

                  {/* Email Display */}
                  <motion.div
                    className="px-4 py-3 rounded-xl bg-primary/5 border border-primary/20"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="text-primary font-semibold break-all">{email}</p>
                  </motion.div>

                  {/* Instructions */}
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="space-y-3 text-left">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">1</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Open your email inbox and look for our verification email
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">2</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Click the verification link in the email
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">3</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Return here and log in with your credentials
                        </p>
                      </div>
                    </div>

                    {/* Success Message */}
                    <motion.div
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <p className="text-sm font-medium text-green-500">
                        Account created successfully!
                      </p>
                    </motion.div>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    className="space-y-3 pt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button
                      onClick={() => window.open('https://mail.google.com', '_blank')}
                      className="w-full h-12 font-semibold group"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Open Gmail
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    {/* Resend Email */}
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Didn't receive the email?
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={isResending || resendSuccess}
                        className="text-xs h-auto p-1 hover:text-primary"
                      >
                        {isResending ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Sending...
                          </>
                        ) : resendSuccess ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                            Sent!
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Resend
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>

                  {/* Footer Note */}
                  <motion.div
                    className="pt-4 border-t border-white/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-primary">Note:</strong> Check your spam folder if you don't see the email within a few minutes.
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
