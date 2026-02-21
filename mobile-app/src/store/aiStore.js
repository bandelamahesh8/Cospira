import { aiService } from '../services/ai.service';

class AIStore {
  constructor() {
    this.status = { status: 'idle', activeSectors: 0, aiConfidence: '0%', recommendation: 'Loading...' };
    this.predictions = [];
    this.threats = [];
    this.loading = false;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(cb => cb());
  }

  async fetchSystemStatus() {
    this.loading = true;
    this.notify();
    try {
      const data = await aiService.getStatus();
      this.status = data;
    } catch (e) {
      console.error('AI Status Fetch Error', e);
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  async fetchIntelligence() {
    const [preds, threats] = await Promise.all([
      aiService.getPredictions(),
      aiService.getThreatMap()
    ]);
    this.predictions = preds;
    this.threats = threats;
    this.notify();
  }

  // Hook up live listener
  initializeListeners() {
    aiService.subscribeToEvents((event) => {
      console.log('[AIStore] Inbound Event:', event);
      // In a real app we'd update state here
      if (event.type === 'ANOMALY_DETECTED') {
         this.status.status = 'alert';
         this.notify();
         // Reset after 3s
         setTimeout(() => {
           this.status.status = 'active';
           this.notify();
         }, 3000);
      }
    });
  }
}

export const aiStore = new AIStore();
