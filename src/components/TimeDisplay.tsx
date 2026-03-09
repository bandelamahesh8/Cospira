import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const TIMEZONES = [
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'Local Time', value: 'local' },
  { label: 'UTC', value: 'UTC' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
];

export const TimeDisplay = () => {
  const [time, setTime] = useState(new Date());
  const [zone, setZone] = useState('Asia/Kolkata'); // Default to IST

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date, timeZone: string) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };

    try {
      if (timeZone === 'local') {
        return date.toLocaleString('en-US', options);
      }
      return date.toLocaleString('en-US', { ...options, timeZone });
    } catch {
      return date.toLocaleString(); // Fallback
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-colors group'>
          <Clock className='w-3 h-3 text-emerald-400 group-hover:text-emerald-300' />
          <span className='text-[10px] font-mono text-emerald-400/80 group-hover:text-emerald-300 font-bold min-w-[150px] text-center'>
            {formatTime(time, zone)}
          </span>
          <span className='text-[8px] text-white/30 font-bold uppercase tracking-wider ml-1 hidden xl:inline-block'>
            {zone === 'local'
              ? 'LOC'
              : zone.includes('/')
                ? zone.split('/')[1].substring(0, 3).toUpperCase()
                : zone}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-48 bg-[#0A0C14] border-white/10 text-slate-200 backdrop-blur-xl'
      >
        <DropdownMenuLabel className='text-xs uppercase text-slate-500 font-bold tracking-widest px-2 py-1'>
          System Time
        </DropdownMenuLabel>

        {TIMEZONES.map((tz) => (
          <DropdownMenuItem
            key={tz.value}
            onSelect={() => setZone(tz.value)}
            className={`text-xs font-medium cursor-pointer flex justify-between items-center ${zone === tz.value ? 'bg-white/10 text-white' : 'focus:bg-white/5'}`}
          >
            <span>{tz.label}</span>
            {zone === tz.value && <div className='w-1 h-1 bg-emerald-500 rounded-full' />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
