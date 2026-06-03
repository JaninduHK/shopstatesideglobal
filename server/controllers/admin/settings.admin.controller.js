import { SiteSettings } from '../../models/SiteSettings.js';
import { setSetting, clearCache, SETTINGS_KEYS } from '../../services/siteSettings.service.js';
import { ok } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const listSettings = catchAsync(async (req, res) => {
  const all = await SiteSettings.find({}).sort({ key: 1 }).lean();
  const map = {};
  for (const s of all) map[s.key] = s.value;
  return ok(res, { settings: map, keys: SETTINGS_KEYS });
});

export const updateSettings = catchAsync(async (req, res) => {
  const { updates } = req.body; // [{ key, value }]
  if (!Array.isArray(updates)) {
    return ok(res, { saved: 0 });
  }
  for (const u of updates) {
    if (typeof u?.key === 'string') {
      await setSetting(u.key, u.value, req.user._id);
    }
  }
  clearCache();
  return ok(res, { saved: updates.length });
});
