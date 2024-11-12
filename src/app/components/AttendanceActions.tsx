import { Button } from "@/components/ui/button";
import { useAttendance } from "@/hooks/useAttendance";
import { recordAttendanceAction } from "../actions";

export const AttendanceActions = () => {
  const { clockedIn, onBreak, breakTaken } = useAttendance();

  return (
    <div>
      <Button
        onClick={() => recordAttendanceAction("clockIn")}
        disabled={clockedIn}
      >
        出勤
      </Button>
      <Button
        onClick={() => recordAttendanceAction("clockOut")}
        disabled={!clockedIn || onBreak}
      >
        退勤
      </Button>
      <Button
        onClick={() => recordAttendanceAction("breakStart")}
        disabled={!clockedIn || onBreak || breakTaken}
      >
        休憩開始
      </Button>
      <Button
        onClick={() => recordAttendanceAction("breakEnd")}
        disabled={!onBreak}
      >
        休憩終了
      </Button>
    </div>
  );
};
