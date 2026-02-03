import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

interface FeedbackProps {
  x: number;
  y: number;
  type: "correct" | "wrong";
  message?: string;
  onComplete: () => void;
}

export const Feedback: React.FC<FeedbackProps> = ({
  x,
  y,
  type,
  message,
  onComplete,
}) => {
  const isCorrect = type === "correct";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1],
        y: -100, // Float up higher
        x: isCorrect ? 0 : [0, -15, 15, -15, 15, 0], // Stronger shake if wrong
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: "none",
        transform: "translate(-50%, -50%)",
      }}
      className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl font-black text-2xl md:text-3xl backdrop-blur-md border-4 whitespace-nowrap ${
        isCorrect
          ? "bg-green-100/90 text-green-600 border-green-500"
          : "bg-red-100/90 text-red-600 border-red-500"
      }`}
    >
      {isCorrect ? (
        <CheckCircle className="w-8 h-8 md:w-10 md:h-10" />
      ) : (
        <XCircle className="w-8 h-8 md:w-10 md:h-10" />
      )}
      {isCorrect ? message || "+10" : message || "Sai rồi!"}
    </motion.div>
  );
};
