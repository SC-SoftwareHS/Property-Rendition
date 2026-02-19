/**
 * Dev tool: enumerate all named fields in a PDF template.
 *
 * Usage:
 *   cd apps/api
 *   npx ts-node src/pdf/scripts/enumerate-fields.ts tx-50-144.pdf
 *
 * Outputs field type, name, and page for every interactive field.
 */
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const filename = process.argv[2];
if (!filename) {
  console.error('Usage: npx ts-node src/pdf/scripts/enumerate-fields.ts <filename>');
  console.error('  File must be in src/pdf/templates/');
  process.exit(1);
}

async function main() {
  const templatePath = path.join(process.cwd(), 'src', 'pdf', 'templates', filename);

  if (!fs.existsSync(templatePath)) {
    console.error(`File not found: ${templatePath}`);
    process.exit(1);
  }

  const bytes = fs.readFileSync(templatePath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const fields = form.getFields();

  console.log(`\nPDF: ${filename}`);
  console.log(`Pages: ${doc.getPageCount()}`);
  console.log(`Fields: ${fields.length}`);
  console.log('─'.repeat(70));
  console.log(`${'Type'.padEnd(20)} ${'Name'.padEnd(30)} Value`);
  console.log('─'.repeat(70));

  for (const field of fields) {
    const type = field.constructor.name.replace('PDF', '');
    const name = field.getName();
    let value = '';

    try {
      if (type === 'TextField') {
        value = (field as any).getText() ?? '';
      } else if (type === 'CheckBox') {
        value = (field as any).isChecked() ? 'checked' : 'unchecked';
      } else if (type === 'Dropdown') {
        value = (field as any).getSelected()?.join(', ') ?? '';
      }
    } catch {
      // ignore
    }

    console.log(`${type.padEnd(20)} ${name.padEnd(30)} ${value}`);
  }

  console.log('─'.repeat(70));
  console.log(`Total: ${fields.length} fields\n`);
}

main().catch(console.error);
