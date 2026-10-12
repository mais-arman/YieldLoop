import type { ProductionJob } from './jobs';

export function cardValues(job?: Partial<ProductionJob>) {
  return {
    product_specification: job?.product_specification ?? '',
    sheet_width: job?.sheet_width ?? '',
    sheet_height: job?.sheet_height ?? '',
    sheet_unit: job?.sheet_unit ?? '',
    planned_yield: job?.planned_yield ?? '',
    cutting_instructions: job?.cutting_instructions ?? '',
  };
}
export type CardValues = ReturnType<typeof cardValues>;
export function cardPayload(card: CardValues) {
  return { ...card, sheet_width: card.sheet_width || null, sheet_height: card.sheet_height || null, planned_yield: card.planned_yield || null };
}
export function validCard(card: CardValues) {
  const decimal = (s: string) => /^\d{1,9}(\.\d{1,3})?$/.test(s);
  const size = !card.sheet_width && !card.sheet_height && !card.sheet_unit
    || decimal(card.sheet_width) && Number(card.sheet_width) > 0 && decimal(card.sheet_height) && Number(card.sheet_height) > 0 && ['mm', 'cm', 'in'].includes(card.sheet_unit);
  return Boolean(size && (!card.planned_yield || decimal(card.planned_yield) && Number(card.planned_yield) <= 100));
}
