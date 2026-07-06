export interface OfflineCity {
  name: string;
  lat: number;
  lon: number;
}

export const OFFLINE_CITIES: OfflineCity[] = [
  // Egypt - Gharbia (High Density Detail)
  { name: 'بهبيت الحجارة، سمنود، الغربية، مصر', lat: 30.9405, lon: 31.2291 },
  { name: 'سمنود، الغربية، مصر', lat: 30.9622, lon: 31.2409 },
  { name: 'المحلة الكبرى، الغربية، مصر', lat: 30.9706, lon: 31.1685 },
  { name: 'طنطا، الغربية، مصر', lat: 30.7885, lon: 31.0019 },
  { name: 'بسيون، الغربية، مصر', lat: 30.9388, lon: 30.8122 },
  { name: 'زفتى، الغربية، مصر', lat: 30.7107, lon: 31.2384 },
  { name: 'السنطة، الغربية، مصر', lat: 30.7483, lon: 31.1417 },
  { name: 'كفر الزيات، الغربية، مصر', lat: 30.8242, lon: 30.8169 },
  { name: 'قطور، الغربية، مصر', lat: 30.8989, lon: 31.0039 },

  // Egypt - Dakahlia (High Density Detail)
  { name: 'المنصورة، الدقهلية، مصر', lat: 31.0409, lon: 31.3785 },
  { name: 'طلخا، الدقهلية، مصر', lat: 31.0538, lon: 31.3789 },
  { name: 'ميت غمر، الدقهلية، مصر', lat: 30.7188, lon: 31.2585 },
  { name: 'السنبلاوين، الدقهلية، مصر', lat: 30.8872, lon: 31.4647 },
  { name: 'شربين، الدقهلية، مصر', lat: 31.1925, lon: 31.5272 },
  { name: 'دكرنس، الدقهلية، مصر', lat: 31.0858, lon: 31.5947 },

  // Egypt - Other Governorates
  { name: 'القاهرة، مصر', lat: 30.0444, lon: 31.2357 },
  { name: 'الجيزة، مصر', lat: 30.0131, lon: 31.2089 },
  { name: 'حلوان، القاهرة، مصر', lat: 29.8408, lon: 31.2982 },
  { name: '6 أكتوبر، الجيزة، مصر', lat: 29.9722, lon: 30.9419 },
  { name: 'الإسكندرية، مصر', lat: 31.2001, lon: 29.9187 },
  { name: 'بورسعيد، مصر', lat: 31.2653, lon: 32.3019 },
  { name: 'السويس، مصر', lat: 29.9668, lon: 32.5498 },
  { name: 'الإسماعيلية، مصر', lat: 30.6043, lon: 32.2723 },
  { name: 'دمياط، مصر', lat: 31.4175, lon: 31.8144 },
  { name: 'رأس البر، دمياط، مصر', lat: 31.4519, lon: 31.8156 },
  { name: 'الزقازيق، الشرقية، مصر', lat: 30.5877, lon: 31.5021 },
  { name: 'بنها، القليوبية، مصر', lat: 30.4591, lon: 31.1856 },
  { name: 'شبرا الخيمة، القليوبية، مصر', lat: 30.1286, lon: 31.2422 },
  { name: 'شبين الكوم، المنوفية، مصر', lat: 30.5510, lon: 31.0119 },
  { name: 'دمنهور، البحيرة، مصر', lat: 31.0379, lon: 30.4674 },
  { name: 'كفر الشيخ، مصر', lat: 31.1107, lon: 30.9388 },
  { name: 'الفيوم، مصر', lat: 29.3084, lon: 30.8428 },
  { name: 'بني سويف، مصر', lat: 29.0744, lon: 31.0978 },
  { name: 'المنيا، مصر', lat: 28.0871, lon: 30.7618 },
  { name: 'أسيوط، مصر', lat: 27.1783, lon: 31.1859 },
  { name: 'سوهاج، مصر', lat: 26.5570, lon: 31.6948 },
  { name: 'قنا، مصر', lat: 26.1551, lon: 32.7160 },
  { name: 'الأقصر، مصر', lat: 25.6872, lon: 32.6396 },
  { name: 'أسوان، مصر', lat: 24.0889, lon: 32.8998 },
  { name: 'الغردقة، البحر الأحمر، مصر', lat: 27.2579, lon: 33.8116 },
  { name: 'شرم الشيخ، جنوب سيناء، مصر', lat: 27.9158, lon: 34.3299 },
  { name: 'مرسى مطروح، مصر', lat: 31.3543, lon: 27.2373 },
  { name: 'العريش، شمال سيناء، مصر', lat: 31.1319, lon: 33.8032 },
  { name: 'الطور، جنوب سيناء، مصر', lat: 28.2431, lon: 33.6231 },

  // Arab World Capitals & Major Cities
  { name: 'مكة المكرمة، السعودية', lat: 21.4225, lon: 39.8262 },
  { name: 'المدينة المنورة، السعودية', lat: 24.4672, lon: 39.6111 },
  { name: 'الرياض، السعودية', lat: 24.7136, lon: 46.6753 },
  { name: 'جدة، السعودية', lat: 21.5433, lon: 39.1728 },
  { name: 'دبي، الإمارات', lat: 25.2048, lon: 55.2708 },
  { name: 'أبوظبي، الإمارات', lat: 24.4539, lon: 54.3773 },
  { name: 'الكويت، الكويت', lat: 29.3759, lon: 47.9774 },
  { name: 'الدوحة، قطر', lat: 25.2854, lon: 51.5310 },
  { name: 'المنامة، البحرين', lat: 26.2285, lon: 50.5860 },
  { name: 'مسقط، عمان', lat: 23.5859, lon: 58.4059 },
  { name: 'القدس، فلسطين', lat: 31.7683, lon: 35.2137 },
  { name: 'غزة، فلسطين', lat: 31.5000, lon: 34.4667 },
  { name: 'عمان، الأردن', lat: 31.9522, lon: 35.9106 },
  { name: 'بيروت، لبنان', lat: 33.8938, lon: 35.5018 },
  { name: 'دمشق، سوريا', lat: 33.5138, lon: 36.2765 },
  { name: 'حلب، سوريا', lat: 36.2021, lon: 37.1343 },
  { name: 'بغداد، العراق', lat: 33.3152, lon: 44.3661 },
  { name: 'صنعاء، اليمن', lat: 15.3694, lon: 44.1910 },
  { name: 'الخرطوم، السودان', lat: 15.5007, lon: 32.5599 },
  { name: 'طرابلس، ليبيا', lat: 32.8872, lon: 13.1913 },
  { name: 'تونس، تونس', lat: 36.8065, lon: 10.1815 },
  { name: 'الجزائر، الجزائر', lat: 36.7525, lon: 3.0420 },
  { name: 'الرباط، المغرب', lat: 34.0209, lon: -6.8416 },
  { name: 'الدار البيضاء، المغرب', lat: 33.5731, lon: -7.5898 },

  // Global & Major Islamic Centers
  { name: 'جاكرتا، إندونيسيا', lat: -6.2088, lon: 106.8456 },
  { name: 'كوالالمبور، ماليزيا', lat: 3.1390, lon: 101.6869 },
  { name: 'كراتشي، باكستان', lat: 24.8607, lon: 67.0011 },
  { name: 'دكا، بنغلاديش', lat: 23.8103, lon: 90.4125 },
  { name: 'إسطنبول، تركيا', lat: 41.0082, lon: 28.9784 },
  { name: 'لندن، المملكة المتحدة', lat: 51.5074, lon: -0.1278 },
  { name: 'باريس، فرنسا', lat: 48.8566, lon: 2.3522 },
  { name: 'نيويورك، الولايات المتحدة', lat: 40.7128, lon: -74.0060 },
  { name: 'تورونتو، كندا', lat: 43.6532, lon: -79.3832 },
  { name: 'سيدني، أستراليا', lat: -33.8688, lon: 151.2093 },
  { name: 'مومباي، الهند', lat: 19.0760, lon: 72.8777 },
  { name: 'موسكو، روسيا', lat: 55.7558, lon: 37.6173 },
  { name: 'كيب تاون، جنوب أفريقيا', lat: -33.9249, lon: 18.4241 },
  { name: 'لاغوس، نيجيريا', lat: 6.5244, lon: 3.3792 }
];

// Haversine distance formula (in km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getOfflineAddress(lat: number, lon: number): string | null {
  let closestCity: OfflineCity | null = null;
  let minDistance = Infinity;

  for (const city of OFFLINE_CITIES) {
    const dist = getDistance(lat, lon, city.lat, city.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city;
    }
  }

  // If the closest city is within 60 km, return its offline address name!
  if (closestCity && minDistance <= 60) {
    return closestCity.name;
  }

  return null;
}
