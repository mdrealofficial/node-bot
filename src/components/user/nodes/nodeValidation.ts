interface NodeData {
  label?: string;
  content?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  title?: string;
  cards?: any[];
  products?: any[];
  delay?: string | number;
  delayUnit?: string;
  fieldName?: string;
  prompt?: string;
  buttons?: Array<{ id: string; title: string }>;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
  buttonName?: string;
  actionType?: 'next_message' | 'url' | 'start_flow' | 'call';
  url?: string;
  flowId?: string;
  phoneNumber?: string;
  replyText?: string;
}

export const validateAudioNode = (data: NodeData): boolean => {
  return !!(data.audioUrl && data.audioUrl.trim().length > 0);
};

export const validateVideoNode = (data: NodeData): boolean => {
  return !!(data.videoUrl && data.videoUrl.trim().length > 0);
};

export const validateFileNode = (data: NodeData): boolean => {
  return !!(data.fileUrl && data.fileUrl.trim().length > 0);
};

export const validateCardNode = (data: NodeData): boolean => {
  return !!(data.title && data.title.trim().length > 0);
};

export const validateCarouselNode = (data: NodeData): boolean => {
  // Carousel node is valid by default - carousel items are separate connected nodes
  return true;
};

export const validateProductNode = (data: NodeData): boolean => {
  return !!(Array.isArray(data.products) && data.products.length > 0);
};

export const validateSequenceNode = (data: NodeData): boolean => {
  return !!(data.delay && Number(data.delay) > 0);
};

export const validateInputNode = (data: NodeData): boolean => {
  return !!(data.fieldName && data.fieldName.trim().length > 0);
};

export const validateAINode = (data: NodeData): boolean => {
  return !!(data.prompt && data.prompt.trim().length > 0);
};

export const validateTextNode = (data: NodeData): boolean => {
  return !!(data.content && data.content.trim().length > 0);
};

export const validateImageNode = (data: NodeData): boolean => {
  if (!data.imageUrl || !data.imageUrl.trim()) return false;
  
  try {
    new URL(data.imageUrl);
    return true;
  } catch {
    return false;
  }
};

export const validateButtonNode = (data: NodeData): boolean => {
  // Button node requires buttonName and actionType
  if (!data.buttonName || !data.buttonName.trim()) return false;
  if (!data.actionType) return false;
  
  // Validate based on action type
  switch (data.actionType) {
    case 'url':
      return !!(data.url && data.url.trim().length > 0);
    case 'start_flow':
      return !!(data.flowId && data.flowId.trim().length > 0);
    case 'call':
      return !!(data.phoneNumber && data.phoneNumber.trim().length > 0);
    case 'next_message':
      return true; // Only buttonName is required for next_message
    default:
      return false;
  }
};

export const validateConditionNode = (data: NodeData): boolean => {
  if (!data.condition) return false;
  
  return !!(
    data.condition.field &&
    data.condition.field.trim().length > 0 &&
    data.condition.operator
  );
};

export const validateQuickReplyNode = (data: NodeData): boolean => {
  // Quick reply node requires replyText and actionType
  if (!data.replyText || !data.replyText.trim()) return false;
  if (!data.actionType) return false;
  
  // Validate based on action type (only next_message and start_flow supported)
  switch (data.actionType) {
    case 'start_flow':
      return !!(data.flowId && data.flowId.trim().length > 0);
    case 'next_message':
      return true; // Only replyText is required for next_message
    default:
      return false;
  }
};

export const getNodeStatus = (nodeType: string, data: NodeData): {
  isValid: boolean;
  message: string;
} => {
  switch (nodeType) {
    case "text":
      return {
        isValid: validateTextNode(data),
        message: validateTextNode(data) ? "Configured" : "Needs message",
      };
    case "image":
      return {
        isValid: validateImageNode(data),
        message: validateImageNode(data) ? "Configured" : "Needs image URL",
      };
    case "button":
      if (validateButtonNode(data)) {
        return { isValid: true, message: "Configured" };
      }
      // Provide specific error message
      if (!data.buttonName || !data.buttonName.trim()) {
        return { isValid: false, message: "Needs button name" };
      }
      if (!data.actionType) {
        return { isValid: false, message: "Select action type" };
      }
      if (data.actionType === 'url' && (!data.url || !data.url.trim())) {
        return { isValid: false, message: "Needs URL" };
      }
      if (data.actionType === 'start_flow' && (!data.flowId || !data.flowId.trim())) {
        return { isValid: false, message: "Select flow" };
      }
      if (data.actionType === 'call' && (!data.phoneNumber || !data.phoneNumber.trim())) {
        return { isValid: false, message: "Needs phone number" };
      }
      return { isValid: false, message: "Needs configuration" };
    case "quickReply":
      if (validateQuickReplyNode(data)) {
        return { isValid: true, message: "Configured" };
      }
      // Provide specific error message
      if (!data.replyText || !data.replyText.trim()) {
        return { isValid: false, message: "Needs reply text" };
      }
      if (!data.actionType) {
        return { isValid: false, message: "Select action type" };
      }
      if (data.actionType === 'start_flow' && (!data.flowId || !data.flowId.trim())) {
        return { isValid: false, message: "Select flow" };
      }
      return { isValid: false, message: "Needs configuration" };
    case "condition":
      return {
        isValid: validateConditionNode(data),
        message: validateConditionNode(data) ? "Configured" : "Needs condition",
      };
    case "audio":
      return {
        isValid: validateAudioNode(data),
        message: validateAudioNode(data) ? "Configured" : "Needs audio URL",
      };
    case "video":
      return {
        isValid: validateVideoNode(data),
        message: validateVideoNode(data) ? "Configured" : "Needs video URL",
      };
    case "file":
      return {
        isValid: validateFileNode(data),
        message: validateFileNode(data) ? "Configured" : "Needs file URL",
      };
    case "card":
      return {
        isValid: validateCardNode(data),
        message: validateCardNode(data) ? "Configured" : "Needs card details",
      };
    case "carousel":
      return {
        isValid: validateCarouselNode(data),
        message: "Configured",
      };
    case "product":
      return {
        isValid: validateProductNode(data),
        message: validateProductNode(data) ? "Configured" : "Needs products",
      };
    case "sequence":
      return {
        isValid: validateSequenceNode(data),
        message: validateSequenceNode(data) ? "Configured" : "Needs delay",
      };
    case "input":
      return {
        isValid: validateInputNode(data),
        message: validateInputNode(data) ? "Configured" : "Needs field name",
      };
    case "ai":
      return {
        isValid: validateAINode(data),
        message: validateAINode(data) ? "Configured" : "Needs AI prompt",
      };
    default:
      return { isValid: true, message: "Ready" };
  }
};

export const getDetailedValidationErrors = (nodeType: string, data: NodeData): string[] => {
  const errors: string[] = [];
  
  switch (nodeType) {
    case "text":
      if (!data.content || !data.content.trim()) {
        errors.push("Message content is required");
      }
      break;
    
    case "image":
      if (!data.imageUrl || !data.imageUrl.trim()) {
        errors.push("Image URL is required");
      } else {
        try {
          new URL(data.imageUrl);
        } catch {
          errors.push("Image URL must be a valid URL");
        }
      }
      break;
    
    case "button":
      if (!Array.isArray(data.buttons) || data.buttons.length === 0) {
        errors.push("At least one button is required");
      } else {
        const invalidButtons = data.buttons.filter(btn => !btn.title || !btn.title.trim());
        if (invalidButtons.length > 0) {
          errors.push(`${invalidButtons.length} button(s) missing title`);
        }
      }
      break;
    
    case "condition":
      if (!data.condition) {
        errors.push("Condition configuration is required");
      } else {
        if (!data.condition.field || !data.condition.field.trim()) {
          errors.push("Condition field is required");
        }
        if (!data.condition.operator) {
          errors.push("Condition operator is required");
        }
      }
      break;
    
    case "audio":
      if (!data.audioUrl || !data.audioUrl.trim()) {
        errors.push("Audio URL is required");
      }
      break;
    
    case "video":
      if (!data.videoUrl || !data.videoUrl.trim()) {
        errors.push("Video URL is required");
      }
      break;
    
    case "file":
      if (!data.fileUrl || !data.fileUrl.trim()) {
        errors.push("File URL is required");
      }
      break;
    
    case "card":
      if (!data.title || !data.title.trim()) {
        errors.push("Card title is required");
      }
      break;
    
    case "carousel":
      if (!Array.isArray(data.cards) || data.cards.length === 0) {
        errors.push("At least one card is required");
      }
      break;
    
    case "product":
      if (!Array.isArray(data.products) || data.products.length === 0) {
        errors.push("At least one product is required");
      }
      break;
    
    case "sequence":
      if (!data.delay) {
        errors.push("Delay time is required");
      } else if (Number(data.delay) <= 0) {
        errors.push("Delay must be greater than 0");
      }
      break;
    
    case "input":
      if (!data.fieldName || !data.fieldName.trim()) {
        errors.push("Field name is required");
      }
      break;
    
    case "ai":
      if (!data.prompt || !data.prompt.trim()) {
        errors.push("AI prompt is required");
      }
      break;
  }
  
  return errors;
};
