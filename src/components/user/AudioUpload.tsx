import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AudioUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export const AudioUpload = ({ value, onChange, label, placeholder }: AudioUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [maxSizeMB, setMaxSizeMB] = useState(20); // Default for audio
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMaxSize = async () => {
      const { data } = await supabase
        .from('admin_config')
        .select('max_image_size_mb')
        .single();
      
      if (data?.max_image_size_mb) {
        setMaxSizeMB(data.max_image_size_mb * 4); // 4x for audio
      }
    };
    fetchMaxSize();
  }, []);

  const uploadFile = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('flow-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('flow-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const validateAndUploadFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error("Please select an audio file");
      return false;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Audio size must be less than ${maxSizeMB}MB`);
      return false;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const publicUrl = await uploadFile(file);
      setUploadProgress(100);
      onChange(publicUrl);
      toast.success("Audio uploaded successfully");
      return true;
    } catch (error: any) {
      toast.error("Failed to upload audio: " + error.message);
      return false;
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await validateAndUploadFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await validateAndUploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div 
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          uploading && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4">
          <div className="flex gap-2 mb-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Enter audio URL or upload"}
              type="text"
              disabled={uploading}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="mb-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {!value && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Drag and drop an audio file here, or click upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum size: {maxSizeMB}MB
              </p>
            </div>
          )}

          {value && (
            <div className="mt-2 border rounded-lg overflow-hidden p-2">
              <audio
                src={value}
                controls
                className="w-full"
                onError={(e) => {
                  (e.target as HTMLAudioElement).style.display = 'none';
                }}
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
