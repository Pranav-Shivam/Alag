import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui";

/** Copies `text` to the clipboard, confirms with a toast, and shows a check mark for two seconds. */
export default function CopyButton({ text, label = "Copy", what = "Text" }: { text: string; label?: string; what?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied to the clipboard`);
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.");
    }
  };

  return (
    <Button variant="ghost" size="sm" icon={done ? Check : Copy} onClick={copy}>
      {done ? "Copied" : label}
    </Button>
  );
}
