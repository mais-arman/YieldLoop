import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

const en = {
  brand: 'YieldLoop',
  phase: 'Phase 1 · Foundation',
  title: 'System connectivity',
  subtitle: 'Live checks against the YieldLoop server and its PostgreSQL database. Results are shown exactly as the server reports them.',
  switchLang: 'العربية',
  switchLangLabel: 'Switch language to Arabic',
  retryAll: 'Check again',
  retry: 'Retry',
  apiTitle: 'API service',
  apiDesc: 'Confirms the application server is running and responding.',
  dbTitle: 'PostgreSQL database',
  dbDesc: 'Confirms the server can reach and query the database.',
  checking: 'Checking',
  checkingDetail: 'Waiting for a response from the server.',
  ok: 'Operational',
  okApi: 'The API server responded and reports healthy.',
  okDb: 'The database is connected and accepting queries.',
  failed: 'Unavailable',
  dbUnavailable: 'The server is running but cannot reach the database.',
  timeout: 'No response within {s} seconds.',
  network: 'The server could not be reached. Check the network or that the API service is running.',
  httpError: 'The server returned an error (HTTP {code}).',
  unexpected: 'The server responded with an unexpected result.',
  endpoint: 'Endpoint',
  httpStatus: 'HTTP',
  checkedAt: 'Checked at',
  summaryChecking: 'Running checks',
  summaryOk: 'All systems connected',
  summaryPartial: 'Attention needed',
  summaryDown: 'Services unavailable',
  footer: 'Status is never cached as healthy. Each check makes a new request with a {s}-second timeout.',
};

const ar: typeof en = {
  brand: 'YieldLoop',
  phase: 'المرحلة 1 · الأساس',
  title: 'اتصال النظام',
  subtitle: 'فحوصات مباشرة لخادم YieldLoop وقاعدة بيانات PostgreSQL. تُعرض النتائج كما يُبلغ عنها الخادم تمامًا.',
  switchLang: 'English',
  switchLangLabel: 'تغيير اللغة إلى الإنجليزية',
  retryAll: 'إعادة الفحص',
  retry: 'إعادة المحاولة',
  apiTitle: 'خدمة الواجهة البرمجية',
  apiDesc: 'يتحقق من أن خادم التطبيق يعمل ويستجيب.',
  dbTitle: 'قاعدة بيانات PostgreSQL',
  dbDesc: 'يتحقق من قدرة الخادم على الوصول إلى قاعدة البيانات والاستعلام منها.',
  checking: 'جارٍ الفحص',
  checkingDetail: 'بانتظار استجابة من الخادم.',
  ok: 'يعمل',
  okApi: 'استجاب خادم الواجهة البرمجية وأفاد بأنه سليم.',
  okDb: 'قاعدة البيانات متصلة وتقبل الاستعلامات.',
  failed: 'غير متاح',
  dbUnavailable: 'الخادم يعمل لكنه لا يستطيع الوصول إلى قاعدة البيانات.',
  timeout: 'لم تصل استجابة خلال {s} ثوانٍ.',
  network: 'تعذّر الوصول إلى الخادم. تحقّق من الشبكة أو من تشغيل خدمة الواجهة البرمجية.',
  httpError: 'أعاد الخادم خطأ (HTTP {code}).',
  unexpected: 'استجاب الخادم بنتيجة غير متوقعة.',
  endpoint: 'نقطة الوصول',
  httpStatus: 'HTTP',
  checkedAt: 'وقت الفحص',
  summaryChecking: 'جارٍ تنفيذ الفحوصات',
  summaryOk: 'جميع الأنظمة متصلة',
  summaryPartial: 'يتطلب الانتباه',
  summaryDown: 'الخدمات غير متاحة',
  footer: 'لا تُخزَّن الحالة السليمة مؤقتًا أبدًا. كل فحص يرسل طلبًا جديدًا بمهلة {s} ثوانٍ.',
};

export type MsgKey = keyof typeof en;
const dict: Record<Lang, typeof en> = { en, ar };

type Ctx = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (l: Lang) => void;
  t: (k: MsgKey, vars?: Record<string, string | number>) => string;
  formatTime: (ts: number) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function initialLang(): Lang {
  try {
    const s = localStorage.getItem('yieldloop.lang');
    if (s === 'en' || s === 'ar') return s;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem('yieldloop.lang', lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const value = useMemo<Ctx>(() => {
    const t: Ctx['t'] = (k, vars) => {
      let s = dict[lang][k];
      if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
      return s;
    };
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return { lang, dir, setLang, t, formatTime: (ts) => fmt.format(new Date(ts)) };
  }, [lang, dir, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
