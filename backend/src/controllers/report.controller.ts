import { Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import { AuthRequest } from "../middleware/auth.middleware";
import * as reportService from "../services/report.service";

const BLUE = "FF2563EB";
const NAVY = "FF1E3A5F";
const WHITE = "FFFFFFFF";
const BORDER = "FFD1D5DB";
const TEXT_DARK = "FF111827";
const TEXT_DIM = "FF9CA3AF";
const TITLE_BG = "FFF0F4FF";

const thin = (argb = BORDER): ExcelJS.Border => ({
  style: "thin",
  color: { argb },
});
const medium = (argb = BLUE): ExcelJS.Border => ({
  style: "medium",
  color: { argb },
});
const fill = (argb: string): ExcelJS.FillPattern => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

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

    const { customerName, taskMap, start, end } =
      await reportService.getCustomerReport(
        customerId as string,
        startDate,
        endDate,
      );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FulfillmentPlus";

    const sheet = workbook.addWorksheet("Hours Report", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
    });

    sheet.getColumn(1).width = 40;
    sheet.getColumn(2).width = 14;

    sheet.mergeCells("A1:B1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `Hours Report — ${customerName}`;
    titleCell.font = { bold: true, size: 15, color: { argb: NAVY } };
    titleCell.alignment = { horizontal: "left", vertical: "middle" };
    titleCell.fill = fill(TITLE_BG);
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:B2");
    const rangeCell = sheet.getCell("A2");
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    rangeCell.value = `${fmt(start)} – ${fmt(end)}`;
    rangeCell.font = { size: 10, italic: true, color: { argb: TEXT_DIM } };
    rangeCell.alignment = { horizontal: "left", vertical: "middle" };
    rangeCell.fill = fill(TITLE_BG);
    sheet.getRow(2).height = 18;

    sheet.getRow(3).height = 6;

    const headerRow = sheet.addRow(["Task", "Hours"]);
    headerRow.height = 26;
    headerRow.eachCell((cell, col) => {
      cell.fill = fill(BLUE);
      cell.font = { bold: true, size: 11, color: { argb: WHITE } };
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 2 ? "right" : "left",
      };
      cell.border = {
        top: thin(BLUE),
        left: thin(BLUE),
        right: thin(BLUE),
        bottom: medium(NAVY),
      };
    });

    let grandTotalSeconds = 0;

    for (const [, { taskName, users }] of taskMap) {
      const taskTotalSeconds = Array.from(users.values()).reduce(
        (sum, { seconds }) => sum + seconds,
        0,
      );

      const dataRow = sheet.addRow([taskName, taskTotalSeconds / 3600]);
      dataRow.height = 21;

      dataRow.getCell(1).fill = fill(WHITE);
      dataRow.getCell(1).font = {
        bold: true,
        size: 10,
        color: { argb: TEXT_DARK },
      };
      dataRow.getCell(1).alignment = { vertical: "middle" };
      dataRow.getCell(1).border = {
        top: thin(),
        bottom: thin(),
        left: medium(),
        right: thin(),
      };

      dataRow.getCell(2).fill = fill(WHITE);
      dataRow.getCell(2).numFmt = "0.00";
      dataRow.getCell(2).font = { size: 10, color: { argb: TEXT_DARK } };
      dataRow.getCell(2).alignment = {
        horizontal: "right",
        vertical: "middle",
      };
      dataRow.getCell(2).border = {
        top: thin(),
        bottom: thin(),
        left: thin(),
        right: thin(),
      };

      grandTotalSeconds += taskTotalSeconds;
    }

    // Grand total
    const totalRow = sheet.addRow(["TOTAL HOURS", grandTotalSeconds / 3600]);
    totalRow.height = 28;
    totalRow.eachCell((cell, col) => {
      cell.fill = fill(NAVY);
      cell.font = { bold: true, size: 12, color: { argb: WHITE } };
      cell.border = {
        top: medium(),
        bottom: medium(NAVY),
        left: thin(NAVY),
        right: thin(NAVY),
      };
      if (col === 2) {
        cell.numFmt = "0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });

    sheet.addRow([]);
    const footerRowNum = sheet.lastRow!.number + 1;
    sheet.mergeCells(`A${footerRowNum}:B${footerRowNum}`);
    const footerCell = sheet.getCell(`A${footerRowNum}`);
    footerCell.value = `Generated ${new Date().toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}`;
    footerCell.font = { size: 9, italic: true, color: { argb: TEXT_DIM } };
    footerCell.alignment = { horizontal: "right" };

    const safeName = customerName
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_");
    const filename = `${safeName}_hours_report.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
