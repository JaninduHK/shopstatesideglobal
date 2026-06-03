import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';

import { AuthCard } from '../../components/auth/AuthCard.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { useResetPasswordMutation } from '../../features/auth/authApi.js';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords must match', path: ['confirm'] });

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [reset, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    try {
      await reset({ token, password }).unwrap();
      setDone(true);
      toast.success('Password updated');
      setTimeout(() => navigate('/auth/login', { replace: true }), 1500);
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Reset failed');
    }
  };

  return (
    <>
      <Helmet><title>Reset password — State Side Global</title></Helmet>
      <AuthCard
        title="Set a new password"
        footer={<Link to="/auth/login" className="text-gold hover:text-gold-light">Back to sign in</Link>}
      >
        {done ? (
          <p className="text-text-secondary text-sm">Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <Button type="submit" loading={isLoading} className="w-full">Update password</Button>
          </form>
        )}
      </AuthCard>
    </>
  );
}
