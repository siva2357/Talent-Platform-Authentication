const excel = require("exceljs");

/**
 * Creates and initializes a styled Excel Workbook.
 * @param {object} meta - Workbook metadata (creator, title, etc.)
 * @returns {excel.Workbook}
 */
function createWorkbook(meta = {}) {
  const workbook = new excel.Workbook();
  workbook.creator = meta.creator || "Talent-Hub Admin System";
  workbook.lastModifiedBy = meta.lastModifiedBy || "Talent-Hub Admin System";
  workbook.created = meta.created || new Date();
  workbook.modified = meta.modified || new Date();
  return workbook;
}

/**
 * Adds a professionally styled worksheet with headers and rows.
 * @param {excel.Workbook} workbook - The exceljs Workbook instance
 * @param {string} sheetName - Name of the worksheet tab
 * @param {Array<object>} columns - Array of column definitions: [{ header, key, width, style }]
 * @param {Array<object>} rows - Array of row data matching column keys
 * @param {object} options - Custom styling options
 * @returns {excel.Worksheet}
 */
function addStyledWorksheet(workbook, sheetName, columns = [], rows = [], options = {}) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Assign columns
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 6, 15),
    style: col.style || {}
  }));

  // Style Header Row (Row 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = options.headerHeight || 28;
  headerRow.font = {
    name: "Arial",
    size: 11,
    bold: true,
    color: { argb: options.headerTextColor || "FFFFFFFF" }
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: options.headerBgColor || "FF2563EB" } // Talent-Hub Blue
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center"
  };

  // Add Data Rows
  rows.forEach((rowData, index) => {
    const row = sheet.addRow(rowData);
    row.height = 22;
    row.alignment = { vertical: "middle" };

    // Zebra striping for readability
    if (index % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" } // subtle light slate
      };
    }
  });

  return sheet;
}

/**
 * Streams the workbook as an XLSX or CSV attachment to Express response.
 * @param {object} res - Express response object
 * @param {excel.Workbook} workbook - The exceljs Workbook instance
 * @param {string} filename - Filename without extension
 * @param {string} format - 'xlsx' or 'csv' (default 'xlsx')
 */
async function sendWorkbookResponse(res, workbook, filename = "report", format = "xlsx") {
  const sanitizedFilename = (filename || "report").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

  if (format && format.toLowerCase() === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizedFilename}.csv"`);
    await workbook.csv.write(res);
    res.end();
  } else {
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizedFilename}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }
}

module.exports = {
  createWorkbook,
  addStyledWorksheet,
  sendWorkbookResponse
};
