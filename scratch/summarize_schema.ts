import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scratch/schema.json', 'utf8'));

let output = '# Esquema de la Base de Datos\n\n';

if (data.definitions) {
  for (const [tableName, tableDef] of Object.entries(data.definitions)) {
    // Skip backup tables to keep it cleaner, unless we want all
    if (tableName.startsWith('backup_')) continue;

    output += `## Tabla: ${tableName}\n`;
    if (tableDef.description) {
      output += `Descripción: ${tableDef.description}\n`;
    }
    output += `Columnas:\n`;
    
    if (tableDef.properties) {
      for (const [colName, colDef] of Object.entries(tableDef.properties)) {
        let type = colDef.type;
        if (colDef.format) type += ` (${colDef.format})`;
        let desc = colDef.description ? ` - ${colDef.description}` : '';
        // Check if it's required (NOT NULL)
        let isRequired = tableDef.required && tableDef.required.includes(colName);
        let reqStr = isRequired ? '**[NOT NULL]**' : '';
        output += `- \`${colName}\`: ${type} ${reqStr}${desc}\n`;
      }
    }
    output += '\n';
  }
}

fs.writeFileSync('scratch/schema_summary.md', output);
console.log('Summary generated at scratch/schema_summary.md');
