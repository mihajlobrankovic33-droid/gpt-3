import { useState, useEffect } from "react";
import { X, Shield, RotateCcw, Power, Search, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  fetchAllLicenses,
  toggleLicenseStatus,
  resetDeviceLock,
  extendLicense,
  getDaysUntilExpiry,
  type License
} from "@/lib/licenseService";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadLicenses();
    }
  }, [isOpen]);

  const loadLicenses = async () => {
    setIsLoading(true);
    const data = await fetchAllLicenses();
    setLicenses(data);
    setIsLoading(false);
  };

  const handleToggleStatus = async (license: License) => {
    const success = await toggleLicenseStatus(license.id, !license.is_active);
    if (success) {
      toast({
        title: license.is_active ? "Korisnik deaktiviran" : "Korisnik aktiviran",
        description: `${license.user_name} je sada ${!license.is_active ? 'aktivan' : 'neaktivan'}.`,
      });
      loadLicenses();
    }
  };

  const handleResetDevice = async (license: License) => {
    const success = await resetDeviceLock(license.id);
    if (success) {
      toast({
        title: "Uređaj resetovan",
        description: `${license.user_name} može sada koristiti novi uređaj.`,
      });
      loadLicenses();
    }
  };

  const handleExtend = async (license: License, days: number) => {
    const success = await extendLicense(license.id, days);
    if (success) {
      toast({
        title: `+${days} dana dodato`,
        description: `Pretplata za ${license.user_name} je produžena.`,
      });
      loadLicenses();
    }
  };

  const filteredLicenses = licenses.filter(license =>
    license.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    license.unique_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Upravljanje licencama</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pretraži po imenu ili ključu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Ime</TableHead>
                    <TableHead className="text-muted-foreground">Buddy</TableHead>
                    <TableHead className="text-muted-foreground">Ključ</TableHead>
                    <TableHead className="text-muted-foreground text-center">Uređaj</TableHead>
                    <TableHead className="text-muted-foreground text-center">Istek</TableHead>
                    <TableHead className="text-muted-foreground text-center">Produži</TableHead>
                    <TableHead className="text-muted-foreground text-center">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => {
                    const daysLeft = getDaysUntilExpiry(license.expiry_date);
                    const isExpired = daysLeft !== null && daysLeft <= 0;
                    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
                    
                    return (
                      <TableRow key={license.id} className="border-border hover:bg-muted/30">
                        {/* Status indicator */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              !license.is_active 
                                ? 'bg-red-500 shadow-[0_0_8px_hsl(0,85%,50%)]' 
                                : isExpired 
                                  ? 'bg-orange-500 shadow-[0_0_8px_hsl(30,100%,50%)]'
                                  : 'bg-emerald-500 shadow-[0_0_8px_hsl(150,100%,45%)]'
                            }`} />
                          </div>
                        </TableCell>
                        
                        <TableCell className="font-medium text-foreground">
                          {license.user_name}
                        </TableCell>
                        
                        <TableCell className="text-muted-foreground">
                          {getAvatarEmoji(license.avatar)}
                        </TableCell>
                        
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded text-foreground font-mono">
                            {license.unique_code}
                          </code>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          {license.device_id ? (
                            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                              Povezan
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
                              Slobodan
                            </Badge>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          {license.unique_code === 'BOSS-0000-XP' ? (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              ∞
                            </Badge>
                          ) : daysLeft === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                              Istekao
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={isExpiringSoon 
                                ? 'border-warning/50 text-warning bg-warning/10' 
                                : 'border-muted-foreground/30 text-muted-foreground'
                              }
                            >
                              {daysLeft}d
                            </Badge>
                          )}
                        </TableCell>
                        
                        {/* Renewal buttons */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtend(license, 30)}
                              className="text-xs text-primary hover:text-primary hover:bg-primary/10 px-2"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              30d
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtend(license, 60)}
                              className="text-xs text-accent hover:text-accent hover:bg-accent/10 px-2"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              60d
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExtend(license, 120)}
                              className="text-xs text-success hover:text-success hover:bg-success/10 px-2"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              120d
                            </Button>
                          </div>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(license)}
                              className={`text-xs ${
                                license.is_active
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              }`}
                            >
                              <Power className="w-3 h-3 mr-1" />
                              {license.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                            </Button>
                            {license.device_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetDevice(license)}
                                className="text-xs text-warning hover:text-warning hover:bg-warning/10"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Aktivan
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Istekao
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Blokiran
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ESC za zatvaranje
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function getAvatarEmoji(avatar: string): string {
  const emojis: Record<string, string> = {
    rabbit: '🐰',
    owl: '🦉',
    fox: '🦊',
    panda: '🐼',
    cat: '🐱',
    penguin: '🐧',
  };
  return emojis[avatar] || '🎓';
}
