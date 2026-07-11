import { Request, Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { AuthRequest } from "../middleware/auth.middleware";
import * as reportService from "../services/report.service";
import { REPORT_TIMEZONE } from "../utils/timezone";

const PIE_COLORS = [
  "#4F81BD",
  "#C0504D",
  "#9BBB59",
  "#8064A2",
  "#4BACC6",
  "#F79646",
  "#2C4770",
  "#772C2A",
];

async function renderPieChart(
  segments: { label: string; seconds: number }[],
  title: string,
): Promise<Buffer> {
  const canvas = new ChartJSNodeCanvas({ width: 600, height: 400, backgroundColour: "white" });
  const total = segments.reduce((s, x) => s + x.seconds, 0);
  const toHm = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };
  return canvas.renderToBuffer({
    type: "pie",
    data: {
      labels: segments.map(
        (s) => `${s.label} (${toHm(s.seconds)} — ${Math.round((s.seconds / total) * 100)}%)`,
      ),
      datasets: [
        {
          data: segments.map((s) => s.seconds),
          backgroundColor: segments.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: title, font: { size: 16 } },
        legend: { position: "right", labels: { font: { size: 11 }, padding: 14 } },
      },
    },
  });
}

// Palette
const CHARCOAL = "FF111827";
const SLATE = "FF374151";
const GREY_LT = "FFF9FAFB";
const GREY_MD = "FFE5E7EB";
const WHITE = "FFFFFFFF";
const BORDER = "FFD1D5DB";
const TEXT_DARK = "FF111827";
const TEXT_DIM = "FF9CA3AF";

// Helpers
const thin = (argb = BORDER): ExcelJS.Border => ({
  style: "thin",
  color: { argb },
});
const medium = (argb = SLATE): ExcelJS.Border => ({
  style: "medium",
  color: { argb },
});
const fill = (argb: string): ExcelJS.FillPattern => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

const toDay = (seconds: number) => seconds / 86400;

type EntrySheetRow = {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  groupName: string;
  taskName: string;
};

function buildEntriesSheet(
  workbook: ExcelJS.Workbook,
  col2Label: string,
  entries: EntrySheetRow[],
): void {
  const s = workbook.addWorksheet("All Entries");
  s.getColumn(1).width = 16;
  s.getColumn(2).width = 26;
  s.getColumn(3).width = 22;
  s.getColumn(4).width = 22;
  s.getColumn(5).width = 12;

  const hdr = s.addRow(["Date", col2Label, "Task", "Start – End", "Duration"]);
  hdr.height = 26;
  hdr.eachCell((cell, col) => {
    cell.fill = fill(SLATE);
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: col >= 4 ? "center" : "left", indent: col <= 3 ? 1 : 0 };
    cell.border = { top: thin(SLATE), bottom: thin(SLATE), left: thin(SLATE), right: thin(SLATE) };
  });

  for (const entry of entries) {
    const dateStr = entry.startTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: REPORT_TIMEZONE });
    const startStr = entry.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: REPORT_TIMEZONE });
    const endStr = entry.endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: REPORT_TIMEZONE });
    const row = s.addRow([dateStr, entry.groupName, entry.taskName, `${startStr} – ${endStr}`, toDay(entry.durationSeconds)]);
    row.height = 19;

    row.getCell(1).fill = fill(WHITE);
    row.getCell(1).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    row.getCell(1).alignment = { vertical: "middle", indent: 1 };
    row.getCell(1).border = { top: thin(), bottom: thin(), left: medium(), right: thin() };

    row.getCell(2).fill = fill(WHITE);
    row.getCell(2).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    row.getCell(2).alignment = { vertical: "middle", indent: 1 };
    row.getCell(2).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    row.getCell(3).fill = fill(WHITE);
    row.getCell(3).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    row.getCell(3).alignment = { vertical: "middle", indent: 1 };
    row.getCell(3).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    row.getCell(4).fill = fill(WHITE);
    row.getCell(4).font = { size: 10, color: { argb: TEXT_DIM }, name: "Calibri" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

    row.getCell(5).fill = fill(WHITE);
    row.getCell(5).numFmt = "[h]:mm";
    row.getCell(5).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).border = { top: thin(), bottom: thin(), left: thin(), right: medium() };
  }
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: REPORT_TIMEZONE,
  });

const fmtFilenameDate = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  return `${map.day}-${map.month}-${map.year}`;
};

// Pick stats (public aggregate endpoint for warehouse dashboard)
export const getPickStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await reportService.getPickStats();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

async function sendEmployeeReport(
  userId: string,
  startDate: string | undefined,
  endDate: string | undefined,
  res: Response,
) {
  const { employeeName, customers, totalSeconds, entries, start, end } =
    await reportService.getEmployeeReport(userId, startDate, endDate);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FulfilmentPlus";

  const sheet = workbook.addWorksheet("Hours Report", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
    views: [{ state: "normal" }],
  });

  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 26;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 12;

  // Row 1 black banner
  sheet.mergeCells("A1:E1");
  const banner = sheet.getCell("A1");
  banner.value = "FulfilmentPlus — Hours Report";
  banner.fill = fill(CHARCOAL);
  banner.font = {
    bold: true,
    size: 13,
    color: { argb: WHITE },
    name: "Calibri",
  };
  banner.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 30;

  // Row 2 employee name
  sheet.mergeCells("A2:E2");
  const nameCell = sheet.getCell("A2");
  nameCell.value = employeeName;
  nameCell.fill = fill(SLATE);
  nameCell.font = {
    bold: true,
    size: 16,
    color: { argb: WHITE },
    name: "Calibri",
  };
  nameCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  sheet.getRow(2).height = 36;

  // Row 3 date range
  sheet.mergeCells("A3:E3");
  const rangeCell = sheet.getCell("A3");
  rangeCell.value = `${fmtDate(start)}  –  ${fmtDate(end)}`;
  rangeCell.fill = fill(GREY_LT);
  rangeCell.font = { size: 10, italic: true, color: { argb: TEXT_DIM } };
  rangeCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  sheet.getRow(3).height = 20;

  // Row 4 spacer
  sheet.getRow(4).height = 4;

  // Row 5 column headers
  const headerRow = sheet.addRow(["Customer / Task", "", "Entries", "h:mm", "Avg / Entry"]);
  headerRow.height = 26;
  headerRow.eachCell((cell, col) => {
    cell.fill = fill(SLATE);
    cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: "Calibri" };
    cell.alignment = {
      vertical: "middle",
      horizontal: col >= 3 ? "center" : "left",
      indent: col === 1 ? 1 : 0,
    };
    cell.border = { top: thin(SLATE), bottom: thin(SLATE), left: thin(SLATE), right: thin(SLATE) };
  });

  for (const customer of customers) {
    // Customer section header
    const secRow = sheet.addRow([customer.customerName.toUpperCase(), "", "", "", ""]);
    secRow.height = 22;
    sheet.mergeCells(`A${secRow.number}:E${secRow.number}`);
    const secCell = sheet.getCell(`A${secRow.number}`);
    secCell.value = customer.customerName.toUpperCase();
    secCell.fill = fill(GREY_LT);
    secCell.font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    secCell.alignment = { vertical: "middle", indent: 1 };
    secCell.border = { top: medium(), bottom: thin(), left: medium(), right: medium() };

    // Task rows
    customer.tasks.forEach((task) => {
      const avg = task.entryCount > 0 ? task.seconds / task.entryCount : 0;
      const row = sheet.addRow(["", task.taskName, task.entryCount, toDay(task.seconds), toDay(avg)]);
      row.height = 21;

      row.getCell(1).fill = fill(WHITE);
      row.getCell(1).border = { top: thin(), bottom: thin(), left: medium(), right: thin() };

      row.getCell(2).fill = fill(WHITE);
      row.getCell(2).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      row.getCell(2).alignment = { vertical: "middle", indent: 1 };
      row.getCell(2).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

      row.getCell(3).fill = fill(WHITE);
      row.getCell(3).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

      row.getCell(4).fill = fill(WHITE);
      row.getCell(4).numFmt = "[h]:mm";
      row.getCell(4).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

      row.getCell(5).fill = fill(WHITE);
      row.getCell(5).numFmt = "[h]:mm";
      row.getCell(5).font = { size: 10, color: { argb: TEXT_DIM }, name: "Calibri", italic: true };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).border = { top: thin(), bottom: thin(), left: thin(), right: medium() };
    });

    // Customer subtotal
    const custAvg = customer.totalEntries > 0 ? customer.totalSeconds / customer.totalEntries : 0;
    const subRow = sheet.addRow(["", "Subtotal", customer.totalEntries, toDay(customer.totalSeconds), toDay(custAvg)]);
    subRow.height = 23;

    subRow.getCell(1).fill = fill(GREY_MD);
    subRow.getCell(1).border = { top: thin(), bottom: medium(), left: medium(), right: thin() };

    subRow.getCell(2).fill = fill(GREY_MD);
    subRow.getCell(2).font = { bold: true, size: 10, color: { argb: TEXT_DARK }, italic: true, name: "Calibri" };
    subRow.getCell(2).alignment = { vertical: "middle", indent: 1 };
    subRow.getCell(2).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

    subRow.getCell(3).fill = fill(GREY_MD);
    subRow.getCell(3).font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    subRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    subRow.getCell(3).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

    subRow.getCell(4).fill = fill(GREY_MD);
    subRow.getCell(4).numFmt = "[h]:mm";
    subRow.getCell(4).font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
    subRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    subRow.getCell(4).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

    subRow.getCell(5).fill = fill(GREY_MD);
    subRow.getCell(5).numFmt = "[h]:mm";
    subRow.getCell(5).font = { bold: true, size: 10, color: { argb: TEXT_DIM }, italic: true, name: "Calibri" };
    subRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    subRow.getCell(5).border = { top: thin(), bottom: medium(), left: thin(), right: medium() };

    sheet.addRow([]).height = 4;
  }

  // Grand total
  const totalEntries = customers.reduce((s, c) => s + c.totalEntries, 0);
  const overallAvg = totalEntries > 0 ? totalSeconds / totalEntries : 0;
  const totalRow = sheet.addRow(["TOTAL HOURS", "", totalEntries, toDay(totalSeconds), toDay(overallAvg)]);
  totalRow.height = 30;
  totalRow.eachCell((cell, col) => {
    cell.fill = fill(CHARCOAL);
    cell.font = { bold: true, size: 12, color: { argb: WHITE }, name: "Calibri" };
    cell.border = { top: medium(CHARCOAL), bottom: medium(CHARCOAL), left: thin(CHARCOAL), right: thin(CHARCOAL) };
    if (col >= 3) {
      cell.numFmt = col === 3 ? "0" : "[h]:mm";
      cell.alignment = { horizontal: "center", vertical: "middle" };
    } else {
      cell.alignment = { horizontal: "left", vertical: "middle", indent: col === 1 ? 1 : 0 };
    }
  });

  // Footer
  sheet.addRow([]).height = 6;
  const foot = sheet.addRow([]);
  sheet.mergeCells(`A${foot.number}:E${foot.number}`);
  const footCell = sheet.getCell(`A${foot.number}`);
  footCell.value = `Generated ${fmtDate(new Date())}`;
  footCell.font = { size: 9, italic: true, color: { argb: TEXT_DIM } };
  footCell.alignment = { horizontal: "right" };

  if (entries.length > 0) {
    const sorted = [...entries].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
    buildEntriesSheet(workbook, "Customer", sorted.map((e) => ({ ...e, groupName: e.customerName })));
  }

  if (customers.length > 0) {
    const chartPng = await renderPieChart(
      customers.map((c) => ({ label: c.customerName, seconds: c.totalSeconds })),
      `Hours by Customer — ${fmtDate(start)} to ${fmtDate(end)}`,
    );
    const imageId = workbook.addImage({ buffer: Buffer.from(chartPng) as any, extension: "png" });
    const chartSheet = workbook.addWorksheet("Chart");
    chartSheet.addImage(imageId, {
      tl: { col: 0.5, row: 0.5 },
      ext: { width: 600, height: 400 },
    });
  }

  const safeName = employeeName
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}_${fmtFilenameDate(start)}_to_${fmtFilenameDate(end)}.xlsx"`,
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  await workbook.xlsx.write(res);
  res.end();
}

export const getEmployeeReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.params.userId as string) ?? req.user!.userId;
    const startDate =
      typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate =
      typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    await sendEmployeeReport(userId, startDate, endDate, res);
  } catch (err) {
    next(err);
  }
};

// Employee summary (JSON)
export const getEmployeeReportSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId;
    const startDate =
      typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate =
      typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const data = await reportService.getEmployeeReport(
      userId,
      startDate,
      endDate,
    );
    res.json({
      employeeName: data.employeeName,
      totalSeconds: data.totalSeconds,
      customers: data.customers,
      start: data.start,
      end: data.end,
    });
  } catch (err) {
    next(err);
  }
};

// Customer report
export const getCustomerReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { customerId } = req.params;
    const startDate =
      typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate =
      typeof req.query.endDate === "string" ? req.query.endDate : undefined;

    const { customerName, taskMap, entries: customerEntries, start, end } =
      await reportService.getCustomerReport(
        customerId as string,
        startDate,
        endDate,
      );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FulfilmentPlus";

    const sheet = workbook.addWorksheet("Hours Report", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
      views: [{ state: "normal" }],
    });

    sheet.getColumn(1).width = 36;
    sheet.getColumn(2).width = 24;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 14;

    // Row 1 — banner
    sheet.mergeCells("A1:E1");
    const banner = sheet.getCell("A1");
    banner.value = "FulfilmentPlus — Hours Report";
    banner.fill = fill(CHARCOAL);
    banner.font = {
      bold: true,
      size: 13,
      color: { argb: WHITE },
      name: "Calibri",
    };
    banner.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    sheet.getRow(1).height = 30;

    // Row 2 — customer name
    sheet.mergeCells("A2:E2");
    const nameCell = sheet.getCell("A2");
    nameCell.value = customerName;
    nameCell.fill = fill(SLATE);
    nameCell.font = { bold: true, size: 16, color: { argb: WHITE }, name: "Calibri" };
    nameCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    sheet.getRow(2).height = 36;

    // Row 3 — date range
    sheet.mergeCells("A3:E3");
    const rangeCell = sheet.getCell("A3");
    rangeCell.value = `${fmtDate(start)}  –  ${fmtDate(end)}`;
    rangeCell.fill = fill(GREY_LT);
    rangeCell.font = { size: 10, italic: true, color: { argb: TEXT_DIM } };
    rangeCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    sheet.getRow(3).height = 20;

    // Row 4 — spacer
    sheet.getRow(4).height = 4;

    // Row 5 — column headers
    const headerRow = sheet.addRow(["Task / Employee", "", "Entries", "h:mm", "Avg / Entry"]);
    headerRow.height = 26;
    headerRow.eachCell((cell, col) => {
      cell.fill = fill(SLATE);
      cell.font = { bold: true, size: 11, color: { argb: WHITE }, name: "Calibri" };
      cell.alignment = {
        vertical: "middle",
        horizontal: col >= 3 ? "center" : "left",
        indent: col === 1 ? 1 : 0,
      };
      cell.border = { top: thin(SLATE), bottom: thin(SLATE), left: thin(SLATE), right: thin(SLATE) };
    });

    let grandTotalSeconds = 0;

    for (const [, { taskName, users }] of taskMap) {
      const taskTotalSeconds = Array.from(users.values()).reduce(
        (sum, { seconds }) => sum + seconds,
        0,
      );

      // Task section header
      const taskTotalEntries = Array.from(users.values()).reduce((s, u) => s + u.entryCount, 0);
      const secRow = sheet.addRow([taskName.toUpperCase(), "", "", "", ""]);
      secRow.height = 22;
      sheet.mergeCells(`A${secRow.number}:E${secRow.number}`);
      const secCell = sheet.getCell(`A${secRow.number}`);
      secCell.value = taskName.toUpperCase();
      secCell.fill = fill(GREY_LT);
      secCell.font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      secCell.alignment = { vertical: "middle", indent: 1 };
      secCell.border = { top: medium(), bottom: thin(), left: medium(), right: medium() };

      // Employee rows
      for (const [, { userName, seconds, entryCount }] of users) {
        const avg = entryCount > 0 ? seconds / entryCount : 0;
        const row = sheet.addRow(["", userName, entryCount, toDay(seconds), toDay(avg)]);
        row.height = 21;

        row.getCell(1).fill = fill(WHITE);
        row.getCell(1).border = { top: thin(), bottom: thin(), left: medium(), right: thin() };

        row.getCell(2).fill = fill(WHITE);
        row.getCell(2).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
        row.getCell(2).alignment = { vertical: "middle", indent: 1 };
        row.getCell(2).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

        row.getCell(3).fill = fill(WHITE);
        row.getCell(3).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
        row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(3).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

        row.getCell(4).fill = fill(WHITE);
        row.getCell(4).numFmt = "[h]:mm";
        row.getCell(4).font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
        row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(4).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };

        row.getCell(5).fill = fill(WHITE);
        row.getCell(5).numFmt = "[h]:mm";
        row.getCell(5).font = { size: 10, color: { argb: TEXT_DIM }, name: "Calibri", italic: true };
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(5).border = { top: thin(), bottom: thin(), left: thin(), right: medium() };
      }

      // Task subtotal
      const taskAvg = taskTotalEntries > 0 ? taskTotalSeconds / taskTotalEntries : 0;
      const subRow = sheet.addRow(["", "Subtotal", taskTotalEntries, toDay(taskTotalSeconds), toDay(taskAvg)]);
      subRow.height = 23;

      subRow.getCell(1).fill = fill(GREY_MD);
      subRow.getCell(1).border = { top: thin(), bottom: medium(), left: medium(), right: thin() };

      subRow.getCell(2).fill = fill(GREY_MD);
      subRow.getCell(2).font = { bold: true, size: 10, italic: true, color: { argb: TEXT_DARK }, name: "Calibri" };
      subRow.getCell(2).alignment = { vertical: "middle", indent: 1 };
      subRow.getCell(2).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

      subRow.getCell(3).fill = fill(GREY_MD);
      subRow.getCell(3).font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      subRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      subRow.getCell(3).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

      subRow.getCell(4).fill = fill(GREY_MD);
      subRow.getCell(4).numFmt = "[h]:mm";
      subRow.getCell(4).font = { bold: true, size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
      subRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      subRow.getCell(4).border = { top: thin(), bottom: medium(), left: thin(), right: thin() };

      subRow.getCell(5).fill = fill(GREY_MD);
      subRow.getCell(5).numFmt = "[h]:mm";
      subRow.getCell(5).font = { bold: true, size: 10, color: { argb: TEXT_DIM }, italic: true, name: "Calibri" };
      subRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      subRow.getCell(5).border = { top: thin(), bottom: medium(), left: thin(), right: medium() };

      grandTotalSeconds += taskTotalSeconds;
      sheet.addRow([]).height = 4;
    }

    // Grand total
    const grandTotalEntries = Array.from(taskMap.values()).reduce(
      (s, { users }) => s + Array.from(users.values()).reduce((u, r) => u + r.entryCount, 0), 0,
    );
    const grandAvg = grandTotalEntries > 0 ? grandTotalSeconds / grandTotalEntries : 0;
    const totalRow = sheet.addRow(["TOTAL HOURS", "", grandTotalEntries, toDay(grandTotalSeconds), toDay(grandAvg)]);
    totalRow.height = 30;
    totalRow.eachCell((cell, col) => {
      cell.fill = fill(CHARCOAL);
      cell.font = { bold: true, size: 12, color: { argb: WHITE }, name: "Calibri" };
      cell.border = { top: medium(CHARCOAL), bottom: medium(CHARCOAL), left: thin(CHARCOAL), right: thin(CHARCOAL) };
      if (col >= 3) {
        cell.numFmt = col === 3 ? "0" : "[h]:mm";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle", indent: col === 1 ? 1 : 0 };
      }
    });

    // Footer
    sheet.addRow([]).height = 6;
    const foot = sheet.addRow([]);
    sheet.mergeCells(`A${foot.number}:E${foot.number}`);
    const footCell = sheet.getCell(`A${foot.number}`);
    footCell.value = `Generated ${fmtDate(new Date())}`;
    footCell.font = { size: 9, italic: true, color: { argb: TEXT_DIM } };
    footCell.alignment = { horizontal: "right" };

    if (customerEntries.length > 0) {
      const sorted = [...customerEntries].sort((a, b) => {
        const c = a.userName.localeCompare(b.userName);
        return c !== 0 ? c : a.startTime.getTime() - b.startTime.getTime();
      });
      buildEntriesSheet(workbook, "Employee", sorted.map((e) => ({ ...e, groupName: e.userName })));
    }

    if (taskMap.size > 0) {
      const taskSegments = Array.from(taskMap.values()).map(({ taskName, users }) => ({
        label: taskName,
        seconds: Array.from(users.values()).reduce((s, u) => s + u.seconds, 0),
      }));
      const chartPng = await renderPieChart(
        taskSegments,
        `Hours by Task — ${fmtDate(start)} to ${fmtDate(end)}`,
      );
      const imageId = workbook.addImage({ buffer: Buffer.from(chartPng) as any, extension: "png" });
      const chartSheet = workbook.addWorksheet("Chart");
      chartSheet.addImage(imageId, {
        tl: { col: 0.5, row: 0.5 },
        ext: { width: 600, height: 400 },
      });
    }

    const safeName = customerName
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_${fmtFilenameDate(start)}_to_${fmtFilenameDate(end)}.xlsx"`,
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
