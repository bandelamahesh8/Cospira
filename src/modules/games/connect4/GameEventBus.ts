/**
 * GameEventBus handles reliable ordering of game events using sequence numbers.
 *
 * This is intended for the host-authoritative model described in the Connect4 prompt.
 */

import { GameEvent } from '../shared/GameEvent';

export type ApplyEventFn = (event: GameEvent) => void;
export type RequestSnapshotFn = () => void;

export class GameEventBus {
  private lastAppliedSeq = 0;
  private buffer = new Map<number, GameEvent>();
  private gapTimer?: ReturnType<typeof setTimeout>;

  constructor(private requestSnapshot: RequestSnapshotFn) {}

  receive(event: GameEvent, apply: ApplyEventFn): void {
    if (event.sequenceId <= this.lastAppliedSeq) {
      return; // already applied
    }

    if (event.sequenceId === this.lastAppliedSeq + 1) {
      this.applyAndAdvance(event, apply);
      this.drainBuffer(apply);
      return;
    }

    if (event.sequenceId > this.lastAppliedSeq + 1) {
      // missing events
      this.buffer.set(event.sequenceId, event);
      this.startGapTimer();
    }
  }

  private applyAndAdvance(event: GameEvent, apply: ApplyEventFn) {
    apply(event);
    this.lastAppliedSeq = event.sequenceId;
  }

  private drainBuffer(apply: ApplyEventFn) {
    let nextSeq = this.lastAppliedSeq + 1;
    while (this.buffer.has(nextSeq)) {
      const nextEvent = this.buffer.get(nextSeq)!;
      this.buffer.delete(nextSeq);
      this.applyAndAdvance(nextEvent, apply);
      nextSeq = this.lastAppliedSeq + 1;
    }
  }

  private startGapTimer() {
    if (this.gapTimer) return;
    this.gapTimer = setTimeout(() => {
      this.requestSnapshot();
      this.gapTimer = undefined;
    }, 800);
  }
}
