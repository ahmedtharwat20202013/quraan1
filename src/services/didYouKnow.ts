import { LocalNotifications } from '@capacitor/local-notifications';
import { DID_YOU_KNOW_FACTS } from '../data/didYouKnow';
import { Capacitor } from '@capacitor/core';

/**
 * Initialize Did You Know notifications by requesting permissions
 */
export const initDidYouKnowNotifications = async (): Promise<boolean> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('Skipping native notification initialization on non-native platform.');
      return false;
    }
    if (!LocalNotifications || typeof LocalNotifications.requestPermissions !== 'function') {
      console.log('LocalNotifications is not available in this environment.');
      return false;
    }
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display !== 'granted') {
      return false;
    }

    // Create the high-priority notification channel for sound and vibration
    if (typeof LocalNotifications.createChannel === 'function') {
      await LocalNotifications.createChannel({
        id: 'did_you_know_channel',
        name: 'هل تعلم اليومية',
        description: 'قناة إشعارات هل تعلم اليومية مع الصوت والاهتزاز',
        importance: 5, // IMPORTANCE_HIGH
        sound: 'default',
        visibility: 1,
        vibration: true
      });
    }

    return true;
  } catch (e) {
    console.error('Failed to request permissions for Did You Know:', e);
    return false;
  }
};

/**
 * Cancel any scheduled Did You Know notifications (IDs 2000 to 2015)
 */
export const cancelDidYouKnowNotifications = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (LocalNotifications && typeof LocalNotifications.cancel === 'function') {
      const ids = [];
      for (let i = 2000; i < 2015; i++) {
        ids.push({ id: i });
      }
      await LocalNotifications.cancel({ notifications: ids });
      console.log('Cancelled pending Did You Know notifications.');
    }
  } catch (e) {
    console.error('Error cancelling Did You Know notifications:', e);
  }
};

/**
 * Schedule daily Did You Know notifications for the next 7 days
 */
export const scheduleWeeklyDidYouKnow = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('Skipping weekly Did You Know scheduling on web platform.');
      return;
    }
    // Cancel first
    await cancelDidYouKnowNotifications();

    // Check if option is enabled (default to true)
    const isEnabled = localStorage.getItem('quran_did_you_know_enabled') !== 'false';
    if (!isEnabled) {
      console.log('Did You Know notifications are disabled.');
      return;
    }

    // Ensure notification channel is created
    await initDidYouKnowNotifications();

    // Get preferred time (default 08:00 PM)
    const timeStr = localStorage.getItem('quran_did_you_know_time') || '20:00';
    const [hour, minute] = timeStr.split(':').map(Number);

    const now = new Date();
    const notifications = [];

    for (let i = 0; i < 7; i++) {
      const scheduleTime = new Date();
      scheduleTime.setDate(now.getDate() + i);
      scheduleTime.setHours(hour, minute, 0, 0);

      // Only schedule if it's in the future
      if (scheduleTime.getTime() > now.getTime()) {
        // Calculate local epoch day to map every calendar day to a unique non-repeating fact index
        const localEpochDay = Math.floor((scheduleTime.getTime() - scheduleTime.getTimezoneOffset() * 60 * 1000) / (1000 * 60 * 60 * 24));
        const factIndex = localEpochDay % DID_YOU_KNOW_FACTS.length;
        const fact = DID_YOU_KNOW_FACTS[factIndex];

        notifications.push({
          title: 'هل تعلم؟ 🤔',
          body: fact.text,
          largeBody: fact.text, // Expandable big text style so it shows fully without truncation
          id: 2000 + i,
          schedule: { at: scheduleTime, allowWhileIdle: true },
          sound: 'default',
          channelId: 'did_you_know_channel',
          smallIcon: 'ic_stat_icon_default', // Status bar white silhouette
          largeIcon: 'res://ic_launcher', // Program logo thumbnail
          extra: {
            type: 'did_you_know',
            factText: fact.text,
            factId: fact.id,
            dayOffset: i
          }
        });
      }
    }

    if (notifications.length > 0 && LocalNotifications && typeof LocalNotifications.schedule === 'function') {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} daily Did You Know notifications.`);
    }
  } catch (e) {
    console.error('Error scheduling Did You Know notifications:', e);
  }
};

/**
 * Sync index based on days passed since last sync (Deprecated)
 */
export const syncDidYouKnowIndex = () => {
  // Deprecated: Facts are now sequentially tied directly to the calendar day (epoch day)
};
