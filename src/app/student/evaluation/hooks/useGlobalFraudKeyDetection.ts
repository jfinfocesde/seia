import { useEffect } from "react";

export function useGlobalFraudKeyDetection(onFraud: (reason: string) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      const forbidden =
        (e.ctrlKey && e.shiftKey && ["I", "J", "C", "X", "P", "M", "L", "K", "U", "E", "F", "D", "B", "O", "S", "V", "Y", "Z", "N", "T", "Q", "W"].includes(key)) ||
        (e.ctrlKey && ["Tab"].includes(key)) ||
        (e.altKey && [
          "F","E","V","H","T","N","P","S","O","L","M","K","J","I","U","D","B","C","X","Z","Q","W","E","R","T","Y","U","I","O","P","A","S","D","F","G","H","J","K","L","Z","X","C","V","B","N","M"
        ].includes(key)) ||
        key === "F1" ||
        key === "F11" ||
        key === "F12" ||
        (e.ctrlKey && key === "F12") ||
        (e.ctrlKey && e.shiftKey && key === "F12") ||
        (e.ctrlKey && e.altKey && ["I","J","C","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"].includes(key));

      if (forbidden) {
        e.preventDefault();
        e.stopPropagation();
        onFraud("Combinación de teclas sospechosa: " + key);
        return false;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onFraud]);
} 