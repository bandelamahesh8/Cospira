export class SequenceTracker {
  private lastApplied: number = 0;
  private buffered: Map<number, any> = new Map();

  processEvent(event: { sequenceId: number }): 'apply' | 'buffer' | 'drop' {
    if (event.sequenceId <= this.lastApplied) {
      return 'drop';
    }
    if (event.sequenceId === this.lastApplied + 1) {
      this.lastApplied = event.sequenceId;
      this.tryApplyBuffered();
      return 'apply';
    }
    // gap detected
    this.buffered.set(event.sequenceId, event);
    // trigger STATE_SYNC
    return 'buffer';
  }

  private tryApplyBuffered(): void {
    let next = this.lastApplied + 1;
    while (this.buffered.has(next)) {
      this.lastApplied = next;
      this.buffered.delete(next);
      next++;
    }
  }

  getLastApplied(): number {
    return this.lastApplied;
  }
}
