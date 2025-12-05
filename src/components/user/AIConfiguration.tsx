import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bot, Loader2 } from 'lucide-react';

const TEXT_MODELS = [
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Best for Complex Text)', provider: 'openai' },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini (Fast Text)', provider: 'openai' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Most Capable)', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Balanced)', provider: 'gemini' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Fast)', provider: 'gemini' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
];

const IMAGE_MODELS = [
  { value: 'gpt-image-1', label: 'GPT Image 1 (Most Advanced)', provider: 'openai' },
  { value: 'dall-e-3', label: 'DALL-E 3 (High Quality)', provider: 'openai' },
  { value: 'dall-e-2', label: 'DALL-E 2 (Fast)', provider: 'openai' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', provider: 'gemini' },
];

const VISION_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Best Vision)', provider: 'openai' },
  { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Advanced Vision)', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast Vision)', provider: 'openai' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Multimodal)', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast Vision)', provider: 'gemini' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Vision)', provider: 'gemini' },
];

const AUDIO_MODELS = [
  { value: 'whisper-1', label: 'Whisper (Speech to Text)', provider: 'openai' },
  { value: 'tts-1', label: 'TTS 1 (Text to Speech)', provider: 'openai' },
  { value: 'tts-1-hd', label: 'TTS 1 HD (High Quality)', provider: 'openai' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Audio Understanding)', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast Audio)', provider: 'gemini' },
];

const VIDEO_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best Video Understanding)', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast Video)', provider: 'gemini' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Video Analysis)', provider: 'gemini' },
];

export const AIConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<string>('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [textModel, setTextModel] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [visionModel, setVisionModel] = useState('');
  const [audioModel, setAudioModel] = useState('');
  const [videoModel, setVideoModel] = useState('');
  const [maxTokens, setMaxTokens] = useState(2048);
  const [tokenUsage, setTokenUsage] = useState(0);

  useEffect(() => {
    if (user) {
      loadAIConfig();
    }
  }, [user]);

  const loadAIConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('openai_api_key, gemini_api_key, preferred_ai_provider, text_model, image_model, vision_model, audio_model, video_model, max_tokens, token_usage_count')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProvider(data.preferred_ai_provider || 'lovable');
        setOpenaiKey(data.openai_api_key || '');
        setGeminiKey(data.gemini_api_key || '');
        setTextModel(data.text_model || '');
        setImageModel(data.image_model || '');
        setVisionModel(data.vision_model || '');
        setAudioModel(data.audio_model || '');
        setVideoModel(data.video_model || '');
        setMaxTokens(data.max_tokens || 2048);
        setTokenUsage(data.token_usage_count || 0);
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
      toast.error('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          openai_api_key: openaiKey || null,
          gemini_api_key: geminiKey || null,
          preferred_ai_provider: provider,
          text_model: textModel || null,
          image_model: imageModel || null,
          vision_model: visionModel || null,
          audio_model: audioModel || null,
          video_model: videoModel || null,
          max_tokens: maxTokens
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('AI configuration saved successfully');
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Failed to save AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredModels = (models: typeof TEXT_MODELS, currentProvider: string) => {
    if (currentProvider === 'lovable') {
      return models.filter(m => m.provider === 'lovable');
    }
    return models.filter(m => m.provider === currentProvider);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI provider and models for chatbot flows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Total Tokens Consumed</Label>
          <div className="text-2xl font-bold text-primary">{tokenUsage.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">
            Cumulative tokens used across all AI operations
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (Your API Key)</SelectItem>
              <SelectItem value="gemini">Google Gemini (Your API Key)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === 'openai' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>

          </>
        )}

        {provider === 'gemini' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                placeholder="AIza..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

          </>
        )}

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Multi-Modal AI Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Select specialized models for different AI tasks
          </p>

          <div className="space-y-2">
            <Label htmlFor="text-model">Text Generation Model</Label>
            <Select value={textModel} onValueChange={setTextModel}>
              <SelectTrigger id="text-model">
                <SelectValue placeholder="Select text model" />
              </SelectTrigger>
              <SelectContent>
                {getFilteredModels(TEXT_MODELS, provider).map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-model">Image Generation Model</Label>
            <Select value={imageModel} onValueChange={setImageModel}>
              <SelectTrigger id="image-model">
                <SelectValue placeholder="Select image model" />
              </SelectTrigger>
              <SelectContent>
                {getFilteredModels(IMAGE_MODELS, provider).map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision-model">Vision/Image Analysis Model</Label>
            <Select value={visionModel} onValueChange={setVisionModel}>
              <SelectTrigger id="vision-model">
                <SelectValue placeholder="Select vision model" />
              </SelectTrigger>
              <SelectContent>
                {getFilteredModels(VISION_MODELS, provider).map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-model">Audio Processing Model</Label>
            <Select value={audioModel} onValueChange={setAudioModel}>
              <SelectTrigger id="audio-model">
                <SelectValue placeholder="Select audio model" />
              </SelectTrigger>
              <SelectContent>
                {getFilteredModels(AUDIO_MODELS, provider).map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-model">Video Understanding Model</Label>
            <Select value={videoModel} onValueChange={setVideoModel}>
              <SelectTrigger id="video-model">
                <SelectValue placeholder="Select video model" />
              </SelectTrigger>
              <SelectContent>
                {getFilteredModels(VIDEO_MODELS, provider).map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_tokens">Max Response Tokens</Label>
          <Input
            id="max_tokens"
            type="number"
            min="256"
            max="1000000"
            step="1000"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
            placeholder="2048"
          />
          <p className="text-sm text-muted-foreground">
            Controls response length (256-1,000,000). Higher values allow longer responses but may cost more.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
