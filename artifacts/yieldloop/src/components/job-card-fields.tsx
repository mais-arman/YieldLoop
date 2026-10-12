import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { validCard, type CardValues } from '@/lib/job-card';

export function JobCardFields({ value, onChange, disabled = false, errors = {} }: {
  value: CardValues; onChange?: (value: CardValues) => void; disabled?: boolean; errors?: Record<string, string>;
}) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const labels: Record<keyof CardValues, string> = ar ? {
    product_specification: 'مواصفات المنتج', sheet_width: 'عرض الورقة', sheet_height: 'طول الورقة', sheet_unit: 'وحدة الأبعاد',
    planned_yield: 'المردود الوزني الجيد المخطط (%)', cutting_instructions: 'تعليمات القص',
  } : {
    product_specification: 'Product specification', sheet_width: 'Sheet width', sheet_height: 'Sheet height', sheet_unit: 'Dimension unit',
    planned_yield: 'Planned good weight yield (%)', cutting_instructions: 'Cutting instructions',
  };
  const unspecified = ar ? 'غير محدد — لم تُقدَّم بيانات' : 'Unspecified — not supplied';
  return <fieldset className="min-w-0 space-y-4 border-t pt-4" disabled={disabled}>
    <legend className="max-w-full px-1 text-sm font-semibold">{ar ? 'بطاقة الإنتاج المخططة' : 'Production planning card'}</legend>
    <p className="text-xs text-muted-foreground">{ar
      ? 'جميع الحقول اختيارية. المردود المخطط هدف وزني وليس المردود الفعلي أو استغلال مساحة القص. الأبعاد تحتاج العرض والطول والوحدة معاً.'
      : 'All fields are optional. Planned yield is a weight-based target, not actual good yield or cutting-area utilization. Sheet size requires width, height and unit together.'}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(labels) as (keyof CardValues)[]).map(key => {
        const text = key === 'product_specification' || key === 'cutting_instructions';
        const id = `card-${key}`;
        const update = (next: string) => onChange?.({ ...value, [key]: next });
        return <div key={key} className={text ? 'min-w-0 space-y-1 sm:col-span-2' : 'min-w-0 space-y-1'}>
          <Label htmlFor={onChange ? id : undefined}>{labels[key]}</Label>
          {!onChange ? <p className="whitespace-pre-wrap break-words text-sm" data-testid={id}>{value[key] || unspecified}{key === 'planned_yield' && value[key] ? '%' : ''}</p>
            : text ? <Textarea id={id} value={value[key]} maxLength={5000} onChange={e => update(e.target.value)} aria-invalid={Boolean(errors[key])} />
            : key === 'sheet_unit' ? <select id={id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={value[key]} onChange={e => update(e.target.value)}>
              <option value="">{unspecified}</option><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option>
            </select> : <Input id={id} inputMode="decimal" dir="ltr" value={value[key]} onChange={e => update(e.target.value)} aria-invalid={Boolean(errors[key])} />}
          {errors[key] && <p role="alert" className="text-xs text-destructive">{errors[key]}</p>}
        </div>;
      })}
    </div>
    {onChange && !validCard(value) && <p role="alert" className="text-sm text-destructive">{ar
      ? 'أدخل أبعاداً موجبة ووحدة معاً أو اتركها جميعاً فارغة. المردود من 0 إلى 100. الحد الأقصى ثلاث منازل عشرية.'
      : 'Supply positive width, height and a unit together, or clear all three. Yield must be 0–100. Use at most three decimal places.'}</p>}
    <p className="text-xs text-muted-foreground">{ar ? 'المرفقات الخاصة غير متاحة حالياً؛ يلزم اعتماد تخزين آمن.' : 'Private attachments are not available yet; approved secure storage is required.'}</p>
  </fieldset>;
}
