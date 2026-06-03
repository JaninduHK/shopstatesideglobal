import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import {
  useSubmitRequestMutation,
  useVerifyRequestPaymentMutation,
} from '../../features/requests/requestsApi.js';
import { usePaystack } from '../../hooks/usePaystack.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { ReferenceImageUpload } from '../../components/request/ReferenceImageUpload.jsx';
import { formatNaira, nairaToKobo } from '../../utils/formatCurrency.js';

const SUBMISSION_FEE_KOBO = 3_000_000; // display only — server enforces real value

const schema = z.object({
  title: z.string().min(1, 'Required').max(200),
  description: z.string().min(10, 'Tell us at least a sentence').max(5000),
  budgetNaira: z.coerce.number().int().min(0, 'Budget must be ≥ 0'),
  category: z.string().optional(),
  brand: z.string().optional(),
  additionalNotes: z.string().max(2000).optional(),
});

const CATEGORIES = ['', 'women', 'men', 'handbags', 'jewelry', 'watches', 'shoes', 'home', 'art', 'kids'];

export function RequestCreate() {
  const navigate = useNavigate();
  const [submit, { isLoading }] = useSubmitRequestMutation();
  const [verify] = useVerifyRequestPaymentMutation();
  const { pay } = usePaystack();
  const [images, setImages] = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const init = await submit({
        title: values.title,
        description: values.description,
        budget: nairaToKobo(values.budgetNaira),
        category: values.category || undefined,
        brand: values.brand || undefined,
        additionalNotes: values.additionalNotes || undefined,
        referenceImages: images,
      }).unwrap();

      pay({
        accessCode: init.accessCode,
        authorizationUrl: init.authorizationUrl,
        onSuccess: async (tx) => {
          try {
            await verify({ reference: tx.reference || init.reference }).unwrap();
            toast.success('Request submitted');
            navigate(`/member/requests/${init.request.id}`, { replace: true });
          } catch (err) {
            toast.error(err?.data?.error?.message || 'Verification failed');
          }
        },
        onClose: () => toast('Payment cancelled', { icon: '◇' }),
      });
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not submit');
    }
  };

  return (
    <>
      <Helmet><title>Special request — State Side Global</title></Helmet>
      <div className="container-luxe py-16 max-w-4xl">
        <p className="text-xs uppercase tracking-luxe text-gold mb-2">Bespoke sourcing</p>
        <h1 className="font-display text-4xl mb-12">Special request</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { n: '1', t: 'Submit', d: `Tell us what you're looking for and pay the ${formatNaira(SUBMISSION_FEE_KOBO)} review fee.` },
            { n: '2', t: 'We assess', d: 'Within 3 business days we either accept (with a sourcing cost) or refund your fee.' },
            { n: '3', t: 'We deliver', d: 'Once you pay the sourcing cost, we begin acquisition. We ship when ready.' },
          ].map((s) => (
            <div key={s.n} className="border-t border-gold/40 pt-4">
              <p className="text-xs uppercase tracking-luxe text-gold mb-2">Step {s.n}</p>
              <h3 className="font-display text-xl mb-2">{s.t}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="bg-bg-secondary border border-border p-6">
            <Input label="What are you looking for?" error={errors.title?.message} {...register('title')} placeholder="e.g. Hermès Birkin 30 Etoupe Togo" />
            <div className="mb-5">
              <label className="label-luxe">Detailed description</label>
              <textarea
                rows={5}
                className="input-luxe"
                placeholder="Size, colour, era, condition expectations, any details that help us source the right piece…"
                {...register('description')}
              />
              {errors.description && <p className="mt-2 text-xs text-status-error">{errors.description.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6">
              <Input label="Budget (₦)" type="number" error={errors.budgetNaira?.message} {...register('budgetNaira')} placeholder="50,000,000" />
              <Input label="Brand (optional)" {...register('brand')} placeholder="Hermès, Cartier, …" />
              <div className="mb-5">
                <label className="label-luxe">Category (optional)</label>
                <select className="input-luxe" {...register('category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-5">
              <label className="label-luxe">Additional notes (optional)</label>
              <textarea rows={3} className="input-luxe" {...register('additionalNotes')} />
            </div>
            <ReferenceImageUpload images={images} onChange={setImages} max={5} />
          </div>

          <div className="bg-bg-secondary border-l-2 border-gold p-6">
            <h3 className="font-display text-xl mb-2">Submission fee {formatNaira(SUBMISSION_FEE_KOBO)}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Charged at submission. If we cannot fulfill your request, this fee is refunded in full. If we accept,
              the fee is non-refundable and goes toward sourcing.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={isLoading}>Submit & pay {formatNaira(SUBMISSION_FEE_KOBO)}</Button>
            <Link to="/member/requests" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
