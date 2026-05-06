import { motion } from "motion/react";

interface EmptyCardsProps {
  onCreateCard: () => void;
}

export default function EmptyCards({ onCreateCard }: EmptyCardsProps) {
  const money = ["💵", "💸", "💶"];

  return (
    <div className="w-full h-[340px] flex flex-col items-center justify-center text-slate-300">

      {/* TARJETA */}
      <motion.div
        animate={{
          y: [0, -6, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-[230px] h-[140px] rounded-[18px] bg-gradient-to-br from-violet-500 to-teal-500 shadow-2xl overflow-hidden"
      >

        {/* DINERO */}
        {money.map((item, i) => (
          <motion.span
            key={i}
            initial={{ y: -50, opacity: 0, scale: 0.8 }}
            animate={{
              y: [ -50, 40, 30, 38, 80 ],
              opacity: [0, 1, 1, 1, 0],
              scale: [0.8, 1, 0.95, 1, 0.9],
            }}
            transition={{
              duration: 2.2 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
            style={{
              position: "absolute",
              left: `${30 + i * 20}%`,
              fontSize: "20px",
            }}
          >
            {item}
          </motion.span>
        ))}

      </motion.div>

      {/* TEXTO */}
      <h3 className="mt-6 text-white text-lg font-semibold">
        No tienes tarjetas aún
      </h3>

      <p className="text-sm text-center max-w-[260px] mt-2">
        Agrega tu primera tarjeta y empieza a controlar tu dinero de forma inteligente
      </p>

      {/* BOTÓN */}
      <motion.button
        onClick={onCreateCard}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-4 px-5 py-2 rounded-lg bg-violet-500 text-white font-medium"
      >
        + Crear tarjeta
      </motion.button>

    </div>
  );
}
