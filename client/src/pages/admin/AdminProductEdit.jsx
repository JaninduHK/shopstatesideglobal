import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import {
  useAdminGetProductQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminListBrandsQuery,
} from '../../features/admin/adminApi.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Loader } from '../../components/common/Loader.jsx';
import { ImageUploaderAdmin } from '../../components/admin/ImageUploaderAdmin.jsx';
import { nairaToKobo, koboToNaira } from '../../utils/formatCurrency.js';

const CATEGORIES = ['women', 'men', 'handbags', 'jewelry', 'watches', 'shoes', 'home', 'art', 'kids'];
const CONDITIONS = ['new_with_tags', 'excellent', 'very_good', 'good', 'fair'];
const ADDON_GATES = ['none', 'addon1', 'addon2'];

export function AdminProductEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { data: brandsData } = useAdminListBrandsQuery();
  const { data, isLoading } = useAdminGetProductQuery(id, { skip: isNew });
  const [create, { isLoading: creating }] = useAdminCreateProductMutation();
  const [update, { isLoading: updating }] = useAdminUpdateProductMutation();

  const [images, setImages] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      shortDescription: '',
      description: '',
      category: 'handbags',
      brand: '',
      condition: 'excellent',
      priceNaira: '',
      originalRetailPriceNaira: '',
      size: '',
      color: '',
      material: '',
      dimensions: '',
      sku: '',
      requiresAddon: 'none',
      isPublished: false,
      isFeatured: false,
    },
  });

  useEffect(() => {
    if (data?.product) {
      const p = data.product;
      reset({
        title: p.title,
        shortDescription: p.shortDescription || '',
        description: p.description || '',
        category: p.category,
        brand: typeof p.brand === 'object' ? p.brand._id : p.brand,
        condition: p.condition,
        priceNaira: koboToNaira(p.price),
        originalRetailPriceNaira: p.originalRetailPrice ? koboToNaira(p.originalRetailPrice) : '',
        size: p.size || '',
        color: p.color || '',
        material: p.material || '',
        dimensions: p.dimensions || '',
        sku: p.sku || '',
        requiresAddon: p.requiresAddon || 'none',
        isPublished: !!p.isPublished,
        isFeatured: !!p.isFeatured,
      });
      setImages(p.images || []);
    }
  }, [data, reset]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      price: nairaToKobo(Number(values.priceNaira)),
      originalRetailPrice: values.originalRetailPriceNaira
        ? nairaToKobo(Number(values.originalRetailPriceNaira))
        : undefined,
      images,
    };
    delete payload.priceNaira;
    delete payload.originalRetailPriceNaira;

    try {
      if (isNew) {
        const res = await create(payload).unwrap();
        toast.success('Product created');
        navigate(`/admin/products/${res.product._id}`);
      } else {
        await update({ id, ...payload }).unwrap();
        toast.success('Saved');
      }
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed');
    }
  };

  if (!isNew && isLoading) return <Loader />;

  return (
    <>
      <Helmet><title>{isNew ? 'New product' : 'Edit product'} — Admin</title></Helmet>
      <div className="p-10 max-w-4xl">
        <Link to="/admin/products" className="text-xs uppercase tracking-luxe text-text-muted hover:text-text-primary mb-6 inline-block">
          ← Products
        </Link>
        <h1 className="font-display text-3xl mb-8">{isNew ? 'New product' : 'Edit product'}</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-bg-secondary border border-border p-6">
            <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
            <Input label="Short description" {...register('shortDescription')} />
            <div className="mb-5">
              <label className="label-luxe">Description</label>
              <textarea rows={5} className="input-luxe" {...register('description')} />
            </div>
          </div>

          <div className="bg-bg-secondary border border-border p-6 grid sm:grid-cols-2 gap-x-6">
            <div className="mb-5">
              <label className="label-luxe">Brand</label>
              <select className="input-luxe" {...register('brand', { required: 'Required' })}>
                <option value="">— select —</option>
                {brandsData?.brands?.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {errors.brand && <p className="text-xs text-status-error mt-2">{errors.brand.message}</p>}
            </div>
            <div className="mb-5">
              <label className="label-luxe">Category</label>
              <select className="input-luxe" {...register('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className="label-luxe">Condition</label>
              <select className="input-luxe" {...register('condition')}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className="label-luxe">Requires add-on</label>
              <select className="input-luxe" {...register('requiresAddon')}>
                {ADDON_GATES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <Input label="Price (₦)" type="number" error={errors.priceNaira?.message} {...register('priceNaira', { required: 'Required', valueAsNumber: true, min: 0 })} />
            <Input label="Retail price (₦)" type="number" {...register('originalRetailPriceNaira', { valueAsNumber: true, min: 0 })} />
            <Input label="SKU (auto if blank)" {...register('sku')} />
            <Input label="Size" {...register('size')} />
            <Input label="Colour" {...register('color')} />
            <Input label="Material" {...register('material')} />
            <Input label="Dimensions" {...register('dimensions')} />
          </div>

          <div className="bg-bg-secondary border border-border p-6">
            <ImageUploaderAdmin images={images} onChange={setImages} />
          </div>

          <div className="bg-bg-secondary border border-border p-6 flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-gold" {...register('isPublished')} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-gold" {...register('isFeatured')} />
              Featured
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" loading={creating || updating}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
            <Link to="/admin/products" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}
