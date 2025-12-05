interface NavLink {
  text: string;
  url: string;
}

interface NavigationBarProps {
  logo?: string;
  logoUrl?: string;
  links?: NavLink[];
  ctaButton?: { text: string; url: string };
  sticky?: boolean;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const NavigationBar = ({
  logo = "Logo",
  logoUrl = "#",
  links = [
    { text: "Home", url: "#" },
    { text: "Features", url: "#features" },
    { text: "Pricing", url: "#pricing" },
    { text: "Contact", url: "#contact" },
  ],
  ctaButton = { text: "Get Started", url: "#" },
  sticky = true,
  isEditing,
  onUpdate,
}: NavigationBarProps) => {
  return (
    <nav
      className={`w-full bg-background border-b ${
        sticky ? "sticky top-0 z-50" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a href={logoUrl} className="text-2xl font-bold text-foreground">
            {logo}
          </a>
          
          <div className="hidden md:flex items-center gap-8">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="text-foreground hover:text-primary transition-colors"
              >
                {link.text}
              </a>
            ))}
          </div>
          
          {ctaButton && (
            <a
              href={ctaButton.url}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
            >
              {ctaButton.text}
            </a>
          )}
        </div>
      </div>
    </nav>
  );
};
