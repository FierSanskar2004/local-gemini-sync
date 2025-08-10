import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { localBackend } from "@/lib/local-backend";
import { cloudFallback } from "@/lib/cloud-fallback";
import { useToast } from "@/hooks/use-toast";
import { ProcessingStatus } from "./ProcessingStatus";

export const SettingsPanel = () => {
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await localBackend.getSetting('cloudEnabled');
      const key = await localBackend.getSetting('gptApiKey');
      
      setCloudEnabled(enabled || false);
      setApiKey(key || "");
      
      cloudFallback.setEnabled(enabled || false);
      if (key) {
        cloudFallback.setApiKey(key);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await localBackend.setSetting('cloudEnabled', cloudEnabled);
      await localBackend.setSetting('gptApiKey', apiKey);
      
      cloudFallback.setEnabled(cloudEnabled);
      if (apiKey) {
        cloudFallback.setApiKey(apiKey);
      }
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been saved locally.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearApiKey = async () => {
    setApiKey("");
    await localBackend.setSetting('gptApiKey', "");
    cloudFallback.setApiKey("");
    toast({
      title: "API key cleared",
      description: "Your API key has been removed.",
    });
  };

  const testConnection = async () => {
    if (!apiKey || !cloudEnabled) {
      toast({
        title: "Test failed",
        description: "Please enable cloud processing and enter an API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      cloudFallback.setApiKey(apiKey);
      cloudFallback.setEnabled(true);
      
      await cloudFallback.chatWithGPT("Test message - please respond with 'Connection successful'");
      
      toast({
        title: "Connection successful",
        description: "GPT API is working correctly.",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const status = cloudFallback.getStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          App Settings
        </CardTitle>
        <CardDescription>
          Configure your local-first app with optional cloud enhancement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Mode</Label>
            <div className="flex gap-2">
              <ProcessingStatus type="local" />
              {status.hasApiKey && status.isEnabled && (
                <ProcessingStatus type="cloud" />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Cloud Processing Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="cloud-toggle" className="text-base">
              Allow Cloud Processing
            </Label>
            <div className="text-sm text-muted-foreground">
              Enable optional GPT API calls for enhanced capabilities
            </div>
          </div>
          <Switch
            id="cloud-toggle"
            checked={cloudEnabled}
            onCheckedChange={setCloudEnabled}
          />
        </div>

        {/* API Key Configuration */}
        {cloudEnabled && (
          <div className="space-y-3">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {apiKey && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearApiKey}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={saveSettings}
            disabled={isLoading}
            variant="local"
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          
          {cloudEnabled && apiKey && (
            <Button
              onClick={testConnection}
              disabled={isLoading}
              variant="cloud"
            >
              Test Connection
            </Button>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-local/5 border border-local/20 rounded-lg p-3">
          <div className="text-sm">
            <div className="font-medium text-local mb-1">🔒 Privacy First</div>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• All data processing happens locally by default</li>
              <li>• API keys are stored only in your browser</li>
              <li>• Cloud calls are optional and user-controlled</li>
              <li>• No data is sent to our servers</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};