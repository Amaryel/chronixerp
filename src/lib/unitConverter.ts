/**
 * Aquinos Frios - Smart Unit Conversion Module
 * Simplified and robust conversion supporting UN, KG, CX
 */

import { Product, UnitConversion } from '../types';

export const STANDARD_UNITS = [
  { value: 'UN', label: 'Unidade (UN)', type: 'unit' },
  { value: 'KG', label: 'Quilograma (KG)', type: 'weight' },
  { value: 'CX', label: 'Caixa (CX)', type: 'package' },
];

/**
 * Normalizes input unit strings into standard tokens (UN, KG, CX)
 */
export function normalizeUnitToken(unitStr?: string): 'UN' | 'KG' | 'CX' | string {
  if (!unitStr) return 'UN';
  const u = unitStr.trim().toUpperCase();

  if (u === 'UN' || u === 'UNIDADE' || u === 'UNIDADES' || u === 'PC' || u === 'PEÇA' || u === 'PECA' || u === 'PEÇAS' || u === 'FD' || u === 'FARDO' || u === 'PCT' || u === 'PACOTE') {
    return 'UN';
  }
  if (u === 'KG' || u === 'KILO' || u === 'KILOS' || u === 'QUILOGRAMA' || u === 'QUILOGRAMAS' || u === 'G' || u === 'GRAMA' || u === 'GRAMAS') {
    return 'KG';
  }
  if (u === 'CX' || u === 'CJ' || u === 'CAIXA' || u === 'CAIXAS' || u === 'CXS' || u === 'CJS') {
    return 'CX';
  }

  return u;
}

/**
 * Converts a quantity from `inputUnit` to `product.main_unit`
 */
export function convertToMainUnit(
  product: Product,
  qty: number,
  inputUnit: string
): {
  mainQty: number;
  factorUsed: number;
  explanation: string;
  isExact: boolean;
} {
  const normMain = normalizeUnitToken(product.main_unit || 'UN');
  const normInput = normalizeUnitToken(inputUnit || 'UN');

  let factor = 1;

  // 1. Same unit
  if (normMain === normInput) {
    factor = 1;
  }
  // 2. Direct Box Conversion on Product (Option 1: 1 CX = X KG; Option 2: 1 CX = X UN)
  else if (product.box_conversion_value && product.box_conversion_value > 0) {
    const normBoxConvUnit = normalizeUnitToken(product.box_conversion_unit || '');

    // Case A: Product main unit is CX and user inputs in KG or UN
    if (normMain === 'CX' && normInput === normBoxConvUnit) {
      factor = 1 / product.box_conversion_value; // e.g., 20 KG -> 1 CX => 1 KG = 0.05 CX
    }
    // Case B: Product main unit is KG or UN and user inputs in CX
    else if ((normMain === 'KG' || normMain === 'UN') && normInput === 'CX' && (normBoxConvUnit === normMain || !product.box_conversion_unit)) {
      factor = product.box_conversion_value; // e.g., 1 CX = 20 KG => 6 CX = 120 KG
    }
  }

  // 3. Fallback to product.conversions array
  if (factor === 1 && normMain !== normInput && product.conversions && product.conversions.length > 0) {
    const match = product.conversions.find(
      (c) => normalizeUnitToken(c.from_unit) === normInput && normalizeUnitToken(c.to_unit) === normMain
    );
    if (match && match.factor > 0) {
      factor = match.factor;
    } else {
      const reverseMatch = product.conversions.find(
        (c) => normalizeUnitToken(c.to_unit) === normInput && normalizeUnitToken(c.from_unit) === normMain
      );
      if (reverseMatch && reverseMatch.factor > 0) {
        factor = 1 / reverseMatch.factor;
      }
    }
  }

  // Fallback metric gram -> kg
  if (normInput === 'G' && normMain === 'KG') factor = 0.001;

  const mainQty = Number((qty * factor).toFixed(3));

  const explanation =
    normMain === normInput
      ? `1 ${normInput} = 1 ${normMain}`
      : `1 ${normInput} = ${factor} ${normMain} (${qty} ${normInput} = ${mainQty} ${normMain})`;

  return {
    mainQty,
    factorUsed: factor,
    explanation,
    isExact: true,
  };
}

/**
 * Formats stock display with optional box conversion equivalent
 */
export function formatStockDisplay(
  product: Product,
  qty: number,
  showConversions = true
): string {
  const normMain = normalizeUnitToken(product.main_unit || 'UN');
  const formattedMain = `${qty.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${normMain}`;

  if (!showConversions) return formattedMain;

  if (product.box_conversion_value && product.box_conversion_value > 0) {
    const normBoxConvUnit = normalizeUnitToken(product.box_conversion_unit || '');
    if (normMain === 'CX' && normBoxConvUnit) {
      const totalInUnit = qty * product.box_conversion_value;
      return `${formattedMain} (~${totalInUnit.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${normBoxConvUnit})`;
    } else if ((normMain === 'KG' || normMain === 'UN') && qty > 0) {
      const boxes = qty / product.box_conversion_value;
      return `${formattedMain} (~${boxes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} CX)`;
    }
  }

  return formattedMain;
}

export function getAvailableUnitsForProduct(product?: Product | null): string[] {
  const units = new Set<string>();
  const main = normalizeUnitToken(product?.main_unit || 'UN');
  units.add(main);

  if (product?.box_conversion_unit) {
    units.add(normalizeUnitToken(product.box_conversion_unit));
  }
  units.add('CX');
  units.add('KG');
  units.add('UN');

  return Array.from(units);
}
