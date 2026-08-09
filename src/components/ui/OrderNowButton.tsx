import { Link } from 'react-router-dom';

export function OrderNowButton({
  className = '',
  variant = 'solid',
  children = 'Order Now',
}: {
  className?: string;
  variant?: 'solid' | 'outline';
  children?: string;
}) {
  return (
    <Link to="/checkout" className={`${variant === 'solid' ? 'btn-gold' : 'btn-outline'} ${className}`}>
      {children}
    </Link>
  );
}
