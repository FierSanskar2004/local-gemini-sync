import { cn } from "@/lib/utils";
import { Cpu, Cloud, Wifi, WifiOff } from "lucide-react";

interface ProcessingStatusProps {
  type: 'local' | 'cloud' | 'offline';
  isProcessing?: boolean;
  className?: string;
}

export const ProcessingStatus = ({ type, isProcessing, className }: ProcessingStatusProps) => {
  const getIcon = () => {
    switch (type) {
      case 'local':
        return <Cpu className="h-4 w-4" />;
      case 'cloud':
        return <Cloud className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStyle = () => {
    switch (type) {
      case 'local':
        return 'bg-local/10 text-local border-local/20';
      case 'cloud':
        return 'bg-cloud/10 text-cloud border-cloud/20';
      case 'offline':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'local':
        return 'Local Processing';
      case 'cloud':
        return 'Cloud Enhanced';
      case 'offline':
        return 'Offline Mode';
      default:
        return 'Processing';
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium",
      getStyle(),
      isProcessing && "animate-pulse",
      className
    )}>
      {getIcon()}
      {getLabel()}
      {isProcessing && (
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};