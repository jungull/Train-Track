import { useEffect } from 'react';
import { format, parseISO, differenceInWeeks } from 'date-fns';

export default function GTGManager() {
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function checkGTG() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      try {
        const [settingsRes, eventsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch(`/api/gtg/${format(new Date(), 'yyyy-MM-dd')}`)
        ]);
        
        const settings = await settingsRes.json();
        const events = await eventsRes.json();

        const now = new Date();
        const currentTime = format(now, 'HH:mm');
        const todayStr = format(now, 'yyyy-MM-dd');
        
        // Calculate targets
        const startDate = parseISO(settings.program_start_date || todayStr);
        const weekIndex = Math.max(0, differenceInWeeks(now, startDate));
        
        const pushupTarget = (settings.pushup_start_reps || 12) + (settings.pushup_weekly_add || 3) * weekIndex;
        const plankTarget = (settings.plank_start_sec || 20) + (settings.plank_weekly_add || 5) * weekIndex;

        // Check Pushups
        if (currentTime >= settings.pushup_start_time && currentTime <= settings.pushup_end_time) {
          const pushupEvents = events.filter((e: any) => e.type === 'pushups');
          const lastPushup = pushupEvents.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
          
          let shouldNotifyPushup = false;
          if (!lastPushup) {
            shouldNotifyPushup = true;
          } else {
            const lastTime = new Date(lastPushup.timestamp);
            const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);
            
            if (lastPushup.completed) {
              if (diffMinutes >= 120) shouldNotifyPushup = true; // 2 hours after completion
            } else {
              if (diffMinutes >= (settings.nag_interval || 30)) shouldNotifyPushup = true; // nag interval
            }
          }

          if (shouldNotifyPushup) {
            // Log a "due" event to prevent spamming
            await fetch('/api/gtg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'pushups',
                date: todayStr,
                timestamp: now.toISOString(),
                target: pushupTarget,
                completed: 0,
                source: 'notification'
              })
            });

            const notification = new Notification('GTG: Pushups', {
              body: `Time for ${pushupTarget} pushups! Click to mark complete.`,
              requireInteraction: true
            });

            notification.onclick = async () => {
              await fetch('/api/gtg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'pushups',
                  date: todayStr,
                  timestamp: new Date().toISOString(),
                  target: pushupTarget,
                  completed: 1,
                  source: 'notification'
                })
              });
              notification.close();
            };
          }
        }

        // Check Planks
        if (currentTime >= settings.plank_start_time && currentTime <= settings.plank_end_time) {
          const plankEvents = events.filter((e: any) => e.type === 'planks');
          const lastPlank = plankEvents.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
          
          let shouldNotifyPlank = false;
          if (!lastPlank) {
            shouldNotifyPlank = true;
          } else {
            const lastTime = new Date(lastPlank.timestamp);
            const diffMinutes = (now.getTime() - lastTime.getTime()) / (1000 * 60);
            
            if (lastPlank.completed) {
              if (diffMinutes >= 120) shouldNotifyPlank = true;
            } else {
              if (diffMinutes >= (settings.nag_interval || 30)) shouldNotifyPlank = true;
            }
          }

          if (shouldNotifyPlank) {
            await fetch('/api/gtg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'planks',
                date: todayStr,
                timestamp: now.toISOString(),
                target: plankTarget,
                completed: 0,
                source: 'notification'
              })
            });

            const notification = new Notification('GTG: Planks', {
              body: `Time for a ${plankTarget}s plank! Click to mark complete.`,
              requireInteraction: true
            });

            notification.onclick = async () => {
              await fetch('/api/gtg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'planks',
                  date: todayStr,
                  timestamp: new Date().toISOString(),
                  target: plankTarget,
                  completed: 1,
                  source: 'notification'
                })
              });
              notification.close();
            };
          }
        }

      } catch (err) {
        console.error('GTG check failed', err);
      }
    }

    // Check every minute
    intervalId = setInterval(checkGTG, 60000);
    // Initial check
    checkGTG();

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
