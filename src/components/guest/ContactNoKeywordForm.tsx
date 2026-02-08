import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/lib/hooks/I18nProvider";

interface ContactNoKeywordFormProps {
  nickname: string;
  initialKeyword?: string;
  onSuccess?: () => void;
  onNewSearch?: () => void;
}

export function ContactNoKeywordForm({
  nickname,
  initialKeyword = "",
  onSuccess,
  onNewSearch,
}: ContactNoKeywordFormProps) {
  const t = useTranslation();

  const [keyword, setKeyword] = useState(initialKeyword);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setKeywordError(null);

    // Validate keyword - show error if empty or too short
    if (!keyword.trim() || keyword.trim().length < 3) {
      setKeywordError(t("guest.keywordMinLength"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/nakka/submit-no-keyword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname,
          keyword: keyword.trim(),
          user_email: email.trim() || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("guest.contactFormError"));
      }

      if (data.success) {
        setIsSubmitted(true);
        onSuccess?.();
      } else {
        throw new Error(data.error || t("guest.contactFormError"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("guest.contactFormError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after submission
  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto mb-8 px-4">
        <div className="bg-card border rounded-lg p-4 sm:p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-green-500 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("guest.contactFormSuccess")}</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {t("guest.contactFormSuccessDescription")}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground mb-6">
              <p className="mb-2">
                <strong>{t("guest.contactFormNickname")}:</strong> {nickname}
              </p>
              <p className="mb-2">
                <strong>{t("guest.contactFormKeyword")}:</strong> {keyword}
              </p>
              {email && (
                <p>
                  <strong>{t("guest.contactFormEmail")}:</strong> {email}
                </p>
              )}
            </div>
            <Button onClick={onNewSearch} size="lg" className="w-full">
              <Search className="mr-2 h-4 w-4" />
              {t("guest.newSearch")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show the form
  return (
    <div className="max-w-2xl mx-auto mb-8 px-4">
      <div className="bg-card border rounded-lg p-4 sm:p-6">
        <div className="text-center mb-4 sm:mb-6">
          <Mail className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-purple-500 mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("guest.contactFormTitle")}</h3>
          <p className="text-sm sm:text-base text-muted-foreground">{t("guest.contactFormDescription")}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="contact-nickname">{t("guest.contactFormNickname")}</Label>
            <Input id="contact-nickname" type="text" value={nickname} disabled className="bg-muted" />
          </div>

          {/* Keyword (Editable) */}
          <div className="space-y-2">
            <Label htmlFor="contact-keyword">{t("guest.contactFormKeyword")}</Label>
            <Input
              id="contact-keyword"
              type="text"
              placeholder={t("guest.tournamentKeywordPlaceholder")}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                if (e.target.value.length >= 3) {
                  setKeywordError(null);
                }
              }}
              disabled={isSubmitting}
              className={keywordError ? "border-destructive" : ""}
            />
            {keywordError && <p className="text-sm text-destructive">{keywordError}</p>}
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="contact-email">{t("guest.contactFormEmail")}</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder={t("guest.contactFormEmailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                {t("guest.contactFormSubmitting")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("guest.contactFormSubmit")}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
