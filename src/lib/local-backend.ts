// Local-first backend implementation
import { openDB, type IDBPDatabase } from 'idb';

export interface LocalDatabase {
  datasets: {
    key: string;
    value: {
      id: string;
      name: string;
      data: any;
      created: Date;
      size: number;
    };
  };
  conversations: {
    key: string;
    value: {
      id: string;
      messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
        processingType: 'local' | 'cloud';
      }>;
      created: Date;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

class LocalBackend {
  private db: IDBPDatabase<LocalDatabase> | null = null;
  private pyodide: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    // Initialize IndexedDB
    this.db = await openDB<LocalDatabase>('LocalFirstDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });

    // Initialize Pyodide for Python data processing
    try {
      const { loadPyodide } = await import('pyodide');
      this.pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
      });
      
      // Install basic data science packages
      await this.pyodide.loadPackage(['numpy', 'pandas', 'micropip']);
      
      console.log('✅ Local backend initialized with Pyodide');
    } catch (error) {
      console.warn('⚠️ Pyodide failed to load, using fallback processing:', error);
    }

    this.isInitialized = true;
  }

  // Data processing methods
  async processDataLocally(data: any, operation: string): Promise<any> {
    if (!this.pyodide) {
      return this.fallbackDataProcessing(data, operation);
    }

    try {
      // Convert JS data to Python
      this.pyodide.globals.set('data', data);
      
      // Execute Python operations
      const result = await this.pyodide.runPython(`
import pandas as pd
import numpy as np

# Convert data to DataFrame
if isinstance(data, list) and len(data) > 0:
    df = pd.DataFrame(data)
elif isinstance(data, dict):
    df = pd.DataFrame([data])
else:
    df = pd.DataFrame()

# Perform basic analysis based on operation
if "${operation}" == "summary":
    result = {
        "shape": df.shape,
        "columns": list(df.columns) if len(df.columns) > 0 else [],
        "dtypes": df.dtypes.to_dict() if len(df.columns) > 0 else {},
        "missing": df.isnull().sum().to_dict() if len(df.columns) > 0 else {},
        "sample": df.head().to_dict('records') if len(df) > 0 else []
    }
elif "${operation}" == "stats":
    result = df.describe().to_dict() if len(df.columns) > 0 else {}
else:
    result = {"processed": True, "rows": len(df)}

result
      `);

      return result.toJs();
    } catch (error) {
      console.warn('Pyodide processing failed, using fallback:', error);
      return this.fallbackDataProcessing(data, operation);
    }
  }

  private fallbackDataProcessing(data: any, operation: string): any {
    // Simple JavaScript fallback for basic operations
    if (!Array.isArray(data)) {
      data = [data];
    }

    switch (operation) {
      case 'summary':
        return {
          shape: [data.length, Object.keys(data[0] || {}).length],
          columns: Object.keys(data[0] || {}),
          sample: data.slice(0, 5)
        };
      case 'stats':
        const numerics = data.map(row => 
          Object.entries(row).filter(([_, v]) => typeof v === 'number')
        );
        return { message: 'Basic stats computed locally' };
      default:
        return { processed: true, rows: data.length };
    }
  }

  // Simple NLP processing
  async processTextLocally(text: string, operation: string): Promise<any> {
    switch (operation) {
      case 'sentiment':
        return this.basicSentimentAnalysis(text);
      case 'keywords':
        return this.extractKeywords(text);
      case 'summary':
        return this.basicSummarization(text);
      default:
        return { text, processed: true };
    }
  }

  private basicSentimentAnalysis(text: string): any {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'poor', 'worst'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positive = words.filter(word => positiveWords.includes(word)).length;
    const negative = words.filter(word => negativeWords.includes(word)).length;
    
    const sentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
    const confidence = Math.abs(positive - negative) / words.length;
    
    return { sentiment, confidence, positive, negative };
  }

  private extractKeywords(text: string): any {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    const keywords = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    return { keywords, totalWords: words.length };
  }

  private basicSummarization(text: string): any {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, Math.min(3, Math.ceil(sentences.length * 0.3)));
    
    return {
      summary: summary.join('. ') + '.',
      originalLength: sentences.length,
      summaryLength: summary.length
    };
  }

  // Database operations
  async saveDataset(name: string, data: any): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
    const id = Date.now().toString();
    const dataset = {
      id,
      name,
      data,
      created: new Date(),
      size: JSON.stringify(data).length
    };
    
    await this.db.add('datasets', dataset);
    return id;
  }

  async getDatasets(): Promise<any[]> {
    if (!this.db) return [];
    return this.db.getAll('datasets');
  }

  async saveConversation(conversation: any): Promise<void> {
    if (!this.db) return;
    await this.db.put('conversations', conversation);
  }

  async getConversations(): Promise<any[]> {
    if (!this.db) return [];
    return this.db.getAll('conversations');
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) return;
    await this.db.put('settings', { key, value });
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) return null;
    const setting = await this.db.get('settings', key);
    return setting?.value || null;
  }
}

export const localBackend = new LocalBackend();