import { motion } from "motion/react";
import { PulseDotLoader } from "./prompt-kit/loader";

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      className="group/message mx-auto w-full max-w-3xl px-4"
      data-role={role}
      data-testid="message-assistant-loading"
      initial={{ y: 5, opacity: 0 }}
    >
      <PulseDotLoader className="m-1.5 size-3 animate-[pulse-dot_2s_ease-in-out_infinite] bg-muted-foreground" />
    </motion.div>
  );
};
