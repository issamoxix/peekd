import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const markdownPath = path.join(root, "public", "adblume-implementation-plan.md");
const pdfPath = path.join(root, "public", "adblume-implementation-plan.pdf");
const markdown = fs.readFileSync(markdownPath, "utf8");

const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const contentWidth = pageWidth - margin * 2;
const lineHeight = 14;

function escapePdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text, size) {
  const maxChars = Math.floor(contentWidth / (size * 0.52));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function markdownToBlocks(input) {
  return input.split("\n").flatMap((raw) => {
    const line = raw.trim();
    if (!line) return [{ type: "space" }];
    if (line.startsWith("# ")) return [{ type: "h1", text: line.slice(2) }];
    if (line.startsWith("## ")) return [{ type: "h2", text: line.slice(3) }];
    if (line.startsWith("### ")) return [{ type: "h3", text: line.slice(4) }];
    if (line.startsWith("- ")) return [{ type: "bullet", text: line.slice(2) }];
    return [{ type: "p", text: line.replace(/`/g, "") }];
  });
}

const pages = [];
let stream = [];
let y = pageHeight - margin;

function newPage() {
  if (stream.length) pages.push(stream);
  stream = [];
  y = pageHeight - margin;
}

function ensure(space) {
  if (y - space < margin) newPage();
}

function drawText(text, x, size, font = "F1") {
  stream.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdf(text)}) Tj ET`);
}

function addBlock(block) {
  if (block.type === "space") {
    y -= 8;
    return;
  }
  const config = {
    h1: { size: 22, font: "F2", before: 0, after: 10 },
    h2: { size: 15, font: "F2", before: 12, after: 7 },
    h3: { size: 12, font: "F2", before: 8, after: 5 },
    bullet: { size: 10, font: "F1", before: 2, after: 2 },
    p: { size: 10, font: "F1", before: 2, after: 5 },
  }[block.type];
  const prefix = block.type === "bullet" ? "- " : "";
  const indent = block.type === "bullet" ? 12 : 0;
  const lines = wrap(`${prefix}${block.text}`, config.size);
  ensure(config.before + lines.length * lineHeight + config.after);
  y -= config.before;
  for (const line of lines) {
    drawText(line, margin + indent, config.size, config.font);
    y -= lineHeight;
  }
  y -= config.after;
}

for (const block of markdownToBlocks(markdown)) addBlock(block);
if (stream.length) pages.push(stream);

const objects = [];
function addObject(body) {
  objects.push(body);
  return objects.length;
}

const catalogId = 1;
const pagesId = 2;
objects.push("");
objects.push("");
const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const pageIds = [];

for (const page of pages) {
  const content = page.join("\n");
  const contentId = addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
  pageIds.push(pageId);
}

objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let index = 0; index < objects.length; index += 1) {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
}
const xrefOffset = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let index = 1; index < offsets.length; index += 1) {
  pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(pdfPath, pdf);
console.log(`Wrote ${pdfPath}`);
