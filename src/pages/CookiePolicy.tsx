import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const CookiePolicy = () => {
  const [appName, setAppName] = useState('Our Platform');

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase.from('admin_config').select('app_name').single();
      if (data?.app_name) setAppName(data.app_name);
    };
    fetchBranding();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files that are stored on your device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Cookies</h2>
            <p className="text-muted-foreground mb-2">{appName} uses cookies for the following purposes:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly (authentication, security)</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our platform</li>
              <li><strong>Marketing Cookies:</strong> Track the effectiveness of our marketing campaigns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Types of Cookies We Use</h2>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Essential Cookies</h3>
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p><strong>Name:</strong> supabase-auth-token</p>
              <p><strong>Purpose:</strong> Maintains your logged-in session</p>
              <p><strong>Duration:</strong> Session / 7 days</p>
            </div>

            <h3 className="text-lg font-medium mt-4 mb-2">Preference Cookies</h3>
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p><strong>Name:</strong> theme-preference</p>
              <p><strong>Purpose:</strong> Remembers your dark/light mode preference</p>
              <p><strong>Duration:</strong> 1 year</p>
            </div>

            <h3 className="text-lg font-medium mt-4 mb-2">Analytics Cookies</h3>
            <div className="bg-muted/50 p-4 rounded-lg text-sm">
              <p><strong>Name:</strong> _ga, _gid (Google Analytics)</p>
              <p><strong>Purpose:</strong> Track website usage and performance</p>
              <p><strong>Duration:</strong> 2 years / 24 hours</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground mb-2">We use cookies from the following third-party services:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Facebook:</strong> For Facebook integration and pixel tracking</li>
              <li><strong>Google:</strong> For analytics and performance monitoring</li>
              <li><strong>Payment Providers:</strong> For secure payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground mb-2">You can control cookies through your browser settings:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Note: Blocking essential cookies may affect the functionality of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Choices</h2>
            <p className="text-muted-foreground">
              When you first visit our platform, you will be presented with a cookie consent banner. 
              You can accept all cookies, reject non-essential cookies, or customize your preferences. 
              You can change your preferences at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page 
              with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about our use of cookies, please contact us through our Help Center 
              or refer to our <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
