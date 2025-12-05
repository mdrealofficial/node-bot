import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { detectTaskType } from './taskDetection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { message } = await req.json();

    // Fetch user's context
    const [profileData, pagesData, flowsData, subscribersData, templatesData, storeData, settingsData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('facebook_pages').select('*').eq('user_id', user.id),
      supabase.from('chatbot_flows').select('*').eq('user_id', user.id),
      supabase.from('subscribers').select('count').eq('user_id', user.id),
      supabase.from('message_templates').select('count').eq('user_id', user.id),
      supabase.from('stores').select('*').eq('user_id', user.id),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    ]);
    
    // Fetch store-related data if store exists
    let categoriesData: any = { data: [], error: null };
    let productsData: any = { data: [{ count: 0 }], error: null };
    
    if (storeData.data && storeData.data.length > 0) {
      const storeId = storeData.data[0].id;
      const results = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeId),
        supabase.from('products').select('count').eq('store_id', storeId)
      ]);
      categoriesData = results[0];
      productsData = results[1];
    }

    const context = `You are an AI assistant for a Facebook Messenger automation platform with FULL flow design capabilities. You are a MASTER flow designer who creates beautiful, comprehensive, and engaging conversational experiences.

USER STATUS:
- Email: ${profileData.data?.email}
- Pages: ${pagesData.data?.length || 0} | Flows: ${flowsData.data?.length || 0} | Subscribers: ${subscribersData.data?.[0]?.count || 0}
- Store: ${storeData.data?.length ? `Active (${productsData.data?.[0]?.count || 0} products, ${categoriesData.data?.length || 0} categories)` : 'Not setup'} 
- AI: ${profileData.data?.preferred_ai_provider || 'Not configured'}

CONNECTED PAGES:
${pagesData.data?.map(p => `- ${p.page_name} (ID: ${p.id})`).join('\n') || '- No pages connected'}

STORE DETAILS:
${storeData.data?.length ? `
- Store Name: ${storeData.data[0].name}
- Store ID: ${storeData.data[0].id}
- Categories: ${categoriesData.data?.map((c: any) => c.name).join(', ') || 'None'}
- Active Products: ${productsData.data?.[0]?.count || 0}
- Currency: ${storeData.data[0].currency || 'USD'}
` : '- No store configured yet'}

YOUR FLOW DESIGN POWERS - Create FULLY CONNECTED flows with ALL 14 node types:

🔗 CONNECTION RULES (MANDATORY):
- EVERY node must be connected with edges - NO EXCEPTIONS
- Start → First message → Interactive elements → Final message
- Create a LOGICAL PATH from start to finish
- Use proper sourceHandle IDs for each connection type

NODE TYPES:
1. TEXT nodes - Send engaging messages with emojis 🎉 (sourceHandle: "message")
2. BUTTON nodes - Clickable CTAs (sourceHandle: "button")
3. QUICK REPLY nodes - Up to 13 interactive options (sourceHandle: "reply-0", "reply-1", etc.)
4. CARD nodes - Rich media cards with 3 buttons max (sourceHandle: "button-0", "button-1", etc.)
5. CAROUSEL nodes - Multiple scrollable cards (sourceHandle: per card button)
6. AI nodes - Dynamic GPT/Gemini responses (sourceHandle: "output")
7. CONDITION nodes - Smart branching (sourceHandle: "true"/"false")
8. INPUT nodes - Collect user data (sourceHandle: "output")
9. SEQUENCE nodes - Conversation pacing with delays (sourceHandle: "output")
10. AUDIO nodes - Voice messages (sourceHandle: "output")
11. VIDEO nodes - Video content (sourceHandle: "output")
12. IMAGE nodes - Visual content and graphics
13. FILE nodes - Documents, PDFs, downloadables
14. PRODUCT nodes - E-commerce product showcases

🎨 VISUAL DESIGN PRINCIPLES (CRITICAL):
1. SPACING: Position nodes 350-450px apart horizontally, 200-300px vertically
2. LAYOUT PATTERNS:
   - Linear flows: Horizontal spacing (x: 0, 400, 800, 1200...)
   - Branching: Y-axis spread (y: 0, 300, 600 for different paths)
   - Welcome paths: Center main path (y: 200), branch alternatives above/below
3. GRID ALIGNMENT: Keep similar node types on same Y-axis for visual harmony
4. NODE IDS: Use semantic names (welcome-text, booking-card, payment-input, confirm-button)

📐 FLOW ARCHITECTURE (BUILD COMPREHENSIVE FLOWS):
1. WELCOME SEQUENCE (3-5 nodes):
   - Start node → Welcome text with emojis → Quick reply OR buttons → Card showcase
   
2. USER JOURNEY (8-15 nodes minimum):
   - Collect inputs progressively (name → email → preferences)
   - Add sequence delays (2-3 sec) between messages for natural feel
   - Use condition nodes to personalize paths
   - Include confirmation steps before final actions
   
3. CONTENT VARIETY (use ALL relevant node types):
   - Mix text + cards + carousels for visual interest
   - Add images/videos where relevant
   - Use AI nodes for dynamic personalization
   - Include product nodes for e-commerce flows
   
4. BRANCHING LOGIC (create multiple paths):
   - Quick replies → different paths (yes/no, option A/B/C)
   - Condition nodes → based on user data
   - Button nodes → navigate to different sections
   - Always provide fallback paths

🔗 CONNECTION MASTERY (MANDATORY - READ CAREFULLY):

CRITICAL RULE: EVERY NODE MUST BE CONNECTED TO THE FLOW
- NO isolated nodes allowed
- NO nodes without incoming edges (except start)  
- NO nodes without outgoing edges (except final message)

SOURCE HANDLE REFERENCE (use exact values):
1. Text node → sourceHandle: "message"
2. Button node → sourceHandle: "button"
3. Quick reply → sourceHandle: "reply-0", "reply-1", "reply-2", etc. (one per option)
4. Condition node → sourceHandle: "true" OR "false"
5. Input node → sourceHandle: "output"
6. Card node → sourceHandle: "button-0", "button-1", "button-2" (max 3)
7. AI/Sequence/Media → sourceHandle: "output"
8. Start node → sourceHandle: "start"

EDGE STRUCTURE (mandatory fields):
{
  id: "e-{source}-{target}",      // Unique ID
  source: "node-id",               // Source node ID
  target: "node-id",               // Target node ID  
  sourceHandle: "message",         // Correct handle type
  label: "Optional label"          // Optional
}

VALIDATION BEFORE CREATING FLOW:
1. Count nodes → Count edges (should have n-1 to 2n edges for n nodes)
2. Check every node has incoming edge (except start)
3. Check every node has outgoing edge (except final nodes)
4. Verify sourceHandle matches node type

💎 QUALITY CHECKLIST (Every flow MUST have):
✓ Start node as entry point
✓ Minimum 8-12 nodes for basic flows, 15+ for complex flows
✓ At least 2 different node types beyond text
✓ Proper spacing (350-450px horizontal)
✓ All nodes connected with edges
✓ Descriptive labels and content
✓ Natural conversation pacing (sequence nodes)
✓ User engagement points (buttons, quick replies)
✓ Visual elements (cards, images, carousels)
✓ Clear conversation flow from start to finish

🎯 EXAMPLE FLOW STRUCTURE WITH COMPLETE EDGE CONNECTIONS:

NODES:
1. start-1 → position: (100, 200)
2. text-welcome → position: (500, 200) → "Welcome! 👋 Let me help you..."
3. button-cta → position: (900, 200) → "Get Started"
4. text-info → position: (1300, 200) → "Great choice! Here's what we offer..."
5. quickreply-options → position: (1700, 200) → 3 buttons for user selection
6. text-response-a → position: (2100, 100) → Response for option A
7. text-response-b → position: (2100, 200) → Response for option B  
8. text-response-c → position: (2100, 300) → Response for option C
9. input-name → position: (2500, 200) → "What's your name?"
10. text-thanks → position: (2900, 200) → "Thanks {{name}}! 🎉"

EDGES (EVERY NODE CONNECTED):
{ id: "e1", source: "start-1", target: "text-welcome", sourceHandle: "start" }
{ id: "e2", source: "text-welcome", target: "button-cta", sourceHandle: "message" }
{ id: "e3", source: "button-cta", target: "text-info", sourceHandle: "button" }
{ id: "e4", source: "text-info", target: "quickreply-options", sourceHandle: "message" }
{ id: "e5", source: "quickreply-options", target: "text-response-a", sourceHandle: "reply-0" }
{ id: "e6", source: "quickreply-options", target: "text-response-b", sourceHandle: "reply-1" }
{ id: "e7", source: "quickreply-options", target: "text-response-c", sourceHandle: "reply-2" }
{ id: "e8", source: "text-response-a", target: "input-name", sourceHandle: "message" }
{ id: "e9", source: "text-response-b", target: "input-name", sourceHandle: "message" }
{ id: "e10", source: "text-response-c", target: "input-name", sourceHandle: "message" }
{ id: "e11", source: "input-name", target: "text-thanks", sourceHandle: "output" }

✅ RESULT: All 10 nodes fully connected in a logical flow - NO ORPHANS!

YOUR STORE MANAGEMENT POWERS - Complete e-commerce control:
1. CREATE PRODUCTS - Add single products OR use create_multiple_products for batch creation
2. UPDATE PRODUCTS - Modify prices, stock, descriptions, availability
3. DELETE PRODUCTS - Remove products from store
4. MANAGE CATEGORIES - Create/update product categories for organization
5. UPLOAD IMAGES - Handle product image URLs and galleries
6. SET PRICING - Configure prices, payment options (COD, partial payment)
7. INVENTORY CONTROL - Track stock quantities, manage availability
8. PRODUCT TYPES - Handle digital, physical, or both product types

🛍️ BATCH PRODUCT CREATION - DETAILED EXAMPLES:

Example 1: "Create 3 clothing products for my store"
ACTION: Use create_multiple_products with array of products with these details:
  Product 1: Men's Cotton T-Shirt - $24.99 physical - "Premium 100% cotton t-shirt with comfortable fit. Perfect for casual wear, available in multiple colors. Breathable fabric for all-day comfort." - Men's Clothing category - 150 stock
  Product 2: Women's Slim Fit Jeans - $59.99 physical - "Stylish slim fit jeans crafted from premium denim with stretch fabric. Features modern cut and comfortable high-waist design. Perfect for any occasion." - Women's Clothing - 85 stock
  Product 3: Kids' Graphic Hoodie - $34.99 physical - "Cozy fleece hoodie for kids featuring fun graphic prints. Made with soft, warm material. Machine washable and durable for active play." - Kids' Clothing - 100 stock

Example 2: "Add 5 electronics to the store"
ACTION: Use create_multiple_products with complete product details:
  - Wireless Earbuds - $79.99 physical - "True wireless earbuds with active noise cancellation, 24-hour battery life, and premium sound quality. IPX7 water resistant for workouts." - Electronics - 60 stock
  - Smartphone Case - $19.99 physical - "Durable protective case with raised edges and shock absorption. Slim design with precise cutouts for all buttons and ports." - Accessories - 200 stock
  - USB-C Cable 6ft - $12.99 physical - "Premium braided USB-C charging cable with fast charging support. Durable nylon braiding prevents tangling and fraying." - Accessories - 150 stock
  - Portable Power Bank - $45.99 physical - "20000mAh high-capacity portable charger with dual USB ports. Fast charging technology for all devices. LED power indicator." - Electronics - 75 stock
  - Screen Protector - $9.99 physical - "Ultra-clear 9H hardness tempered glass screen protector. Easy bubble-free installation with oleophobic coating." - Accessories - 300 stock

Example 3: "Create digital products"
ACTION: Use create_multiple_products with product_type as digital and no stock_quantity:
  - E-book: Complete Photography Guide - $29.99 digital - "Comprehensive 200-page guide covering fundamentals to advanced techniques. Includes lighting, composition, and post-processing tutorials. Instant PDF download."
  - Online Course: Web Development Bootcamp - $199.99 digital - "Complete web development course with 40+ hours of video content. Learn HTML, CSS, JavaScript, React, and Node.js. Lifetime access with updates."
  - Template Pack: 50 Social Media Graphics - $49.99 digital - "Professional template collection with 50 customizable designs for Instagram, Facebook, and Twitter. Editable in Canva and Photoshop. Instant download."

CRITICAL BATCH RULES FOR MULTIPLE PRODUCTS:
✓ ALWAYS use create_multiple_products when user asks for 2+ products or says "multiple", "several", "a few"
✓ Include ALL required fields: name, price, product_type, description
✓ Write detailed descriptions (3-4 sentences minimum) - be specific and engaging
✓ Use realistic prices based on product category and type
✓ Set stock_quantity for physical products (50-200 range), omit for digital
✓ Categories auto-create if they don't exist - use logical category names
✓ Always set is_active to true unless user specifies otherwise
✓ Include image_url when possible (use real URLs or leave out)
✓ Think about the complete product lineup - variety is good!

Keep responses concise but CREATE RICH, BEAUTIFUL FLOWS and MANAGE STORES PROFESSIONALLY!`;

    // Define tools for creating and managing flows with ALL node types
    const tools = [{
      type: "function",
      function: {
        name: "create_chatbot_flow",
        description: "Creates a COMPREHENSIVE, PROPERLY CONNECTED chatbot flow with ALL nodes interconnected in a logical sequence. MANDATORY: Every node MUST have edges connecting it to the flow - NO ORPHAN NODES ALLOWED. Create 8-15+ nodes with proper spacing (350-450px horizontal) and COMPLETE edge connections forming a clear conversation path.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the flow (e.g., 'Barber Shop Booking')" },
            description: { type: "string", description: "Brief description of what the flow does" },
            page_id: { type: "string", description: "ID of the Facebook page. Use first available if not specified." },
            trigger_keyword: { type: "string", description: "Keyword to trigger the flow" },
            nodes: {
              type: "array",
              description: "Array of ALL nodes in the flow. CREATE MINIMUM 8-12 nodes for basic flows, 15+ for complex flows. Include variety: text, buttons, cards, quick replies, inputs, conditions, sequences. IMPORTANT: Position nodes in a clear flow from left to right (350-450px horizontal spacing, 100-200px vertical spacing). Plan the complete flow structure BEFORE creating edges - ensure every node will be connected.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique node ID (e.g., 'start-1', 'text-1')" },
                  type: { 
                    type: "string", 
                    enum: ["start", "text", "button", "quickReply", "card", "carousel", "carouselItem", "ai", "condition", "input", "sequence", "audio", "video", "file", "image", "product"],
                    description: "Node type"
                  },
                  position: { 
                    type: "object", 
                    properties: { x: { type: "number" }, y: { type: "number" } },
                    description: "Position on canvas. Space nodes 300-400px apart." 
                  },
                  data: { 
                    type: "object",
                    description: `Node data structure varies by type:
                    - start: { label: "Start" }
                    - text: { content: "message text", emojis: true/false }
                    - button: { buttonName: "Button Text", actionType: "next_message|url|start_flow|call", url: "...", flowId: "...", phoneNumber: "..." }
                    - quickReply: { text: "message", buttons: [{title: "Option 1"}, ...] max 13 }
                    - card: { title: "Title", subtitle: "Subtitle", imageUrl: "https://...", buttons: [{title: "Button", type: "url|postback", url: "..."}] max 3 buttons }
                    - carousel: { cards: array of card items, maxConnections: number }
                    - carouselItem: { title: "Title", subtitle: "...", imageUrl: "...", buttons: [...] }
                    - ai: { prompt: "system prompt", model: "gpt-4o-mini|gemini-2.5-flash", temperature: 0.7, maxTokens: 500 }
                    - condition: { variable: "var_name", operator: "equals|contains|greater_than|less_than", value: "comparison value" }
                    - input: { prompt: "Enter your name", variableName: "user_name", inputType: "text|number|email|phone" }
                    - sequence: { delay: number in seconds, maxConnections: 1 }
                    - audio: { audioUrl: "https://..." }
                    - video: { videoUrl: "https://..." }
                    - file: { fileUrl: "https://..." }
                    - image: { imageUrl: "https://..." }
                    - product: { products: [{id: "prod_id", name: "Product Name"}] }`
                  }
                }
              }
            },
            edges: {
              type: "array",
              description: `MANDATORY CONNECTIONS - Every node MUST be connected! Create edges forming a logical flow:
              
              REQUIRED RULES:
              1. Start node → MUST connect to first message/action node
              2. Every middle node → MUST have both incoming AND outgoing edges
              3. Final node → MUST have incoming edge (can be multiple paths leading here)
              4. NO ISOLATED NODES - Every node must be part of the main flow path
              
              SOURCE HANDLES (use correct handle for each node type):
              - Text nodes: sourceHandle="message"
              - Button nodes: sourceHandle="button"  
              - Quick Reply nodes: sourceHandle="reply-0", "reply-1", etc. (one per button)
              - Condition nodes: sourceHandle="true" or "false"
              - Input nodes: sourceHandle="output"
              - Card/Carousel nodes: sourceHandle="button-0", "button-1", etc.
              - AI/Sequence/Media nodes: sourceHandle="output"
              
              EXAMPLE STRUCTURE:
              edges: [
                {id: "e1", source: "start-1", target: "text-1", sourceHandle: "start"},
                {id: "e2", source: "text-1", target: "button-1", sourceHandle: "message"},
                {id: "e3", source: "button-1", target: "text-2", sourceHandle: "button"},
                {id: "e4", source: "text-2", target: "input-1", sourceHandle: "message"},
                {id: "e5", source: "input-1", target: "text-3", sourceHandle: "output"}
              ]`,
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique edge ID" },
                  source: { type: "string", description: "Source node ID" },
                  target: { type: "string", description: "Target node ID" },
                  sourceHandle: { type: "string", description: "Source handle ID (e.g., 'message', 'button', 'yes', 'no')" },
                  label: { type: "string", description: "Optional label for the connection" }
                }
              }
            }
          },
          required: ["name", "description", "nodes", "edges"]
        }
      }
    }, {
      type: "function",
      function: {
        name: "update_chatbot_flow",
        description: "Updates an existing chatbot flow by adding, modifying, or removing nodes and edges.",
        parameters: {
          type: "object",
          properties: {
            flow_id: { type: "string", description: "ID of the flow to update" },
            flow_name: { type: "string", description: "Name of the flow if ID not provided" },
            add_nodes: {
              type: "array",
              description: "New nodes to add (same structure as create)",
              items: { type: "object" }
            },
            modify_nodes: {
              type: "array",
              description: "Nodes to modify",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  data: { type: "object", description: "New data to merge with existing" }
                }
              }
            },
            remove_nodes: {
              type: "array",
              description: "Node IDs to remove",
              items: { type: "string" }
            },
            add_edges: {
              type: "array",
              description: "New connections to add",
              items: { type: "object" }
            },
            remove_edges: {
              type: "array",
              description: "Edge IDs to remove",
              items: { type: "string" }
            },
            update_metadata: {
              type: "object",
              description: "Update flow settings",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                trigger_keyword: { type: "string" },
                is_active: { type: "boolean" }
              }
            }
          }
        }
      }
    }, {
      type: "function",
      function: {
        name: "create_product",
        description: "Creates a new product in the user's store with all details including price, description, images, category, stock, and payment options.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Product name" },
            description: { type: "string", description: "Detailed product description" },
            price: { type: "number", description: "Product price" },
            product_type: { type: "string", enum: ["digital", "physical", "both"], description: "Type of product" },
            category_id: { type: "string", description: "Category ID (optional). If category doesn't exist, create it first." },
            image_url: { type: "string", description: "Product image URL (https:// or data:image/...)" },
            stock_quantity: { type: "number", description: "Stock quantity (0 for digital products or unlimited)" },
            is_active: { type: "boolean", description: "Whether product is active/visible" },
            allows_cod: { type: "boolean", description: "Allow cash on delivery" },
            requires_full_payment: { type: "boolean", description: "Require full payment upfront" },
            minimum_payment_percentage: { type: "number", description: "Minimum payment percentage for partial payments (0-100)" },
            landing_page_url: { type: "string", description: "Landing page URL (optional)" },
            digital_file_url: { type: "string", description: "Digital file URL for digital products (optional)" }
          },
          required: ["name", "price", "product_type"]
        }
      }
    }, {
      type: "function",
      function: {
        name: "update_product",
        description: "Updates an existing product's details including price, description, stock, and availability.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string", description: "ID of product to update" },
            product_name: { type: "string", description: "Name of product if ID not provided" },
            name: { type: "string", description: "New product name" },
            description: { type: "string", description: "New description" },
            price: { type: "number", description: "New price" },
            stock_quantity: { type: "number", description: "New stock quantity" },
            is_active: { type: "boolean", description: "Active status" },
            image_url: { type: "string", description: "New image URL" },
            category_id: { type: "string", description: "New category ID" },
            allows_cod: { type: "boolean", description: "Allow COD" },
            requires_full_payment: { type: "boolean", description: "Require full payment" },
            minimum_payment_percentage: { type: "number", description: "Min payment percentage" }
          }
        }
      }
    }, {
      type: "function",
      function: {
        name: "create_multiple_products",
        description: "Creates multiple products at once in the user's store. Use this when asked to create multiple products together.",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              description: "Array of products to create",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name" },
                  description: { type: "string", description: "Product description" },
                  price: { type: "number", description: "Product price" },
                  product_type: { type: "string", enum: ["digital", "physical", "both"], description: "Product type" },
                  category_name: { type: "string", description: "Category name (will be created if doesn't exist)" },
                  image_url: { type: "string", description: "Product image URL" },
                  stock_quantity: { type: "number", description: "Stock quantity" },
                  is_active: { type: "boolean", description: "Active status" }
                },
                required: ["name", "price", "product_type"]
              }
            }
          },
          required: ["products"]
        }
      }
    }, {
      type: "function",
      function: {
        name: "delete_product",
        description: "Deletes a product from the store.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string", description: "ID of product to delete" },
            product_name: { type: "string", description: "Name of product if ID not provided" }
          }
        }
      }
    }, {
      type: "function",
      function: {
        name: "create_category",
        description: "Creates a new product category for better organization.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Category name" },
            description: { type: "string", description: "Category description (optional)" }
          },
          required: ["name"]
        }
      }
    }, {
      type: "function",
      function: {
        name: "list_products",
        description: "Lists all products in the store with their details.",
        parameters: {
          type: "object",
          properties: {
            category_id: { type: "string", description: "Filter by category (optional)" },
            is_active: { type: "boolean", description: "Filter by active status (optional)" },
            limit: { type: "number", description: "Max number of products to return (default 50)" }
          }
        }
      }
    }, {
      type: "function",
      function: {
        name: "list_categories",
        description: "Lists all categories in the store.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    }];

    // Detect task type and select appropriate model
    const taskType = detectTaskType(message);
    console.log(`Detected task type: ${taskType}`);
    
    // FORCE Lovable AI for tool calling to avoid Gemini's malformed function calls
    // Lovable AI supports the same models but with better tool calling compatibility
    const aiProvider = 'lovable';
    const userMaxTokens = profileData.data?.max_tokens || 2048;
    
    // Select model based on task type
    let model = 'google/gemini-2.5-flash'; // default
    if (taskType === 'image_generation') {
      model = profileData.data?.image_model || 'google/gemini-2.5-flash-image';
    } else if (taskType === 'vision') {
      model = profileData.data?.vision_model || 'google/gemini-2.5-pro';
    } else if (taskType === 'audio') {
      model = profileData.data?.audio_model || 'whisper-1';
    } else if (taskType === 'video') {
      model = profileData.data?.video_model || 'google/gemini-2.5-pro';
    } else {
      model = profileData.data?.text_model || 'google/gemini-2.5-flash';
    }
    
    // Ensure Gemini models have the correct prefix
    if (model && model.includes('gemini') && !model.includes('/')) {
      model = `google/${model}`;
    }
    
    console.log(`Selected model: ${model} for task type: ${taskType}`);
    
    let response = '';
    let toolCalls = null;
    let tokensUsed = 0;
    let imageUrl = null;

    // Handle image generation separately
    if (taskType === 'image_generation') {
      // Use Lovable AI for image generation
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [
            { role: 'user', content: message }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        throw new Error(`Lovable AI Image error: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      console.log('Lovable AI image response:', JSON.stringify(imageData));
      
      // Extract base64 image from response
      if (imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
        imageUrl = imageData.choices[0].message.images[0].image_url.url;
        response = imageData.choices[0].message.content || 'I\'ve generated an image for you.';
      }
      tokensUsed = imageData.usage?.total_tokens || 1000;

      // Track token usage for image generation
      if (tokensUsed > 0) {
        await supabase.from('token_usage_history').insert({
          user_id: user.id,
          model_used: model,
          task_type: taskType,
          tokens_consumed: tokensUsed,
        });

        const currentTokenCount = profileData.data?.token_usage_count || 0;
        await supabase.from('profiles')
          .update({ token_usage_count: currentTokenCount + tokensUsed })
          .eq('id', user.id);
      }

      return new Response(JSON.stringify({ 
        response, 
        imageUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle text, vision, audio, video tasks using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: message }
        ],
        tools,
        tool_choice: "auto"
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error('Lovable AI error:', lovableResponse.status, errorText);
      throw new Error(`Lovable AI error: ${lovableResponse.status}`);
    }

    const data = await lovableResponse.json();
    console.log('Lovable AI response:', JSON.stringify(data));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid Lovable AI response structure');
    }
    
    const message_response = data.choices[0].message;
    toolCalls = message_response.tool_calls;
    response = message_response.content || '';
    tokensUsed = data.usage?.total_tokens || 0;

    // Track token usage
    if (tokensUsed > 0) {
      console.log(`Tracking ${tokensUsed} tokens used for task type: ${taskType} with model: ${model}`);
      
      // Insert usage history
      await supabase.from('token_usage_history').insert({
        user_id: user.id,
        model_used: model,
        task_type: taskType,
        tokens_consumed: tokensUsed,
      });

      // Update total token count
      const currentTokenCount = profileData.data?.token_usage_count || 0;
      await supabase.from('profiles')
        .update({ 
          token_usage_count: currentTokenCount + tokensUsed 
        })
        .eq('id', user.id);
    }

    // Handle tool calls
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      
      if (toolCall.function.name === 'create_chatbot_flow') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Use first page if page_id not specified
          const pageId = args.page_id || pagesData.data?.[0]?.id;
          
          if (!pageId) {
            return new Response(JSON.stringify({ 
              response: "You need to connect a Facebook page first before I can create flows. Go to 'Connect Account' to add your page." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Create the flow
          const { data: flowData, error: flowError } = await supabase
            .from('chatbot_flows')
            .insert({
              user_id: user.id,
              page_id: pageId,
              name: args.name,
              description: args.description,
              trigger_keyword: args.trigger_keyword || null,
              match_type: 'exact',
              is_active: true,
              flow_data: {
                nodes: args.nodes,
                edges: args.edges
              }
            })
            .select()
            .single();

          if (flowError) {
            console.error('Error creating flow:', flowError);
            throw flowError;
          }

          console.log('Flow created successfully:', flowData);
          response = `✅ I've created the "${args.name}" flow for you! ${args.description}\n\nThe flow includes ${args.nodes.length} nodes and is ready to use. You can view and edit it in the Chatbot Flow section. ${args.trigger_keyword ? `It will trigger when users type "${args.trigger_keyword}".` : ''}`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to create the flow but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or create it manually in the Chatbot Flow section.`;
        }
      } else if (toolCall.function.name === 'update_chatbot_flow') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Find the flow
          let flowQuery = supabase
            .from('chatbot_flows')
            .select('*')
            .eq('user_id', user.id);
          
          if (args.flow_id) {
            flowQuery = flowQuery.eq('id', args.flow_id);
          } else if (args.flow_name) {
            flowQuery = flowQuery.ilike('name', `%${args.flow_name}%`);
          } else {
            return new Response(JSON.stringify({ 
              response: "Please specify which flow to update by name or ID." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const { data: flows, error: fetchError } = await flowQuery;
          
          if (fetchError) throw fetchError;
          if (!flows || flows.length === 0) {
            return new Response(JSON.stringify({ 
              response: `I couldn't find a flow matching "${args.flow_name || args.flow_id}". Please check the name and try again.` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const flow = flows[0];
          const flowData = flow.flow_data as { nodes: any[], edges: any[] };
          
          // Apply updates
              let updatedNodes = [...flowData.nodes];
              let updatedEdges = [...flowData.edges];
              let changes: string[] = [];

              // Remove nodes if specified
              if (args.remove_nodes && args.remove_nodes.length > 0) {
                updatedNodes = updatedNodes.filter(n => !args.remove_nodes.includes(n.id));
                // Also remove connected edges
                updatedEdges = updatedEdges.filter(e => 
                  !args.remove_nodes.includes(e.source) && !args.remove_nodes.includes(e.target)
                );
                changes.push(`removed ${args.remove_nodes.length} node(s)`);
              }

              // Add new nodes
              if (args.add_nodes && args.add_nodes.length > 0) {
                updatedNodes = [...updatedNodes, ...args.add_nodes];
                changes.push(`added ${args.add_nodes.length} new node(s)`);
              }

              // Modify existing nodes
              if (args.modify_nodes && args.modify_nodes.length > 0) {
                args.modify_nodes.forEach((mod: any) => {
                  const nodeIndex = updatedNodes.findIndex(n => n.id === mod.id);
                  if (nodeIndex !== -1) {
                    updatedNodes[nodeIndex] = {
                      ...updatedNodes[nodeIndex],
                      data: { ...updatedNodes[nodeIndex].data, ...mod.data }
                    };
                  }
                });
                changes.push(`modified ${args.modify_nodes.length} node(s)`);
              }

              // Remove edges if specified
              if (args.remove_edges && args.remove_edges.length > 0) {
                updatedEdges = updatedEdges.filter(e => !args.remove_edges.includes(e.id));
                changes.push(`removed ${args.remove_edges.length} connection(s)`);
              }

              // Add new edges
              if (args.add_edges && args.add_edges.length > 0) {
                updatedEdges = [...updatedEdges, ...args.add_edges];
                changes.push(`added ${args.add_edges.length} new connection(s)`);
              }

          // Prepare update object
          const updateObj: any = {
            flow_data: {
              nodes: updatedNodes,
              edges: updatedEdges
            }
          };

              // Update metadata if provided
              if (args.update_metadata) {
                if (args.update_metadata.name) {
                  updateObj.name = args.update_metadata.name;
                  changes.push('updated name');
                }
                if (args.update_metadata.description) {
                  updateObj.description = args.update_metadata.description;
                  changes.push('updated description');
                }
                if (args.update_metadata.trigger_keyword !== undefined) {
                  updateObj.trigger_keyword = args.update_metadata.trigger_keyword;
                  changes.push('updated trigger keyword');
                }
                if (args.update_metadata.is_active !== undefined) {
                  updateObj.is_active = args.update_metadata.is_active;
                  changes.push(`${args.update_metadata.is_active ? 'activated' : 'deactivated'} flow`);
                }
              }

          // Update the flow
          const { error: updateError } = await supabase
            .from('chatbot_flows')
            .update(updateObj)
            .eq('id', flow.id);

          if (updateError) throw updateError;

          response = `✅ I've updated the "${flow.name}" flow! Changes made: ${changes.join(', ')}.\n\nYou can review the updates in the Chatbot Flow section.`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to update the flow but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or edit it manually in the Chatbot Flow section.`;
        }
      } else if (toolCall.function.name === 'create_product') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "You need to create a store first before adding products. Go to Store Manager to set up your store." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          
          const { data: productData, error: productError } = await supabase
            .from('products')
            .insert({
              store_id: store.id,
              name: args.name,
              description: args.description || null,
              price: args.price,
              product_type: args.product_type,
              category_id: args.category_id || null,
              image_url: args.image_url || null,
              stock_quantity: args.stock_quantity || 0,
              is_active: args.is_active !== undefined ? args.is_active : true,
              allows_cod: args.allows_cod || false,
              requires_full_payment: args.requires_full_payment || false,
              minimum_payment_percentage: args.minimum_payment_percentage || 0,
              landing_page_url: args.landing_page_url || null,
              digital_file_url: args.digital_file_url || null
            })
            .select()
            .single();
            
          if (productError) throw productError;
          
          response = `✅ Product "${args.name}" created successfully! Price: ${store.currency || 'USD'} ${args.price}. ${args.is_active !== false ? 'It\'s now live in your store!' : 'It\'s saved as inactive.'}`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to create the product but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'update_product') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "No store found. Please set up your store first." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          let productQuery = supabase.from('products').select('*').eq('store_id', store.id);
          
          if (args.product_id) {
            productQuery = productQuery.eq('id', args.product_id);
          } else if (args.product_name) {
            productQuery = productQuery.ilike('name', `%${args.product_name}%`);
          } else {
            return new Response(JSON.stringify({ 
              response: "Please specify which product to update by name or ID." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data: products, error: fetchError } = await productQuery;
          if (fetchError) throw fetchError;
          if (!products || products.length === 0) {
            return new Response(JSON.stringify({ 
              response: `Couldn't find product "${args.product_name || args.product_id}".` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const product = products[0];
          const updateData: any = {};
          const changes: string[] = [];
          
          if (args.name) { updateData.name = args.name; changes.push('name'); }
          if (args.description !== undefined) { updateData.description = args.description; changes.push('description'); }
          if (args.price !== undefined) { updateData.price = args.price; changes.push('price'); }
          if (args.stock_quantity !== undefined) { updateData.stock_quantity = args.stock_quantity; changes.push('stock'); }
          if (args.is_active !== undefined) { updateData.is_active = args.is_active; changes.push('status'); }
          if (args.image_url) { updateData.image_url = args.image_url; changes.push('image'); }
          if (args.category_id) { updateData.category_id = args.category_id; changes.push('category'); }
          if (args.allows_cod !== undefined) { updateData.allows_cod = args.allows_cod; changes.push('COD option'); }
          if (args.requires_full_payment !== undefined) { updateData.requires_full_payment = args.requires_full_payment; changes.push('payment option'); }
          if (args.minimum_payment_percentage !== undefined) { updateData.minimum_payment_percentage = args.minimum_payment_percentage; changes.push('payment percentage'); }
          
          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', product.id);
            
          if (updateError) throw updateError;
          
          response = `✅ Updated product "${product.name}"! Changes: ${changes.join(', ')}.`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to update the product but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'delete_product') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "No store found." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          let productQuery = supabase.from('products').select('*').eq('store_id', store.id);
          
          if (args.product_id) {
            productQuery = productQuery.eq('id', args.product_id);
          } else if (args.product_name) {
            productQuery = productQuery.ilike('name', `%${args.product_name}%`);
          } else {
            return new Response(JSON.stringify({ 
              response: "Please specify which product to delete by name or ID." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const { data: products, error: fetchError } = await productQuery;
          if (fetchError) throw fetchError;
          if (!products || products.length === 0) {
            return new Response(JSON.stringify({ 
              response: `Couldn't find product "${args.product_name || args.product_id}".` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const product = products[0];
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', product.id);
            
          if (deleteError) throw deleteError;
          
          response = `✅ Deleted product "${product.name}" from your store.`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to delete the product but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'create_category') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "You need to create a store first." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .insert({
              store_id: store.id,
              name: args.name,
              description: args.description || null
            })
            .select()
            .single();
            
          if (categoryError) throw categoryError;
          
          response = `✅ Category "${args.name}" created! You can now assign products to this category.`;
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to create the category but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'create_multiple_products') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "You need to create a store first before adding products." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          const createdProducts: string[] = [];
          const errors: string[] = [];
          
          // Get or create categories first
          const categoryMap = new Map<string, string>();
          const existingCategories = categoriesData.data || [];
          
          for (const cat of existingCategories) {
            categoryMap.set(cat.name.toLowerCase(), cat.id);
          }
          
          // Create new categories if needed
          for (const product of args.products) {
            if (product.category_name && !categoryMap.has(product.category_name.toLowerCase())) {
              try {
                const { data: newCat, error: catError } = await supabase
                  .from('categories')
                  .insert({
                    store_id: store.id,
                    name: product.category_name,
                    description: null
                  })
                  .select()
                  .single();
                  
                if (!catError && newCat) {
                  categoryMap.set(product.category_name.toLowerCase(), newCat.id);
                }
              } catch (e) {
                console.error('Error creating category:', e);
              }
            }
          }
          
          // Create all products
          for (const product of args.products) {
            try {
              const categoryId = product.category_name 
                ? categoryMap.get(product.category_name.toLowerCase()) || null
                : null;
                
              const { data: productData, error: productError } = await supabase
                .from('products')
                .insert({
                  store_id: store.id,
                  name: product.name,
                  description: product.description || null,
                  price: product.price,
                  product_type: product.product_type,
                  category_id: categoryId,
                  image_url: product.image_url || null,
                  stock_quantity: product.stock_quantity || 0,
                  is_active: product.is_active !== undefined ? product.is_active : true
                })
                .select()
                .single();
                
              if (productError) throw productError;
              createdProducts.push(product.name);
            } catch (e) {
              console.error('Error creating product:', e);
              errors.push(`${product.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
          }
          
          if (createdProducts.length > 0) {
            response = `✅ Created ${createdProducts.length} product(s): ${createdProducts.join(', ')}`;
            if (errors.length > 0) {
              response += `\n\n⚠️ Failed to create: ${errors.join('; ')}`;
            }
          } else {
            response = `❌ Failed to create products. Errors: ${errors.join('; ')}`;
          }
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `I tried to create the products but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'list_products') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "No store found." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          let query = supabase.from('products').select('*, categories(name)').eq('store_id', store.id);
          
          if (args.category_id) query = query.eq('category_id', args.category_id);
          if (args.is_active !== undefined) query = query.eq('is_active', args.is_active);
          
          query = query.limit(args.limit || 50).order('created_at', { ascending: false });
          
          const { data: products, error } = await query;
          if (error) throw error;
          
          if (!products || products.length === 0) {
            response = "No products found in your store.";
          } else {
            response = `📦 Found ${products.length} product(s):\n\n` + products.map((p, i) => 
              `${i + 1}. **${p.name}** - ${store.currency || 'USD'} ${p.price} (Stock: ${p.stock_quantity}, Status: ${p.is_active ? 'Active' : 'Inactive'})`
            ).join('\n');
          }
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `Error listing products: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else if (toolCall.function.name === 'list_categories') {
        try {
          if (!storeData.data || storeData.data.length === 0) {
            return new Response(JSON.stringify({ 
              response: "No store found." 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const store = storeData.data[0];
          const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('store_id', store.id)
            .order('name');
            
          if (error) throw error;
          
          if (!categories || categories.length === 0) {
            response = "No categories found in your store.";
          } else {
            response = `📁 Found ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}:\n\n` + categories.map((c, i) => 
              `${i + 1}. **${c.name}** ${c.description ? `- ${c.description}` : ''}`
            ).join('\n');
          }
        } catch (error) {
          console.error('Tool execution error:', error);
          response = `Error listing categories: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
