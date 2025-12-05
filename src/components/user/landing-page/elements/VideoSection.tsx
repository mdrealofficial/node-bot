interface VideoSectionProps {
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'custom';
  autoplay?: boolean;
  controls?: boolean;
  caption?: string;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const VideoSection = ({
  videoUrl = "",
  videoType = 'youtube',
  autoplay = false,
  controls = true,
  caption,
  isEditing,
  onUpdate,
}: VideoSectionProps) => {
  const getEmbedUrl = () => {
    if (!videoUrl) return "";
    
    if (videoType === 'youtube') {
      const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&controls=${controls ? 1 : 0}` : videoUrl;
    }
    
    if (videoType === 'vimeo') {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}` : videoUrl;
    }
    
    return videoUrl;
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {videoUrl ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-muted">
            {videoType === 'custom' ? (
              <video
                src={videoUrl}
                controls={controls}
                autoPlay={autoplay}
                className="w-full h-full object-cover"
              />
            ) : (
              <iframe
                src={getEmbedUrl()}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Add video URL to display</p>
          </div>
        )}
        {caption && (
          <p className="text-center text-muted-foreground mt-4">{caption}</p>
        )}
      </div>
    </div>
  );
};
