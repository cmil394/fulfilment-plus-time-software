import { prisma } from "../lib/prisma";
import { NotFoundError } from "../utils/errors";
import {
  startOfDayInReportTz,
  endOfDayInReportTz,
  todayInReportTz,
} from "../utils/timezone";

export type UserRow = { userName: string; seconds: number; entryCount: number };
export type TaskRow = { taskName: string; users: Map<string, UserRow> };
export type CustomerEntryRow = {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  userName: string;
  taskName: string;
};
export type CustomerReportData = {
  customerName: string;
  taskMap: Map<string, TaskRow>;
  entries: CustomerEntryRow[];
  start: Date;
  end: Date;
};

export const getCustomerReport = async (
  customerId: string,
  startDate?: string,
  endDate?: string,
): Promise<CustomerReportData> => {
  const today = todayInReportTz();
  const start = startDate
    ? startOfDayInReportTz(startDate)
    : startOfDayInReportTz(`${today.slice(0, 7)}-01`);
  const end = endDate ? endOfDayInReportTz(endDate) : endOfDayInReportTz(today);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  const entries = await prisma.timeEntry.findMany({
    where: {
      customerId,
      startTime: { gte: start, lte: end },
      endTime: { not: null },
    },
    include: {
      task: { select: { name: true } },
      user: {
        select: {
          fullName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const taskMap = new Map<string, TaskRow>();

  for (const entry of entries) {
    const taskId = entry.taskId ?? "__unassigned__";
    const taskName = entry.task?.name ?? "Unassigned";
    const userId = entry.userId;
    const userName =
      entry.user.fullName ||
      `${entry.user.firstName ?? ""} ${entry.user.lastName ?? ""}`.trim() ||
      entry.user.email;
    const duration = entry.durationSeconds ?? 0;

    if (!taskMap.has(taskId))
      taskMap.set(taskId, { taskName, users: new Map() });
    const taskRow = taskMap.get(taskId)!;
    if (!taskRow.users.has(userId))
      taskRow.users.set(userId, { userName, seconds: 0, entryCount: 0 });
    taskRow.users.get(userId)!.seconds += duration;
    taskRow.users.get(userId)!.entryCount += 1;
  }

  const customerEntryRows: CustomerEntryRow[] = entries
    .filter((e) => e.endTime !== null)
    .map((e) => ({
      startTime: e.startTime,
      endTime: e.endTime!,
      durationSeconds: e.durationSeconds ?? 0,
      userName:
        e.user.fullName ||
        `${e.user.firstName ?? ""} ${e.user.lastName ?? ""}`.trim() ||
        e.user.email,
      taskName: e.task?.name ?? "Unassigned",
    }));

  return {
    customerName: customer.name,
    taskMap,
    entries: customerEntryRows,
    start,
    end,
  };
};

export type EmployeeTaskRow = {
  taskId: string;
  taskName: string;
  seconds: number;
  entryCount: number;
};
export type EmployeeCustomerRow = {
  customerId: string;
  customerName: string;
  totalSeconds: number;
  totalEntries: number;
  tasks: EmployeeTaskRow[];
};
export type EmployeeEntryRow = {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  customerName: string;
  taskName: string;
};
export type EmployeeReportData = {
  employeeName: string;
  totalSeconds: number;
  customers: EmployeeCustomerRow[];
  entries: EmployeeEntryRow[];
  start: Date;
  end: Date;
};

export type PickStatBucket = {
  count: number;
  avgSeconds: number;
  totalSeconds: number;
} | null;

export type PickStatPeriod = {
  picking: PickStatBucket;
  packing: PickStatBucket;
};

export type PickStatRow = {
  customerId: string;
  customerName: string;
  previousMonth: PickStatPeriod;
  currentMonthToDate: PickStatPeriod;
};

type RunningBucket = { count: number; total: number };
const emptyRunningBucket = (): RunningBucket => ({ count: 0, total: 0 });

const finalizeBucket = (bucket: RunningBucket): PickStatBucket =>
  bucket.count > 0
    ? {
        count: bucket.count,
        avgSeconds: Math.round(bucket.total / bucket.count),
        totalSeconds: bucket.total,
      }
    : null;

export const getPickStats = async (): Promise<PickStatRow[]> => {
  const today = todayInReportTz();
  const [year, month] = today.slice(0, 7).split("-").map(Number);

  const currentMonthStart = startOfDayInReportTz(`${today.slice(0, 7)}-01`);
  const currentMonthEnd = endOfDayInReportTz(today);

  const prevMonthLastDay = new Date(Date.UTC(year, month - 1, 0));
  const prevMonthStr = `${prevMonthLastDay.getUTCFullYear()}-${String(
    prevMonthLastDay.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  const prevMonthStart = startOfDayInReportTz(`${prevMonthStr}-01`);

  const entries = await prisma.timeEntry.findMany({
    where: {
      task: { name: { in: ["Picking", "Packing"], mode: "insensitive" } },
      durationSeconds: { not: null },
      endTime: { not: null },
      startTime: { gte: prevMonthStart, lte: currentMonthEnd },
    },
    select: {
      customerId: true,
      startTime: true,
      durationSeconds: true,
      customer: { select: { id: true, name: true } },
      task: { select: { name: true } },
    },
  });

  const map = new Map<
    string,
    {
      customerName: string;
      previousMonth: { picking: RunningBucket; packing: RunningBucket };
      currentMonthToDate: { picking: RunningBucket; packing: RunningBucket };
    }
  >();

  for (const entry of entries) {
    const cid = entry.customerId;
    if (!cid || !entry.customer) continue;

    if (!map.has(cid)) {
      map.set(cid, {
        customerName: entry.customer.name,
        previousMonth: {
          picking: emptyRunningBucket(),
          packing: emptyRunningBucket(),
        },
        currentMonthToDate: {
          picking: emptyRunningBucket(),
          packing: emptyRunningBucket(),
        },
      });
    }

    const row = map.get(cid)!;
    const period =
      entry.startTime >= currentMonthStart
        ? row.currentMonthToDate
        : row.previousMonth;
    const taskName = entry.task?.name?.toLowerCase() ?? "";
    const dur = entry.durationSeconds ?? 0;

    if (taskName === "picking") {
      period.picking.count++;
      period.picking.total += dur;
    } else if (taskName === "packing") {
      period.packing.count++;
      period.packing.total += dur;
    }
  }

  const result: PickStatRow[] = [];
  for (const [
    customerId,
    { customerName, previousMonth, currentMonthToDate },
  ] of map) {
    result.push({
      customerId,
      customerName,
      previousMonth: {
        picking: finalizeBucket(previousMonth.picking),
        packing: finalizeBucket(previousMonth.packing),
      },
      currentMonthToDate: {
        picking: finalizeBucket(currentMonthToDate.picking),
        packing: finalizeBucket(currentMonthToDate.packing),
      },
    });
  }

  result.sort((a, b) => a.customerName.localeCompare(b.customerName));
  return result;
};

export const getEmployeeReport = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<EmployeeReportData> => {
  const today = todayInReportTz();
  const start = startDate
    ? startOfDayInReportTz(startDate)
    : startOfDayInReportTz(`${today.slice(0, 7)}-01`);
  const end = endDate ? endOfDayInReportTz(endDate) : endOfDayInReportTz(today);

  const [user, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, firstName: true, lastName: true, email: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: start, lte: end },
        endTime: { not: null },
      },
      include: {
        customer: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const employeeName =
    user?.fullName ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email ||
    "Employee";

  const customerMap = new Map<
    string,
    {
      customerName: string;
      tasks: Map<
        string,
        { taskName: string; seconds: number; entryCount: number }
      >;
    }
  >();

  for (const entry of entries) {
    const customerId = entry.customerId ?? "__unknown__";
    const customerName = entry.customer?.name ?? "Unknown";
    const taskId = entry.taskId ?? "__unassigned__";
    const taskName = entry.task?.name ?? "Unassigned";
    const duration = entry.durationSeconds ?? 0;

    if (!customerMap.has(customerId))
      customerMap.set(customerId, { customerName, tasks: new Map() });

    const customerRow = customerMap.get(customerId)!;
    if (!customerRow.tasks.has(taskId))
      customerRow.tasks.set(taskId, { taskName, seconds: 0, entryCount: 0 });
    customerRow.tasks.get(taskId)!.seconds += duration;
    customerRow.tasks.get(taskId)!.entryCount += 1;
  }

  let totalSeconds = 0;
  const customers: EmployeeCustomerRow[] = [];

  for (const [customerId, { customerName, tasks }] of customerMap) {
    const taskList: EmployeeTaskRow[] = [];
    let customerTotal = 0;
    let customerEntries = 0;

    for (const [taskId, { taskName, seconds, entryCount }] of tasks) {
      taskList.push({ taskId, taskName, seconds, entryCount });
      customerTotal += seconds;
      customerEntries += entryCount;
    }

    taskList.sort((a, b) => b.seconds - a.seconds);
    customers.push({
      customerId,
      customerName,
      totalSeconds: customerTotal,
      totalEntries: customerEntries,
      tasks: taskList,
    });
    totalSeconds += customerTotal;
  }

  customers.sort((a, b) => b.totalSeconds - a.totalSeconds);

  const entryRows: EmployeeEntryRow[] = entries
    .filter((e) => e.endTime !== null)
    .map((e) => ({
      startTime: e.startTime,
      endTime: e.endTime!,
      durationSeconds: e.durationSeconds ?? 0,
      customerName: e.customer?.name ?? "Unknown",
      taskName: e.task?.name ?? "Unassigned",
    }));

  return {
    employeeName,
    totalSeconds,
    customers,
    entries: entryRows,
    start,
    end,
  };
};
