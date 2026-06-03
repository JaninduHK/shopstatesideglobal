import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

import { AuthCard } from '../../components/auth/AuthCard.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { useForgotPasswordMutation } from '../../features/auth/authApi.js';

const schema = z.object({ email: z.string().email('Enter a valid email') });

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [forgot, { isLoading }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    try {
      await forgot({ email }).unwrap();
      setSent(true);
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <>
      <Helmet><title>Forgot password — State Side Global</title></Helmet>
      <AuthCard
        title="Forgot password?"
        subtitle={sent ? '' : "Enter your email and we'll send a reset link."}
        footer={<Link to="/auth/login" className="text-gold hover:text-gold-light">Back to sign in</Link>}
      >
        {sent ? (
          <p className="text-text-secondary text-sm">
            If an account exists for that email, a reset link is on the way.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
            <Button type="submit" loading={isLoading} className="w-full">Send reset link</Button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
