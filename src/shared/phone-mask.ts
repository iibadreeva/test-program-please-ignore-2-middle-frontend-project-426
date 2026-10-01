/**
 * Форматирует введенную пользователем строку в телефонный номер по маске:
 * +7 (XXX) XXX-XX-XX
 *
 * Если пользователь вводит цифры с 7 или 8 в начале, они нормализуются в префикс +7.
 * Если вводит другую первую цифру (например, 9), автоматически подставляется +7 (9...
 */
export function formatPhoneMask(input: string): string {
  const national = nationalDigits(input);
  if (!national) return "";

  const clamped = national.slice(0, 10);

  let result = "+7";
  if (clamped.length > 0) {
    result += ` (${clamped.slice(0, 3)}`;
  }
  if (clamped.length > 3) {
    result += `) ${clamped.slice(3, 6)}`;
  }
  if (clamped.length > 6) {
    result += `-${clamped.slice(6, 8)}`;
  }
  if (clamped.length > 8) {
    result += `-${clamped.slice(8, 10)}`;
  }

  return result;
}

export type PhoneMaskResult = {
  value: string;
  selectionStart: number;
};

/**
 * Та же маска плюс позиция каретки: считаем цифры номера слева от курсора
 * и ставим его после стольких же цифр в отформатированной строке.
 */
export function applyPhoneMask(input: string, selectionStart: number): PhoneMaskResult {
  const value = formatPhoneMask(input);
  return {
    value,
    selectionStart: caretAfterNationalDigits(value, nationalDigitsBefore(input, selectionStart)),
  };
}

function digitsOnly(input: string): string {
  let digits = "";
  for (const char of input) {
    if (char >= "0" && char <= "9") digits += char;
  }
  return digits;
}

/** Цифры номера без ведущей 7/8 — она становится префиксом +7. */
function nationalDigits(input: string): string {
  const digits = digitsOnly(input);
  if (digits.startsWith("7") || digits.startsWith("8")) return digits.slice(1);
  return digits;
}

function nationalDigitsBefore(input: string, selectionStart: number): number {
  const end = Math.max(0, Math.min(selectionStart, input.length));
  return Math.min(nationalDigits(input.slice(0, end)).length, 10);
}

function caretAfterNationalDigits(formatted: string, nationalCount: number): number {
  if (!formatted || nationalCount <= 0) {
    const paren = formatted.indexOf("(");
    return paren === -1 ? formatted.length : paren;
  }

  let seen = 0;
  let skippedPrefix = false;
  for (let index = 0; index < formatted.length; index++) {
    const char = formatted[index] ?? "";
    if (char < "0" || char > "9") continue;
    if (!skippedPrefix && formatted.startsWith("+7")) {
      skippedPrefix = true;
      continue;
    }
    seen += 1;
    if (seen === nationalCount) return index + 1;
  }
  return formatted.length;
}
