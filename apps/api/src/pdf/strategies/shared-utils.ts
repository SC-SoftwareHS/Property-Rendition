import { PDFForm } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export function setFieldSafe(form: PDFForm, fieldName: string, value: string): void {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
  } catch {
    // Field doesn't exist or wrong type — skip silently
  }
}

export function setCheckboxSafe(form: PDFForm, fieldName: string, checked: boolean): void {
  try {
    const cb = form.getCheckBox(fieldName);
    if (checked) cb.check();
    else cb.uncheck();
  } catch {
    // Field doesn't exist or wrong type — skip silently
  }
}

export function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

export function setRadioSafe(form: PDFForm, fieldName: string, value: string): void {
  try {
    const radio = form.getRadioGroup(fieldName);
    radio.select(value);
  } catch {
    // Field doesn't exist or value not a valid option — skip silently
  }
}

export function loadTemplate(filename: string): Uint8Array {
  const templatePath = path.join(process.cwd(), 'src', 'pdf', 'templates', filename);
  return fs.readFileSync(templatePath);
}
