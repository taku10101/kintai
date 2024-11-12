import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  fetchAttendanceRecords,
  getCurrentHourlyRate,
  updateHourlyRate,
} from "../app/actions";

export const useAttendance = () => {
  const [clockedIn] = useState(false);
  const [onBreak] = useState(false);
  const [breakTaken] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hourlyRate, setHourlyRate] = useState(1000);
  type GroupedAttendanceRecord = {
    date: Date;
    records: AttendanceRecord[];
  };

  const [attendanceRecords, setAttendanceRecords] = useState<
    GroupedAttendanceRecord[]
  >([]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [newHourlyRate, setNewHourlyRate] = useState(hourlyRate);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null
  );

  type AttendanceRecord = {
    id: number;
    date: Date;
    clockInTime: Date;
    clockOutTime: Date | null;
    breakStartTime: Date | null;
    breakEndTime: Date | null;
    hoursWorked: number | null;
  };

  useEffect(() => {
    fetchRecords();
    fetchHourlyRate();
  }, [currentMonth]);

  const fetchRecords = async () => {
    const records = await fetchAttendanceRecords(currentMonth);
    const groupedRecords = records.reduce(
      (
        acc: {
          [key: string]: {
            date: Date;
            records: {
              id: number;
              date: Date;
              clockInTime: Date;
              clockOutTime: Date;
              breakStartTime: Date;
              breakEndTime: Date;
              hoursWorked: number;
            }[];
          };
        },
        record
      ) => {
        const dateString = record.date.toISOString().split("T")[0];
        if (!acc[dateString]) {
          acc[dateString] = { date: record.date, records: [] };
        }
        acc[dateString].records.push(record);
        return acc;
      },
      {}
    );
    setAttendanceRecords(Object.values(groupedRecords));
  };

  const fetchHourlyRate = async () => {
    const rate = await getCurrentHourlyRate();
    setHourlyRate(rate);
    setNewHourlyRate(rate);
  };

  const calculateMonthlyWage = () => {
    return attendanceRecords.reduce(
      (total, group: { date: Date; records: AttendanceRecord[] }) =>
        total +
        group.records.reduce(
          (dayTotal: number, record: { hoursWorked: number | null }) =>
            dayTotal + (record.hoursWorked || 0) * hourlyRate,
          0
        ),
      0
    );
  };

  const handleHourlyRateChange = () => {
    setIsPasswordDialogOpen(true);
  };

  const confirmHourlyRateChange = async () => {
    if (password === "password") {
      const result = await updateHourlyRate(newHourlyRate);
      if (result.success) {
        setHourlyRate(newHourlyRate);
        setIsPasswordDialogOpen(false);
        setPassword("");
        toast({
          title: "時給更新",
          description: result.message,
        });
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "エラー",
        description: "パスワードが正しくありません。",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (record: {
    id: number;
    date: Date;
    clockInTime: Date;
    clockOutTime: Date | null;
    breakStartTime: Date | null;
    breakEndTime: Date | null;
    hoursWorked: number | null;
  }) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  // const handleEditSave = async () => {
  //   if (editingRecord) {
  //     const result = await updateAttendanceRecord(
  //       editingRecord.id,
  //       editingRecord
  //     );
  //     if (result.success) {
  //       setIsEditDialogOpen(false);
  //       setEditingRecord(null);
  //       fetchRecords();
  //       toast({
  //         title: "記録更新",
  //         description: result.message,
  //       });
  //     } else {
  //       toast({
  //         title: "エラー",
  //         description: result.message,
  //         variant: "destructive",
  //       });
  //     }
  //   }
  // };

  return {
    clockedIn,
    onBreak,
    breakTaken,
    hourlyRate,
    calculateMonthlyWage,
    currentMonth,
    attendanceRecords,
    isPasswordDialogOpen,
    isEditDialogOpen,
    password,
    newHourlyRate,
    editingRecord,
    setCurrentMonth,
    setIsPasswordDialogOpen,
    handleHourlyRateChange,
    confirmHourlyRateChange,
    handleEditClick,
    // handleEditSave,
    setPassword,
    setNewHourlyRate,
    setEditingRecord,
  };
};
