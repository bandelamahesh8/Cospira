import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MeetingService } from '@/services/MeetingService';
import { toast } from 'sonner';

interface ScheduleMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!title || !date) {
      toast.error('Missing Required Fields', { description: 'Please provide a title and date.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const startStr = `${format(date, 'yyyy-MM-dd')}T${startTime}:00`;
      const endStr = `${format(date, 'yyyy-MM-dd')}T${endTime}:00`;

      await MeetingService.scheduleMeeting(
        organizationId,
        {
          title,
          description,
          start_time: new Date(startStr).toISOString(),
          end_time: new Date(endStr).toISOString(),
        },
        user?.id
      );

      toast.success('Meeting Synchronized', {
        description: 'Your neural sector has been scheduled.',
      });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Scheduling error:', error);
      toast.error('Synchronization Failed', { description: 'Could not schedule the meeting.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(undefined);
    setStartTime('10:00');
    setEndTime('11:00');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-[#05060f] border-white/5 p-0 overflow-hidden sm:max-w-[500px] rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)]'>
        <div className='relative'>
          {/* Header Aesthetic */}
          <div className='h-24 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-white/5 flex items-center px-8'>
            <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mr-4 border border-indigo-500/20'>
              <Clock className='w-6 h-6' />
            </div>
            <div>
              <DialogTitle className='text-2xl font-black uppercase tracking-tighter text-white italic'>
                Schedule Meeting
              </DialogTitle>
              <p className='text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]'>
                Neural Sector Reservation
              </p>
            </div>
          </div>

          <div className='p-8 space-y-6'>
            {/* Title Input */}
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-white/40 pl-1'>
                Meeting Title
              </Label>
              <Input
                placeholder='E.G. STRATEGY SYNC'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='h-14 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/10 font-bold uppercase tracking-widest px-6'
              />
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-white/40 pl-1'>
                Agenda Details (Optional)
              </Label>
              <Textarea
                placeholder='DESCRIBE THE CORE OBJECTIVE...'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className='bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/10 min-h-[100px] p-6 text-sm'
              />
            </div>

            {/* Date Picker */}
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-white/40 pl-1'>
                Target Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full h-14 justify-start text-left font-bold uppercase tracking-widest bg-white/5 border-white/10 rounded-2xl',
                      !date && 'text-white/20'
                    )}
                  >
                    <CalendarIcon className='mr-2 h-4 w-4 text-indigo-400' />
                    {date ? format(date, 'PPP') : <span>Select Transmission Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='w-auto p-0 bg-[#0a0d14] border-white/10 rounded-3xl overflow-hidden'
                  align='start'
                >
                  <Calendar
                    mode='single'
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className='bg-transparent text-white'
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Slots */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-white/40 pl-1'>
                  Start Time
                </Label>
                <Input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='h-12 bg-white/5 border-white/10 rounded-xl text-white font-mono text-center'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-white/40 pl-1'>
                  End Time
                </Label>
                <Input
                  type='time'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className='h-12 bg-white/5 border-white/10 rounded-xl text-white font-mono text-center'
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSchedule}
              disabled={isSubmitting || !title || !date}
              className='w-full h-14 bg-white text-black hover:bg-white/90 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_4px_20px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                  Synchronizing...
                </>
              ) : (
                'Initiate Reservation'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
