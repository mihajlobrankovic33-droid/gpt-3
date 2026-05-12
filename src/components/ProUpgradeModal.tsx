import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Crown, Sparkles, Zap, Palette, Headphones, CreditCard, Loader2, CheckCircle2, ArrowLeft, Key } from "lucide-react";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const benefits = [
  { icon: Zap, text: "Neograničene 'puškice' (bez dnevnih limita)" },
  { icon: Palette, text: "Ekskluzivni Dark Mode & Teme" },
  { icon: Headphones, text: "Prioritetna Podrška" },
];

type ModalView = "plan" | "payment" | "processing" | "success" | "redeem";

// Generate a unique device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

export function ProUpgradeModal({ open, onOpenChange }: ProUpgradeModalProps) {
  const { activateProWithPayment, refreshProfile } = useSupabaseAuth();
  const { toast } = useToast();
  const [view, setView] = useState<ModalView>("plan");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleClose = () => {
    setView("plan");
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setCardHolder("");
    setRedeemCode("");
    setRedeemError("");
    onOpenChange(false);
  };

  // Radix Dialog can call onOpenChange(true) during internal state sync.
  // We only want to react to CLOSE requests from the dialog UI.
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) handleClose();
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    return cleaned;
  };

  const handlePayNow = async () => {
    setView("processing");
    
    // Simulate payment processing
    setTimeout(async () => {
      await activateProWithPayment();
      setView("success");
    }, 2000);
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    
    setIsRedeeming(true);
    setRedeemError("");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRedeemError("Morate biti prijavljeni");
        setIsRedeeming(false);
        return;
      }

      const deviceId = getDeviceId();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-pro-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            code: redeemCode.trim(),
            deviceId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setRedeemError(data.error || "Greška pri aktivaciji koda");
        setIsRedeeming(false);
        return;
      }

      // Refresh the profile to get updated Pro status
      await refreshProfile();

      toast({
        title: "🎉 Pro Aktiviran!",
        description: data.message || "Pro pristup je odobren.",
      });
      handleClose();
    } catch (error) {
      setRedeemError("Greška pri povezivanju sa serverom");
    } finally {
      setIsRedeeming(false);
    }
  };

  const isFormValid = cardNumber.replace(/\s/g, "").length === 16 && 
                      expiryDate.length === 5 && 
                      cvv.length >= 3 && 
                      cardHolder.trim().length > 0;

  // Success View
  if (view === "success") {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/25 mb-6">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Plaćanje Uspešno!
            </h2>
            <p className="text-muted-foreground mb-2">
              Pro funkcije su otključane na 30 dana. 🎉
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Nakon isteka ćeš se vratiti na besplatni plan (5 puškica dnevno).
            </p>
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold px-8"
            >
              Nastavi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Processing View
  if (view === "processing") {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Obrađujem plaćanje...
            </h2>
            <p className="text-muted-foreground">
              Molimo sačekajte
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Payment Form View
  if (view === "payment") {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView("plan")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Plaćanje karticom
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Mjesečno: 350 RSD (30 dana)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Card Preview */}
            <div className="relative h-44 rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-6 text-white shadow-xl overflow-hidden">
              <div className="absolute top-4 right-4">
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded-full bg-red-500 opacity-80" />
                  <div className="w-8 h-8 rounded-full bg-orange-400 opacity-80 -ml-4" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="font-mono text-lg tracking-wider mb-4">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="text-xs text-white/60 uppercase">Card Holder</div>
                    <div className="font-medium">{cardHolder || "YOUR NAME"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 uppercase">Expires</div>
                    <div className="font-medium">{expiryDate || "MM/YY"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardHolder">Ime na kartici</Label>
                <Input
                  id="cardHolder"
                  placeholder="MARKO MARKOVIĆ"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Broj kartice</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Datum isteka</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayNow}
            disabled={!isFormValid}
            className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-6 text-lg shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Plati 350 RSD
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            🔒 Sigurno plaćanje sa 256-bit enkripcijom
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  // Redeem Code View
  if (view === "redeem") {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView("plan")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Unesi Pro Kod
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Unesi Pro kod da aktiviraš pristup
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="redeemCode">Pro Kod</Label>
              <Input
                id="redeemCode"
                placeholder="PRO-XXXXXXXX"
                value={redeemCode}
                onChange={(e) => {
                  setRedeemCode(e.target.value.toUpperCase());
                  setRedeemError("");
                }}
                className="uppercase font-mono text-center text-lg tracking-wider"
              />
              {redeemError && (
                <p className="text-sm text-destructive text-center">{redeemError}</p>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Svaki kod važi samo za jedan uređaj
            </p>
          </div>

          <Button
            onClick={handleRedeemCode}
            disabled={!redeemCode.trim() || isRedeeming}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-6 text-lg shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Aktiviram...
              </>
            ) : (
              <>
                <Key className="w-5 h-5 mr-2" />
                Aktiviraj Kod
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Plan View (default)
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-amber-500/30 max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-500/10">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            Upgrade na Pro
            <Sparkles className="w-5 h-5 text-amber-400" />
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Dostigao si dnevni limit! Nadogradi na Pro za neograničen pristup.
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="space-y-3 py-4">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
            >
              <div className="p-2 rounded-full bg-amber-500/10">
                <benefit.icon className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-foreground font-medium">{benefit.text}</span>
              <Check className="w-4 h-4 text-emerald-400 ml-auto" />
            </div>
          ))}
        </div>

        {/* Single Pricing Card */}
        <Card className="border-2 border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-center">
              <span className="text-sm font-medium text-muted-foreground block mb-1">
                Mjesečno
              </span>
              <span className="text-3xl font-bold text-foreground">350</span>
              <span className="text-sm text-muted-foreground ml-1">RSD</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 text-center">
            <span className="text-sm text-muted-foreground">30 dana Pro pristupa</span>
          </CardContent>
        </Card>

        {/* CTAs */}
        <div className="pt-2 space-y-3">
          <Button
            onClick={() => setView("payment")}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-6 text-lg shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Plati 350 RSD
          </Button>
          
          {/* Redeem Key Link */}
          <Button
            variant="ghost"
            onClick={() => setView("redeem")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <Key className="w-4 h-4 mr-2" />
            Imam Pro kod
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Sigurno plaćanje • Pristup na 30 dana
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
