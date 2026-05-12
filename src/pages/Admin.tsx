import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { AdminPanel } from "@/components/AdminPanel";

const ADMIN_EMAIL = "mihajlobrankovic33@gmail.com";

export default function Admin() {
  const { user, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const isAuthorizedAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isLoading && !isAuthorizedAdmin) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthorizedAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return null;
  }

  return <AdminPanel isOpen={true} onClose={() => navigate("/")} />;
}
