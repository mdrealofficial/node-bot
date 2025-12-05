import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormSettingsProps {
  settings: any;
  styling: any;
  onSettingsChange: (settings: any) => void;
  onStylingChange: (styling: any) => void;
  onClose: () => void;
}

export const FormSettings = ({
  settings,
  styling,
  onSettingsChange,
  onStylingChange,
  onClose,
}: FormSettingsProps) => {
  return (
    <div className="w-96 border-l bg-card">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="font-semibold">Form Settings</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="general" className="h-[calc(100vh-120px)]">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="styling">Styling</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="h-full">
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Submit Button */}
              <div className="space-y-2">
                <Label>Submit Button Text</Label>
                <Input
                  value={settings.submitButtonText || "Submit"}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, submitButtonText: e.target.value })
                  }
                />
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <Label>Success Message</Label>
                <Textarea
                  value={settings.successMessage || ""}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, successMessage: e.target.value })
                  }
                  rows={3}
                />
              </div>

              {/* Redirect URL */}
              <div className="space-y-2">
                <Label>Redirect URL (Optional)</Label>
                <Input
                  value={settings.redirectUrl || ""}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, redirectUrl: e.target.value })
                  }
                  placeholder="https://example.com/thank-you"
                />
                <p className="text-xs text-muted-foreground">
                  Redirect after successful submission
                </p>
              </div>

              <Separator />

              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <Switch
                    checked={settings.emailNotifications || false}
                    onCheckedChange={(checked) =>
                      onSettingsChange({ ...settings, emailNotifications: checked })
                    }
                  />
                </div>

                {settings.emailNotifications && (
                  <div className="space-y-2">
                    <Label>Notification Email</Label>
                    <Input
                      type="email"
                      value={settings.notificationEmail || ""}
                      onChange={(e) =>
                        onSettingsChange({ ...settings, notificationEmail: e.target.value })
                      }
                      placeholder="admin@example.com"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Captcha */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Captcha</Label>
                  <p className="text-xs text-muted-foreground">
                    Protect from spam submissions
                  </p>
                </div>
                <Switch
                  checked={settings.enableCaptcha || false}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ ...settings, enableCaptcha: checked })
                  }
                />
              </div>

              {/* Max Submissions */}
              <div className="space-y-2">
                <Label>Max Submissions (Optional)</Label>
                <Input
                  type="number"
                  value={settings.maxSubmissions || ""}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      maxSubmissions: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground">
                  Limit total number of submissions
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="styling" className="h-full">
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Theme */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={styling.theme === "light" ? "default" : "outline"}
                    onClick={() => onStylingChange({ ...styling, theme: "light" })}
                  >
                    Light
                  </Button>
                  <Button
                    variant={styling.theme === "dark" ? "default" : "outline"}
                    onClick={() => onStylingChange({ ...styling, theme: "dark" })}
                  >
                    Dark
                  </Button>
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Input
                  type="color"
                  value={styling.primaryColor || "#000000"}
                  onChange={(e) =>
                    onStylingChange({ ...styling, primaryColor: e.target.value })
                  }
                />
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label>Font Family</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={styling.fontFamily || "inherit"}
                  onChange={(e) =>
                    onStylingChange({ ...styling, fontFamily: e.target.value })
                  }
                >
                  <option value="inherit">Default</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                </select>
              </div>

              {/* Border Radius */}
              <div className="space-y-2">
                <Label>Border Radius (px)</Label>
                <Input
                  type="number"
                  value={parseInt(styling.borderRadius) || 8}
                  onChange={(e) =>
                    onStylingChange({ ...styling, borderRadius: `${e.target.value}px` })
                  }
                  min="0"
                  max="50"
                />
              </div>

              {/* Field Spacing */}
              <div className="space-y-2">
                <Label>Field Spacing (px)</Label>
                <Input
                  type="number"
                  value={parseInt(styling.fieldSpacing) || 16}
                  onChange={(e) =>
                    onStylingChange({ ...styling, fieldSpacing: `${e.target.value}px` })
                  }
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
