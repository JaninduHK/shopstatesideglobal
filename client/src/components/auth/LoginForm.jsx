import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Input } from '../common/Input.jsx';
import { Button } from '../common/Button.jsx';
import { useLoginMutation } from '../../features/auth/authApi.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const data = await login(values).unwrap();
      toast.success(`Welcome back, ${data.user.firstName}.`);
      const from = location.state?.from?.pathname;
      const dest =
        from && !from.startsWith('/auth')
          ? from
          : data.user.membership?.status === 'active'
            ? '/member'
            : '/membership/plans';
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <div className="flex justify-end mb-6">
        <Link to="/auth/forgot-password" className="text-xs text-gold hover:text-gold-light">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={isLoading} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
