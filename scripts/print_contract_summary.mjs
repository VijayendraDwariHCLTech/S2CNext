import contract from "/tmp/s2c_schema_contract.json" with { type: "json" };

const summary = {
  tables: contract.tableCount,
  columns: contract.columnCount,
  enumColumns: contract.tables.flatMap((table) => table.enumColumns.map((column) => ({
    table: table.table,
    column: column.name,
    values: column.values,
  }))),
  nonUniqueFirstColumns: contract.tables
    .filter((table) => !table.firstColumnUnique)
    .map((table) => ({ table: table.table, first: table.firstColumn, rows: table.rowCount })),
};
console.log(JSON.stringify(summary, null, 2));
