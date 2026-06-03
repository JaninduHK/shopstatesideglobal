import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import {
  selectCartItems, selectCartSubtotal, clearCart,
} from '../../features/cart/cartSlice.js';
import {
  useCreateOrderMutation,
  useVerifyOrderPaymentMutation,
} from '../../features/orders/ordersApi.js';
import { usePaystack } from '../../hooks/usePaystack.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { formatNaira } from '../../utils/formatCurrency.js';

const schema = z.object({
  fullName: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  country: z.string().default('Nigeria'),
  postalCode: z.string().optional(),
  customerNote: z.string().optional(),
});

export function Checkout() {
  const { user } = useAuth();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createOrder, { isLoading: creating }] = useCreateOrderMutation();
  const [verify] = useVerifyOrderPaymentMutation();
  const { pay } = usePaystack();
  const [step, setStep] = useState('details'); // details | processing

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Nigeria', fullName: user ? `${user.firstName} ${user.lastName}` : '' },
  });

  if (items.length === 0 && step === 'details') {
    return (
      <div className="container-luxe py-32 text-center max-w-xl mx-auto">
        <p className="text-text-muted mb-6">Your cart is empty.</p>
        <button onClick={() => navigate('/member/shop')} className="btn-ghost">Browse the collection</button>
      </div>
    );
  }

  const onSubmit = async (values) => {
    const body = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      shippingAddress: { ...values },
      customerNote: values.customerNote,
    };
    try {
      setStep('processing');
      const init = await createOrder(body).unwrap();
      pay({
        accessCode: init.accessCode,
        authorizationUrl: init.authorizationUrl,
        onSuccess: async (tx) => {
          try {
            const verifyRes = await verify({ reference: tx.reference || init.reference }).unwrap();
            dispatch(clearCart());
            toast.success('Order confirmed');
            navigate(`/member/orders/${verifyRes.order._id}`, { replace: true });
          } catch (err) {
            toast.error(err?.data?.error?.message || 'Verification failed');
            setStep('details');
          }
        },
        onClose: () => {
          toast('Payment cancelled', { icon: '◇' });
          setStep('details');
        },
      });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not start checkout');
      setStep('details');
    }
  };

  return (
    <>
      <Helmet><title>Checkout — State Side Global</title></Helmet>
      <div className="container-luxe py-16">
        <p className="text-xs uppercase tracking-luxe text-gold mb-2">Step 1 of 2</p>
        <h1 className="font-display text-4xl mb-12">Checkout</h1>

        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <h2 className="font-display text-2xl mb-6">Shipping address</h2>
            <div className="bg-bg-secondary border border-border p-6 grid sm:grid-cols-2 gap-x-6">
              <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
              <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
              <div className="sm:col-span-2"><Input label="Address line 1" error={errors.line1?.message} {...register('line1')} /></div>
              <div className="sm:col-span-2"><Input label="Address line 2 (optional)" {...register('line2')} /></div>
              <Input label="City" error={errors.city?.message} {...register('city')} />
              <Input label="State" error={errors.state?.message} {...register('state')} />
              <Input label="Country" {...register('country')} />
              <Input label="Postal code" {...register('postalCode')} />
              <div className="sm:col-span-2 mb-5">
                <label className="label-luxe">Note to seller (optional)</label>
                <textarea rows={3} className="input-luxe" {...register('customerNote')} />
              </div>
            </div>

            <div className="mt-8">
              <Button type="submit" loading={creating || step === 'processing'} className="w-full">
                Continue to payment
              </Button>
              <p className="mt-3 text-xs text-text-muted text-center">
                Total charged today: {formatNaira(subtotal)} + shipping
              </p>
            </div>
          </form>

          <aside className="bg-bg-secondary border border-border p-6 h-fit lg:sticky lg:top-20">
            <h3 className="font-display text-xl mb-4">Order</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.productId} className="flex gap-3 text-sm">
                  {i.image && <img src={i.image} alt="" className="w-12 h-14 object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary line-clamp-2">{i.title}</p>
                    <p className="text-xs text-text-muted">Qty {i.quantity}</p>
                  </div>
                  <p className="font-mono text-gold text-xs">{formatNaira(i.price * i.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal</span>
                <span className="font-mono">{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Shipping</span>
                <span className="text-text-muted text-xs">Calculated next</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-xs uppercase tracking-luxe">Total</span>
                <span className="font-mono text-gold">{formatNaira(subtotal)}+</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
