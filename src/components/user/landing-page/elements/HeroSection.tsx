interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const HeroSection = ({
  title = "Welcome to Our Platform",
  subtitle = "Build amazing landing pages with drag and drop",
  ctaText = "Get Started",
  ctaLink = "#",
  backgroundImage,
  isEditing,
  onUpdate,
}: HeroSectionProps) => {
  return (
    <div
      className="relative min-h-[500px] flex items-center justify-center px-4 py-20 bg-gradient-to-br from-primary/10 to-secondary/10"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground">
          {subtitle}
        </p>
        <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-semibold">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
