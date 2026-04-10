import fs from 'fs';
import path from 'path';

interface ActionSignature {
url: string;
action: string; // 'click', 'fill', 'select'
targetText: string;
}

interface LearnedSelector {
selector: string;
successCount: number;
lastUsed: string;
}

const DB_PATH = path.join(process.cwd(), 'learning-db.json');

class LearningStore {
private db: Map<string, LearnedSelector[]> = new Map();

constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      for (const [key, selectors] of Object.entries(data)) {
        this.db.set(key, selectors as LearnedSelector[]);
      }
    }
  }

  private save() {
    const obj: Record<string, LearnedSelector[]> = {};
    for (const [key, value] of this.db.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2));
  }

  private getKey(sig: ActionSignature): string {
    return `${sig.url}|${sig.action}|${sig.targetText}`;
  }

  recordSuccess(sig: ActionSignature, usedSelector: string) {
    const key = this.getKey(sig);
    const existing = this.db.get(key) || [];
    const found = existing.find(e => e.selector === usedSelector);
    if (found) {
      found.successCount++;
      found.lastUsed = new Date().toISOString();
    } else {
      existing.push({ selector: usedSelector, successCount: 1, lastUsed: new Date().toISOString() });
    }
    existing.sort((a, b) => b.successCount - a.successCount);
    this.db.set(key, existing.slice(0, 5));
    this.save();
  }

  getBestSelector(sig: ActionSignature): string | null {
    const key = this.getKey(sig);
    const selectors = this.db.get(key);
    if (selectors && selectors.length > 0) {
      return selectors[0].selector;
    }
    return null;
  }

  recordFailure(sig: ActionSignature, failedSelector: string) {
    const key = this.getKey(sig);
    const selectors = this.db.get(key);
    if (selectors) {
      const idx = selectors.findIndex(e => e.selector === failedSelector);
      if (idx !== -1) {
        selectors.splice(idx, 1);
        this.db.set(key, selectors);
        this.save();
      }
    }
  }
}

export const learningStore = new LearningStore();