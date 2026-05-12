import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  Users, 
  Search, 
  Plus,
  FileText,
  Check,
  CheckCheck
} from "lucide-react";

interface Conversation {
  id: string;
  other_user_email: string;
  other_user_name: string | null;
  other_user_id: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string | null;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  puskica_id: string | null;
  puskica_title?: string;
  puskica_content?: string;
}

interface PuskiceItem {
  id: string;
  title: string;
  content: string;
}

export function DirectChat() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [myPuskice, setMyPuskice] = useState<PuskiceItem[]>([]);
  const [showPuskiceSelector, setShowPuskiceSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;

    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participants?.length) {
      setConversations([]);
      return;
    }

    const conversationIds = participants.map((p) => p.conversation_id);

    // Get other participants for each conversation
    const convList: Conversation[] = [];

    for (const convId of conversationIds) {
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convId)
        .neq("user_id", user.id);

      if (otherParticipants?.length) {
        const otherUserId = otherParticipants[0].user_id;

        // Get profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", otherUserId)
          .maybeSingle();

        // Get last message
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from("direct_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", convId)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        convList.push({
          id: convId,
          other_user_id: otherUserId,
          other_user_email: profile?.email || "Unknown",
          other_user_name: profile?.display_name || null,
          last_message: lastMsg?.content || undefined,
          last_message_time: lastMsg?.created_at || undefined,
          unread_count: unreadCount || 0,
        });
      }
    }

    // Sort by last message time
    convList.sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    setConversations(convList);
  };

  // Fetch messages for selected conversation
  const fetchMessages = async () => {
    if (!selectedConversation) return;

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", selectedConversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Enrich with puskice data
    const enrichedMessages: Message[] = [];
    for (const msg of data || []) {
      let puskicaData: { title: string; content: string } | null = null;
      if (msg.puskica_id) {
        const { data: puskica } = await supabase
          .from("puskice")
          .select("title, content")
          .eq("id", msg.puskica_id)
          .maybeSingle();
        puskicaData = puskica;
      }
      enrichedMessages.push({
        ...msg,
        puskica_title: puskicaData?.title,
        puskica_content: puskicaData?.content,
      });
    }

    setMessages(enrichedMessages);

    // Mark as read
    if (user) {
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("conversation_id", selectedConversation.id)
        .neq("sender_id", user.id);
    }
  };

  // Fetch my puskice for sharing
  const fetchMyPuskice = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("puskice")
      .select("id, title, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMyPuskice(data || []);
  };

  useEffect(() => {
    fetchConversations();
    fetchMyPuskice();
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [selectedConversation]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start new conversation using secure edge function
  const startNewConversation = async () => {
    if (!user || !searchEmail.trim()) return;

    setIsSearching(true);

    try {
      // Get user's session token for authenticated API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Greška",
          description: "Moraš biti prijavljen.",
          variant: "destructive",
        });
        return;
      }

      // Use secure edge function to find user (prevents email enumeration)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: searchEmail.trim().toLowerCase() }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        // Generic error message - doesn't reveal if email exists
        toast({
          title: "Korisnik nije pronađen",
          description: "Nije moguće pronaći korisnika. Proveri email adresu.",
          variant: "destructive",
        });
        return;
      }

      const targetUser = result.user;

      // Check if conversation already exists
      if (result.existing_conversation_id) {
        const existingConv = conversations.find(c => c.id === result.existing_conversation_id);
        if (existingConv) {
          setSelectedConversation(existingConv);
        } else {
          // Refresh conversations and find it
          await fetchConversations();
          const updated = conversations.find(c => c.id === result.existing_conversation_id);
          if (updated) setSelectedConversation(updated);
        }
        setShowNewChat(false);
        setSearchEmail("");
        return;
      }

      // Create new conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: targetUser.user_id },
      ]);

      const newConv: Conversation = {
        id: conv.id,
        other_user_id: targetUser.user_id,
        other_user_email: searchEmail.trim().toLowerCase(), // Use the email they searched for
        other_user_name: targetUser.display_name,
        unread_count: 0,
      };

      setConversations((prev) => [newConv, ...prev]);
      setSelectedConversation(newConv);
      setShowNewChat(false);
      setSearchEmail("");

      toast({
        title: "Razgovor kreiran",
        description: `Možeš sada pisati sa ${targetUser.display_name || "korisnikom"}`,
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Greška",
        description: "Nije moguće kreirati razgovor.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Send message
  const sendMessage = async (puskicaId?: string) => {
    if (!user || !selectedConversation) return;
    if (!newMessage.trim() && !puskicaId) return;

    try {
      await supabase.from("direct_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage.trim() || null,
        puskica_id: puskicaId || null,
      });

      setNewMessage("");
      setShowPuskiceSelector(false);
      fetchConversations(); // Update last message
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Greška",
        description: "Poruka nije poslana.",
        variant: "destructive",
      });
    }
  };

  // Share puskica
  const sharePuskica = (puskica: PuskiceItem) => {
    sendMessage(puskica.id);
  };

  // Conversation list view
  if (!selectedConversation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Poruke</h2>
          </div>
          <Button size="sm" onClick={() => setShowNewChat(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Novi chat
          </Button>
        </div>

        {/* New chat form */}
        {showNewChat && (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Unesi email korisnika kojem želiš pisati:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="email@example.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startNewConversation()}
                />
                <Button onClick={startNewConversation} disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewChat(false)}
              >
                Odustani
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Conversations list */}
        {conversations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nema poruka</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Započni razgovor sa nekim!
              </p>
              <Button onClick={() => setShowNewChat(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novi chat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => setSelectedConversation(conv)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {conv.other_user_name || conv.other_user_email}
                    </p>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="font-semibold">
            {selectedConversation.other_user_name || selectedConversation.other_user_email}
          </p>
          {selectedConversation.other_user_name && (
            <p className="text-xs text-muted-foreground">
              {selectedConversation.other_user_email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        <div className="space-y-3 px-1">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.puskica_title && (
                    <div className="mb-2 p-2 rounded-lg bg-background/20 border border-border/50">
                      <div className="flex items-center gap-1 text-xs font-medium mb-1">
                        <FileText className="w-3 h-3" />
                        Puškica
                      </div>
                      <p className="font-semibold text-sm">{msg.puskica_title}</p>
                      <p className="text-xs opacity-80 line-clamp-2 mt-1">
                        {msg.puskica_content}
                      </p>
                    </div>
                  )}
                  {msg.content && (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                    <span className="text-[10px] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString("sr", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && (
                      msg.is_read ? (
                        <CheckCheck className="w-3 h-3 opacity-60" />
                      ) : (
                        <Check className="w-3 h-3 opacity-60" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Puskice selector */}
      {showPuskiceSelector && (
        <div className="border-t border-border p-3 max-h-48 overflow-auto">
          <p className="text-sm font-medium mb-2">Izaberi puškicu za dijeljenje:</p>
          {myPuskice.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nemaš puškica za dijeljenje.</p>
          ) : (
            <div className="space-y-2">
              {myPuskice.map((p) => (
                <Card
                  key={p.id}
                  className="cursor-pointer hover:border-primary/50"
                  onClick={() => sharePuskica(p)}
                >
                  <CardContent className="p-2">
                    <p className="font-medium text-sm">{p.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {p.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setShowPuskiceSelector(false)}
          >
            Odustani
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border pt-3 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowPuskiceSelector(!showPuskiceSelector)}
          title="Podijeli puškicu"
        >
          <FileText className="w-4 h-4" />
        </Button>
        <Input
          placeholder="Napiši poruku..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          className="flex-1"
        />
        <Button onClick={() => sendMessage()} disabled={!newMessage.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
