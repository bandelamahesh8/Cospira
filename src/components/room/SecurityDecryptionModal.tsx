import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, Terminal, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';

interface SecurityDecryptionModalProps {
  isOpen: boolean;
  onDecrypt: () => void;
  roomId: string;
}

export const SecurityDecryptionModal: React.FC<SecurityDecryptionModalProps> = ({
  isOpen,
  onDecrypt,
  roomId,
}) => {
  const [step, setStep] = useState<'scan' | 'auth' | 'decrypting' | 'success'>('scan');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const { verifyRoomPassword } = useWebSocket();
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('scan');
      setTerminalLines([]);
      // Simulate scanning
      let i = 0;
      const scanLogs = [
        'INITIATING SECURITY PROTOCOL...',
        'SCANNING NETWORK INTEGRITY...',
        'DETECTING ENCRYPTION LAYERS...',
        'QUANTUM ENTANGLEMENT DETECTED',
        'SECURE CHANNEL FOUND: ' + roomId,
        'AWAITING BIOMETRIC/PIN INPUT...',
      ];
      const interval = setInterval(() => {
        setTerminalLines((prev) => [...prev, scanLogs[i]]);
        i++;
        if (i >= scanLogs.length) {
          clearInterval(interval);
          setTimeout(() => setStep('auth'), 500);
        }
      }, 300); // Fast scan
      return () => clearInterval(interval);
    }
  }, [isOpen, roomId]);

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    // MVP: Any PIN works, or enforce a mock specific one like '0000' or based on room
    // For "Ultra" feel, let's just make it look cool.
    // Check regex or length
    if (pin.length < 4) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }

    setIsVerifying(true);
    verifyRoomPassword(pin).then((success) => {
      setIsVerifying(false);
      if (success) {
        proceedToDecryption();
      } else {
        setError(true);
        setTerminalLines((prev) => [...prev, 'ACCESS DENIED: INCORRECT PIN']);
        setTimeout(() => setError(false), 500);
      }
    });
  };

  const proceedToDecryption = () => {
    setStep('decrypting');
    setTerminalLines([]); // clear for new logs

    let i = 0;
    const decryptLogs = [
      'VERIFYING CREDENTIALS...',
      'DECRYPTING AUDIO STREAMS...',
      'DECRYPTING VIDEO FEEDS...',
      'ESTABLISHING E2EE TUNNEL...',
      'ACCESS GRANTED.',
    ];

    const interval = setInterval(() => {
      setTerminalLines((prev) => [...prev, decryptLogs[i]]);
      i++;
      if (i >= decryptLogs.length) {
        clearInterval(interval);
        setTimeout(() => {
          setStep('success');
          setTimeout(onDecrypt, 1500);
        }, 500);
      }
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-[99999] bg-black flex items-center justify-center font-mono overflow-hidden'
        >
          {/* Matrix Rain Effect Background (CSS/SVG Simple version) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://media.giphy.com/media/U3qYN8S0j3bpK/giphy.gif')] bg-cover mix-blend-screen" />

          <div className='relative z-10 w-full max-w-lg p-6'>
            <div className='border border-red-500/30 bg-black/90 backdrop-blur-xl rounded-xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)]'>
              {/* HEADER */}
              <div className='flex items-center gap-4 mb-8 border-b border-red-500/20 pb-4'>
                <div
                  className={`p-3 rounded-full border ${step === 'success' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}
                >
                  {step === 'success' ? (
                    <ShieldCheck className='w-8 h-8 text-emerald-500' />
                  ) : (
                    <Lock className='w-8 h-8 text-red-500 animate-pulse' />
                  )}
                </div>
                <div>
                  <h2
                    className={`text-xl font-bold tracking-[0.2em] ${step === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {step === 'success' ? 'SECURE LINK ACTIVE' : 'RESTRICTED ACCESS'}
                  </h2>
                  <p className='text-xs text-slate-500 uppercase tracking-widest'>
                    Ultra Security Mode • {roomId}
                  </p>
                </div>
              </div>

              {/* CONTENT AREA */}
              <div className='min-h-[200px] flex flex-col justify-end'>
                {/* TERMINAL OUTPUT */}
                <div className='space-y-1 mb-6 font-mono text-xs text-green-500/80'>
                  {terminalLines.map((line, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {`> ${line}`}
                    </motion.div>
                  ))}
                  {step === 'decrypting' && (
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >
                      _
                    </motion.span>
                  )}
                </div>

                {/* INPUT FORM */}
                {step === 'auth' && (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleUnlock}
                    className='space-y-4'
                  >
                    <div className='relative'>
                      <Terminal className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500' />
                      <Input
                        autoFocus
                        type='password'
                        placeholder='ENTER SECURITY PIN (Any 4+ chars)'
                        className={`pl-10 h-12 bg-black/50 border-white/10 text-center tracking-[0.5em] text-lg text-white font-bold focus:border-red-500/50 focus:ring-red-500/20 ${error ? 'border-red-500 animate-shake' : ''}`}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      type='submit'
                      className='w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02]'
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Identity'}
                    </Button>

                    <div className='flex items-center gap-2 justify-center text-[10px] text-red-500/50 uppercase tracking-widest mt-4'>
                      <AlertTriangle className='w-3 h-3' />
                      Attempt Logged • Location Traced
                    </div>
                  </motion.form>
                )}

                {step === 'success' && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className='text-center py-4'
                  >
                    <p className='text-emerald-500 font-bold uppercase tracking-widest text-sm animate-pulse'>
                      Redirecting to Workspace...
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
