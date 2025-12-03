import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Youtube, Upload, Monitor, X, Tv, Film, Sparkles, PlayCircle } from 'lucide-react';

interface OTTGridModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartYouTube: (url: string) => void;
  onFileUpload: (file: File) => void;
  onStartScreenShare: () => void;
}

const OTTGridModal: React.FC<OTTGridModalProps> = ({
  isOpen,
  onOpenChange,
  onStartYouTube,
  onFileUpload,
  onStartScreenShare,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      onStartYouTube(youtubeUrl);
      setYoutubeUrl('');
      setShowYoutubeInput(false);
      onOpenChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      onOpenChange(false);
    }
  };

  const handleOTTClick = (url: string) => {
    window.open(url, '_blank');
    onStartScreenShare();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] bg-zinc-900 border-zinc-800 text-white'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold text-center mb-4'>
            Share Content
          </DialogTitle>
          <DialogDescription className='text-center text-zinc-400'>
            Choose how you want to share content with the room.
          </DialogDescription>
        </DialogHeader>

        {!showYoutubeInput ? (
          <div className='p-4 space-y-6'>
            {/* Quick Actions */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium text-zinc-400 uppercase tracking-wider'>
                Quick Actions
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {/* YouTube Option */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-red-500 transition-all group'
                  onClick={() => setShowYoutubeInput(true)}
                >
                  <div className='p-2 rounded-full bg-red-500/10 group-hover:bg-red-500/20 transition-colors'>
                    <Youtube className='h-6 w-6 text-red-500' />
                  </div>
                  <span className='font-medium'>YouTube</span>
                </Button>

                {/* File Upload Option */}
                <div className='relative'>
                  <input
                    type='file'
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                    onChange={handleFileChange}
                  />
                  <Button
                    variant='outline'
                    className='w-full h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-blue-500 transition-all group'
                  >
                    <div className='p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors'>
                      <Upload className='h-6 w-6 text-blue-500' />
                    </div>
                    <span className='font-medium'>Upload File</span>
                  </Button>
                </div>

                {/* Screen Share Option */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-green-500 transition-all group'
                  onClick={() => {
                    onStartScreenShare();
                    onOpenChange(false);
                  }}
                >
                  <div className='p-2 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors'>
                    <Monitor className='h-6 w-6 text-green-500' />
                  </div>
                  <span className='font-medium'>Screen Share</span>
                </Button>
              </div>
            </div>

            {/* OTT Platforms */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium text-zinc-400 uppercase tracking-wider'>
                OTT Platforms
              </h3>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {/* Netflix */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-red-600 transition-all group'
                  onClick={() => handleOTTClick('https://www.netflix.com')}
                >
                  <div className='p-2 rounded-full bg-red-600/10 group-hover:bg-red-600/20 transition-colors'>
                    <Film className='h-6 w-6 text-red-600' />
                  </div>
                  <span className='font-medium'>Netflix</span>
                </Button>

                {/* Prime Video */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-blue-400 transition-all group'
                  onClick={() => handleOTTClick('https://www.primevideo.com')}
                >
                  <div className='p-2 rounded-full bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors'>
                    <Tv className='h-6 w-6 text-blue-400' />
                  </div>
                  <span className='font-medium'>Prime Video</span>
                </Button>

                {/* Disney+ */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-indigo-500 transition-all group'
                  onClick={() => handleOTTClick('https://www.disneyplus.com')}
                >
                  <div className='p-2 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors'>
                    <Sparkles className='h-6 w-6 text-indigo-500' />
                  </div>
                  <span className='font-medium'>Disney+</span>
                </Button>

                {/* Hulu */}
                <Button
                  variant='outline'
                  className='h-24 flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-green-500 transition-all group'
                  onClick={() => handleOTTClick('https://www.hulu.com')}
                >
                  <div className='p-2 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors'>
                    <PlayCircle className='h-6 w-6 text-green-500' />
                  </div>
                  <span className='font-medium'>Hulu</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className='p-4 space-y-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-medium'>Enter YouTube URL</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowYoutubeInput(false)}
                className='text-zinc-400 hover:text-white'
              >
                Back
              </Button>
            </div>
            <form onSubmit={handleYoutubeSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='youtube-url'>Video URL</Label>
                <Input
                  id='youtube-url'
                  placeholder='https://www.youtube.com/watch?v=...'
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className='bg-zinc-800 border-zinc-700 text-white'
                  autoFocus
                />
              </div>
              <Button type='submit' className='w-full bg-red-600 hover:bg-red-700 text-white'>
                Start Watching
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OTTGridModal;
