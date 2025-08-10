import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2, BarChart3 } from "lucide-react";
import { localBackend } from "@/lib/local-backend";
import { useToast } from "@/hooks/use-toast";
import { ProcessingStatus } from "./ProcessingStatus";

interface Dataset {
  id: string;
  name: string;
  data: any;
  created: Date;
  size: number;
}

export const DataUpload = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadDatasets = async () => {
    try {
      const data = await localBackend.getDatasets();
      setDatasets(data);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  };

  // Load datasets on component mount
  useState(() => {
    loadDatasets();
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const text = await file.text();
      let data: any;
      
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else {
        throw new Error('Unsupported file type. Please upload CSV or JSON files.');
      }

      const datasetId = await localBackend.saveDataset(file.name, data);
      
      toast({
        title: "Dataset uploaded",
        description: `${file.name} has been saved locally.`,
      });
      
      await loadDatasets();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Try to parse as number
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? value : numValue;
      });
      return row;
    });
    
    return rows;
  };

  const analyzeDataset = async (dataset: Dataset) => {
    setIsProcessing(true);
    setAnalysisResult(null);
    
    try {
      const result = await localBackend.processDataLocally(dataset.data, 'summary');
      setAnalysisResult({ ...result, datasetName: dataset.name });
      
      toast({
        title: "Analysis complete",
        description: "Dataset analysis finished locally.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze dataset.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteDataset = async (id: string) => {
    // Note: In a real implementation, you'd need a delete method in localBackend
    toast({
      title: "Delete dataset",
      description: "Dataset deletion would be implemented here.",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Upload
          </CardTitle>
          <CardDescription>
            Upload CSV or JSON files for local analysis. All data stays on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                disabled={isUploading}
                ref={fileInputRef}
                className="mt-1"
              />
            </div>
            
            {isUploading && (
              <ProcessingStatus type="local" isProcessing />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datasets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Datasets</CardTitle>
          <CardDescription>
            {datasets.length} dataset(s) stored locally
          </CardDescription>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No datasets uploaded yet</p>
              <p className="text-sm">Upload a CSV or JSON file to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <div key={dataset.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dataset.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(dataset.size)} • {new Date(dataset.created).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="local"
                      size="sm"
                      onClick={() => analyzeDataset(dataset)}
                      disabled={isProcessing}
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Analyze
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDataset(dataset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analysis Results: {analysisResult.datasetName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProcessingStatus type="local" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Dataset Shape</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.shape?.[0] || 0} rows × {analysisResult.shape?.[1] || 0} columns
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Columns</h4>
                  <div className="text-sm text-muted-foreground">
                    {analysisResult.columns?.length > 0 ? (
                      analysisResult.columns.join(', ')
                    ) : (
                      'No columns detected'
                    )}
                  </div>
                </div>
              </div>

              {analysisResult.sample && analysisResult.sample.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Sample Data</h4>
                  <div className="bg-muted rounded-lg p-3 text-sm font-mono overflow-x-auto">
                    <pre>{JSON.stringify(analysisResult.sample.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};