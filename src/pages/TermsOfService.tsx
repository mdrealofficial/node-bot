import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const TermsOfService = () => {
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

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using {appName}, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              {appName} provides a comprehensive platform for managing social media automation, customer engagement, 
              e-commerce operations, and communication across multiple channels including Facebook, Instagram, WhatsApp, and TikTok.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You may not share your account with others</li>
              <li>One person or entity may maintain only one account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the service for any illegal purposes</li>
              <li>Send spam or unsolicited messages</li>
              <li>Harass, abuse, or harm others</li>
              <li>Violate any third-party platform terms (Facebook, Instagram, etc.)</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Upload malicious content or malware</li>
              <li>Resell or redistribute our services without permission</li>
              <li>Use automated scripts to access our services beyond intended use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription and Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Subscriptions are billed according to your selected plan</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
              <li>Failed payments may result in service suspension</li>
              <li>You can cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content, features, and functionality of {appName} are owned by us and are protected by copyright, 
              trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you create or upload. By using our service, you grant us a license to use, 
              store, and process your content as necessary to provide the service. You are solely responsible for the 
              content you create and must ensure it complies with all applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Third-Party Integrations</h2>
            <p className="text-muted-foreground">
              Our service integrates with third-party platforms. Your use of these integrations is subject to the respective 
              platform's terms of service. We are not responsible for changes to third-party APIs or services that may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance, 
              updates, or experience outages. We will notify users of planned maintenance when possible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, {appName} shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of the service. Our total liability 
              shall not exceed the amount paid by you in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless {appName} from any claims, damages, or expenses arising from 
              your use of the service, violation of these terms, or infringement of any rights of third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violation of these terms. You may terminate 
              your account at any time through your account settings. Upon termination, your right to use the service 
              ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of significant changes. 
              Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact our support team through the Help Center.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
