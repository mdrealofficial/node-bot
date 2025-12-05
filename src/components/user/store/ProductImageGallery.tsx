import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, Trash2, Star, Image as ImageIcon } from 'lucide-react';

interface ProductImage {
  id: string;
  image_url: string;
  attribute_combination: Record<string, string>;
  is_primary: boolean;
  display_order: number;
}

interface ProductImageGalleryProps {
  productId: string | null;
  attributes: any[];
  onImagesChange?: () => void;
}

export function ProductImageGallery({ productId, attributes, onImagesChange }: ProductImageGalleryProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productId) {
      loadImages();
    } else {
      setImages([]);
    }
  }, [productId]);

  const loadImages = async () => {
    if (!productId) return;

    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading images:', error);
      return;
    }

    setImages((data || []).map(img => ({
      ...img,
      attribute_combination: (img.attribute_combination || {}) as Record<string, string>
    })));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: publicUrl,
          is_primary: images.length === 0,
          display_order: images.length,
        });

      if (insertError) throw insertError;

      toast.success('Image uploaded successfully');
      loadImages();
      setSelectedAttributes({});
      onImagesChange?.();
    } catch (error: any) {
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const filePath = `product-images/${urlParts[urlParts.length - 1]}`;

      // Delete from storage
      await supabase.storage.from('products').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Image deleted');
      loadImages();
      onImagesChange?.();
    } catch (error: any) {
      toast.error('Failed to delete image: ' + error.message);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // Unset all primary flags
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      // Set this image as primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Primary image updated');
      loadImages();
      onImagesChange?.();
    } catch (error: any) {
      toast.error('Failed to set primary image: ' + error.message);
    }
  };

  const getAttributeCombinationLabel = (combination: Record<string, string>) => {
    if (!combination || Object.keys(combination).length === 0) {
      return 'Default';
    }
    return Object.entries(combination)
      .map(([attrId, value]) => {
        const attr = attributes.find(a => a.id === attrId);
        return attr ? `${attr.name}: ${value}` : value;
      })
      .join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Product Images</Label>
        <p className="text-sm text-muted-foreground">
          Upload multiple images for your product
        </p>
      </div>

      {/* Image Upload Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading || !productId}
              className="flex-1"
            />
            {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
          </div>
          {!productId && (
            <p className="text-sm text-muted-foreground">Save product first to upload images</p>
          )}
        </CardContent>
      </Card>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={img.image_url}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
                {img.is_primary && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {getAttributeCombinationLabel(img.attribute_combination)}
                </div>
                <div className="flex gap-2">
                  {!img.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetPrimary(img.id)}
                      className="flex-1"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Set Primary
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteImage(img.id, img.image_url)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && productId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images uploaded yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
