import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import type { FileData } from '@/contexts/WebSocketContext';

interface FileViewerProps {
  file: FileData;
  presenterName: string;
  onClose: () => void;
  isPresenter: boolean;
}

const FileViewer = ({ file, presenterName, onClose, isPresenter }: FileViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getFileType = () => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) {
      return 'image';
    }
    // Videos
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) {
      return 'video';
    }
    // PDFs
    if (ext === 'pdf') {
      return 'pdf';
    }
    // Office Documents
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) {
      return 'office';
    }
    // Text files
    if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext || '')) {
      return 'text';
    }
    return 'other';
  };

  const fileType = getFileType();

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFileContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className='flex items-center justify-center h-full p-8'>
            <img
              src={file.url}
              alt={file.name}
              className='max-w-full max-h-full object-contain transition-transform duration-300 rounded-lg shadow-2xl'
              style={{ transform: `scale(${zoom / 100})` }}
            />
          </div>
        );

      case 'video':
        return (
          <div className='flex items-center justify-center h-full p-8'>
            <video
              src={file.url}
              controls
              autoPlay
              className='max-w-full max-h-full rounded-lg shadow-2xl'
              style={{ transform: `scale(${zoom / 100})` }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'pdf':
        return (
          <div className='w-full h-full p-4'>
            <iframe
              src={`${file.url}#page=${currentPage}`}
              className='w-full h-full rounded-lg shadow-2xl bg-white'
              title={file.name}
            />
          </div>
        );

      case 'office':
        return (
          <div className='w-full h-full p-4'>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
              className='w-full h-full rounded-lg shadow-2xl bg-white'
              title={file.name}
            />
          </div>
        );

      case 'text':
        return (
          <div className='flex items-center justify-center h-full p-8'>
            <div className='glass-card p-8 max-w-4xl max-h-full overflow-auto custom-scrollbar'>
              <iframe
                src={file.url}
                className='w-full min-h-[600px] bg-transparent text-white'
                title={file.name}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className='flex items-center justify-center h-full'>
            <div className='glass-card p-12 text-center max-w-md'>
              <div className='mb-6'>
                <div className='w-24 h-24 mx-auto bg-gradient-primary rounded-full flex items-center justify-center mb-4'>
                  <Download className='w-12 h-12 text-white' />
                </div>
                <h3 className='text-2xl font-bold text-white mb-2'>{file.name}</h3>
                <p className='text-zinc-400 mb-2'>
                  File type: {file.name.split('.').pop()?.toUpperCase()}
                </p>
                <p className='text-zinc-400 mb-6'>
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={handleDownload}
                className='w-full bg-gradient-primary hover:opacity-90 text-white'
              >
                <Download className='w-4 h-4 mr-2' />
                Download File
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-scale-in'>
      {/* Top Control Bar */}
      <div className='glass-effect border-b border-white/10 px-6 py-4 flex items-center justify-between relative'>
        <div className='absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none' />

        <div className='flex items-center gap-4 relative z-10'>
          <h2 className='text-white font-bold text-lg truncate max-w-md'>{file.name}</h2>
          <span className='text-xs text-zinc-400 px-3 py-1 glass-effect rounded-full'>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>

        <div className='flex items-center gap-2 relative z-10'>
          {/* Zoom controls for images and videos */}
          {(fileType === 'image' || fileType === 'video') && (
            <>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleZoomOut}
                className='glass-button h-10 w-10'
                disabled={zoom <= 50}
              >
                <ZoomOut className='w-5 h-5' />
              </Button>
              <span className='text-white text-sm font-medium min-w-[60px] text-center'>
                {zoom}%
              </span>
              <Button
                variant='ghost'
                size='icon'
                onClick={handleZoomIn}
                className='glass-button h-10 w-10'
                disabled={zoom >= 200}
              >
                <ZoomIn className='w-5 h-5' />
              </Button>
              <div className='w-px h-6 bg-white/20 mx-2' />
            </>
          )}

          {/* Page navigation for PDFs */}
          {fileType === 'pdf' && (
            <>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className='glass-button h-10 w-10'
                disabled={currentPage <= 1}
              >
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <span className='text-white text-sm font-medium min-w-[80px] text-center'>
                Page {currentPage}
              </span>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className='glass-button h-10 w-10'
              >
                <ChevronRight className='w-5 h-5' />
              </Button>
              <div className='w-px h-6 bg-white/20 mx-2' />
            </>
          )}

          <Button
            variant='ghost'
            size='icon'
            onClick={handleDownload}
            className='glass-button h-10 w-10'
            title='Download'
          >
            <Download className='w-5 h-5' />
          </Button>

          {isPresenter && (
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              className='glass-button h-10 w-10 hover:bg-red-500/20'
              title='Close Presentation'
            >
              <X className='w-5 h-5' />
            </Button>
          )}
        </div>
      </div>

      {/* File Content Area */}
      <div className='flex-1 overflow-hidden'>{renderFileContent()}</div>

      {/* Bottom Info Bar */}
      <div className='glass-effect border-t border-white/10 px-6 py-3 flex items-center justify-between relative'>
        <div className='absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none' />

        <div className='flex items-center gap-2 relative z-10'>
          <div className='w-2 h-2 rounded-full bg-primary animate-pulse-glow' />
          <span className='text-sm text-zinc-300'>
            Presented by <span className='text-white font-semibold'>{presenterName}</span>
          </span>
        </div>

        {!isPresenter && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='glass-button text-zinc-400 hover:text-white relative z-10'
          >
            Close View
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
