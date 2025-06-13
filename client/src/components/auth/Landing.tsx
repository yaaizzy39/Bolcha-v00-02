import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function Landing() {
  const handleGoogleSignIn = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-medium text-foreground mb-2">
                Welcome to Multi-Language Chat
              </h2>
              <p className="text-muted-foreground">
                Connect with people around the world in your preferred language
              </p>
            </div>
            
            <Button 
              onClick={handleGoogleSignIn}
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-3"
            >
              <img 
                src="https://developers.google.com/identity/images/g-logo.png" 
                alt="Google" 
                className="w-5 h-5"
              />
              <span>Sign in with Google</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
