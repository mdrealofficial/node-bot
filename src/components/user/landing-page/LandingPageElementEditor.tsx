import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

interface PageElement {
  id: string;
  type: string;
  properties: any;
  position: number;
  parentId?: string | null;
  children?: PageElement[];
}

interface LandingPageElementEditorProps {
  element: PageElement | null;
  onUpdate: (properties: any) => void;
  onClose: () => void;
}

export const LandingPageElementEditor = ({
  element,
  onUpdate,
  onClose,
}: LandingPageElementEditorProps) => {
  if (!element) {
    return (
      <div className="w-80 border-l bg-background p-6 flex items-center justify-center text-muted-foreground">
        Select an element to edit
      </div>
    );
  }

  const updateProperty = (key: string, value: any) => {
    onUpdate({ ...element.properties, [key]: value });
  };

  const renderHeroEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Welcome to Our Platform"
        />
      </div>
      <div>
        <Label>Subtitle</Label>
        <Textarea
          value={element.properties.subtitle || ""}
          onChange={(e) => updateProperty("subtitle", e.target.value)}
          placeholder="Build amazing landing pages"
        />
      </div>
      <div>
        <Label>CTA Text</Label>
        <Input
          value={element.properties.ctaText || ""}
          onChange={(e) => updateProperty("ctaText", e.target.value)}
          placeholder="Get Started"
        />
      </div>
      <div>
        <Label>CTA Link</Label>
        <Input
          value={element.properties.ctaLink || ""}
          onChange={(e) => updateProperty("ctaLink", e.target.value)}
          placeholder="#"
        />
      </div>
      <div>
        <Label>Background Image URL</Label>
        <Input
          value={element.properties.backgroundImage || ""}
          onChange={(e) => updateProperty("backgroundImage", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>
    </div>
  );

  const renderTextEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Content</Label>
        <Textarea
          value={element.properties.content || ""}
          onChange={(e) => updateProperty("content", e.target.value)}
          placeholder="Add your text content here"
          rows={6}
        />
      </div>
      <div>
        <Label>Alignment</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.alignment || "left"}
          onChange={(e) => updateProperty("alignment", e.target.value)}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );

  const renderImageEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Image URL</Label>
        <Input
          value={element.properties.imageUrl || ""}
          onChange={(e) => updateProperty("imageUrl", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div>
        <Label>Caption</Label>
        <Input
          value={element.properties.caption || ""}
          onChange={(e) => updateProperty("caption", e.target.value)}
          placeholder="Image caption"
        />
      </div>
      <div>
        <Label>Alt Text</Label>
        <Input
          value={element.properties.alt || ""}
          onChange={(e) => updateProperty("alt", e.target.value)}
          placeholder="Descriptive alt text"
        />
      </div>
    </div>
  );

  const renderButtonEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Button Text</Label>
        <Input
          value={element.properties.text || ""}
          onChange={(e) => updateProperty("text", e.target.value)}
          placeholder="Click Here"
        />
      </div>
      <div>
        <Label>Link URL</Label>
        <Input
          value={element.properties.link || ""}
          onChange={(e) => updateProperty("link", e.target.value)}
          placeholder="#"
        />
      </div>
      <div>
        <Label>Variant</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.variant || "primary"}
          onChange={(e) => updateProperty("variant", e.target.value)}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <div>
        <Label>Alignment</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.alignment || "center"}
          onChange={(e) => updateProperty("alignment", e.target.value)}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );

  const renderFormEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Form Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Get in Touch"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={element.properties.description || ""}
          onChange={(e) => updateProperty("description", e.target.value)}
          placeholder="Fill out the form"
        />
      </div>
      <div>
        <Label>Submit Button Text</Label>
        <Input
          value={element.properties.buttonText || ""}
          onChange={(e) => updateProperty("buttonText", e.target.value)}
          placeholder="Submit"
        />
      </div>
    </div>
  );

  const renderVideoEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Video URL</Label>
        <Input
          value={element.properties.videoUrl || ""}
          onChange={(e) => updateProperty("videoUrl", e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      <div>
        <Label>Video Type</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.videoType || "youtube"}
          onChange={(e) => updateProperty("videoType", e.target.value)}
        >
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
          <option value="custom">Custom URL</option>
        </select>
      </div>
      <div>
        <Label>Caption</Label>
        <Input
          value={element.properties.caption || ""}
          onChange={(e) => updateProperty("caption", e.target.value)}
          placeholder="Video caption"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Show Controls</Label>
        <Switch
          checked={element.properties.controls !== false}
          onCheckedChange={(checked) => updateProperty("controls", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Autoplay</Label>
        <Switch
          checked={element.properties.autoplay === true}
          onCheckedChange={(checked) => updateProperty("autoplay", checked)}
        />
      </div>
    </div>
  );

  const renderNavbarEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Logo Text</Label>
        <Input
          value={element.properties.logo || ""}
          onChange={(e) => updateProperty("logo", e.target.value)}
          placeholder="Your Logo"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Sticky Header</Label>
        <Switch
          checked={element.properties.sticky !== false}
          onCheckedChange={(checked) => updateProperty("sticky", checked)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Links and CTA button can be customized in the component code
      </p>
    </div>
  );

  const renderFooterEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Company Name</Label>
        <Input
          value={element.properties.companyName || ""}
          onChange={(e) => updateProperty("companyName", e.target.value)}
          placeholder="Your Company"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={element.properties.description || ""}
          onChange={(e) => updateProperty("description", e.target.value)}
          placeholder="Company description"
        />
      </div>
      <div>
        <Label>Copyright</Label>
        <Input
          value={element.properties.copyright || ""}
          onChange={(e) => updateProperty("copyright", e.target.value)}
          placeholder="© 2024 Your Company"
        />
      </div>
    </div>
  );

  const renderCountdownEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Limited Time Offer"
        />
      </div>
      <div>
        <Label>Subtitle</Label>
        <Input
          value={element.properties.subtitle || ""}
          onChange={(e) => updateProperty("subtitle", e.target.value)}
          placeholder="Don't miss out"
        />
      </div>
      <div>
        <Label>Target Date</Label>
        <Input
          type="datetime-local"
          value={element.properties.targetDate || ""}
          onChange={(e) => updateProperty("targetDate", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Show Days</Label>
          <Switch
            checked={element.properties.showDays !== false}
            onCheckedChange={(checked) => updateProperty("showDays", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show Hours</Label>
          <Switch
            checked={element.properties.showHours !== false}
            onCheckedChange={(checked) => updateProperty("showHours", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show Minutes</Label>
          <Switch
            checked={element.properties.showMinutes !== false}
            onCheckedChange={(checked) => updateProperty("showMinutes", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show Seconds</Label>
          <Switch
            checked={element.properties.showSeconds !== false}
            onCheckedChange={(checked) => updateProperty("showSeconds", checked)}
          />
        </div>
      </div>
    </div>
  );

  const renderDividerEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Style</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.style || "solid"}
          onChange={(e) => updateProperty("style", e.target.value)}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div>
        <Label>Width (%)</Label>
        <Input
          type="number"
          min="10"
          max="100"
          value={element.properties.width || 100}
          onChange={(e) => updateProperty("width", parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Margin (px)</Label>
        <Input
          type="number"
          min="0"
          max="200"
          value={element.properties.margin || 32}
          onChange={(e) => updateProperty("margin", parseInt(e.target.value))}
        />
      </div>
    </div>
  );

  const renderFeaturesEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Section Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Features"
        />
      </div>
      <div>
        <Label>Number of Columns</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.columns || 3}
          onChange={(e) => updateProperty("columns", parseInt(e.target.value))}
        >
          <option value="2">2 Columns</option>
          <option value="3">3 Columns</option>
          <option value="4">4 Columns</option>
        </select>
      </div>
      <p className="text-sm text-muted-foreground">
        Feature items can be customized by editing the component code
      </p>
    </div>
  );

  const renderPricingEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Section Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Pricing Plans"
        />
      </div>
      <div>
        <Label>Section Subtitle</Label>
        <Textarea
          value={element.properties.subtitle || ""}
          onChange={(e) => updateProperty("subtitle", e.target.value)}
          placeholder="Choose the perfect plan for you"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Pricing plans can be customized by editing the component code
      </p>
    </div>
  );

  const renderFAQEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Section Title</Label>
        <Input
          value={element.properties.title || ""}
          onChange={(e) => updateProperty("title", e.target.value)}
          placeholder="Frequently Asked Questions"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        FAQ items can be customized by editing the component code
      </p>
    </div>
  );

  const renderSectionEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Columns</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.columns || 1}
          onChange={(e) => updateProperty("columns", parseInt(e.target.value))}
        >
          <option value="1">1 Column</option>
          <option value="2">2 Columns</option>
          <option value="3">3 Columns</option>
          <option value="4">4 Columns</option>
        </select>
      </div>
      <div>
        <Label>Column Layout</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.columnRatios || "equal"}
          onChange={(e) => updateProperty("columnRatios", e.target.value)}
        >
          <option value="equal">Equal Width</option>
          <option value="50-50">50/50</option>
          <option value="33-67">33/67</option>
          <option value="67-33">67/33</option>
          <option value="25-75">25/75</option>
          <option value="75-25">75/25</option>
          <option value="33-33-33">33/33/33</option>
        </select>
      </div>
      <div>
        <Label>Background Color</Label>
        <Input
          type="color"
          value={element.properties.backgroundColor || "#ffffff"}
          onChange={(e) => updateProperty("backgroundColor", e.target.value)}
        />
      </div>
      <div>
        <Label>Background Image URL</Label>
        <Input
          value={element.properties.backgroundImage || ""}
          onChange={(e) => updateProperty("backgroundImage", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      {element.properties.backgroundImage && (
        <div>
          <Label>Overlay Opacity (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={element.properties.backgroundOverlay || 0}
            onChange={(e) => updateProperty("backgroundOverlay", parseInt(e.target.value))}
          />
        </div>
      )}
      <div>
        <Label>Container Width</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.containerWidth || "boxed"}
          onChange={(e) => updateProperty("containerWidth", e.target.value)}
        >
          <option value="boxed">Boxed (max-width)</option>
          <option value="full">Full Width</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Padding Top</Label>
          <Input
            type="number"
            value={element.properties.paddingTop || 8}
            onChange={(e) => updateProperty("paddingTop", parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label>Padding Bottom</Label>
          <Input
            type="number"
            value={element.properties.paddingBottom || 8}
            onChange={(e) => updateProperty("paddingBottom", parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label>Padding Left</Label>
          <Input
            type="number"
            value={element.properties.paddingLeft || 4}
            onChange={(e) => updateProperty("paddingLeft", parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label>Padding Right</Label>
          <Input
            type="number"
            value={element.properties.paddingRight || 4}
            onChange={(e) => updateProperty("paddingRight", parseInt(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Label>Gap Between Columns</Label>
        <Input
          type="number"
          value={element.properties.gap || 4}
          onChange={(e) => updateProperty("gap", parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Vertical Alignment</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.verticalAlign || "top"}
          onChange={(e) => updateProperty("verticalAlign", e.target.value)}
        >
          <option value="top">Top</option>
          <option value="center">Center</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>
    </div>
  );

  const renderColumnEditor = () => (
    <div className="space-y-4">
      <div>
        <Label>Background Color</Label>
        <Input
          type="color"
          value={element.properties.backgroundColor || "#ffffff"}
          onChange={(e) => updateProperty("backgroundColor", e.target.value)}
        />
      </div>
      <div>
        <Label>Padding</Label>
        <Input
          type="number"
          value={element.properties.padding || 4}
          onChange={(e) => updateProperty("padding", parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Vertical Alignment</Label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={element.properties.verticalAlign || "top"}
          onChange={(e) => updateProperty("verticalAlign", e.target.value)}
        >
          <option value="top">Top</option>
          <option value="center">Center</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>
    </div>
  );

  const renderEditor = () => {
    switch (element.type) {
      case "section":
        return renderSectionEditor();
      case "column":
        return renderColumnEditor();
      case "hero":
        return renderHeroEditor();
      case "text":
        return renderTextEditor();
      case "image":
        return renderImageEditor();
      case "video":
        return renderVideoEditor();
      case "button":
        return renderButtonEditor();
      case "features":
        return renderFeaturesEditor();
      case "pricing":
        return renderPricingEditor();
      case "faq":
        return renderFAQEditor();
      case "navbar":
        return renderNavbarEditor();
      case "footer":
        return renderFooterEditor();
      case "countdown":
        return renderCountdownEditor();
      case "divider":
        return renderDividerEditor();
      case "form":
        return renderFormEditor();
      case "spacer":
        return <p className="text-sm text-muted-foreground">Spacer height is fixed at 64px</p>;
      default:
        return <p className="text-sm text-muted-foreground">No properties to edit for this element</p>;
    }
  };

  return (
    <div className="w-80 border-l bg-background p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Edit Element</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {renderEditor()}
    </div>
  );
};
