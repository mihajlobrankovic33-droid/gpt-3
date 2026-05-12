import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { Loader2, MessageCircle, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatSession {
  id: string;
  title: string;
  subject: string | null;
  messages: Array<{ role: string; content: string }>;
  created_at: string;
  updated_at: string;
}

interface ChatHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSession: (messages: Array<{ role: "user" | "assistant"; content: string }>, sessionId: string) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
}

// Subject detection based on content
const detectSubject = (messages: Array<{ role: string; content: string }>): string => {
  const allContent = messages.map(m => m.content.toLowerCase()).join(" ");
  
  const subjectKeywords: Record<string, string[]> = {
    "Matematika": ["matematika", "jednačina", "funkcija", "integral", "derivat", "geometrija", "algebra", "trigonometrija", "broj", "računanje", "sabiranje", "množenje", "deljenje", "procenat", "formula", "x=", "y=", "cos", "sin", "tan", "+", "-", "×", "÷"],
    "Srpski": ["srpski", "gramatika", "pravopis", "književnost", "pesma", "roman", "priča", "glagol", "imenica", "pridev", "rečenica", "padež", "sintaksa", "stilske figure"],
    "Engleski": ["english", "engleski", "grammar", "vocabulary", "tense", "verb", "noun", "adjective", "translate", "translation", "prevod"],
    "Fizika": ["fizika", "sila", "brzina", "ubrzanje", "masa", "energija", "newton", "elektricitet", "magnetizam", "optika", "talasi"],
    "Hemija": ["hemija", "molekul", "atom", "reakcija", "element", "periodični sistem", "kiselina", "baza", "so", "oksidacija"],
    "Biologija": ["biologija", "ćelija", "organizam", "evolucija", "genetika", "dnk", "rnk", "fotosinteza", "metabolizam", "ekosistem"],
    "Istorija": ["istorija", "rat", "revolucija", "dinastija", "car", "kralj", "civilizacija", "srednji vek", "antika", "imperija"],
    "Geografija": ["geografija", "kontinent", "država", "reka", "planina", "klima", "stanovništvo", "privreda", "grad"],
    "Informatika": ["informatika", "programiranje", "kod", "algoritam", "kompjuter", "software", "hardware", "python", "javascript", "baza podataka"],
  };

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    const matchCount = keywords.filter(keyword => allContent.includes(keyword)).length;
    if (matchCount >= 2) {
      return subject;
    }
  }
  
  return "Opšte";
};

// Generate title from first user message
const generateTitle = (messages: Array<{ role: string; content: string }>): string => {
  const firstUserMessage = messages.find(m => m.role === "user");
  if (!firstUserMessage) return "Novi razgovor";
  
  const content = firstUserMessage.content;
  // Take first 40 characters and add ellipsis if longer
  if (content.length > 40) {
    return content.substring(0, 40).trim() + "...";
  }
  return content;
};

export function ChatHistoryModal({ 
  open, 
  onOpenChange, 
  onLoadSession, 
  onNewChat,
  currentSessionId 
}: ChatHistoryModalProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchSessions();
    }
  }, [open, user]);

  const fetchSessions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Type the data properly
      const typedSessions: ChatSession[] = (data || []).map(session => ({
        ...session,
        messages: Array.isArray(session.messages) 
          ? session.messages as Array<{ role: string; content: string }>
          : []
      }));
      
      setSessions(typedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati istoriju.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: "Obrisano",
        description: "Razgovor je obrisan."
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Greška",
        description: "Nije moguće obrisati razgovor.",
        variant: "destructive"
      });
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    const messages = session.messages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));
    onLoadSession(messages, session.id);
    onOpenChange(false);
  };

  const handleNewChat = () => {
    onNewChat();
    onOpenChange(false);
  };

  // Group sessions by subject
  const groupedSessions = sessions.reduce((acc, session) => {
    const subject = session.subject || "Opšte";
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const subjectEmojis: Record<string, string> = {
    "Matematika": "📐",
    "Srpski": "📖",
    "Engleski": "🇬🇧",
    "Fizika": "⚡",
    "Hemija": "🧪",
    "Biologija": "🧬",
    "Istorija": "📜",
    "Geografija": "🌍",
    "Informatika": "💻",
    "Opšte": "💬"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Istorija razgovora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Chat Button */}
          <Button 
            onClick={handleNewChat}
            className="w-full"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novi razgovor
          </Button>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nema sačuvanih razgovora</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSessions).map(([subject, subjectSessions]) => (
                  <div key={subject} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 sticky top-0 bg-background py-1">
                      <span>{subjectEmojis[subject] || "📚"}</span>
                      {subject}
                      <span className="text-xs text-muted-foreground/60">({subjectSessions.length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {subjectSessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                            currentSessionId === session.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.updated_at).toLocaleDateString('sr-RS', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export helper functions for use in Home.tsx
export { detectSubject, generateTitle };
