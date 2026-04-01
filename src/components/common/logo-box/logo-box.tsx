import { clx } from "@medusajs/ui"
import { Transition, motion } from "motion/react"

type LogoBoxProps = {
  className?: string
  checked?: boolean
  containerTransition?: Transition
  pathTransition?: Transition
}

export const LogoBox = ({
  className,
  checked,
  containerTransition = {
    duration: 0.8,
    delay: 0.5,
    ease: [0, 0.71, 0.2, 1.01],
  },
  pathTransition = {
    duration: 0.8,
    delay: 0.6,
    ease: [0.1, 0.8, 0.2, 1.01],
  },
}: LogoBoxProps) => {
  return (
    <div
      className={clx(
        "size-14 relative flex items-center justify-center rounded-xl",
        "bg-co-navy shadow-[0_2px_8px_rgba(23,41,74,0.2)]",
        className
      )}
    >
      {checked && (
        <motion.div
          className="size-5 absolute -right-[5px] -top-1 flex items-center justify-center rounded-full border-[0.5px] border-co-navy/20 bg-co-success bg-gradient-to-b from-white/0 to-white/20 shadow-[0px_1px_2px_0px_rgba(3,7,18,0.12)]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={containerTransition}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <motion.path
              d="M5.8335 10.4167L9.16683 13.75L14.1668 6.25"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={pathTransition}
            />
          </svg>
        </motion.div>
      )}
      {/* Gold cross on navy */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="10.5" y="3" width="3" height="18" rx="0.75" fill="#F2CD69"/>
        <rect x="5" y="9.5" width="14" height="3" rx="0.75" fill="#F2CD69"/>
      </svg>
    </div>
  )
}
