"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GooeyTextProps {
  texts: string[];
  morphTime?: number;
  cooldownTime?: number;
  className?: string;
  textClassName?: string;
}

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName
}: GooeyTextProps) {
  const text1Ref = React.useRef<HTMLSpanElement>(null);
  const text2Ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    let textIndex = 0;
    let time = performance.now();
    let morphTimer = 0;
    let cooldownTimer = cooldownTime;
    let isMorphing = false;
    let rafId: number;

    const setMorph = (fraction: number) => {
      if (!text1Ref.current || !text2Ref.current) return;
      
      // fraction goes from 0 to 1
      // When fraction is 0: Text 1 is 100% visible, Text 2 is 0% visible
      // When fraction is 1: Text 1 is 0% visible, Text 2 is 100% visible
      const blur1 = Math.min(8 / (1 - fraction) - 8, 100);
      const blur2 = Math.min(8 / fraction - 8, 100);

      text1Ref.current.style.filter = `blur(${blur1}px)`;
      text1Ref.current.style.opacity = `${Math.pow(1 - fraction, 0.4) * 100}%`;

      text2Ref.current.style.filter = `blur(${blur2}px)`;
      text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
    };

    const animate = (currentTime: number) => {
      const dt = (currentTime - time) / 1000;
      time = currentTime;

      if (isMorphing) {
        morphTimer += dt;
        if (morphTimer >= morphTime) {
          isMorphing = false;
          morphTimer = 0;
          cooldownTimer = cooldownTime;
          
          // Seamless handoff: Sync Text 1 with current visible Text 2 
          // and reset morph to 0. Since content is identical, user sees no jump.
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex % texts.length];
            setMorph(0); 
          }
        } else {
          setMorph(morphTimer / morphTime);
        }
      } else {
        cooldownTimer -= dt;
        if (cooldownTimer <= 0) {
          isMorphing = true;
          cooldownTimer = 0;
          
          // Text 1 captures where we are, Text 2 becomes the target
          const nextIndex = (textIndex + 1) % texts.length;
          const nextText = texts[nextIndex];
          
          if (text2Ref.current) {
            text2Ref.current.textContent = nextText;
          }
          
          textIndex = nextIndex;
          setMorph(0);
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    // Initial words setup
    if (text1Ref.current && text2Ref.current) {
      text1Ref.current.textContent = texts[0];
      text2Ref.current.textContent = texts[1 % texts.length];
      setMorph(0);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [JSON.stringify(texts), morphTime, cooldownTime]);

  return (
    <div className={cn("relative", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="flex items-center justify-center"
        style={{ filter: "url(#threshold)" }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt] whitespace-nowrap",
            "text-foreground",
            textClassName
          )}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute inline-block select-none text-center text-6xl md:text-[60pt] whitespace-nowrap",
            "text-foreground",
            textClassName
          )}
        />
      </div>
    </div>
  );
}
