import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Database, Settings, MessageSquare, Zap } from "lucide-react";
import { ChatInterface } from "@/components/ChatInterface";
import { DataUpload } from "@/components/DataUpload";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { localBackend } from "@/lib/local-backend";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const { toast } = useToast();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await localBackend.initialize();
      toast({
        title: "🚀 App Ready",
        description: "Local backend initialized successfully!",
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast({
        title: "Initialization Warning",
        description: "Some features may be limited. App will work with basic functionality.",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-local to-cloud flex items-center justify-center mb-4">
              <Cpu className="h-8 w-8 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Initializing Local Backend</h2>
            <p className="text-muted-foreground text-center mb-4">
              Setting up your local-first environment...
            </p>
            <ProcessingStatus type="local" isProcessing />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-local to-cloud flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Local-First AI</h1>
                <p className="text-sm text-muted-foreground">Privacy-focused data analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ProcessingStatus type="local" />
              <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ChatInterface />
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">How it works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-local flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white font-medium">1</span>
                      </div>
                      <div>
                        <div className="font-medium">Local Processing</div>
                        <div className="text-muted-foreground">All queries are processed locally first using built-in NLP and data analysis</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cloud flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white font-medium">2</span>
                      </div>
                      <div>
                        <div className="font-medium">Cloud Fallback</div>
                        <div className="text-muted-foreground">Complex queries can optionally use GPT when enabled in settings</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white font-medium">3</span>
                      </div>
                      <div>
                        <div className="font-medium">Privacy First</div>
                        <div className="text-muted-foreground">Your data never leaves your device unless you explicitly enable cloud features</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Try asking:</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors"
                         onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="Ask me anything"]')?.focus()}>
                      "Analyze the sentiment of this text..."
                    </div>
                    <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors">
                      "What can you do locally?"
                    </div>
                    <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors">
                      "Help me with data analysis"
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <DataUpload />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-center">
              <SettingsPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Built with local-first principles • Your data stays private
            </div>
            <div className="flex items-center gap-4">
              <ProcessingStatus type="local" />
              <span>100% offline capable</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
