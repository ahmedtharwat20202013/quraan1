/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Home, 
  Compass, 
  Sparkles, 
  Droplet, 
  Heart, 
  Utensils, 
  Milestone, 
  CloudRain, 
  Frown, 
  Activity, 
  Coins, 
  ShieldCheck, 
  Share2, 
  Copy, 
  Check, 
  ChevronLeft, 
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

// Definition of an Adhkar item
interface DhikrItem {
  id: string;
  text: string;
  count: number; // total needed counts, e.g. 1, 3, 7
  note?: string; // extra notation
}

// Definition of an Adhkar category
interface AdhkarCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: any; // Lucide component
  iconBg: string; // Tailwind class
  textColor: string;
  borderColor: string;
  items: DhikrItem[];
}

const ADHKAR_DATA: AdhkarCategory[] = [
  {
    id: 'morning',
    title: 'أذكار الصباح',
    subtitle: 'طرد الشياطين وجلب الرزق والبركة في يومك',
    icon: Sun,
    iconBg: 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black',
    textColor: 'text-amber-400',
    borderColor: 'hover:border-amber-500/20',
    items: [
      {
        id: 'morning-1',
        text: 'أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
        count: 1
      },
      {
        id: 'morning-2',
        text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ.',
        count: 1
      },
      {
        id: 'morning-3',
        text: 'آية الكرسي: اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ.',
        count: 1,
        note: 'آية الكرسي'
      },
      {
        id: 'morning-4',
        text: 'سورة الإخلاص والمعوذتين (3 مرات).',
        count: 3,
        note: 'الإخلاص والمعوذتين'
      },
      {
        id: 'morning-5',
        text: 'اللَّهُمَّ أَنْتَ رَبِّي لا إِلَهَ إِلا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لا يَغْفِرُ الذُّنُوبَ إِلا أَنْتَ.',
        count: 1,
        note: 'سيد الاستغفار'
      },
      {
        id: 'morning-6',
        text: 'بِسْمِ اللَّهِ الَّذِي لا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.',
        count: 3,
        note: '3 مرات'
      }
    ]
  },
  {
    id: 'evening',
    title: 'أذكار المساء',
    subtitle: 'حفظ وسلامة وسكينة حتى تصبح',
    icon: Moon,
    iconBg: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
    textColor: 'text-indigo-400',
    borderColor: 'hover:border-indigo-500/20',
    items: [
      {
        id: 'evening-1',
        text: 'أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
        count: 1
      },
      {
        id: 'evening-2',
        text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ المَصِيرُ.',
        count: 1
      },
      {
        id: 'evening-3',
        text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.',
        count: 3,
        note: '3 مرات'
      },
      {
        id: 'evening-4',
        text: 'آية الكرسي، وسورة الإخلاص والمعوذتين (3 مرات).',
        count: 3,
        note: 'آية الكرسي والمعوذات'
      }
    ]
  },
  {
    id: 'sleep',
    title: 'أذكار النوم',
    subtitle: 'هدوء نفسي وحراسة ربانية وبراءة من الشرك',
    icon: Moon,
    iconBg: 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white',
    textColor: 'text-purple-400',
    borderColor: 'hover:border-purple-500/20',
    items: [
      {
        id: 'sleep-1',
        text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.',
        count: 1
      },
      {
        id: 'sleep-2',
        text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ.',
        count: 3,
        note: '3 مرات'
      },
      {
        id: 'sleep-3',
        text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.',
        count: 1
      },
      {
        id: 'sleep-4',
        text: 'قراءة آية الكرسي، وآخر آيتين من سورة البقرة.',
        count: 1,
        note: 'آية الكرسي وخواتيم البقرة'
      }
    ]
  },
  {
    id: 'wake',
    title: 'أذكار الاستيقاظ',
    subtitle: 'حمد الله على إحياء الجسد والروح بعد النوم',
    icon: Sunrise,
    iconBg: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    textColor: 'text-emerald-400',
    borderColor: 'hover:border-emerald-500/20',
    items: [
      {
        id: 'wake-1',
        text: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ.',
        count: 1
      },
      {
        id: 'wake-2',
        text: 'لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلا إِلَهَ إِلا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ.',
        count: 1
      }
    ]
  },
  {
    id: 'mosque',
    title: 'أذكار دخول المسجد والخروج منه',
    subtitle: 'أدعية دخول المسجد والخروج منه والتعلق بالمحاريب',
    icon: Compass,
    iconBg: 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white',
    textColor: 'text-cyan-400',
    borderColor: 'hover:border-cyan-500/20',
    items: [
      {
        id: 'mosque-1',
        text: 'عند الدخول: بِسْمِ اللهِ، وَالصَّلَاةُ وَالسَّلَّامُ عَلَى رَسُولِ اللهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ.',
        count: 1,
        note: 'عند الدخول'
      },
      {
        id: 'mosque-2',
        text: 'عند الخروج: بِسْمِ اللهِ، وَالصَّلَاةُ وَالسَّلَّامُ عَلَى رَسُولِ اللهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ.',
        count: 1,
        note: 'عند الخروج'
      }
    ]
  },
  {
    id: 'home_io',
    title: 'أذكار دخول المنزل والخروج منه',
    subtitle: 'البركة والأمان والتوفيق عند دخول المنزل والخروج منه',
    icon: Home,
    iconBg: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
    textColor: 'text-blue-400',
    borderColor: 'hover:border-blue-500/20',
    items: [
      {
        id: 'home_io-1',
        text: 'عند الدخول: بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى رَبِّنَا تَوَكَّلْنَا.',
        count: 1,
        note: 'عند الدخول'
      },
      {
        id: 'home_io-2',
        text: 'عند الخروج: بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ.',
        count: 1,
        note: 'عند الخروج'
      }
    ]
  },
  {
    id: 'toilet',
    title: 'أذكار دخول الخلاء والخروج منه',
    subtitle: 'الاستعاذة وطلب المغفرة عند دخول الخلاء والخروج',
    icon: Sparkles,
    iconBg: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
    textColor: 'text-rose-400',
    borderColor: 'hover:border-rose-500/20',
    items: [
      {
        id: 'toilet-1',
        text: 'عند الدخول: بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ.',
        count: 1,
        note: 'عند الدخول'
      },
      {
        id: 'toilet-2',
        text: 'عند الخروج: غُفْرَانَكَ.',
        count: 1,
        note: 'عند الخروج'
      }
    ]
  },
  {
    id: 'wudu',
    title: 'أذكار الوضوء',
    subtitle: 'التسمية والشهادة ونيل التطهر والقبول',
    icon: Droplet,
    iconBg: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
    textColor: 'text-sky-400',
    borderColor: 'hover:border-sky-500/20',
    items: [
      {
        id: 'wudu-1',
        text: 'قبل الوضوء: بِسْمِ اللَّهِ.',
        count: 1,
        note: 'قبل الوضوء'
      },
      {
        id: 'wudu-2',
        text: 'بعد الوضوء: أَشْهَدُ أَنْ لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ.',
        count: 1,
        note: 'بعد الوضوء'
      }
    ]
  },
  {
    id: 'after_prayer',
    title: 'أذكار بعد الصلاة',
    subtitle: 'الاستغفار التام والتسبيحات بعد المكتوبة',
    icon: Heart,
    iconBg: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
    textColor: 'text-rose-400',
    borderColor: 'hover:border-rose-500/20',
    items: [
      {
        id: 'after_prayer-1',
        text: 'أَسْتَغْفِرُ اللَّهَ (3 مرات)، اللَّهُمَّ أَنْتَ السَّلامُ وَمِنْكَ السَّلامُ، تَبَارَكْتَ يَا ذَا الْجَلالِ وَالإِكْرَامِ.',
        count: 1,
        note: 'الاستغفار والتسليم'
      },
      {
        id: 'after_prayer-2',
        text: 'لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
        count: 1
      },
      {
        id: 'after_prayer-3',
        text: 'التسبيح (33)، والتحميد (33)، والتكبير (33)، وتمام المائة: لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
        count: 1,
        note: 'التسبيحات وتمام المئة'
      }
    ]
  },
  {
    id: 'food',
    title: 'أذكار الطعام والشراب',
    subtitle: 'البركة والحمد والسمو بآداب الطعام والشراب',
    icon: Utensils,
    iconBg: 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white',
    textColor: 'text-orange-400',
    borderColor: 'hover:border-orange-500/20',
    items: [
      {
        id: 'food-1',
        text: 'قبل الطعام: بِسْمِ اللَّهِ، وَإِذَا نَسِيَ فَلْيَقُلْ: بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ.',
        count: 1,
        note: 'قبل الطعام'
      },
      {
        id: 'food-2',
        text: 'بعد الطعام: الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا الطَّعَامَ وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلا قُوَّةٍ.',
        count: 1,
        note: 'بعد الطعام'
      }
    ]
  },
  {
    id: 'travel',
    title: 'أذكار السفر',
    subtitle: 'دعاء الركوب وتسهيل السبل وحفظ الرحلة والأهل',
    icon: Milestone,
    iconBg: 'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black',
    textColor: 'text-yellow-400',
    borderColor: 'hover:border-yellow-500/20',
    items: [
      {
        id: 'travel-1',
        text: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ.',
        count: 1,
        note: 'دعاء الركوب'
      },
      {
        id: 'travel-2',
        text: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الأَهْلِ.',
        count: 1,
        note: 'دعاء السفر'
      }
    ]
  },
  {
    id: 'weather',
    title: 'أذكار المطر والرعد والرياح',
    subtitle: 'الأدعية المأثورة عند المطر والرعد والرياح',
    icon: CloudRain,
    iconBg: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white',
    textColor: 'text-sky-400',
    borderColor: 'hover:border-sky-500/20',
    items: [
      {
        id: 'weather-1',
        text: 'عند المطر: اللَّهُمَّ صَيِّبًا نَافِا.',
        count: 1,
        note: 'عند المطر'
      },
      {
        id: 'weather-2',
        text: 'عند الرعد: سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلائِكَةُ مِنْ خِيفَتِهِ.',
        count: 1,
        note: 'عند الرعد'
      },
      {
        id: 'weather-3',
        text: 'عند الريح: اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيهَا وَشَرِّ مَا أُرْسِلَتْ بِهِ.',
        count: 1,
        note: 'عند الريح'
      }
    ]
  },
  {
    id: 'grief',
    title: 'أذكار الهم والحزن',
    subtitle: 'دعاء وتفريج الكرب وزوال الأحزان والضيق والألم',
    icon: Frown,
    iconBg: 'bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white',
    textColor: 'text-pink-400',
    borderColor: 'hover:border-pink-500/20',
    items: [
      {
        id: 'grief-1',
        text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ، وَغَلَبَةِ الرِّجَالِ.',
        count: 1
      },
      {
        id: 'grief-2',
        text: 'لا إِلَهَ إِلا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لا إِلَهَ إِلا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لا إِلَهَ إِلا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ.',
        count: 1
      }
    ]
  },
  {
    id: 'sickness',
    title: 'أذكار المرض والشفاء',
    subtitle: 'ما يقال للشفاء من الآلام والأسقام والأوجاع والرقية',
    icon: Activity,
    iconBg: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    textColor: 'text-emerald-400',
    borderColor: 'hover:border-emerald-500/20',
    items: [
      {
        id: 'sickness-1',
        text: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لا شِفَاءَ إِلا شِفَاؤُكَ، شِفَاءً لا يُغَادِرُ سَقَمًا.',
        count: 1
      },
      {
        id: 'sickness-2',
        text: 'أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ.',
        count: 7,
        note: 'يقال 7 مرات'
      }
    ]
  },
  {
    id: 'rizq',
    title: 'أذكار الرزق',
    subtitle: 'أدعية لجلب السعة والبركة وسداد الدين والعمل المبارك',
    icon: Coins,
    iconBg: 'bg-lime-500/10 text-lime-400 group-hover:bg-lime-500 group-hover:text-black',
    textColor: 'text-lime-400',
    borderColor: 'hover:border-lime-500/20',
    items: [
      {
        id: 'rizq-1',
        text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلاً مُتَقَبَّلاً.',
        count: 1
      },
      {
        id: 'rizq-2',
        text: 'اللَّهُمَّ اكْفِنِي بِحَلالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ.',
        count: 1
      }
    ]
  },
  {
    id: 'protection',
    title: 'أذكار التحصين',
    subtitle: 'حجاب وحماية من كل سوء وشيطان وحسد وعين لامّة',
    icon: ShieldCheck,
    iconBg: 'bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white',
    textColor: 'text-red-400',
    borderColor: 'hover:border-red-500/20',
    items: [
      {
        id: 'protection-1',
        text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لامَّةٍ.',
        count: 1
      },
      {
        id: 'protection-2',
        text: 'بِسْمِ اللَّهِ أَرْقِي نَفْسِي، مِنْ كُلِّ شَيْءٍ يُؤْذِينِي، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِينِي.',
        count: 1
      }
    ]
  }
];

export default function DuasSection() {
  const [selectedCategory, setSelectedCategory] = useState<AdhkarCategory | null>(null);
  
  // Scroll to top on list/view transition
  useEffect(() => {
    const doScroll = () => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, behavior: 'instant' });
    };

    doScroll();
    const timer = setTimeout(doScroll, 80);
    return () => clearTimeout(timer);
  }, [selectedCategory]);
  
  // Text size scaling state for outstanding readability
  const [textScale, setTextScale] = useState<'lg' | 'xl' | '2xl' | '3xl' | '4xl'>(() => {
    return (localStorage.getItem('quran_adhkar_text_scale') as any) || '3xl'; // default to extra large (3xl)
  });

  const scaleClasses = {
    lg: 'text-base sm:text-lg leading-relaxed',
    xl: 'text-lg sm:text-xl leading-relaxed',
    '2xl': 'text-xl sm:text-2xl leading-loose',
    '3xl': 'text-2xl sm:text-3xl leading-loose',
    '4xl': 'text-3xl sm:text-4xl leading-loose',
  };

  const decreaseFontSize = () => {
    const scales: ('lg' | 'xl' | '2xl' | '3xl' | '4xl')[] = ['lg', 'xl', '2xl', '3xl', '4xl'];
    const idx = scales.indexOf(textScale);
    if (idx > 0) {
      const next = scales[idx - 1];
      setTextScale(next);
      localStorage.setItem('quran_adhkar_text_scale', next);
    }
  };

  const increaseFontSize = () => {
    const scales: ('lg' | 'xl' | '2xl' | '3xl' | '4xl')[] = ['lg', 'xl', '2xl', '3xl', '4xl'];
    const idx = scales.indexOf(textScale);
    if (idx < scales.length - 1) {
      const next = scales[idx + 1];
      setTextScale(next);
      localStorage.setItem('quran_adhkar_text_scale', next);
    }
  };
  
  // Interactive counts mapping: { 'dhikr-id': currentCount }
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('quran_adhkar_interactive_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMessage('تم نسخ الذكر إلى الحافظة بنجاح!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleShare = async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title}\n\n${text}\n\nتمت المشاركة من تطبيق نور الهداية`,
        });
      } catch {
        handleCopy(title, text);
      }
    } else {
      handleCopy(title, text);
    }
  };

  const incrementCount = (item: DhikrItem) => {
    const current = counts[item.id] || 0;
    if (current >= item.count) {
      // already completed, allow reset / or just stop
      const updated = { ...counts, [item.id]: 0 };
      setCounts(updated);
      localStorage.setItem('quran_adhkar_interactive_counts', JSON.stringify(updated));
      return;
    }
    const updated = { ...counts, [item.id]: current + 1 };
    setCounts(updated);
    localStorage.setItem('quran_adhkar_interactive_counts', JSON.stringify(updated));

    // Simple haptic feedback simulation if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const resetCategoryCounts = () => {
    if (!selectedCategory) return;
    const updated = { ...counts };
    selectedCategory.items.forEach(item => {
      updated[item.id] = 0;
    });
    setCounts(updated);
    localStorage.setItem('quran_adhkar_interactive_counts', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 pb-24">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          /* Grid View of Categories */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 text-right"
          >
            {/* Header Title strictly as requested */}
            <div className="text-right">
              <h2 className="text-2xl font-black text-white">الأذكار والتحصين</h2>
              <p className="text-xs text-gold-accent font-black mt-1">حصن المسلم اليومي الشامل والأدعية المباركة</p>
            </div>

            {/* Grid of 16 categories - 2 Columns */}
            <div className="grid grid-cols-2 gap-3.5">
              {ADHKAR_DATA.map((cat, idx) => {
                const CatIcon = cat.icon;
                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "flex flex-col items-center justify-center text-center p-5 rounded-3xl cursor-pointer bg-white/[0.03] border border-white/5 transition-all text-right group",
                      cat.borderColor
                    )}
                  >
                    {/* Circle Icon Container - representing clean design from screenshot */}
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-inner mb-3",
                      cat.iconBg
                    )}>
                      <CatIcon size={24} />
                    </div>
                    
                    <h3 className="font-extrabold text-sm text-white group-hover:text-gold-accent transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-[9px] text-white/30 line-clamp-1 mt-1 px-1">
                      {cat.subtitle}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Detailed Category View of Adhkar with clicker */
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Navigation and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md">
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} className="rotate-180" />
                رجوع للأقسام
              </button>

              <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-[10px] text-white/40 font-bold px-2">حجم خط الأذكار:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={decreaseFontSize}
                    disabled={textScale === 'lg'}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs select-none transition-all",
                      textScale === 'lg' 
                        ? "text-white/20 cursor-not-allowed" 
                        : "bg-white/5 text-white/80 hover:bg-white/10"
                    )}
                    title="تصغير الخط"
                  >
                    أ-
                  </button>
                  <span className="text-xs font-black font-mono text-gold-accent w-8 text-center uppercase">
                    {textScale}
                  </span>
                  <button
                    onClick={increaseFontSize}
                    disabled={textScale === '4xl'}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs select-none transition-all",
                      textScale === '4xl' 
                        ? "text-white/20 cursor-not-allowed" 
                        : "bg-white/5 text-white/80 hover:bg-white/10"
                    )}
                    title="تكبير الخط"
                  >
                    أ+
                  </button>
                </div>
              </div>

              <button
                onClick={resetCategoryCounts}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/10 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                title="تصفير جميع العدادات في هذا القسم"
              >
                <RotateCcw size={12} />
                تصفير القسم
              </button>
            </div>

            {/* Category Banner Title */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-48 bg-gold-accent/5 blur-3xl rounded-full pointer-events-none" />
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gold-accent/10 items-center justify-center text-gold-accent mb-1 border border-gold-accent/10">
                {(() => {
                  const CatIco = selectedCategory.icon;
                  return <CatIco size={24} />;
                })()}
              </div>
              <h2 className="text-xl font-black text-white">{selectedCategory.title}</h2>
              <p className="text-[11px] text-white/50 max-w-xs mx-auto leading-relaxed">
                {selectedCategory.subtitle}
              </p>
            </div>

            {/* List of Dhikr items */}
            <div className="space-y-4 text-right">
              {selectedCategory.items.map((item, idx) => {
                const currentCount = counts[item.id] || 0;
                const isCompleted = currentCount >= item.count;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "p-6 rounded-[2rem] border transition-all relative overflow-hidden flex flex-col gap-5",
                      isCompleted 
                        ? "bg-emerald-950/10 border-emerald-500/20" 
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    {/* Top action header for item */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-white/40 font-bold block">
                        {item.note || `الذكر ${idx + 1}`}
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleShare(selectedCategory.title, item.text)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-white transition-colors"
                          title="مشاركة"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => handleCopy(item.id, item.text)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-white transition-colors"
                          title="نسخ"
                        >
                          {copiedId === item.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Sup Arabic Calligraphic text with adjustable class for super legibility */}
                    <p className={cn(
                      "font-bold text-[#f5f5f7] text-center font-sans tracking-wide leading-relaxed",
                      scaleClasses[textScale]
                    )}>
                      {item.text}
                    </p>

                    {/* Interactive Clicker/Counter Area */}
                    <div className="pt-2 flex justify-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => incrementCount(item)}
                        className={cn(
                          "w-full py-4 rounded-2xl border flex items-center justify-center gap-2 font-black text-xs transition-all tracking-wider font-mono",
                          isCompleted
                            ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/10"
                            : "bg-gold-accent/10 border-gold-accent/20 text-gold-accent hover:bg-gold-accent/20"
                        )}
                      >
                        {isCompleted ? (
                          <>
                            <Check size={14} className="stroke-[3]" />
                            تم التكرار بنجاح ({currentCount} / {item.count})
                          </>
                        ) : (
                          <>
                            عد التكرار: {currentCount} / {item.count}
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-28 left-4 right-4 max-w-sm mx-auto z-[100] bg-emerald-950/95 border border-gold-accent/40 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center justify-center"
          >
            <div className="w-6 h-6 rounded-full bg-gold-accent/10 flex items-center justify-center text-gold-accent shrink-0">
              <Check size={14} />
            </div>
            <p className="text-xs font-bold text-white tracking-wide">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
