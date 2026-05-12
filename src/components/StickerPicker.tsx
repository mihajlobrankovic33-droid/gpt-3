import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  disabled?: boolean;
}

const STICKERS = [
  // Study & Success
  "📚", "✨", "🎉", "🏆", "⭐", "💯", "🎓", "📝",
  // Encouragement
  "💪", "👍", "🙌", "🤗", "😊", "🥳", "🤩", "😎",
  // Study themed
  "📖", "✏️", "🖊️", "📓", "🎒", "💡", "🧠", "🔬",
  // Reactions
  "👏", "❤️", "🔥", "💫", "✅", "❓", "🤔", "😅",
];

export const StickerPicker = ({ onSelect, disabled }: StickerPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (sticker: string) => {
    onSelect(sticker);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-xl border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
          title="Send Sticker"
        >
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-2" 
        align="start"
        side="top"
        sideOffset={8}
      >
        <div className="grid grid-cols-8 gap-1">
          {STICKERS.map((sticker, index) => (
            <button
              key={index}
              onClick={() => handleSelect(sticker)}
              className="p-2 text-xl hover:bg-muted rounded-lg transition-colors active:scale-95"
            >
              {sticker}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
