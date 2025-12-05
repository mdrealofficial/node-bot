// Detect the type of task from user message
export function detectTaskType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Image generation keywords
  if (
    lowerMessage.includes('generate image') ||
    lowerMessage.includes('create image') ||
    lowerMessage.includes('draw') ||
    lowerMessage.includes('picture of') ||
    lowerMessage.includes('show me a') ||
    lowerMessage.includes('visualize')
  ) {
    return 'image_generation';
  }
  
  // Vision/image analysis keywords
  if (
    lowerMessage.includes('analyze image') ||
    lowerMessage.includes('what is in this image') ||
    lowerMessage.includes('describe this image') ||
    lowerMessage.includes('read this image') ||
    lowerMessage.includes('ocr') ||
    message.includes('data:image')
  ) {
    return 'vision';
  }
  
  // Audio keywords
  if (
    lowerMessage.includes('transcribe') ||
    lowerMessage.includes('speech to text') ||
    lowerMessage.includes('audio file') ||
    lowerMessage.includes('text to speech') ||
    lowerMessage.includes('voice')
  ) {
    return 'audio';
  }
  
  // Video keywords
  if (
    lowerMessage.includes('video') ||
    lowerMessage.includes('analyze video') ||
    lowerMessage.includes('what happens in this video')
  ) {
    return 'video';
  }
  
  // Default to text
  return 'text';
}
