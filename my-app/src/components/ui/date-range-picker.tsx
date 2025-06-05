"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  // Convert DateRange to datetime-local string format
  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return "";
    return date.toISOString().slice(0, 16); // Format: "YYYY-MM-DDTHH:mm"
  };

  // Handle start date change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value ? new Date(e.target.value) : undefined;
    onDateChange({
      from: newStartDate,
      to: date?.to,
    });
  };

  // Handle end date change
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value ? new Date(e.target.value) : undefined;
    onDateChange({
      from: date?.from,
      to: newEndDate,
    });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {date.from.toLocaleDateString()} -{" "}
                  {date.to.toLocaleDateString()}
                </>
              ) : (
                date.from.toLocaleDateString()
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="relative">
                <label className="text-sm font-medium mb-1 block">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(date?.from)}
                  onChange={handleStartDateChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                <CalendarIcon className="absolute left-3 top-[60%] transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="relative">
                <label className="text-sm font-medium mb-1 block">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(date?.to)}
                  min={formatDateForInput(date?.from)}
                  onChange={handleEndDateChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                <CalendarIcon className="absolute left-3 top-[60%] transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
