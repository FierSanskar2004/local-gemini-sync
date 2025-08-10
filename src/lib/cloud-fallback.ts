// Cloud fallback implementation
interface GPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class CloudFallback {
  private apiKey: string | null = null;
  private isEnabled: boolean = false;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  getStatus() {
    return {
      hasApiKey: !!this.apiKey,
      isEnabled: this.isEnabled
    };
  }

  async processWithGPT(
    messages: GPTMessage[], 
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Cloud processing is disabled');
    }

    if (!this.apiKey) {
      throw new Error('GPT API key not provided');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`GPT API error: ${response.status} ${response.statusText}`);
    }

    const data: GPTResponse = await response.json();
    return data.choices[0]?.message.content || '';
  }

  async analyzeDataWithGPT(data: any, question: string): Promise<string> {
    const dataString = JSON.stringify(data).slice(0, 8000); // Limit data size
    
    const messages: GPTMessage[] = [
      {
        role: 'system',
        content: 'You are a data analyst. Analyze the provided data and answer the user\'s question concisely.'
      },
      {
        role: 'user',
        content: `Data: ${dataString}\n\nQuestion: ${question}`
      }
    ];

    return this.processWithGPT(messages);
  }

  async chatWithGPT(userMessage: string, conversationHistory: GPTMessage[] = []): Promise<string> {
    const messages: GPTMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant for a local-first data analysis app. Be concise and practical.'
      },
      ...conversationHistory.slice(-5), // Keep last 5 messages for context
      {
        role: 'user',
        content: userMessage
      }
    ];

    return this.processWithGPT(messages);
  }

  async enhanceLocalResult(localResult: any, originalQuery: string): Promise<string> {
    const messages: GPTMessage[] = [
      {
        role: 'system',
        content: 'You are helping to enhance a local AI result. Provide additional insights and context.'
      },
      {
        role: 'user',
        content: `Local analysis result: ${JSON.stringify(localResult)}\n\nOriginal query: ${originalQuery}\n\nProvide enhanced insights:`
      }
    ];

    return this.processWithGPT(messages, { temperature: 0.3 });
  }
}

export const cloudFallback = new CloudFallback();