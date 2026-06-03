import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import {
  useAdminGetSettingsQuery,
  useAdminPatchSettingsMutation,
} from '../../features/admin/adminApi.js';
import { Loader } from '../../components/common/Loader.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

const SECTIONS = [
  {
    title: 'Site',
    fields: [
      { key: 'site.name', label: 'Site name' },
      { key: 'site.tagline', label: 'Tagline' },
      { key: 'site.contact_email', label: 'Contact email', type: 'email' },
      { key: 'site.whatsapp', label: 'WhatsApp number' },
    ],
  },
  {
    title: 'Social',
    fields: [
      { key: 'social.instagram', label: 'Instagram URL' },
      { key: 'social.twitter', label: 'Twitter / X URL' },
      { key: 'social.tiktok', label: 'TikTok URL' },
    ],
  },
  {
    title: 'Tax',
    fields: [
      { key: 'tax.rate_bps', label: 'Tax rate (basis points; 750 = 7.5%)', type: 'number' },
    ],
  },
  {
    title: 'Shipping',
    fields: [
      { key: 'shipping.flat_rate', label: 'Flat shipping rate (kobo)', type: 'number' },
    ],
  },
];

export function AdminSettings() {
  const { data, isLoading } = useAdminGetSettingsQuery();
  const [patch, { isLoading: saving }] = useAdminPatchSettingsMutation();
  const [values, setValues] = useState({});
  const [announcement, setAnnouncement] = useState({ text: '', link: '', active: false });

  useEffect(() => {
    if (data?.settings) {
      const next = {};
      for (const section of SECTIONS) {
        for (const f of section.fields) {
          next[f.key] = data.settings[f.key] ?? '';
        }
      }
      setValues(next);
      const a = data.settings['content.announcement_bar'];
      if (a && typeof a === 'object') setAnnouncement(a);
    }
  }, [data]);

  const onSave = async (e) => {
    e.preventDefault();
    const updates = Object.entries(values).map(([key, value]) => {
      const isNum = SECTIONS.some((s) => s.fields.some((f) => f.key === key && f.type === 'number'));
      return { key, value: isNum ? Number(value) || 0 : value };
    });
    updates.push({ key: 'content.announcement_bar', value: announcement });
    try {
      await patch(updates).unwrap();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Save failed');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <Helmet><title>Settings — Admin</title></Helmet>
      <div className="p-10 max-w-3xl">
        <h1 className="font-display text-3xl mb-8">Settings</h1>

        <form onSubmit={onSave} className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-bg-secondary border border-border p-6">
              <h2 className="font-display text-xl mb-4">{s.title}</h2>
              <div className="grid sm:grid-cols-2 gap-x-6">
                {s.fields.map((f) => (
                  <Input
                    key={f.key}
                    label={f.label}
                    type={f.type || 'text'}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="bg-bg-secondary border border-border p-6">
            <h2 className="font-display text-xl mb-4">Announcement bar</h2>
            <Input label="Text" value={announcement.text} onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })} />
            <Input label="Link" value={announcement.link} onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-gold" checked={!!announcement.active} onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })} />
              Show on site
            </label>
          </section>

          <Button type="submit" loading={saving}>Save all settings</Button>
        </form>
      </div>
    </>
  );
}
