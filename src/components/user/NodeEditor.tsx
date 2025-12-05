import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImageUpload } from "./ImageUpload";
import { VideoUpload } from "./VideoUpload";
import { AudioUpload } from "./AudioUpload";
import { FileUpload } from "./FileUpload";
import { ActionButtonSettings } from "./ActionButtonSettings";


interface NodeData {
  label?: string;
  content?: string;
  imageUrl?: string;
  buttons?: Array<{ id: string; title: string; nextNode?: string }>;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
  flowName?: string;
  triggerKeyword?: string;
  matchType?: 'exact' | 'partial';
  audioUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  carouselText?: string;
  products?: Array<string>;
  productSellingMethod?: 'direct_store' | 'details_store' | 'external_store';
  delay?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  fieldName?: string;
  saveAs?: string;
  prompt?: string;
  title?: string;
  subtitle?: string;
  actionTemplate?: string;
  buttonName?: string;
  actionType?: 'next_message' | 'url' | 'start_flow' | 'call';
  url?: string;
  flowId?: string;
  phoneNumber?: string;
  replyText?: string;
}

interface NodeEditorProps {
  open: boolean;
  onClose: () => void;
  nodeType: string;
  nodeData: NodeData;
  onSave: (data: NodeData) => void;
}

export const NodeEditor = ({ open, onClose, nodeType, nodeData, onSave }: NodeEditorProps) => {
  const [label, setLabel] = useState(nodeData.label || "");
  const [content, setContent] = useState(nodeData.content || "");
  const [imageUrl, setImageUrl] = useState(nodeData.imageUrl || "");
  const [buttons, setButtons] = useState<Array<{ id: string; title: string }>>(
    nodeData.buttons || []
  );
  const [conditionField, setConditionField] = useState(nodeData.condition?.field || "");
  const [conditionOperator, setConditionOperator] = useState(nodeData.condition?.operator || "equals");
  const [conditionValue, setConditionValue] = useState(nodeData.condition?.value || "");
  const [flowName, setFlowName] = useState(nodeData.flowName || "");
  const [triggerKeyword, setTriggerKeyword] = useState(nodeData.triggerKeyword || "");
  const [matchType, setMatchType] = useState<'exact' | 'partial'>(nodeData.matchType || 'exact');
  const [audioUrl, setAudioUrl] = useState(nodeData.audioUrl || "");
  const [videoUrl, setVideoUrl] = useState(nodeData.videoUrl || "");
  const [fileUrl, setFileUrl] = useState(nodeData.fileUrl || "");
  const [fileName, setFileName] = useState(nodeData.fileName || "");
  const [delay, setDelay] = useState(nodeData.delay || 0);
  const [delayUnit, setDelayUnit] = useState<'minutes' | 'hours' | 'days'>(nodeData.delayUnit || 'minutes');
  const [fieldName, setFieldName] = useState(nodeData.fieldName || "");
  const [saveAs, setSaveAs] = useState(nodeData.saveAs || "");
  const [prompt, setPrompt] = useState(nodeData.prompt || "");
  const [title, setTitle] = useState(nodeData.title || "");
  const [subtitle, setSubtitle] = useState(nodeData.subtitle || "");
  const [selectedActionTemplate, setSelectedActionTemplate] = useState<string>(nodeData.actionTemplate || "");
  const [buttonName, setButtonName] = useState(nodeData.buttonName || "");
  const [replyText, setReplyText] = useState(nodeData.replyText || "");
  const [actionType, setActionType] = useState<'next_message' | 'url' | 'start_flow' | 'call'>(nodeData.actionType || 'next_message');
  const [url, setUrl] = useState(nodeData.url || "");
  const [selectedFlowId, setSelectedFlowId] = useState(nodeData.flowId || "");
  const [phoneNumber, setPhoneNumber] = useState(nodeData.phoneNumber || "");
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [selectedActionTemplateName, setSelectedActionTemplateName] = useState<string>("");
  const [showActionSettings, setShowActionSettings] = useState(false);
  const [carouselText, setCarouselText] = useState(nodeData.carouselText || "");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(nodeData.products || []);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; price: number; image_url: string | null }>>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSellingMethod, setProductSellingMethod] = useState<'direct_store' | 'details_store' | 'external_store'>(nodeData.productSellingMethod || 'direct_store');

  useEffect(() => {
    setLabel(nodeData.label || "");
    setContent(nodeData.content || "");
    setImageUrl(nodeData.imageUrl || "");
    setButtons(nodeData.buttons || []);
    setConditionField(nodeData.condition?.field || "");
    setConditionOperator(nodeData.condition?.operator || "equals");
    setConditionValue(nodeData.condition?.value || "");
    setFlowName(nodeData.flowName || "");
    setTriggerKeyword(nodeData.triggerKeyword || "");
    setMatchType(nodeData.matchType || 'exact');
    setAudioUrl(nodeData.audioUrl || "");
    setVideoUrl(nodeData.videoUrl || "");
    setFileUrl(nodeData.fileUrl || "");
    setFileName(nodeData.fileName || "");
    setDelay(nodeData.delay || 0);
    setDelayUnit(nodeData.delayUnit || 'minutes');
    setFieldName(nodeData.fieldName || "");
    setSaveAs(nodeData.saveAs || "");
    setPrompt(nodeData.prompt || "");
    setTitle(nodeData.title || "");
    setSubtitle(nodeData.subtitle || "");
    setButtonName(nodeData.buttonName || "");
    setReplyText(nodeData.replyText || "");
    setActionType(nodeData.actionType || 'next_message');
    setUrl(nodeData.url || "");
    setSelectedFlowId(nodeData.flowId || "");
    setPhoneNumber(nodeData.phoneNumber || "");
    setCarouselText(nodeData.carouselText || "");
    setSelectedProducts(nodeData.products || []);
    setProductSellingMethod(nodeData.productSellingMethod || 'direct_store');
  }, [nodeData]);

  // Fetch products when opening product node editor
  useEffect(() => {
    if (open && nodeType === "product") {
      fetchProducts();
    }
  }, [open, nodeType]);

  // Fetch available flows when opening button or quickReply node editor
  useEffect(() => {
    if (open && (nodeType === "button" || nodeType === "quickReply")) {
      fetchAvailableFlows();
    }
  }, [open, nodeType]);

  const fetchAvailableFlows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: flows, error } = await supabase
        .from("chatbot_flows")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setAvailableFlows(flows || []);
    } catch (error: any) {
      toast.error("Failed to load flows: " + error.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!stores || stores.length === 0) {
        toast.error("No store found. Please create a store first.");
        return;
      }

      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("store_id", stores[0].id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAvailableProducts(products || []);
    } catch (error: any) {
      toast.error("Failed to load products: " + error.message);
    }
  };

  const handleSave = () => {
    const updatedData: NodeData = { ...nodeData };

    if (nodeType === "start") {
      if (!flowName.trim()) {
        toast.error("Flow name cannot be empty");
        return;
      }
      updatedData.flowName = flowName.trim();
      updatedData.triggerKeyword = triggerKeyword.trim() || undefined;
      updatedData.matchType = matchType;
      updatedData.label = "Start Flow";
    }

    if (nodeType === "text") {
      if (!content.trim()) {
        toast.error("Message text cannot be empty");
        return;
      }
      if (content.length > 2000) {
        toast.error("Message text must be less than 2000 characters");
        return;
      }
      updatedData.content = content.trim();
      updatedData.label = label.trim() || "Text Block";
    }

    if (nodeType === "image") {
      if (!imageUrl.trim()) {
        toast.error("Image URL cannot be empty");
        return;
      }
      try {
        new URL(imageUrl);
      } catch {
        toast.error("Please enter a valid URL");
        return;
      }
      updatedData.imageUrl = imageUrl.trim();
      updatedData.label = label.trim() || "Image Block";
    }

    if (nodeType === "button") {
      if (!buttonName.trim()) {
        toast.error("Button name is required");
        return;
      }
      if (actionType === 'url' && !url.trim()) {
        toast.error("URL is required for redirect action");
        return;
      }
      if (actionType === 'start_flow' && !selectedFlowId) {
        toast.error("Please select a flow to start");
        return;
      }
      if (actionType === 'call' && !phoneNumber.trim()) {
        toast.error("Phone number is required for call action");
        return;
      }
      updatedData.buttonName = buttonName.trim();
      updatedData.actionType = actionType;
      if (actionType === 'url') {
        updatedData.url = url.trim();
      }
      if (actionType === 'start_flow') {
        updatedData.flowId = selectedFlowId;
      }
      if (actionType === 'call') {
        updatedData.phoneNumber = phoneNumber.trim();
      }
      updatedData.label = buttonName.trim(); // Use button name as label
    }
    
    if (nodeType === "quickReply") {
      if (!replyText.trim()) {
        toast.error("Reply text is required");
        return;
      }
      if (actionType === 'start_flow' && !selectedFlowId) {
        toast.error("Please select a flow to start");
        return;
      }
      updatedData.replyText = replyText.trim();
      updatedData.actionType = actionType;
      if (actionType === 'start_flow') {
        updatedData.flowId = selectedFlowId;
      }
      updatedData.label = replyText.trim(); // Use reply text as label
    }

    if (nodeType === "condition") {
      if (!conditionField.trim()) {
        toast.error("Condition field cannot be empty");
        return;
      }
      updatedData.label = label.trim() || "Condition Block";
      updatedData.condition = {
        field: conditionField.trim(),
        operator: conditionOperator,
        value: conditionValue.trim(),
      };
    }

    if (nodeType === "audio") {
      if (!audioUrl.trim()) {
        toast.error("Audio URL cannot be empty");
        return;
      }
      updatedData.audioUrl = audioUrl.trim();
      updatedData.label = label.trim() || "Audio Block";
    }

    if (nodeType === "video") {
      if (!videoUrl.trim()) {
        toast.error("Video URL cannot be empty");
        return;
      }
      updatedData.videoUrl = videoUrl.trim();
      updatedData.label = label.trim() || "Video Block";
    }

    if (nodeType === "file") {
      if (!fileUrl.trim()) {
        toast.error("File URL cannot be empty");
        return;
      }
      updatedData.fileUrl = fileUrl.trim();
      updatedData.fileName = fileName.trim();
      updatedData.label = label.trim() || "File Block";
    }

    if (nodeType === "card") {
      if (!title.trim()) {
        toast.error("Card title cannot be empty");
        return;
      }
      updatedData.title = title.trim();
      updatedData.subtitle = subtitle.trim();
      updatedData.imageUrl = imageUrl.trim();
      updatedData.label = label.trim() || "Card Block";
    }

    if (nodeType === "sequence") {
      if (delay <= 0) {
        toast.error("Delay must be greater than 0");
        return;
      }
      updatedData.delay = delay;
      updatedData.delayUnit = delayUnit;
      updatedData.label = label.trim() || "Sequence Block";
    }

    if (nodeType === "input") {
      if (!fieldName.trim()) {
        toast.error("Field name cannot be empty");
        return;
      }
      updatedData.fieldName = fieldName.trim();
      updatedData.saveAs = saveAs.trim();
      updatedData.label = label.trim() || "User Input Block";
    }

    if (nodeType === "ai") {
      if (!prompt.trim()) {
        toast.error("AI prompt cannot be empty");
        return;
      }
      updatedData.prompt = prompt.trim();
      updatedData.label = label.trim() || "AI Reply Block";
    }

    if (nodeType === "carousel") {
      updatedData.carouselText = carouselText.trim();
      updatedData.label = "Carousel Message";
    }

    if (nodeType === "carouselItem") {
      if (!title?.trim()) {
        toast.error("Card title is required");
        return;
      }
      updatedData.title = title.trim();
      updatedData.subtitle = subtitle?.trim() || "";
      updatedData.imageUrl = imageUrl.trim();
      updatedData.url = url?.trim() || "";
      updatedData.label = title.trim();
    }

    if (nodeType === "product") {
      if (selectedProducts.length === 0) {
        toast.error("At least one product must be selected");
        return;
      }
      updatedData.products = selectedProducts;
      updatedData.productSellingMethod = productSellingMethod;
      updatedData.label = label.trim() || "Products Block";
    }

    onSave(updatedData);
    toast.success("Node updated successfully");
    onClose();
  };

  const addButton = () => {
    const maxButtons = nodeType === "text" ? 13 : 3;
    if (buttons.length >= maxButtons) {
      toast.error(`Maximum ${maxButtons} buttons allowed`);
      return;
    }
    setButtons([...buttons, { id: `btn-${Date.now()}`, title: "" }]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, title: string) => {
    const updated = [...buttons];
    updated[index].title = title.slice(0, 20);
    setButtons(updated);
  };


  // Product selection management
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Drag and drop sensors

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {nodeType === "start" ? "Configure Flow" : `Edit ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Node`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {nodeType === "start" && (
            <>
              <div>
                <Label>Flow Name *</Label>
                <Input
                  placeholder="Enter flow name"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                />
              </div>

              <div>
                <Label>Trigger Keywords (Optional)</Label>
                <Input
                  placeholder="e.g., start, help, hi (comma-separated)"
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When users message these keywords, the flow will automatically trigger
                </p>
              </div>

              <div>
                <Label>Match Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={matchType === 'exact' ? 'default' : 'outline'}
                    onClick={() => setMatchType('exact')}
                    className="flex-1"
                  >
                    Exact Match
                  </Button>
                  <Button
                    type="button"
                    variant={matchType === 'partial' ? 'default' : 'outline'}
                    onClick={() => setMatchType('partial')}
                    className="flex-1"
                  >
                    Partial Match
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Exact: Keyword must match exactly | Partial: Keyword can be part of message
                </p>
              </div>
            </>
          )}

          {nodeType === "text" && (
            <div>
              <Label>Message Text *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                placeholder="Enter your message..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/2000 characters
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Use the connection handles (Message, Buttons, Quick Replies) to add functionality to this message.
              </p>
            </div>
          )}

          {nodeType === "image" && (
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Image *"
              placeholder="https://example.com/image.jpg"
            />
          )}

          {nodeType === "button" && (
            <>
              <div>
                <Label>Button Name *</Label>
                <Input
                  value={buttonName}
                  onChange={(e) => setButtonName(e.target.value.slice(0, 20))}
                  placeholder="Enter button name"
                />
              </div>

              <div>
                <Label>When user presses the button</Label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="next_message">Send next message</option>
                  <option value="url">Redirect to website URL</option>
                  <option value="start_flow">Start another flow</option>
                  <option value="call">Call us button</option>
                </select>
              </div>

              {actionType === 'url' && (
                <div>
                  <Label>Website URL *</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                </div>
              )}

              {actionType === 'start_flow' && (
                <div>
                  <Label>Select Flow to Start *</Label>
                  <select
                    value={selectedFlowId}
                    onChange={(e) => setSelectedFlowId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Select a flow...</option>
                    {availableFlows.map((flow: any) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actionType === 'call' && (
                <div>
                  <Label>Phone Number (with country code) *</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              )}
            </>
          )}
          
          {nodeType === "quickReply" && (
            <>
              <div>
                <Label>Quick Reply Text * (max 20 chars)</Label>
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 20))}
                  placeholder="Enter quick reply text"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {replyText.length}/20 characters
                </p>
              </div>

              <div>
                <Label>When user taps the quick reply</Label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="next_message">Send next message</option>
                  <option value="start_flow">Start another flow</option>
                </select>
              </div>

              {actionType === 'start_flow' && (
                <div>
                  <Label>Select Flow to Start *</Label>
                  <select
                    value={selectedFlowId}
                    onChange={(e) => setSelectedFlowId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">Select a flow...</option>
                    {availableFlows.map((flow: any) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {nodeType === "condition" && (
            <>
              <div>
                <Label>Message Text</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 640))}
                  placeholder="Message text (optional)"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {content.length}/640 characters
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Buttons * (1-3)</Label>
                  <Button size="sm" variant="outline" onClick={addButton}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Button
                  </Button>
                </div>
                <div className="space-y-2">
                  {buttons.map((button, index) => (
                    <div key={button.id} className="flex gap-2">
                      <Input
                        value={button.title}
                        onChange={(e) => updateButton(index, e.target.value)}
                        placeholder="Button text (max 20 chars)"
                        maxLength={20}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeButton(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label>Action Template (Optional)</Label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowActionSettings(true)}
                    type="button"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {selectedActionTemplateName || "Select Action Template"}
                  </Button>
                  {selectedActionTemplateName && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedActionTemplateName}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {nodeType === "condition" && (
            <>
              <div>
                <Label>Condition Field *</Label>
                <Input
                  value={conditionField}
                  onChange={(e) => setConditionField(e.target.value.slice(0, 50))}
                  placeholder="e.g., user_input, tag, variable"
                />
              </div>

              <div>
                <Label>Operator</Label>
                <select
                  value={conditionOperator}
                  onChange={(e) => setConditionOperator(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                </select>
              </div>

              <div>
                <Label>Compare Value</Label>
                <Input
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value.slice(0, 100))}
                  placeholder="Value to compare against"
                />
              </div>
            </>
          )}

          {nodeType === "audio" && (
            <AudioUpload
              value={audioUrl}
              onChange={setAudioUrl}
              label="Audio *"
              placeholder="Enter audio URL or upload"
            />
          )}

          {nodeType === "video" && (
            <VideoUpload
              value={videoUrl}
              onChange={setVideoUrl}
              label="Video *"
              placeholder="Enter video URL or upload"
            />
          )}

          {nodeType === "file" && (
            <>
              <FileUpload
                value={fileUrl}
                onChange={setFileUrl}
                onFileNameChange={setFileName}
                fileName={fileName}
                label="File *"
                placeholder="Enter file URL or upload"
              />
              <div>
                <Label>File Name (Optional)</Label>
                <Input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="document.pdf"
                />
              </div>
            </>
          )}

          {nodeType === "card" && (
            <>
              <div>
                <Label>Card Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="Enter card title"
                />
              </div>
              <div>
                <Label>Subtitle (Optional)</Label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value.slice(0, 80))}
                  placeholder="Enter subtitle"
                />
              </div>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Image (Optional)"
                placeholder="https://example.com/image.jpg"
              />
            </>
          )}

          {nodeType === "sequence" && (
            <>
              <div>
                <Label>Delay Amount *</Label>
                <Input
                  type="number"
                  min="1"
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                  placeholder="Enter delay amount"
                />
              </div>
              <div>
                <Label>Delay Unit</Label>
                <select
                  value={delayUnit}
                  onChange={(e) => setDelayUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </>
          )}

          {nodeType === "input" && (
            <>
              <div>
                <Label>Field Name *</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value.slice(0, 50))}
                  placeholder="e.g., email, phone, name"
                />
              </div>
              <div>
                <Label>Save As Variable (Optional)</Label>
                <Input
                  value={saveAs}
                  onChange={(e) => setSaveAs(e.target.value.slice(0, 50))}
                  placeholder="e.g., user_email"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variable name to store the user input
                </p>
              </div>
            </>
          )}

          {nodeType === "ai" && (
            <div>
              <Label>AI Prompt *</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                placeholder="Enter the prompt for AI to generate a response..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {prompt.length}/1000 characters
              </p>
            </div>
          )}

          {nodeType === "carousel" && (
            <div>
              <Label>Text Message (Optional)</Label>
              <Textarea
                value={carouselText}
                onChange={(e) => setCarouselText(e.target.value.slice(0, 2000))}
                placeholder="Enter text message to send before carousel items (optional)"
                rows={4}
                className="resize-none"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {carouselText.length}/2000 characters
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This text will be sent before the carousel items are displayed. Use the "Items" connection to create carousel items.
              </p>
            </div>
          )}

          {nodeType === "carouselItem" && (
            <>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Please provide your reply image"
                placeholder="Put your image url here or click the upload box."
              />
              
              <div>
                <Label>Image click destination link</Label>
                <Input
                  value={url || ""}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  value={title || ""}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="Enter card title"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(title || "").length}/80 characters
                </p>
              </div>

              <div>
                <Label>Subtitle</Label>
                <Textarea
                  value={subtitle || ""}
                  onChange={(e) => setSubtitle(e.target.value.slice(0, 80))}
                  placeholder="Enter card subtitle"
                  rows={2}
                  className="resize-none"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(subtitle || "").length}/80 characters
                </p>
              </div>
            </>
          )}

          {nodeType === "product" && (
            <div>
              <Label>Select Products * (Choose one or more)</Label>
              {availableProducts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No products found. Please add products to your store first.
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <div className="space-y-3">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div
                            className="flex items-center space-x-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => toggleProduct(product.id)}
                          >
                            <div className="flex-shrink-0 bg-background border rounded p-1">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={() => toggleProduct(product.id)}
                              />
                            </div>
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ${product.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {selectedProducts.length} product(s) selected
              </p>
              
              {selectedProducts.length > 0 && (
                <div className="mt-4 space-y-3">
                  <Label>Selling Method *</Label>
                  <RadioGroup value={productSellingMethod} onValueChange={(value: any) => setProductSellingMethod(value)}>
                    <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="direct_store" id="direct_store" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="direct_store" className="font-medium cursor-pointer">
                          Sell Direct with inbuilt store
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Changes "More Info" button to "Order Now" linking to your store product page
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="details_store" id="details_store" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="details_store" className="font-medium cursor-pointer">
                          Sell Sending Details Inbuilt store
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sends product images, variations, and details with "Buy Now" button to your store
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="external_store" id="external_store" className="mt-1" />
                      <div className="flex-1">
                        <label htmlFor="external_store" className="font-medium cursor-pointer">
                          Buy With Direct external Store
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sends product images, variations, and details with "Buy Now" button to landing page URL
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Done</Button>
          </div>
        </div>
      </DialogContent>

      {/* Action Button Settings Dialog */}
      <ActionButtonSettings
        open={showActionSettings}
        onOpenChange={setShowActionSettings}
        onSelectTemplate={(templateId, templateName) => {
          setSelectedActionTemplate(templateId);
          setSelectedActionTemplateName(templateName);
        }}
      />
    </Dialog>
  );
};
