import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      alert('Settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-zinc-400" />
          Settings
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div className="flex-1 p-4 space-y-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">General</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Program Start Date</label>
            <input
              type="date"
              value={settings.program_start_date || ''}
              onChange={(e) => setSettings({ ...settings, program_start_date: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Units</label>
            <select
              value={settings.units || 'lb'}
              onChange={(e) => setSettings({ ...settings, units: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">GTG Settings</h2>
            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      alert('Notifications enabled!');
                    }
                  });
                }
              }}
              className="text-xs font-medium text-zinc-900 bg-zinc-100 px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
            >
              Enable Notifications
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Daily Target Sets</label>
              <input
                type="number"
                value={settings.gtg_daily_target_sets ?? 5}
                onChange={(e) => setSettings({ ...settings, gtg_daily_target_sets: parseInt(e.target.value) || 5 })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Cooldown (min)</label>
              <input
                type="number"
                value={settings.gtg_cooldown_minutes ?? 15}
                onChange={(e) => setSettings({ ...settings, gtg_cooldown_minutes: parseInt(e.target.value) || 15 })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.gtg_pushup_enabled}
                onChange={(e) => setSettings({ ...settings, gtg_pushup_enabled: e.target.checked ? 1 : 0 })}
                className="rounded"
              />
              Push-ups enabled
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.gtg_plank_enabled}
                onChange={(e) => setSettings({ ...settings, gtg_plank_enabled: e.target.checked ? 1 : 0 })}
                className="rounded"
              />
              Planks enabled
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Notification Start Time</label>
              <input
                type="time"
                value={settings.pushup_start_time || ''}
                onChange={(e) => setSettings({ ...settings, pushup_start_time: e.target.value, plank_start_time: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Notification End Time</label>
              <input
                type="time"
                value={settings.pushup_end_time || ''}
                onChange={(e) => setSettings({ ...settings, pushup_end_time: e.target.value, plank_end_time: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500">Nag Interval (minutes)</label>
            <input
              type="number"
              value={settings.nag_interval || 30}
              onChange={(e) => setSettings({ ...settings, nag_interval: parseInt(e.target.value) })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Progression Parameters</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Pushups Start</label>
              <input
                type="number"
                value={settings.pushup_start_reps || 12}
                onChange={(e) => setSettings({ ...settings, pushup_start_reps: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Weekly Add</label>
              <input
                type="number"
                value={settings.pushup_weekly_add || 3}
                onChange={(e) => setSettings({ ...settings, pushup_weekly_add: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Planks Start (sec)</label>
              <input
                type="number"
                value={settings.plank_start_sec || 20}
                onChange={(e) => setSettings({ ...settings, plank_start_sec: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Weekly Add</label>
              <input
                type="number"
                value={settings.plank_weekly_add || 5}
                onChange={(e) => setSettings({ ...settings, plank_weekly_add: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">EMOM Start</label>
              <input
                type="number"
                value={settings.emom_start || 7}
                onChange={(e) => setSettings({ ...settings, emom_start: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Weekly Add</label>
              <input
                type="number"
                value={settings.emom_weekly_add || 1}
                onChange={(e) => setSettings({ ...settings, emom_weekly_add: parseInt(e.target.value) })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
