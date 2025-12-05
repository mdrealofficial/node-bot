import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, MessageCircle, Settings, Zap, ShoppingBag, CreditCard, Shield, HelpCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    description: 'Learn the basics of setting up your account',
    articles: [
      { title: 'Creating your account', content: 'Sign up using your email and phone number. Verify your phone with OTP, then select a subscription plan that fits your needs. You can start with a free plan to explore features.' },
      { title: 'Connecting Facebook Pages', content: 'Go to Live Chat → Facebook tab → Click "Connect Facebook". Authorize the app to access your pages, then select the pages you want to connect. Your pages will appear in the connected pages list.' },
      { title: 'Connecting Instagram Accounts', content: 'Navigate to Live Chat → Instagram tab → Click "Connect Instagram". Make sure your Instagram account is a Business or Creator account linked to a Facebook Page. Follow the authorization flow.' },
      { title: 'Setting up WhatsApp', content: 'You can connect WhatsApp via Cloud API (recommended for businesses) or QR Code method. Go to Live Chat → WhatsApp tab and choose your preferred connection method.' },
      { title: 'Understanding your dashboard', content: 'The dashboard shows an overview of your subscribers, messages, flows, and recent activity. Use the sidebar to navigate between different features.' },
    ]
  },
  {
    id: 'automation',
    title: 'Chatbot & Automation',
    icon: MessageCircle,
    description: 'Set up automated responses and flows',
    articles: [
      { title: 'Creating your first flow', content: 'Go to Chatbot Flow section for your platform (Facebook/Instagram/WhatsApp). Click "Create Flow", set a trigger keyword, and use the visual flow builder to design your conversation.' },
      { title: 'Understanding trigger keywords', content: 'Triggers can be set to "Contains" (message includes the keyword), "Exact Match" (message equals keyword exactly), or "Starts With". Use multiple keywords separated by commas.' },
      { title: 'Adding message nodes', content: 'Drag message nodes from the sidebar to the canvas. Connect them by dragging from one node\'s output handle to another\'s input. Each node type has specific configurations.' },
      { title: 'Using quick replies and buttons', content: 'Add interactive elements to engage users. Quick replies show as chips below messages, while buttons can link to URLs, trigger new flows, or perform actions.' },
      { title: 'Comment automation', content: 'Set up automatic replies to comments on your posts. Create templates with keyword triggers, configure DM follow-ups, and enable moderation features.' },
    ]
  },
  {
    id: 'live-chat',
    title: 'Live Chat',
    icon: MessageCircle,
    description: 'Manage conversations across platforms',
    articles: [
      { title: 'Using the unified inbox', content: 'The Live Chat section shows all conversations from connected platforms in one place. Use tabs to filter by platform (All, Facebook, Instagram, WhatsApp, Website).' },
      { title: 'Replying to messages', content: 'Click on a conversation to view the message history. Type your reply in the input field and press Enter or click Send. You can also attach images and files.' },
      { title: 'Using canned responses', content: 'Save frequently used messages as canned responses. Click the template icon in the message input to access and insert saved responses quickly.' },
      { title: 'Conversation labels', content: 'Organize conversations with color-coded labels. Click the label icon on a conversation to add or manage labels for better organization.' },
      { title: 'Sales panel features', content: 'Use the sales panel to send products, create invoices, and manage orders directly within chat conversations. Great for social commerce.' },
    ]
  },
  {
    id: 'store',
    title: 'E-Commerce Store',
    icon: ShoppingBag,
    description: 'Manage your online store',
    articles: [
      { title: 'Setting up your store', content: 'Go to Store settings to configure your store name, currency, delivery areas, and shipping charges. Enable the payment methods you want to accept.' },
      { title: 'Adding products', content: 'Navigate to Products section, click Add Product. Fill in product details including name, price, images, and variations. Set category and stock quantity.' },
      { title: 'Managing orders', content: 'View and manage orders from the Orders section. Update order status, print invoices, track deliveries, and communicate with customers.' },
      { title: 'Configuring shipping', content: 'Set up delivery zones (Inside/Outside Dhaka for Bangladesh), configure shipping charges per zone, and choose calculation method (flat rate, per product, per item).' },
      { title: 'Creating coupons', content: 'Create discount codes in the Coupons section. Set discount type (percentage, fixed, free shipping), validity period, and usage limits.' },
    ]
  },
  {
    id: 'subscription',
    title: 'Subscription & Billing',
    icon: CreditCard,
    description: 'Manage your plan and payments',
    articles: [
      { title: 'Understanding plans', content: 'Each plan includes different limits for connected pages, flows, broadcast recipients, and monthly reply credits. View plan details in the Subscription section.' },
      { title: 'Upgrading your plan', content: 'Go to Subscription, click Upgrade, select your desired plan, apply any coupon codes, and complete payment. Your new plan activates immediately.' },
      { title: 'Reply credits explained', content: 'Reply credits are consumed when the system sends automated messages. Credits reset monthly based on your plan. You can purchase top-up credits if needed.' },
      { title: 'Payment methods', content: 'We support bKash and other payment gateways. Payment is processed securely through the payment provider\'s interface.' },
      { title: 'Canceling subscription', content: 'You can cancel your subscription anytime from the Subscription section. Your account will revert to the free plan at the end of the billing period.' },
    ]
  },
  {
    id: 'settings',
    title: 'Account Settings',
    icon: Settings,
    description: 'Configure your account preferences',
    articles: [
      { title: 'Updating profile information', content: 'Go to Profile/Settings to update your name, email, phone number, and password. Some changes may require verification.' },
      { title: 'Notification preferences', content: 'Configure which notifications you receive via email and SMS. Set preferences for order notifications, system alerts, and marketing messages.' },
      { title: 'API configuration', content: 'If you need custom integrations, configure API keys and webhook endpoints in the advanced settings section.' },
      { title: 'Data export', content: 'Export your data including customers, orders, and conversations from the respective sections using the export feature.' },
      { title: 'Account deletion', content: 'To delete your account, go to Settings → Account → Delete Account. This action is permanent and removes all your data.' },
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    description: 'Keep your account secure',
    articles: [
      { title: 'Password best practices', content: 'Use a strong, unique password with at least 8 characters including numbers and special characters. Never share your password with others.' },
      { title: 'Connected apps', content: 'Review and manage apps connected to your social media accounts. Remove access for apps you no longer use.' },
      { title: 'Data privacy', content: 'We take data protection seriously. Review our Privacy Policy to understand how we collect, use, and protect your information.' },
      { title: 'Suspicious activity', content: 'If you notice unauthorized access, change your password immediately and contact support. We recommend enabling additional security measures.' },
    ]
  },
];

const faqs = [
  { q: 'How do I connect my Facebook Page?', a: 'Go to Live Chat → Facebook tab → Click "Connect Facebook" and follow the authorization process. Make sure you have admin access to the pages you want to connect.' },
  { q: 'Why are my automated messages not sending?', a: 'Check if: 1) Your flow is active, 2) The trigger keyword matches, 3) You have remaining reply credits, 4) The messaging window is within 24 hours for the subscriber.' },
  { q: 'How do I get more reply credits?', a: 'You can either upgrade to a higher plan with more credits or purchase top-up credits from the Subscription section.' },
  { q: 'Can I use the platform on mobile?', a: 'Yes! The platform is fully responsive and works on mobile browsers. We recommend using the latest version of Chrome or Safari.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Subscription section and click "Cancel Plan". Your subscription will remain active until the end of the current billing period.' },
  { q: 'What happens to my data if I cancel?', a: 'Your data is retained for 30 days after cancellation. You can reactivate or export your data during this period. After 30 days, data is permanently deleted.' },
  { q: 'How do I add team members?', a: 'Team collaboration features are available on Business and Enterprise plans. Contact support for multi-user account setup.' },
  { q: 'Why is my WhatsApp not connecting?', a: 'Ensure you\'re using a valid WhatsApp Business number not registered on WhatsApp mobile app. For QR method, the session may expire; try reconnecting.' },
];

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [appName, setAppName] = useState('Our Platform');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase.from('admin_config').select('app_name').single();
      if (data?.app_name) setAppName(data.app_name);
    };
    fetchBranding();
  }, []);

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.articles.some(a => 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find answers and learn how to use {appName}
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredCategories.map((category) => (
            <Card 
              key={category.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                  {expandedCategory === category.id ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              {expandedCategory === category.id && (
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.articles.map((article, idx) => (
                      <AccordionItem key={idx} value={`article-${idx}`}>
                        <AccordionTrigger className="text-sm text-left">
                          {article.title}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {article.content}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Still need help?</CardTitle>
            <CardDescription>
              Our support team is ready to assist you
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button asChild>
              <Link to="/dashboard?tab=support">
                <MessageCircle className="mr-2 h-4 w-4" />
                Create Support Ticket
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/privacy-policy">
                Privacy Policy
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/terms-of-service">
                Terms of Service
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpCenter;
