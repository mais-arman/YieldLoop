import { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

const en = {
  navProduction: 'Production',
  navAdmin: 'Administration',
  openMenu: 'Open navigation',
  account: 'Account',
  systemStatus: 'System status',
  pageDashboard: 'Dashboard',
  pageReports: 'Reports',
  pageJobs: 'Production Jobs',
  pageJobNew: 'New production job',
  pageJob: 'Job details',
  pageCutting: 'Cutting Studio',
  pageInventory: 'Inventory',
  pageLot: 'Inventory lot',
  pageEmployees: 'Employees',
  pagePassword: 'Change password',
  pageNotFound: 'Not found',
  grpStock: 'Stock board',
  grpMargins: 'Margins & kerf',
  grpMode: 'Cutting mode',
  grpParts: 'Parts',
  addRectangle: 'Add rectangle',
  addSquare: 'Add square',
  squareLocked: 'Square: height follows width',
  unlockSquare: 'Unlock square',
  lockSquare: 'Keep square',
  tabSetup: 'Setup',
  tabLayout: 'Layout',
  tabResults: 'Results',
  boardPreview: 'Board preview',
  boardPreviewHint: 'Usable area inside the margins. Complete the remaining inputs to place parts.',
  boardPreviewWaiting: 'Enter board width and height to preview the stock board.',
  usable: 'Usable {w} × {h} mm',
  plans: 'Plans',
  showPlans: 'Show plans',
  hidePlans: 'Hide plans',
  marginsPending: 'Board outline only. Enter all four margins (0 is allowed) to see the usable area.',
};
export type UiKey = keyof typeof en;

const ar: typeof en = {
  navProduction: 'الإنتاج',
  navAdmin: 'الإدارة',
  openMenu: 'فتح التنقل',
  account: 'الحساب',
  systemStatus: 'حالة النظام',
  pageDashboard: 'لوحة المتابعة',
  pageReports: 'التقارير',
  pageJobs: 'أوامر الإنتاج',
  pageJobNew: 'أمر إنتاج جديد',
  pageJob: 'تفاصيل الأمر',
  pageCutting: 'استوديو القص',
  pageInventory: 'المخزون',
  pageLot: 'دفعة مخزون',
  pageEmployees: 'الموظفون',
  pagePassword: 'تغيير كلمة المرور',
  pageNotFound: 'غير موجود',
  grpStock: 'لوح الخام',
  grpMargins: 'الهوامش وعرض القطع',
  grpMode: 'نمط القص',
  grpParts: 'القطع',
  addRectangle: 'إضافة مستطيل',
  addSquare: 'إضافة مربع',
  squareLocked: 'مربع: الارتفاع يتبع العرض',
  unlockSquare: 'إلغاء قفل المربع',
  lockSquare: 'إبقاء مربعًا',
  tabSetup: 'الإعداد',
  tabLayout: 'التخطيط',
  tabResults: 'النتائج',
  boardPreview: 'معاينة اللوح',
  boardPreviewHint: 'المساحة القابلة للاستخدام داخل الهوامش. أكمل بقية المدخلات لوضع القطع.',
  boardPreviewWaiting: 'أدخل عرض اللوح وارتفاعه لمعاينة لوح الخام.',
  usable: 'المساحة المتاحة {w} × {h} مم',
  plans: 'الخطط',
  showPlans: 'عرض الخطط',
  hidePlans: 'إخفاء الخطط',
  marginsPending: 'حدود اللوح فقط. أدخل الهوامش الأربعة (يُسمح بالصفر) لعرض المساحة القابلة للاستخدام.',
};

const dict = { en, ar };
export type Ut = (k: UiKey, vars?: Record<string, string | number>) => string;
export function useUt(): Ut {
  const { lang } = useI18n();
  return useCallback((k, vars) => {
    let s = dict[lang][k] ?? en[k];
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  }, [lang]);
}
