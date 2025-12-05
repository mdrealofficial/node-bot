import { useEffect, useState } from "react";

interface CountdownTimerProps {
  targetDate?: string;
  title?: string;
  subtitle?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const CountdownTimer = ({
  targetDate,
  title = "Limited Time Offer",
  subtitle = "Don't miss out on this amazing deal",
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
  isEditing,
  onUpdate,
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!targetDate) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary text-primary-foreground rounded-lg p-4 min-w-[80px] mb-2">
        <span className="text-4xl font-bold">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-sm text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className="px-4 py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4 text-foreground">{title}</h2>
        <p className="text-xl text-muted-foreground mb-12">{subtitle}</p>
        
        {targetDate ? (
          <div className="flex justify-center gap-4 flex-wrap">
            {showDays && <TimeUnit value={timeLeft.days} label="Days" />}
            {showHours && <TimeUnit value={timeLeft.hours} label="Hours" />}
            {showMinutes && <TimeUnit value={timeLeft.minutes} label="Minutes" />}
            {showSeconds && <TimeUnit value={timeLeft.seconds} label="Seconds" />}
          </div>
        ) : (
          <p className="text-muted-foreground">Set a target date to start the countdown</p>
        )}
      </div>
    </div>
  );
};
