import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { useRegisterMutation } from '../../features/auth/authApi.js';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  subscribeEmail: z.boolean().optional(),
});

export function RegisterForm() {
  const [submitted, setSubmitted] = useState(null);
  const [doRegister, { isLoading }] = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { subscribeEmail: true },
  });

  const onSubmit = async (values) => {
    try {
      const data = await doRegister(values).unwrap();
      setSubmitted(data.user.email);
      toast.success('Account created — check your inbox.');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Registration failed');
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="text-gold text-3xl mb-4">◆</div>
        <h2 className="font-display text-2xl mb-2">Check your inbox</h2>
        <p className="text-text-secondary text-sm">
          We sent a verification link to <span className="text-text-primary">{submitted}</span>.
        </p>
        <p className="text-text-muted text-xs mt-6">
          Didn&apos;t receive it? Check spam, or contact support.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <label className="flex items-start gap-3 mb-6 text-xs text-text-secondary">
        <input type="checkbox" className="mt-1 accent-gold" {...register('subscribeEmail')} />
        <span>
          Send me first-look emails and exclusive drops. Unsubscribe any time.
        </span>
      </label>
      <Button type="submit" loading={isLoading} className="w-full">
        Create account
      </Button>
      <p className="mt-6 text-center text-xs text-text-muted">
        By creating an account you agree to our <Link to="/" className="text-gold hover:text-gold-light">Terms</Link>.
      </p>
    </form>
  );
}
