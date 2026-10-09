import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;
const root = path.resolve('src');
const includeAllStrings = process.argv.includes('--all');
const files = [];

function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (/\.(js|tsx)$/.test(entry.name)) files.push(full);
  }
}

visit(root);
const values = new Map();
const add = (value, file, kind) => {
  const clean = String(value).replace(/\s+/g, ' ').trim();
  if (!clean || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(clean)) return;
  const rows = values.get(clean) ?? [];
  rows.push(`${path.relative(root, file)}:${kind}`);
  values.set(clean, rows);
};

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  traverse(ast, {
    StringLiteral(p) {
      if (includeAllStrings && !p.parentPath.isImportDeclaration()) add(p.node.value, file, 'string');
    },
    TemplateElement(p) {
      if (includeAllStrings) add(p.node.value.cooked ?? p.node.value.raw, file, 'template');
    },
    JSXText(p) {
      add(p.node.value, file, 'text');
    },
    JSXAttribute(p) {
      const name = p.node.name?.name;
      if (!['placeholder', 'accessibilityLabel', 'label', 'title', 'subtitle', 'emptyTitle', 'emptyDescription'].includes(name)) return;
      if (p.node.value?.type === 'StringLiteral') add(p.node.value.value, file, name);
    },
    CallExpression(p) {
      if (p.node.callee?.type !== 'MemberExpression' || p.node.callee.object?.name !== 'Alert' || p.node.callee.property?.name !== 'alert') return;
      for (const arg of p.node.arguments.slice(0, 2)) {
        if (arg.type === 'StringLiteral') add(arg.value, file, 'alert');
      }
    },
  });
}

for (const [value, locations] of [...values].sort((a, b) => a[0].localeCompare(b[0], 'tr'))) {
  console.log(`${JSON.stringify(value)}\t${locations[0]}`);
}
console.error(`TOTAL ${values.size}`);
