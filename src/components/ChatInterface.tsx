import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { localBackend } from "@/lib/local-backend";
import { cloudFallback } from "@/lib/cloud-fallback";
import { ProcessingStatus } from "./ProcessingStatus";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  processingType: 'local' | 'cloud';
  isLoading?: boolean;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your local-first AI assistant. I can help you analyze data, answer questions, and more - all running locally on your device. Ask me anything!',
      timestamp: new Date(),
      processingType: 'local'
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const processMessage = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      processingType: 'local'
    };

    // Add user message and loading assistant message
    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      processingType: 'local',
      isLoading: true
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsProcessing(true);

    try {
      let response = '';
      let processingType: 'local' | 'cloud' = 'local';

      // Try local processing first
      const localResponse = await processLocalQuery(userMessage);
      
      if (localResponse.needsCloudFallback) {
        // Check if cloud processing is available
        const cloudStatus = cloudFallback.getStatus();
        
        if (cloudStatus.isEnabled && cloudStatus.hasApiKey) {
          try {
            response = await cloudFallback.chatWithGPT(userMessage, 
              messages.filter(m => m.role !== 'assistant' || !m.isLoading)
                .map(m => ({ role: m.role as any, content: m.content }))
            );
            processingType = 'cloud';
          } catch (cloudError) {
            console.warn('Cloud processing failed:', cloudError);
            response = localResponse.response + '\n\n💡 For more advanced responses, you can enable cloud processing in settings.';
          }
        } else {
          response = localResponse.response + '\n\n💡 For more advanced responses, you can enable cloud processing in settings.';
        }
      } else {
        response = localResponse.response;
      }

      // Update the loading message with the response
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsg.id 
          ? { ...msg, content: response, processingType, isLoading: false }
          : msg
      ));

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMsg.id 
          ? { 
              ...msg, 
              content: 'Sorry, I encountered an error processing your request. Please try again.', 
              processingType: 'local',
              isLoading: false 
            }
          : msg
      ));
      
      toast({
        title: "Processing Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processLocalQuery = async (query: string): Promise<{ response: string; needsCloudFallback: boolean }> => {
    const lowerQuery = query.toLowerCase();

    // Simple keyword-based routing
    if (lowerQuery.includes('data') || lowerQuery.includes('analyze') || lowerQuery.includes('dataset')) {
      const datasets = await localBackend.getDatasets();
      if (datasets.length === 0) {
        return {
          response: 'I can help you analyze data! Please upload a dataset first using the data upload section.',
          needsCloudFallback: false
        };
      } else {
        return {
          response: `I found ${datasets.length} dataset(s) in your local storage. I can perform basic analysis like summaries, statistics, and filtering. What would you like to know about your data?`,
          needsCloudFallback: false
        };
      }
    }

    if (lowerQuery.includes('sentiment') || lowerQuery.includes('feeling') || lowerQuery.includes('emotion')) {
      const sentiment = await localBackend.processTextLocally(query, 'sentiment');
      return {
        response: `Based on local sentiment analysis: This text appears to be **${sentiment.sentiment}** (confidence: ${(sentiment.confidence * 100).toFixed(1)}%). I detected ${sentiment.positive} positive and ${sentiment.negative} negative indicators.`,
        needsCloudFallback: false
      };
    }

    if (lowerQuery.includes('keyword') || lowerQuery.includes('important words')) {
      const keywords = await localBackend.processTextLocally(query, 'keywords');
      return {
        response: `Key words extracted locally: ${keywords.keywords.map((k: any) => k.word).join(', ')}`,
        needsCloudFallback: false
      };
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return {
        response: 'Hello! I\'m running locally on your device. I can help you with data analysis, text processing, and simple conversations. What can I help you with today?',
        needsCloudFallback: false
      };
    }

    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return {
        response: `Here's what I can do locally:
        
📊 **Data Analysis**: Upload CSV/JSON files for analysis, statistics, and summaries
📝 **Text Processing**: Sentiment analysis, keyword extraction, basic summarization  
💬 **Simple Chat**: Basic conversations and help
🔍 **Local Search**: Find and filter your stored data

For more advanced AI capabilities, you can enable cloud processing in the settings panel.`,
        needsCloudFallback: false
      };
    }

    // For complex queries that need more sophisticated understanding
    if (query.length > 100 || lowerQuery.includes('explain') || lowerQuery.includes('complex') || lowerQuery.includes('detailed')) {
      return {
        response: 'This seems like a complex question that could benefit from advanced AI processing.',
        needsCloudFallback: true
      };
    }

    // Default local response
    return {
      response: 'I processed your message locally. For more sophisticated responses, you can enable cloud processing in settings. How else can I help you?',
      needsCloudFallback: true
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const message = input.trim();
    setInput("");
    processMessage(message);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardContent className="flex flex-col h-full p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-local to-cloud flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-card border"
                    )}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-muted-foreground">Processing...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  
                  {message.role === 'assistant' && !message.isLoading && (
                    <div className="flex items-center gap-2 text-xs">
                      <ProcessingStatus type={message.processingType} />
                      <span className="text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything... (I process locally first!)"
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isProcessing}
              variant="hero"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};