"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function recordAttendanceAction(
  action: "clockIn" | "clockOut" | "breakStart" | "breakEnd"
) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    let record;

    if (action === "clockIn") {
      // Always create a new record for clock in
      record = await prisma.attendanceRecord.create({
        data: {
          date: today,
          clockIn: now,
        },
      });
    } else {
      // Find the latest unfinished record for the day
      record = await prisma.attendanceRecord.findFirst({
        where: {
          date: today,
          clockOut: null,
        },
        orderBy: {
          clockIn: "desc",
        },
      });

      if (!record) {
        throw new Error("No matching clock-in record found");
      }

      const updateData: any = {
        [action]: now,
      };

      if (action === "clockOut") {
        const clockIn = record.clockIn;
        if (clockIn) {
          let totalBreakTime = 0;
          if (record.breakStart && record.breakEnd) {
            totalBreakTime =
              (record.breakEnd.getTime() - record.breakStart.getTime()) /
              (1000 * 60 * 60);
          }
          const hoursWorked =
            (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60) -
            totalBreakTime;
          updateData.hoursWorked = parseFloat(hoursWorked.toFixed(2));
        }
      }

      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: updateData,
      });
    }

    revalidatePath("/dashboard");
    return { success: true, message: `${action} recorded successfully` };
  } catch (error) {
    console.error("Error recording attendance:", error);
    return { success: false, message: "Failed to record attendance" };
  }
}

export async function fetchAttendanceRecords(month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  try {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: [{ date: "asc" }, { clockIn: "asc" }],
    });

    return records;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return [];
  }
}

export async function getCurrentHourlyRate() {
  try {
    const currentRate = await prisma.hourlyRate.findFirst({
      where: {
        endDate: null,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return currentRate?.rate || 1000; // デフォルト値として1000円を設定
  } catch (error) {
    console.error("Error fetching current hourly rate:", error);
    return 1000; // エラー時もデフォルト値を返す
  }
}

export async function updateHourlyRate(newRate: number) {
  try {
    const now = new Date();

    // 現在のレートを終了
    await prisma.hourlyRate.updateMany({
      where: { endDate: null },
      data: { endDate: now },
    });

    // 新しいレートを追加
    await prisma.hourlyRate.create({
      data: {
        rate: newRate,
        startDate: now,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Hourly rate updated successfully" };
  } catch (error) {
    console.error("Error updating hourly rate:", error);
    return { success: false, message: "Failed to update hourly rate" };
  }
}
