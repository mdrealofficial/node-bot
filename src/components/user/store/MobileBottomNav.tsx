import { Link } from 'react-router-dom';
import { Home, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface MobileBottomNavProps {
  storeSlug: string;
  onHomeClick?: () => void;
}

export function MobileBottomNav({ storeSlug, onHomeClick }: MobileBottomNavProps) {
  const { getTotalItems } = useCart();

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        <button 
          onClick={handleHomeClick}
          className="flex flex-col items-center gap-1 py-1 px-4"
        >
          <Home className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        
        <Link to="/cart" className="flex flex-col items-center gap-1 py-1 px-4 relative">
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center font-medium">
                {getTotalItems()}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Cart</span>
        </Link>
      </div>
    </div>
  );
}