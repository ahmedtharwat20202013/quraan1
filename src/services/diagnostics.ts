import { registerPlugin, Capacitor } from '@capacitor/core';

export interface DiagnosticsResult {
  isIgnoringBatteryOptimizations: boolean;
  canScheduleExactAlarms: boolean;
  alarmVolume: number;
  maxAlarmVolume: number;
  hasNotificationPermission: boolean;
  isNative: boolean;
}

interface AdhanDiagnosticsPlugin {
  getDiagnostics(): Promise<{
    isIgnoringBatteryOptimizations: boolean;
    canScheduleExactAlarms: boolean;
    alarmVolume: number;
    maxAlarmVolume: number;
  }>;
  openAppSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  openAutoStartSettings(): Promise<void>;
}

const AdhanDiagnostics = registerPlugin<AdhanDiagnosticsPlugin>('AdhanDiagnostics');

export class DiagnosticsService {
  static async check(): Promise<DiagnosticsResult> {
    const isNative = Capacitor.isNativePlatform();
    
    // Default web fallbacks
    let isIgnoringBattery = true;
    let canScheduleExact = true;
    let alarmVolume = 7;
    let maxAlarmVolume = 7;
    
    if (isNative) {
      try {
        const result = await AdhanDiagnostics.getDiagnostics();
        isIgnoringBattery = result.isIgnoringBatteryOptimizations;
        canScheduleExact = result.canScheduleExactAlarms;
        alarmVolume = result.alarmVolume;
        maxAlarmVolume = result.maxAlarmVolume;
      } catch (err) {
        console.warn('Native diagnostics failed, using fallbacks', err);
      }
    }
    
    // Check notification permission (web & native compatible)
    let hasNotification = false;
    if (isNative) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        hasNotification = perm.display === 'granted';
      } catch (e) {
        hasNotification = 'Notification' in window ? Notification.permission === 'granted' : false;
      }
    } else {
      hasNotification = 'Notification' in window ? Notification.permission === 'granted' : false;
    }
    
    return {
      isIgnoringBatteryOptimizations: isIgnoringBattery,
      canScheduleExactAlarms: canScheduleExact,
      alarmVolume,
      maxAlarmVolume,
      hasNotificationPermission: hasNotification,
      isNative
    };
  }

  static async openAppSettings() {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdhanDiagnostics.openAppSettings();
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert('مفتوح على متصفح الويب: يمكنك إدارة أذونات الموقع والإشعارات من إعدادات متصفحك.');
    }
  }

  static async openNotificationSettings() {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdhanDiagnostics.openNotificationSettings();
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert('مفتوح على متصفح الويب: يرجى الضغط على رمز القفل في شريط عنوان المتصفح لتعديل أذونات الإشعارات.');
    }
  }

  static async openBatterySettings() {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdhanDiagnostics.openBatterySettings();
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert('مفتوح على متصفح الويب: إعدادات تحسين البطارية خاصة بالهواتف المحمولة فقط.');
    }
  }

  static async requestIgnoreBatteryOptimizations() {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdhanDiagnostics.requestIgnoreBatteryOptimizations();
      } catch (e) {
        console.warn(e);
      }
    }
  }

  static async openAutoStartSettings() {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdhanDiagnostics.openAutoStartSettings();
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert('مفتوح على متصفح الويب: إعداد التشغيل التلقائي بالخلفية خاص بهواتف أندرويد فقط.');
    }
  }
}
