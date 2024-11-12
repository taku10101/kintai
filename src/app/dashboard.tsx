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
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  recordAttendanceAction,
  fetchAttendanceRecords,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getCurrentHourlyRate,
  updateHourlyRate,
} from "./actions";

type AttendanceRecord = {
  id: string;
  date: Date;
  action: string;
  actionTime: Date;
  note: string | null;
};

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hourlyRate, setHourlyRate] = useState(1000);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
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
    setAttendanceRecords(records);
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
      fetchRecords();
    } else {
      toast({
        title: "エラー",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const getActionName = (action: string): string => {
    switch (action) {
      case "clockIn":
        return "出勤";
      case "clockOut":
        return "退勤";
      case "breakStart":
        return "休憩開始";
      case "breakEnd":
        return "休憩終了";
      default:
        return "アクション";
    }
  };

  const calculateMonthlyWage = () => {
    let totalHours = 0;
    let currentClockIn: Date | null = null;

    attendanceRecords.forEach((record, index) => {
      if (record.action === "clockIn") {
        currentClockIn = record.actionTime;
      } else if (record.action === "clockOut" && currentClockIn) {
        const hours =
          (record.actionTime.getTime() - currentClockIn.getTime()) /
          (1000 * 60 * 60);
        totalHours += hours;
        currentClockIn = null;
      }
    });

    return totalHours * hourlyRate;
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
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="${
        100 + attendanceRecords.length * 30
      }" style="font-family: Arial, sans-serif;">
        <rect width="100%" height="100%" fill="#f0f0f0" />
        <text x="10" y="30" font-size="20" font-weight="bold">勤怠記録</text>
        <line x1="10" y1="40" x2="590" y2="40" stroke="black" stroke-width="1" />
        <text x="10" y="60" font-size="14">日付</text>
        <text x="100" y="60" font-size="14">アクション</text>
        <text x="200" y="60" font-size="14">時間</text>
        <text x="300" y="60" font-size="14">備考</text>
        <line x1="10" y1="70" x2="590" y2="70" stroke="black" stroke-width="1" />
        ${attendanceRecords
          .map(
            (record, index) => `
          <text x="10" y="${
            90 + index * 30
          }" font-size="12">${record.date.toLocaleDateString()}</text>
          <text x="100" y="${90 + index * 30}" font-size="12">${getActionName(
              record.action
            )}</text>
          <text x="200" y="${
            90 + index * 30
          }" font-size="12">${record.actionTime.toLocaleTimeString()}</text>
          <text x="300" y="${90 + index * 30}" font-size="12">${
              record.note || "-"
            }</text>
        `
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

  const handleEditSave = async () => {
    if (editingRecord) {
      const result = await updateAttendanceRecord(
        editingRecord.id,
        editingRecord
      );
      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingRecord(null);
        fetchRecords();
        toast({
          title: "記録更新",
          description: result.message,
        });
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("この記録を削除してもよろしいですか？")) {
      const result = await deleteAttendanceRecord(id);
      if (result.success) {
        fetchRecords();
        toast({
          title: "記録削除",
          description: result.message,
        });
      } else {
        toast({
          title: "エラー",
          description: result.message,
          variant: "destructive",
        });
      }
    }
  };

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
          <Button onClick={() => recordAction("clockIn")}>出勤</Button>
          <Button onClick={() => recordAction("clockOut")}>退勤</Button>
          <Button onClick={() => recordAction("breakStart")}>休憩開始</Button>
          <Button onClick={() => recordAction("breakEnd")}>休憩終了</Button>
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
                <TableHead>アクション</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>備考</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString()}</TableCell>
                  <TableCell>{getActionName(record.action)}</TableCell>
                  <TableCell>
                    {record.actionTime.toLocaleTimeString()}
                  </TableCell>
                  <TableCell>{record.note || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleEditClick(record)}
                      className='mr-2'
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDeleteClick(record.id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
                <Label htmlFor='edit-action' className='text-right'>
                  アクション
                </Label>
                <Input
                  id='edit-action'
                  value={getActionName(editingRecord.action)}
                  disabled
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-actionTime' className='text-right'>
                  時間
                </Label>
                <Input
                  id='edit-actionTime'
                  type='time'
                  value={editingRecord.actionTime.toTimeString().slice(0, 5)}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      actionTime: new Date(
                        `${editingRecord.date.toDateString()} ${e.target.value}`
                      ),
                    })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='edit-note' className='text-right'>
                  備考
                </Label>
                <Textarea
                  id='edit-note'
                  value={editingRecord.note || ""}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, note: e.target.value })
                  }
                  className='col-span-3'
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
