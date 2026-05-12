import { Button } from "@/components/ui/button";
import { Lightbulb, FileText, HelpCircle, BookOpen, GraduationCap } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export type ActionType = "explain" | "summary" | "quiz" | "homework" | "exam";

interface QuickActionsProps {
  onAction: (action: ActionType, prompt: string) => void;
  disabled?: boolean;
}

export const QuickActions = ({ onAction, disabled }: QuickActionsProps) => {
  const { t } = useLanguage();

  const actions = [
    {
      type: "explain" as ActionType,
      label: t.explainSimply,
      icon: Lightbulb,
      prompt: t.explainPrompt,
      color: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30 hover:border-amber-500/50",
    },
    {
      type: "summary" as ActionType,
      label: t.createSummary,
      icon: FileText,
      prompt: t.summaryPrompt,
      color: "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border-sky-500/30 hover:border-sky-500/50",
    },
    {
      type: "quiz" as ActionType,
      label: t.makeQuiz,
      icon: HelpCircle,
      prompt: t.quizPrompt,
      color: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30 hover:border-emerald-500/50",
    },
    {
      type: "homework" as ActionType,
      label: t.helpWithHomework,
      icon: BookOpen,
      prompt: t.homeworkPrompt,
      color: "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border-violet-500/30 hover:border-violet-500/50",
    },
    {
      type: "exam" as ActionType,
      label: t.examMode,
      icon: GraduationCap,
      prompt: t.examPrompt,
      color: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30 hover:border-red-500/50",
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {actions.map((action) => (
        <Button
          key={action.type}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.type, action.prompt)}
          disabled={disabled}
          className={`${action.color} border rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-sm`}
        >
          <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">{action.label}</span>
          <span className="xs:hidden">{action.label.split(" ")[0]}</span>
        </Button>
      ))}
    </div>
  );
};
