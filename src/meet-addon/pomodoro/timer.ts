type PomodoroOptions = {
  workMinutes?: number;
  breakMinutes?: number;
  onTick?: (secondsLeft: number, isBreak: boolean) => void;
  onCycleComplete?: (cycles: number) => void;
};

export function startPomodoro({
  workMinutes = 25,
  breakMinutes = 5,
  onTick,
  onCycleComplete,
}: PomodoroOptions): () => void {
  let isBreak = false;
  let cycles = 0;
  let secondsLeft = workMinutes * 60;

  const timer = window.setInterval(() => {
    secondsLeft -= 1;
    onTick?.(secondsLeft, isBreak);
    if (secondsLeft > 0) return;

    if (!isBreak) {
      cycles += 1;
      onCycleComplete?.(cycles);
      isBreak = true;
      secondsLeft = breakMinutes * 60;
      return;
    }

    isBreak = false;
    secondsLeft = workMinutes * 60;
  }, 1000);

  return () => window.clearInterval(timer);
}
