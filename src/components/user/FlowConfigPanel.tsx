import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FlowConfigPanelProps {
  flowId: string;
  flowName: string;
  triggerKeyword: string;
  matchType: 'exact' | 'partial';
  onUpdate: (name: string, keyword: string, matchType: 'exact' | 'partial') => void;
}

export const FlowConfigPanel = ({
  flowId,
  flowName,
  triggerKeyword,
  matchType,
  onUpdate,
}: FlowConfigPanelProps) => {
  const [localName, setLocalName] = useState(flowName);
  const [localKeyword, setLocalKeyword] = useState(triggerKeyword);
  const [localMatchType, setLocalMatchType] = useState<'exact' | 'partial'>(matchType);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({
          name: localName || "Untitled Flow",
          trigger_keyword: localKeyword || null,
          match_type: localMatchType,
        })
        .eq("id", flowId);

      if (error) throw error;
      
      onUpdate(localName || "Untitled Flow", localKeyword, localMatchType);
      toast.success("Configuration saved");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-80 h-fit">
      <CardHeader>
        <CardTitle className="text-lg">Configure Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="flow-name">Flow Name</Label>
          <Input
            id="flow-name"
            placeholder="Enter flow name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="trigger-keyword">Trigger Keywords</Label>
          <Input
            id="trigger-keyword"
            placeholder="hi,hello,hey (comma separated)"
            value={localKeyword}
            onChange={(e) => setLocalKeyword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Comma separated keywords for which the bot will be triggered
          </p>
        </div>

        <div>
          <Label className="mb-2 block">Match Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={localMatchType === 'exact' ? 'default' : 'outline'}
              onClick={() => setLocalMatchType('exact')}
              className="w-full"
            >
              Exact keyword match
            </Button>
            <Button
              type="button"
              variant={localMatchType === 'partial' ? 'default' : 'outline'}
              onClick={() => setLocalMatchType('partial')}
              className="w-full"
            >
              String match
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Send reply based on your matching type
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </CardContent>
    </Card>
  );
};
