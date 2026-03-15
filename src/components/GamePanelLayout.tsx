import React from 'react';

export type GamePanelLayoutProps = {
  header?: React.ReactNode;
  sidePanel?: React.ReactNode;
  mainContent: React.ReactNode;
  footer?: React.ReactNode;
};

export const GamePanelLayout: React.FC<GamePanelLayoutProps> = ({
  header,
  sidePanel,
  mainContent,
  footer,
}) => {
  return (
    <div className='w-full h-full flex flex-col'>
      {header && <div className='border-b border-white/10 p-4'>{header}</div>}
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex-1 overflow-auto p-4'>{mainContent}</div>
        {sidePanel && (
          <div className='w-72 border-l border-white/10 bg-black/20 p-4 overflow-auto'>
            {sidePanel}
          </div>
        )}
      </div>
      {footer && <div className='border-t border-white/10 p-4'>{footer}</div>}
    </div>
  );
};
