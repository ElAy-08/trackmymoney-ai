import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function EmptyDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Welcome to your dashboard
        </CardTitle>
        <CardDescription>
          Your income, spending, and recent activity will appear here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to="/transactions" className={buttonVariants()}>
          Add your first transaction
        </Link>
      </CardContent>
    </Card>
  );
}
