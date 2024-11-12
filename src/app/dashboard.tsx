"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  recordAttendanceAction,
  fetchAttendanceRecords,
  getCurrentHourlyRate,
  updateHourlyRate,
} from "./actions";

type AttendanceRecord = {
  id: string;
  date: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  hoursWorked: number | null;
  note: string | null;
};

type GroupedAttendanceRecord = {
  date: Date;
  records: AttendanceRecord[];
};

export default function Dashboard() {
  const [clockedIn, setClockedIn] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [breakTaken, setBreakTaken] = useState(false); // 新しい状態変数
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hourlyRate, setHourlyRate] = useState(1000);
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

  useEffect(() => {
    fetchRecords();
    fetchHourlyRate();
  }, [currentMonth]);

  const fetchRecords = async () => {
    const records = await fetchAttendanceRecords(currentMonth);
    const groupedRecords = records.reduce((acc, record) => {
      const dateString = record.date.toISOString().split("T")[0];
      if (!acc[dateString]) {
        acc[dateString] = { date: record.date, records: [] };
      }
      acc[dateString].records.push(record);
      return acc;
    }, {} as Record<string, GroupedAttendanceRecord>);
    setAttendanceRecords(Object.values(groupedRecords));
  };

  const fetchHourlyRate = async () => {
    const rate = await getCurrentHourlyRate();
    setHourlyRate(rate);
    setNewHourlyRate(rate);
  };

  const recordAction = async (
    action: "clockIn" | "clockOut" | "breakStart" | "breakEnd"
  ) => {
    const result = await recordAttendanceAction(action);
    if (result.success) {
      toast({
        title: "アクション記録",
        description: result.message,
      });
      updateAttendanceState(action);
      fetchRecords();
    } else {
      toast({
        title: "エラー",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // const getActionName = (action: string): string => {
  //   switch (action) {
  //     case "clockIn":
  //       return "出勤";
  //     case "clockOut":
  //       return "退勤";
  //     case "breakStart":
  //       return "休憩開始";
  //     case "breakEnd":
  //       return "休憩終了";
  //     default:
  //       return "アクション";
  //   }
  // };

  const updateAttendanceState = (action: string) => {
    switch (action) {
      case "clockIn":
        setClockedIn(true);
        setBreakTaken(false); // 新しい勤務が開始されたときに休憩状態をリセット
        break;
      case "clockOut":
        setClockedIn(false);
        setOnBreak(false);
        setBreakTaken(false); // 退勤時に休憩状態をリセット
        break;
      case "breakStart":
        setOnBreak(true);
        setBreakTaken(true); // 休憩開始時に休憩済みフラグを立てる
        break;
      case "breakEnd":
        setOnBreak(false);
        break;
    }
  };

  const calculateMonthlyWage = () => {
    return attendanceRecords.reduce(
      (total, group) =>
        total +
        group.records.reduce(
          (dayTotal, record) =>
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

  const generateSVG = () => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="${
        100 +
        attendanceRecords.reduce(
          (total, group) => total + group.records.length * 30,
          0
        )
      }" style="font-family: Arial, sans-serif;">
        <rect width="100%" height="100%" fill="#f0f0f0" />
        <text x="10" y="30" font-size="20" font-weight="bold">勤怠記録</text>
        <line x1="10" y1="40" x2="790" y2="40" stroke="black" stroke-width="1" />
        <text x="10" y="60" font-size="14">日付</text>
        <text x="100" y="60" font-size="14">出勤</text>
        <text x="200" y="60" font-size="14">退勤</text>
        <text x="300" y="60" font-size="14">休憩時間</text>
        <text x="450" y="60" font-size="14">勤務時間</text>
        <line x1="10" y1="70" x2="790" y2="70" stroke="black" stroke-width="1" />
        ${attendanceRecords
          .map((group, groupIndex) =>
            group.records
              .map(
                (record, recordIndex) => `
            <text x="10" y="${
              90 + groupIndex * 30 + recordIndex * 30
            }" font-size="12">${record.date.toLocaleDateString()}</text>
            <text x="100" y="${
              90 + groupIndex * 30 + recordIndex * 30
            }" font-size="12">${
                  record.clockIn?.toLocaleTimeString() || "-"
                }</text>
            <text x="200" y="${
              90 + groupIndex * 30 + recordIndex * 30
            }" font-size="12">${
                  record.clockOut?.toLocaleTimeString() || "-"
                }</text>
            <text x="300" y="${
              90 + groupIndex * 30 + recordIndex * 30
            }" font-size="12">${
                  record.breakStart && record.breakEnd
                    ? `${record.breakStart.toLocaleTimeString()} - ${record.breakEnd.toLocaleTimeString()}`
                    : "-"
                }</text>
            <text x="450" y="${
              90 + groupIndex * 30 + recordIndex * 30
            }" font-size="12">${
                  record.hoursWorked?.toFixed(2) || "-"
                }時間</text>
          `
              )
              .join("")
          )
          .join("")}
      </svg>
    `;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "勤怠記録.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEditClick = (record: AttendanceRecord) => {
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

  const changeMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-4'>勤怠管理ダッシュボード</h1>

      <Card className='mb-4'>
        <CardHeader>
          <CardTitle>勤怠アクション</CardTitle>
        </CardHeader>
        <CardContent className='flex gap-2'>
          <Button onClick={() => recordAction("clockIn")} disabled={clockedIn}>
            出勤
          </Button>
          <Button
            onClick={() => recordAction("clockOut")}
            disabled={!clockedIn || onBreak}
          >
            退勤
          </Button>
          <Button
            onClick={() => recordAction("breakStart")}
            disabled={!clockedIn || onBreak || breakTaken}
          >
            休憩開始
          </Button>
          <Button onClick={() => recordAction("breakEnd")} disabled={!onBreak}>
            休憩終了
          </Button>
        </CardContent>
      </Card>

      <Card className='mb-4'>
        <CardHeader>
          <CardTitle>時給設定</CardTitle>
        </CardHeader>
        <CardContent className='flex items-center gap-2'>
          <Input
            type='number'
            value={newHourlyRate}
            onChange={(e) => setNewHourlyRate(Number(e.target.value))}
            className='w-32'
          />
          <span>円/時</span>
          <Button onClick={handleHourlyRateChange}>更新</Button>
        </CardContent>
      </Card>

      <Card className='mb-4'>
        <CardHeader>
          <CardTitle>月の給与</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-2xl font-bold'>
            {calculateMonthlyWage().toLocaleString()}円
          </p>
        </CardContent>
      </Card>

      <Card className='mb-4'>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>勤怠記録</span>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='icon'
                onClick={() => changeMonth("prev")}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span>
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              <Button
                variant='outline'
                size='icon'
                onClick={() => changeMonth("next")}
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>出勤時間</TableHead>
                <TableHead>退勤時間</TableHead>
                <TableHead>休憩時間</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>編集</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.map((group) =>
                group.records.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {index === 0 ? record.date.toLocaleDateString() : ""}
                    </TableCell>
                    <TableCell>
                      {record.clockIn?.toLocaleTimeString() || "-"}
                    </TableCell>
                    <TableCell>
                      {record.clockOut?.toLocaleTimeString() || "-"}
                    </TableCell>
                    <TableCell>
                      {record.breakStart && record.breakEnd
                        ? `${record.breakStart.toLocaleTimeString()} - ${record.breakEnd.toLocaleTimeString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.hoursWorked?.toFixed(2) || "-"}時間
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleEditClick(record)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Button onClick={generateSVG} className='mt-4'>
            <Download className='mr-2 h-4 w-4' />
            SVGでダウンロード
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>時給変更の確認</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='password' className='text-right'>
                パスワード
              </Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='col-span-3'
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmHourlyRateChange}>確認</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>勤怠記録の編集</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-date' className='text-right'>
                  日付
                </Label>
                <Input
                  id='edit-date'
                  type='date'
                  value={editingRecord.date.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      date: new Date(e.target.value),
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-clockIn' className='text-right'>
                  出勤時間
                </Label>
                <Input
                  id='edit-clockIn'
                  type='time'
                  value={
                    editingRecord.clockIn?.toTimeString().slice(0, 5) || ""
                  }
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      clockIn: e.target.value
                        ? new Date(
                            `${editingRecord.date.toDateString()} ${
                              e.target.value
                            }`
                          )
                        : null,
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-clockOut' className='text-right'>
                  退勤時間
                </Label>
                <Input
                  id='edit-clockOut'
                  type='time'
                  value={
                    editingRecord.clockOut?.toTimeString().slice(0, 5) || ""
                  }
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      clockOut: e.target.value
                        ? new Date(
                            `${editingRecord.date.toDateString()} ${
                              e.target.value
                            }`
                          )
                        : null,
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-breakStart' className='text-right'>
                  休憩開始
                </Label>
                <Input
                  id='edit-breakStart'
                  type='time'
                  value={
                    editingRecord.breakStart?.toTimeString().slice(0, 5) || ""
                  }
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      breakStart: e.target.value
                        ? new Date(
                            `${editingRecord.date.toDateString()} ${
                              e.target.value
                            }`
                          )
                        : null,
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-breakEnd' className='text-right'>
                  休憩終了
                </Label>
                <Input
                  id='edit-breakEnd'
                  type='time'
                  value={
                    editingRecord.breakEnd?.toTimeString().slice(0, 5) || ""
                  }
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      breakEnd: e.target.value
                        ? new Date(
                            `${editingRecord.date.toDateString()} ${
                              e.target.value
                            }`
                          )
                        : null,
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-hoursWorked' className='text-right'>
                  勤務時間
                </Label>
                <Input
                  id='edit-hoursWorked'
                  type='number'
                  value={editingRecord.hoursWorked || ""}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      hoursWorked: Number(e.target.value),
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-note' className='text-right'>
                  備考 *
                </Label>
                <Textarea
                  id='edit-note'
                  value={editingRecord.note || ""}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, note: e.target.value })
                  }
                  className='col-span-3'
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                // handleEditSave();
              }}
              disabled={!editingRecord || !editingRecord.note}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
