import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

interface FooterColumn {
  title: string;
  links: { text: string; url: string }[];
}

interface FooterSectionProps {
  companyName?: string;
  description?: string;
  columns?: FooterColumn[];
  socialLinks?: { platform: string; url: string }[];
  copyright?: string;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const FooterSection = ({
  companyName = "Your Company",
  description = "Building amazing products for amazing people.",
  columns = [
    {
      title: "Product",
      links: [
        { text: "Features", url: "#" },
        { text: "Pricing", url: "#" },
        { text: "Security", url: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { text: "About", url: "#" },
        { text: "Blog", url: "#" },
        { text: "Careers", url: "#" },
      ],
    },
    {
      title: "Support",
      links: [
        { text: "Help Center", url: "#" },
        { text: "Contact", url: "#" },
        { text: "Terms", url: "#" },
      ],
    },
  ],
  socialLinks = [
    { platform: "facebook", url: "#" },
    { platform: "twitter", url: "#" },
    { platform: "instagram", url: "#" },
    { platform: "linkedin", url: "#" },
  ],
  copyright = "© 2024 Your Company. All rights reserved.",
  isEditing,
  onUpdate,
}: FooterSectionProps) => {
  const getSocialIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform.toLowerCase()) {
      case "facebook":
        return <Facebook className={iconClass} />;
      case "twitter":
        return <Twitter className={iconClass} />;
      case "instagram":
        return <Instagram className={iconClass} />;
      case "linkedin":
        return <Linkedin className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <footer className="bg-muted/50 border-t">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-foreground mb-3">{companyName}</h3>
            <p className="text-muted-foreground mb-4">{description}</p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          </div>
          
          {columns.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold text-foreground mb-4">{column.title}</h4>
              <ul className="space-y-2">
                {column.links.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.url}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8 border-t text-center text-muted-foreground">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
};
