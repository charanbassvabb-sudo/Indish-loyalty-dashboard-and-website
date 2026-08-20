import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface Stat {
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
}

export function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-y border-border/60 bg-background/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-6 py-14 md:grid-cols-4 md:px-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="font-display text-4xl text-gradient-ember md:text-5xl">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals} duration={1.6} />
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground md:text-sm">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
