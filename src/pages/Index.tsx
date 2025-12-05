import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Shield, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">FB SmartReply</h1>
          </div>
          <Button onClick={() => navigate('/login')}>Get Started</Button>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Automate Your Facebook <br />
            <span className="text-primary">Comments & DMs</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Smart automation for creators and businesses. Respond instantly to comments with
            personalized public replies and private messages.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/login')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <Zap className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Instant Automation</h3>
              <p className="text-muted-foreground">
                Automatically reply to comments based on keywords. Send different DMs to
                followers vs non-followers.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <Shield className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Smart Detection</h3>
              <p className="text-muted-foreground">
                Detect follower status and send personalized messages. Build stronger
                relationships with your audience.
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">Powerful Analytics</h3>
              <p className="text-muted-foreground">
                Track engagement, monitor performance, and optimize your automation rules
                with detailed insights.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 FB SmartReply. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
