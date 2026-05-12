import { BookOpen, Brain, Target } from "lucide-react";
import { useCustomization } from "@/context/CustomizationContext";
import { useLanguage } from "@/context/LanguageContext";

export const WelcomeMessage = () => {
  const { getAvatarUrl, currentTheme } = useCustomization();
  const { t } = useLanguage();
  
  const features = [
    { icon: BookOpen, text: t.homeworkHelp },
    { icon: Brain, text: t.understandTopics },
    { icon: Target, text: t.practiceQuizzes },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-6 shadow-glow border-2 border-primary/20 animate-bounce-soft">
          <img 
            src={getAvatarUrl()} 
            alt={`${currentTheme.appName} Avatar`}
            className="w-full h-full object-cover"
          />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {t.heyThere}
        </h2>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t.personalTutor}
        </p>

        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-soft"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          {t.tryTyping}
        </p>
      </div>
    </div>
  );
};
