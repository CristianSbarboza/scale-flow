"use client";

import { useEffect, useState } from "react";
import { Sparkles, KeyRound, Save, Trash2, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import PasswordField from "@/components/ui/PasswordField";
import SelectField from "@/components/ui/SelectField";
import SettingsSection from "@/components/ui/SettingsSection";
import Badge from "@/components/ui/Badge";
import {
  getUserAiSettings,
  updateUserAiSettings,
  getChurchAiAdminSettings,
  updateChurchAiAdminSettings,
} from "@/lib/actions/ai";
import { useToast } from "@/components/Toast";
import type {
  AiChurchAdminSettingsView,
  AiPersonalityStyle,
  AiProviderId,
  AiUserSettingsView,
} from "@/types/domain";

const PROVIDER_OPTIONS: Array<{
  value: AiProviderId;
  label: string;
  defaultModel: string;
  placeholderKey: string;
  hint: string;
}> = [
  {
    value: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    placeholderKey: "AIzaSy...",
    hint: "Chave do Google AI Studio (aistudio.google.com).",
  },
  {
    value: "claude",
    label: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    placeholderKey: "sk-ant-...",
    hint: "Chave do console da Anthropic (console.anthropic.com).",
  },
  {
    value: "openai",
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    placeholderKey: "sk-proj-...",
    hint: "Chave da plataforma OpenAI (platform.openai.com).",
  },
  {
    value: "groq",
    label: "Groq Cloud (Ultra-rápido)",
    defaultModel: "openai/gpt-oss-120b",
    placeholderKey: "gsk_...",
    hint: "Chave gratuita ou paga do Groq Console (console.groq.com).",
  },
  {
    value: "grok",
    label: "xAI Grok",
    defaultModel: "grok-3-mini",
    placeholderKey: "xai-...",
    hint: "Chave do console da xAI (console.x.ai).",
  },
  {
    value: "openrouter",
    label: "OpenRouter (Multi-modelos)",
    defaultModel: "google/gemini-2.5-flash",
    placeholderKey: "sk-or-v1-...",
    hint: "Chave do OpenRouter (openrouter.ai).",
  },
];

const STYLE_LABELS: Record<AiPersonalityStyle, string> = {
  warm: "Acolhedora e calorosa (mais afetuosa e encorajadora)",
  balanced: "Equilibrada (fraterna e objetiva na medida certa)",
  direct: "Direta e concisa (vai direto ao ponto com simpatia)",
};

const STYLE_SHORT_LABELS: Record<AiPersonalityStyle, string> = {
  warm: "Acolhedora e calorosa",
  balanced: "Equilibrada",
  direct: "Direta e concisa",
};

export default function AiAssistantSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const { showToast } = useToast();

  // Estado das preferências do usuário
  const [userSettings, setUserSettings] = useState<AiUserSettingsView | null>(null);
  const [customName, setCustomName] = useState("");
  const [customStyle, setCustomStyle] = useState<string>("default");
  const [savingUser, setSavingUser] = useState(false);

  // Estado das configurações da igreja (exclusivo Admin)
  const [churchSettings, setChurchSettings] = useState<AiChurchAdminSettingsView | null>(null);
  const [provider, setProvider] = useState<AiProviderId>("gemini");
  const [model, setModel] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [defaultName, setDefaultName] = useState("Cale");
  const [defaultStyle, setDefaultStyle] = useState<AiPersonalityStyle>("warm");
  const [savingChurch, setSavingChurch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getUserAiSettings(),
      isAdmin ? getChurchAiAdminSettings() : Promise.resolve(null),
    ])
      .then(([u, c]) => {
        if (!active) return;
        setUserSettings(u);
        setCustomName(u.userAiName ?? "");
        setCustomStyle(u.userAiStyle ?? "default");

        if (c) {
          setChurchSettings(c);
          setProvider(c.provider);
          setModel(c.model ?? "");
          setDefaultName(c.defaultName);
          setDefaultStyle(c.defaultStyle);
        }
      })
      .catch(() => {
        if (active) showToast("Não foi possível carregar as opções da assistente.", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, showToast]);

  const userUnchanged =
    userSettings !== null &&
    (customName.trim() || null) === userSettings.userAiName &&
    (customStyle === "default" ? null : customStyle) === userSettings.userAiStyle;

  const handleSaveUserPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSettings) return;
    setSavingUser(true);
    try {
      const nextName = customName.trim() || null;
      const nextStyle =
        customStyle === "default" ? null : (customStyle as AiPersonalityStyle);
      await updateUserAiSettings(nextName, nextStyle);
      const refreshed = await getUserAiSettings();
      setUserSettings(refreshed);
      showToast("Preferências da assistente atualizadas.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar preferências.",
        "error",
      );
    } finally {
      setSavingUser(false);
    }
  };

  const selectedProviderMeta =
    PROVIDER_OPTIONS.find((p) => p.value === provider) ?? PROVIDER_OPTIONS[0];

  const churchUnchanged =
    churchSettings !== null &&
    provider === churchSettings.provider &&
    (model.trim() || null) === churchSettings.model &&
    defaultName.trim() === churchSettings.defaultName &&
    defaultStyle === churchSettings.defaultStyle &&
    newApiKey.trim() === "";

  const handleSaveChurchAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChurch(true);
    try {
      const updated = await updateChurchAiAdminSettings({
        provider,
        model: model.trim() || null,
        newApiKey: newApiKey.trim() || null,
        defaultName: defaultName.trim(),
        defaultStyle,
      });
      setChurchSettings(updated);
      setNewApiKey("");
      const refreshedUser = await getUserAiSettings();
      setUserSettings(refreshedUser);
      showToast("Configurações de IA da igreja salvas.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao salvar configurações de IA.",
        "error",
      );
    } finally {
      setSavingChurch(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!churchSettings) return;
    setSavingChurch(true);
    try {
      const updated = await updateChurchAiAdminSettings({
        provider,
        model: model.trim() || null,
        clearApiKey: true,
        defaultName: defaultName.trim() || churchSettings.defaultName,
        defaultStyle,
      });
      setChurchSettings(updated);
      setNewApiKey("");
      showToast("Chave de API removida.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Erro ao remover a chave.",
        "error",
      );
    } finally {
      setSavingChurch(false);
    }
  };

  return (
    <>
      <SettingsSection title="Assistente Ministerial (IA)" icon={<Sparkles size={14} />}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <form onSubmit={handleSaveUserPreferences} className="grid min-w-0 grid-cols-1 gap-4">
            <Field
              label="Como você quer chamar a assistente (opcional)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`Padrão da igreja: ${userSettings?.churchDefaultName ?? "Cale"}`}
              maxLength={40}
              hint="Deixe em branco para usar o nome padrão definido pela igreja."
            />

            <SelectField
              label="Personalidade e jeito de falar com você"
              value={customStyle}
              onChange={setCustomStyle}
              options={[
                {
                  value: "default",
                  label: `Padrão da igreja (${STYLE_SHORT_LABELS[userSettings?.churchDefaultStyle ?? "warm"]})`,
                },
                { value: "warm", label: STYLE_LABELS.warm },
                { value: "balanced", label: STYLE_LABELS.balanced },
                { value: "direct", label: STYLE_LABELS.direct },
              ]}
              hint="Ajusta se as respostas para você serão mais calorosas ou mais diretas ao ponto."
            />

            <Button
              type="submit"
              disabled={savingUser || userUnchanged}
              className="w-full sm:w-auto sm:justify-self-start"
            >
              <Save size={16} />
              {savingUser ? "Salvando..." : "Salvar Preferência"}
            </Button>
          </form>
        )}
      </SettingsSection>

      {isAdmin && (
        <SettingsSection
          title="Provedor e Chave de API da IA (Igreja)"
          icon={<KeyRound size={14} />}
        >
          {loading || !churchSettings ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <form onSubmit={handleSaveChurchAi} className="grid min-w-0 grid-cols-1 gap-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <div className="text-xs text-muted-foreground">
                  Status do chat na igreja:
                </div>
                {churchSettings.hasApiKey ? (
                  <Badge
                    tone="success"
                    solid
                    icon={<CheckCircle2 size={13} className="shrink-0" />}
                    className="max-w-full min-w-0"
                  >
                    <span className="truncate">Chave ativa ({churchSettings.maskedApiKey})</span>
                  </Badge>
                ) : (
                  <Badge tone="muted" solid className="max-w-full">
                    Sem chave configurada
                  </Badge>
                )}
              </div>

              <SelectField
                label="Provedor de IA"
                value={provider}
                onChange={(v) => setProvider(v as AiProviderId)}
                options={PROVIDER_OPTIONS.map((p) => ({
                  value: p.value,
                  label: p.label,
                }))}
                hint={selectedProviderMeta.hint}
              />

              <PasswordField
                label={
                  churchSettings.hasApiKey
                    ? "Nova Chave de API (preencha apenas para substituir)"
                    : "Chave de API"
                }
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={
                  churchSettings.hasApiKey
                    ? `Atual: ${churchSettings.maskedApiKey}`
                    : selectedProviderMeta.placeholderKey
                }
                autoComplete="off"
                hint="A chave fica protegida no servidor e nunca é exibida para os membros."
              />

              <Field
                label="Modelo customizado (opcional)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={`Padrão automático: ${selectedProviderMeta.defaultModel}`}
                maxLength={80}
                hint="Deixe vazio para usar o modelo recomendado do provedor selecionado."
              />

              <div className="grid min-w-0 grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                <Field
                  label="Nome padrão na igreja"
                  value={defaultName}
                  onChange={(e) => setDefaultName(e.target.value)}
                  maxLength={40}
                  required
                />

                <SelectField
                  label="Tom padrão na igreja"
                  value={defaultStyle}
                  onChange={(v) => setDefaultStyle(v as AiPersonalityStyle)}
                  options={[
                    { value: "warm", label: "Acolhedora e calorosa" },
                    { value: "balanced", label: "Equilibrada" },
                    { value: "direct", label: "Direta e concisa" },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="submit"
                  disabled={savingChurch || churchUnchanged || !defaultName.trim()}
                  className="w-full sm:w-auto"
                >
                  <Save size={16} />
                  {savingChurch ? "Salvando..." : "Salvar Configuração da Igreja"}
                </Button>

                {churchSettings.hasApiKey && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingChurch}
                    onClick={handleClearApiKey}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 size={16} />
                    Remover Chave
                  </Button>
                )}
              </div>
            </form>
          )}
        </SettingsSection>
      )}
    </>
  );
}

