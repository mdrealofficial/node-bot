import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export const ImageUpload = ({ value, onChange, label, placeholder }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [maxSizeMB, setMaxSizeMB] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch max image size from admin config
  useEffect(() => {
    const fetchMaxSize = async () => {
      const { data } = await supabase
        .from('admin_config')
        .select('max_image_size_mb')
        .single();
      
      if (data?.max_image_size_mb) {
        setMaxSizeMB(data.max_image_size_mb);
      }
    };
    fetchMaxSize();
  }, []);

  // Auto-upload data URLs on mount or when value changes to a data URL
  useEffect(() => {
    if (value && value.startsWith('data:image/')) {
      handleUrlChange(value);
    }
  }, []); // Only run on mount to avoid infinite loops

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
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return false;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`Image size must be less than ${maxSizeMB}MB`);
      return false;
    }

    setUploading(true);
    setUploadProgress(0);
    
    // Simulate progress for better UX
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
      toast.success("Image uploaded successfully");
      return true;
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
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

  const handleUrlChange = async (url: string) => {
    // Check if it's a data URL (base64 image)
    if (url.startsWith('data:image/')) {
      setUploading(true);
      try {
        // Convert data URL to blob
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Create a file from the blob
        const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
        
        // Upload the file
        const publicUrl = await uploadFile(file);
        onChange(publicUrl);
        toast.success("Image uploaded successfully");
      } catch (error: any) {
        console.error('Failed to upload pasted image:', error);
        toast.error("Failed to upload pasted image");
      } finally {
        setUploading(false);
      }
    } else {
      // Regular URL, just set it
      onChange(url);
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
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder || "Enter image URL or upload"}
              type="text"
              disabled={uploading}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
                Drag and drop an image here, or click upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum size: {maxSizeMB}MB
              </p>
            </div>
          )}

          {value && (
            <div className="mt-2 border rounded-lg overflow-hidden">
              <img
                src={value}
                alt="Preview"
                className="w-full h-auto max-h-40 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
