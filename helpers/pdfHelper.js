const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const VIEWS_DIR = path.join(__dirname, "..", "views");

/**
 * Resolve Chrome/Chromium executable path across OS environments.
 */
function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidatePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

/**
 * Generate PDF buffer from raw HTML string.
 * @param {string} html - Rendered HTML content
 * @param {object} options - Puppeteer PDF options (format, margin, etc.)
 * @returns {Promise<Buffer>} - Generated PDF buffer
 */
async function generatePdfFromHtml(html, options = {}) {
  let browser = null;
  try {
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process"
      ]
    };

    const execPath = getExecutablePath();
    if (execPath) {
      launchOptions.executablePath = execPath;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Load HTML and wait for network assets
    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
      timeout: 30000
    });

    const pdfBuffer = await page.pdf({
      format: options.format || "A4",
      printBackground: options.printBackground !== undefined ? options.printBackground : true,
      margin: options.margin || {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm"
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("Puppeteer close error:", closeErr);
      }
    }
  }
}

/**
 * Render EJS template with data and generate PDF buffer.
 * @param {string} templateName - Name of the template in views/
 * @param {object} data - Template variables
 * @param {object} options - Puppeteer PDF options
 * @returns {Promise<Buffer>}
 */
async function generatePdfFromTemplate(templateName, data = {}, options = {}) {
  const templatePath = path.join(VIEWS_DIR, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`EJS Template not found at: ${templatePath}`);
  }

  // Render EJS HTML with provided data
  const html = await ejs.renderFile(templatePath, data, { async: true });
  return await generatePdfFromHtml(html, options);
}

/**
 * Helper to send PDF response with proper headers.
 * @param {object} res - Express response object
 * @param {Buffer|Uint8Array} pdfBuffer - The PDF binary buffer
 * @param {string} filename - The filename for the PDF download/display
 * @param {boolean} inline - Whether to display inline (true) or force download (false)
 */
function sendPdfResponse(res, pdfBuffer, filename = "document.pdf", inline = true) {
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const disposition = inline ? "inline" : "attachment";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
}

module.exports = {
  generatePdfFromHtml,
  generatePdfFromTemplate,
  sendPdfResponse,
  VIEWS_DIR
};
