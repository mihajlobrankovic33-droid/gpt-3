import { useState, useEffect } from "react";
import { X, Plus, Trash2, Copy, Check, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ProCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by_device_id: string | null;
  duration_days: number;
  created_at: string;
  used_at: string | null;
  expires_at: string | null;
}

interface ProCodesAdminProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProCodesAdmin({ isOpen, onClose }: ProCodesAdminProps) {
  const [codes, setCodes] = useState<ProCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pro-codes-admin', {
        body: { action: "list" }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      setCodes(data?.codes || []);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće učitati kodove",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCodes();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pro-codes-admin', {
        body: {
          action: "create",
          code: newCodeInput.trim() || undefined,
          durationDays,
        }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      toast({ title: "Uspešno!", description: `Kod ${data.code.code} je kreiran.` });
      setNewCodeInput("");
      fetchCodes();
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće kreirati kod",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('pro-codes-admin', {
        body: { action: "delete", code }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      toast({ title: "Obrisano", description: `Kod ${code} je obrisan.` });
      fetchCodes();
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće obrisati kod",
        variant: "destructive",
      });
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-foreground">Pro Kodovi - Admin</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Create New Code */}
      <div className="p-4 border-b border-border bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">Kreiraj novi kod</h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Kod (ostavite prazno za auto)"
              value={newCodeInput}
              onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Dana"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
              className="w-20"
            />
          </div>
          <Button onClick={handleCreate} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Napravi Pro Kod
          </Button>
        </div>
      </div>

      {/* Codes List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nema Pro kodova. Kreiraj prvi!
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => (
              <div
                key={code.id}
                className={`p-4 rounded-xl border ${
                  code.is_used
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-green-500/10 border-green-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{code.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(code.code)}
                    >
                      {copiedCode === code.code ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(code.code)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={code.is_used ? "text-red-400" : "text-green-400"}>
                      {code.is_used ? "Iskorišćen" : "Dostupan"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trajanje:</span>
                    <span>{code.duration_days} dana</span>
                  </div>
                  {code.is_used && code.used_by_device_id && (
                    <div className="flex justify-between">
                      <span>Uređaj:</span>
                      <span className="truncate max-w-[150px]">{code.used_by_device_id.slice(0, 12)}...</span>
                    </div>
                  )}
                  {code.expires_at && (
                    <div className="flex justify-between">
                      <span>Ističe:</span>
                      <span>{new Date(code.expires_at).toLocaleDateString("sr-RS")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Kreiran:</span>
                    <span>{new Date(code.created_at).toLocaleDateString("sr-RS")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Stats Footer */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex justify-around text-center text-sm">
          <div>
            <div className="font-bold text-foreground">{codes.length}</div>
            <div className="text-muted-foreground text-xs">Ukupno</div>
          </div>
          <div>
            <div className="font-bold text-green-400">{codes.filter((c) => !c.is_used).length}</div>
            <div className="text-muted-foreground text-xs">Dostupno</div>
          </div>
          <div>
            <div className="font-bold text-red-400">{codes.filter((c) => c.is_used).length}</div>
            <div className="text-muted-foreground text-xs">Zauzeto</div>
          </div>
        </div>
      </div>
    </div>
  );
}
