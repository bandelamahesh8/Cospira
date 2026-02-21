import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

interface Log {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}

const LOG_MESSAGES = [
    { msg: "System synchronized with global clock", type: 'info' },
    { msg: "Encrypted handshake established [Node 4FA]", type: 'success' },
    { msg: "Packet loss detected in Sector 7", type: 'warning' },
    { msg: "New user connected: Guest_992", type: 'info' },
    { msg: "Optimizing neural engine weights...", type: 'info' },
    { msg: "Firewall intrusion blocked", type: 'success' },
    { msg: "Latency spike detected (124ms)", type: 'warning' },
    { msg: "Room #332 created in 'PRO' mode", type: 'info' },
    { msg: "Running background diagnostics...", type: 'info' },
    { msg: "Connection signal stable", type: 'success' },
    { msg: "Updating global hash map", type: 'info' },
    { msg: "Memory usage optimal (34%)", type: 'info' }
];

export const LiveLogs = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const addLog = () => {
            const randomLog = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
            const newLog: Log = {
                id: Math.random().toString(36).substring(7),
                message: randomLog.msg,
                type: randomLog.type as Log['type'],
                timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };

            setLogs(prev => {
                const updated = [...prev, newLog];
                if (updated.length > 8) return updated.slice(1);
                return updated;
            });
        };

        const interval = setInterval(() => {
            if (Math.random() > 0.4) addLog();
        }, 1500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="h-full bg-[#0F1116] border border-white/5 rounded-2xl p-5 flex flex-col font-mono text-[10px] leading-relaxed relative overflow-hidden hover:border-white/10 transition-all shadow-[0_0_40px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2 mb-4 text-zinc-500 uppercase tracking-widest font-bold border-b border-white/5 pb-2">
                <Terminal className="w-3 h-3" />
                <span>System Logs</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-hidden space-y-2 relative">
                <AnimatePresence mode='popLayout'>
                    {logs.map(log => (
                        <motion.div 
                            key={log.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3"
                        >
                            <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                            <span className={`
                                truncate
                                ${log.type === 'info' ? 'text-zinc-400' : ''}
                                ${log.type === 'success' ? 'text-emerald-500' : ''}
                                ${log.type === 'warning' ? 'text-amber-500' : ''}
                                ${log.type === 'error' ? 'text-red-500' : ''}
                            `}>
                                {log.type === 'success' && '✓ '}
                                {log.type === 'warning' && '⚠ '}
                                {log.message}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
