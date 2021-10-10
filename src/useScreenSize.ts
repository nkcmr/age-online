import { useEffect, useState } from "react";

export type ScreenSize = "sm" | "md" | "lg" | "xl" | "2xl" | "mega";

function getScreenSize(): ScreenSize {
  if (matchMedia("(max-width: 640px)").matches) {
    return "sm";
  } else if (matchMedia("(max-width: 768px)").matches) {
    return "md";
  } else if (matchMedia("(max-width: 1024px)").matches) {
    return "lg";
  } else if (matchMedia("(max-width: 1280px)").matches) {
    return "xl";
  } else if (matchMedia("(max-width: 1536px)").matches) {
    return "2xl";
  }
  return "mega";
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState(getScreenSize());

  useEffect(() => {
    const handleResize = () => {
      if (getScreenSize() !== screenSize) {
        setScreenSize(getScreenSize());
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  return screenSize;
}

export function screenSizeToNumber(s: ScreenSize): number {
  switch (s) {
    case "sm":
      return 0;
    case "md":
      return 1;
    case "lg":
      return 2;
    case "xl":
      return 3;
    case "2xl":
      return 4;
    case "mega":
      return 5;
  }
}
