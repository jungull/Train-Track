import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 bg-zinc-950 text-white min-h-[100dvh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <h1 className="text-5xl font-bold tracking-tighter leading-[1.1] mb-8">
          lets get<br />after it.
        </h1>
        
        <Link
          to="/today"
          className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-950 rounded-full font-semibold tracking-wide overflow-hidden transition-transform active:scale-95"
        >
          <span className="relative z-10">Let's get after it</span>
          <ArrowRight className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1" />
          <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        </Link>
      </motion.div>
    </div>
  );
}
