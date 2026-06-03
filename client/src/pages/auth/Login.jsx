import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AuthCard } from '../../components/auth/AuthCard.jsx';
import { LoginForm } from '../../components/auth/LoginForm.jsx';

export function Login() {
  return (
    <>
      <Helmet><title>Sign in — State Side Global</title></Helmet>
      <AuthCard
        title="Welcome back."
        subtitle="Sign in to access the collection."
        footer={
          <>
            New here? <Link to="/auth/register" className="text-gold hover:text-gold-light">Become a member</Link>
          </>
        }
      >
        <LoginForm />
      </AuthCard>
    </>
  );
}
