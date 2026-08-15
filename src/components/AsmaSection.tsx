import { useState } from 'react';
import { motion, Variants } from 'motion/react';
import { Search } from 'lucide-react';
import { ASMA_AL_HUSNA } from '../data/asmaAlHusna';

export default function AsmaSection() {
  const [searchQuery, setSearchQuery] = useState("");

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.015,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 25 } },
  };

  // Filter names based on search query
  const query = searchQuery.trim();
  const filteredNames = ASMA_AL_HUSNA.filter((name) => {
    if (!query) return true;
    return (
      name.name.includes(query) ||
      name.meaning.includes(query) ||
      name.id.toString() === query
    );
  });

  return (
    <div className="space-y-6 pb-24 text-right" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-black text-white">أسماء الله الحسنى</h2>
          <p className="text-xs text-gold-accent font-black mt-1">تأمل أسماء الله ومعانيها العظيمة</p>
        </div>
        <span className="px-3 py-1 text-xs font-black bg-gold-accent/10 border border-gold-accent/20 rounded-xl text-gold-accent shrink-0">
          ٩٩ اسماً
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-accent transition-colors" size={20} aria-hidden="true" />
        <input 
          type="text" 
          placeholder="ابحث عن اسم من أسماء الله أو معنى..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="البحث في أسماء الله الحسنى"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-6 focus:outline-none focus:border-gold-accent/50 focus:bg-white/10 transition-all placeholder:text-white/20 text-right font-bold text-sm"
        />
      </div>

      {/* Grid - Single column to show each name on its own row */}
      {filteredNames.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4"
        >
          {filteredNames.map((name) => (
            <motion.div
              key={name.id}
              variants={itemVariants}
              className="glass-card p-6 flex flex-col items-center justify-between text-center min-h-[160px] relative overflow-hidden group hover:border-gold-accent/20 hover:bg-white/[0.04] w-full"
            >
              {/* Index Badge */}
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-gold-accent/30 text-gold-accent text-[10px] font-black flex items-center justify-center font-mono">
                {name.id}
              </div>

              {/* Decorative Glow */}
              <div className="absolute -inset-10 bg-gold-accent/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              {/* Name in large Tehaf quran-font */}
              <h3 className="quran-font text-4xl font-black text-gold-accent mt-4 drop-shadow-md select-all">
                {name.name}
              </h3>

              {/* Divider */}
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-gold-accent/40 to-transparent my-3" />

              {/* Meaning in Noto Sans Arabic */}
              <p className="arabic-text-sans text-sm text-white/60 font-medium leading-relaxed max-w-[90%]">
                {name.meaning}
              </p>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 space-y-3 glass-card bg-white/[0.01]">
          <p className="text-white/40 text-sm font-bold">لا توجد نتائج تطابق بحثك عن "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
