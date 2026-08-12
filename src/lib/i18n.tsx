import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";

const STORAGE_KEY = "datable_lang";

/** Detecta el idioma del dispositivo con navigator.language. */
export function detectLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* almacenamiento no disponible */
  }
  const nav = window.navigator;
  const raw =
    (nav.languages && nav.languages.length ? nav.languages[0] : nav.language) || "es";
  return raw.toLowerCase().startsWith("en") ? "en" : "es";
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** t("texto en español", "english text") */
  t: (es: string, en: string) => string;
};

const LangContext = createContext<Ctx>({
  lang: "es",
  setLang: () => {},
  t: (es) => es,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const detected = detectLang();
    setLangState(detected);
    document.documentElement.lang = detected;
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* almacenamiento no disponible */
    }
    document.documentElement.lang = l;
  }

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Atajo: const t = useT(); t("Hola", "Hi") */
export function useT() {
  return useContext(LangContext).t;
}
