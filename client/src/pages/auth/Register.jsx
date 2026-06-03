import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AuthCard } from '../../components/auth/AuthCard.jsx';
import { RegisterForm } from '../../components/auth/RegisterForm.jsx';

export function Register() {
  return (
    <>
      <Helmet><title>Become a member — State Side Global</title></Helmet>
      <AuthCard
        title="Join the Inner Circle."
        subtitle="Create your account to begin."
        footer={
          <>
            Already a member? <Link to="/auth/login" className="text-gold hover:text-gold-light">Sign in</Link>
          </>
        }
      >
        <RegisterForm />
      </AuthCard>
    </>
  );
}
