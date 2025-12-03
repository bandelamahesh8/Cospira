import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WebSocketContext } from '@/contexts/WebSocketContextValue';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (val: string) => void;
  }) => (
    <div>
      <select
        data-testid='select-mock'
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value='public'>Public</option>
        <option value='password'>Password</option>
        <option value='invite'>Invite</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id: string;
  }) => (
    <input
      type='checkbox'
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid='switch-component'
    />
  ),
}));

const mockUpdateRoomSettings = vi.fn();

const renderWithContext = (ui: React.ReactNode, contextValue: Record<string, unknown> = {}) => {
  const defaultContext = {
    roomId: 'test-room',
    roomName: 'Test Room',
    isHost: true,
    updateRoomSettings: mockUpdateRoomSettings,
    hasWaitingRoom: false,
    accessType: 'public',
    inviteToken: null,
    leaveRoom: vi.fn(),
    disbandRoom: vi.fn(),
    toggleRoomLock: vi.fn(),
    isRoomLocked: false,
    changeVideoDevice: vi.fn(),
    changeAudioDevice: vi.fn(),
    selectedVideoDeviceId: null,
    selectedAudioDeviceId: null,
    ...contextValue,
  };

  return render(
    <MemoryRouter>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <WebSocketContext.Provider value={defaultContext as any}>{ui}</WebSocketContext.Provider>
    </MemoryRouter>
  );
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for host', () => {
    renderWithContext(<SettingsModal roomId='test-room' isHost={true} />);
    expect(screen.getAllByText('Room Settings')[0]).toBeInTheDocument();
    expect(screen.getByText('Access Type')).toBeInTheDocument();
  });

  it('shows password input when password access type is selected', async () => {
    renderWithContext(<SettingsModal roomId='test-room' isHost={true} />);

    const selects = screen.getAllByTestId('select-mock');
    const accessSelect = selects[2]; // 3rd select is Access Type
    fireEvent.change(accessSelect, { target: { value: 'password' } });

    expect(await screen.findByText('Change Password')).toBeInTheDocument();
  });

  it('shows invite token when invite access type is selected', () => {
    renderWithContext(<SettingsModal roomId='test-room' isHost={true} />, {
      accessType: 'invite',
      inviteToken: 'test-token-123',
    });

    expect(screen.getByText('Invite Link')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/test-token-123/)).toBeInTheDocument();
  });

  it('calls updateRoomSettings with correct values', () => {
    renderWithContext(<SettingsModal roomId='test-room' isHost={true} />);

    const saveButton = screen.getByText('Save Room Settings');
    fireEvent.click(saveButton);

    expect(mockUpdateRoomSettings).toHaveBeenCalledWith(
      'Test Room', // roomName (current name)
      undefined, // password (no change)
      false, // waitingRoom
      'public' // accessType
    );
  });
});
