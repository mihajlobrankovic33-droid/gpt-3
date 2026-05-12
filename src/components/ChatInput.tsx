import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Camera, Image, X, FileText } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ChatInputProps {
  onSend: (message: string, fileUrl?: string, fileType?: "image" | "pdf") => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((input.trim() || fileData) && !disabled) {
      onSend(input.trim() || (fileType === "pdf" ? `Sharing: ${fileName}` : "What's in this image?"), fileData || undefined, fileType || undefined);
      setInput("");
      clearFile();
    }
  };


  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setFileName(file.name);
    setFileType("image");

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFileData(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = "";
  };

  const handlePdfSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      return;
    }

    setFileName(file.name);
    setFileType("pdf");
    setFilePreview(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFileData(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = "";
  };

  const clearFile = () => {
    setFilePreview(null);
    setFileData(null);
    setFileType(null);
    setFileName(null);
  };

  return (
    <div className="space-y-3">
      {/* File Preview */}
      {(filePreview || (fileType === "pdf" && fileName)) && (
        <div className="relative inline-block">
          {fileType === "image" && filePreview ? (
            <img
              src={filePreview}
              alt="Selected"
              className="h-16 sm:h-20 w-auto rounded-lg border-2 border-primary/20 shadow-soft"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border-2 border-primary/20">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium truncate max-w-[150px]">{fileName}</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={clearFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-1.5 sm:gap-2 items-end">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdfSelect}
          className="hidden"
        />

        {/* Camera Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-xl border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
          title="Take Photo"
        >
          <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </Button>

        {/* Gallery Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
          className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-xl border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
          title="Choose from Gallery"
        >
          <Image className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </Button>

        {/* PDF Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => pdfInputRef.current?.click()}
          disabled={disabled}
          className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-xl border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
          title="Share PDF"
        >
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </Button>


        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={fileData ? (fileType === "pdf" ? t.addMessage : t.askAboutImage) : t.askAnything}
            className="min-h-[44px] sm:min-h-[52px] max-h-[100px] sm:max-h-[120px] resize-none pr-3 sm:pr-4 rounded-xl border-2 border-border bg-card focus:border-primary transition-colors text-sm sm:text-base"
            disabled={disabled}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={(!input.trim() && !fileData) || disabled}
          size="icon"
          className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-xl gradient-hero hover:opacity-90 transition-opacity shadow-medium flex-shrink-0"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};
