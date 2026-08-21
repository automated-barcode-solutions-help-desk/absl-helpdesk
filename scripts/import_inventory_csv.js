const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "cleaned_inventory.csv";
const rejectsPath = outputPath.replace(/\.csv$/i, "_rejects.csv");

if (!inputPath) {
  console.error("Usage: node scripts/import_inventory_csv.js input.csv cleaned_inventory.csv");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (value || row.length) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }
      if (char === "\r" && next === "\n") i += 1;
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function cleanHeader(header) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const source = fs.readFileSync(path.resolve(inputPath), "utf8");
const rows = parseCsv(source);
const headers = rows.shift().map(cleanHeader);

const aliases = {
  item_code: "sku",
  code: "sku",
  product_code: "sku",
  item_name: "name",
  product_name: "name",
  qty: "quantity_on_hand",
  quantity: "quantity_on_hand",
  stock: "quantity_on_hand",
  reorder: "reorder_level",
  minimum_stock: "reorder_level",
  cost: "unit_cost"
};

const finalHeaders = ["sku", "name", "category", "quantity_on_hand", "reorder_level", "unit_cost"];
const cleanRows = [];
const rejectRows = [];

for (const row of rows) {
  const record = {};
  headers.forEach((header, index) => {
    const key = aliases[header] || header;
    record[key] = (row[index] || "").trim();
  });

  const cleaned = {
    sku: record.sku,
    name: record.name,
    category: record.category || "Uncategorized",
    quantity_on_hand: Number.parseInt(record.quantity_on_hand || "0", 10),
    reorder_level: Number.parseInt(record.reorder_level || "5", 10),
    unit_cost: Number.parseFloat(record.unit_cost || "0")
  };

  const errors = [];
  if (!cleaned.sku) errors.push("missing sku");
  if (!cleaned.name) errors.push("missing name");
  if (!Number.isInteger(cleaned.quantity_on_hand) || cleaned.quantity_on_hand < 0) {
    errors.push("bad quantity");
  }

  if (errors.length) {
    rejectRows.push([...finalHeaders.map((key) => record[key] || ""), errors.join("; ")]);
  } else {
    cleanRows.push(finalHeaders.map((key) => cleaned[key]));
  }
}

fs.writeFileSync(
  outputPath,
  [finalHeaders, ...cleanRows].map((row) => row.map(csvEscape).join(",")).join("\n")
);

fs.writeFileSync(
  rejectsPath,
  [[...finalHeaders, "errors"], ...rejectRows].map((row) => row.map(csvEscape).join(",")).join("\n")
);

console.log(`Cleaned rows: ${cleanRows.length}`);
console.log(`Rejected rows: ${rejectRows.length}`);
console.log(`Output: ${outputPath}`);
console.log(`Rejects: ${rejectsPath}`);

