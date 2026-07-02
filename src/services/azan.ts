import { LocalNotifications } from '@capacitor/local-notifications';
import { Coordinates, PrayerTimes, CalculationMethod } from 'adhan';
import { Capacitor } from '@capacitor/core';

/**
 * Request notification permissions and register native notification channels
 * with custom Azan sounds for Android/iOS.
 */
export const initAzan = async (): Promise<boolean> => {
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

    // Register custom audio channels for Android 8.0+
    // Note: Android requires custom notification sounds to be in res/raw (lowercase, no extensions or with extensions depending on plugin version)
    // capacitor local notifications uses sound: 'soundname.mp3' or 'soundname' which it expects to be in res/raw
    await LocalNotifications.createChannel({
      id: 'fajr_channel',
      name: 'أذان الفجر',
      description: 'قناة إشعارات أذان الفجر بصوت الأذان الخاص بالفجر',
      importance: 5, // IMPORTANCE_HIGH (vibrates, shows heads up, plays sound)
      sound: 'fajr_azan.mp3', // points to android/app/src/main/res/raw/fajr_azan.mp3
      visibility: 1,
      vibration: true
    });

    await LocalNotifications.createChannel({
      id: 'azan_channel',
      name: 'أذان الصلوات',
      description: 'قناة إشعارات أذان الصلوات المكتوبة الأخرى',
      importance: 5,
      sound: 'other_azan.mp3', // points to android/app/src/main/res/raw/other_azan.mp3
      visibility: 1,
      vibration: true
    });

    return true;
  } catch (e) {
    console.error('Failed to initialize Azan notifications:', e);
    return false;
  }
};

/**
 * Cancel all scheduled Azan notifications
 */
export const cancelAllScheduledAzans = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    if (LocalNotifications && typeof LocalNotifications.getPending === 'function' && typeof LocalNotifications.cancel === 'function') {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
        console.log('Cancelled all pending scheduled notifications.');
      }
    }
  } catch (e) {
    console.error('Error cancelling notifications:', e);
  }
};

/**
 * Calculates and schedules Azan notifications for the next 7 days
 * based on user's current GPS location and calculation method.
 */
export const scheduleWeeklyAzans = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('Skipping weekly Azan scheduling on web platform.');
      return;
    }
    // 1. Cancel any previous schedules first to prevent duplicate entries
    await cancelAllScheduledAzans();

    // 2. Check if Azan option is enabled
    const isEnabled = localStorage.getItem('quran_azan_enabled') === 'true';
    if (!isEnabled) {
      console.log('Azan notifications are disabled in settings.');
      return;
    }

    // 3. Get coordinates (default to Bahbayt al-Hijarah, Samanoud if not detected yet)
    let latitude = 30.9405;
    let longitude = 31.2291;
    const savedCoords = localStorage.getItem('quran_gps_coords');
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        latitude = parsed.latitude;
        longitude = parsed.longitude;
      } catch (e) {
        console.warn('Failed to parse saved GPS coords, using defaults', e);
      }
    }

    // 4. Get calculation method
    const calcMethod = localStorage.getItem('quran_prayer_calc_method') || 'Egyptian';
    let params;
    switch (calcMethod) {
      case 'Egyptian':
        params = CalculationMethod.Egyptian();
        break;
      case 'MuslimWorldLeague':
        params = CalculationMethod.MuslimWorldLeague();
        break;
      case 'NorthAmerica':
        params = CalculationMethod.NorthAmerica();
        break;
      case 'ShiaQum':
        params = CalculationMethod.Other();
        params.fajrAngle = 16.0;
        params.ishaAngle = 14.0;
        params.maghribAngle = 4.0;
        break;
      case 'Karachi':
        params = CalculationMethod.Karachi();
        break;
      case 'UmmAlQura':
        params = CalculationMethod.UmmAlQura();
        break;
      case 'Tehran':
        params = CalculationMethod.Tehran();
        break;
      default:
        params = CalculationMethod.Egyptian();
    }

    const coordinates = new Coordinates(latitude, longitude);
    const now = new Date();
    const notificationsToSchedule = [];
    let idCounter = 1000; // start IDs from 1000 to avoid conflicting with other possible notifications

    // 5. Generate and schedule notifications for next 7 days (today + next 6 days)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + dayOffset);

      // Calculate prayer times for this day
      const prayerTimes = new PrayerTimes(coordinates, targetDate, params);

      const prayers = [
        { id: 'fajr', name: 'أذان الفجر', time: prayerTimes.fajr, channel: 'fajr_channel', sound: 'fajr_azan.mp3' },
        { id: 'dhuhr', name: 'أذان الظهر', time: prayerTimes.dhuhr, channel: 'azan_channel', sound: 'other_azan.mp3' },
        { id: 'asr', name: 'أذان العصر', time: prayerTimes.asr, channel: 'azan_channel', sound: 'other_azan.mp3' },
        { id: 'maghrib', name: 'أذان المغرب', time: prayerTimes.maghrib, channel: 'azan_channel', sound: 'other_azan.mp3' },
        { id: 'isha', name: 'أذان العشاء', time: prayerTimes.isha, channel: 'azan_channel', sound: 'other_azan.mp3' }
      ];

      for (const p of prayers) {
        // Safety check: verify date is valid and in future
        if (p.time && p.time instanceof Date && !isNaN(p.time.getTime())) {
          if (p.time.getTime() > now.getTime()) {
            notificationsToSchedule.push({
              title: p.name,
              body: 'حان الآن موعد الصلاة.',
              id: idCounter++,
              schedule: { at: p.time },
              sound: p.sound,
              channelId: p.channel,
              smallIcon: 'ic_stat_icon_default',
              largeIcon: 'res://ic_launcher',
              extra: {
                prayerKey: p.id,
                prayerName: p.name
              }
            });
          }
        }
      }
    }

    // 6. Schedule them using Capacitor native API if available
    if (notificationsToSchedule.length > 0 && LocalNotifications && typeof LocalNotifications.schedule === 'function') {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      console.log(`Successfully scheduled ${notificationsToSchedule.length} future Azan alarms.`);
    }
  } catch (e) {
    console.error('Failed to schedule weekly Azans:', e);
  }
};
