import { useTranslation } from "@/lib/hooks/I18nProvider";

export default function Footer() {
  const t = useTranslation();

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-14 bg-sidebar border-t border-sidebar-border z-30">
      <div className="flex items-center h-full px-6">
        <span className="text-sm text-sidebar-foreground/70">{t("footer.madeBy")}</span>
      </div>
    </footer>
  );
}
