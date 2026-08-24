// Smart Scheduler Engine (Rule-based)

export interface ParsedTask {
  title: string;
  estimatedMinutes: number;
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
}

export function parseNaturalLanguageTask(input: string): ParsedTask {
  // Simple heuristic parsing
  let estimatedMinutes = 30; // default
  let priority: "low" | "medium" | "high" = "medium";
  let dueDate = null;
  
  const lowerInput = input.toLowerCase();

  // Parse time
  const minMatch = lowerInput.match(/(\d+)\s*(m|min|mins|minutes)/);
  if (minMatch) {
    estimatedMinutes = parseInt(minMatch[1], 10);
  }
  
  const hrMatch = lowerInput.match(/(\d+)\s*(h|hr|hrs|hours)/);
  if (hrMatch) {
    estimatedMinutes = parseInt(hrMatch[1], 10) * 60;
  }

  // Parse priority
  if (lowerInput.includes("urgent") || lowerInput.includes("high priority") || lowerInput.includes("asap")) {
    priority = "high";
  } else if (lowerInput.includes("low priority") || lowerInput.includes("whenever")) {
    priority = "low";
  }

  // Parse due date (basic "today", "tomorrow")
  if (lowerInput.includes("today")) {
    dueDate = new Date();
  } else if (lowerInput.includes("tomorrow")) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
  }

  return {
    title: input.trim(),
    estimatedMinutes,
    priority,
    dueDate,
  };
}

export interface TimeBlock {
  id: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
}

export function optimizeSchedule(
  tasks: Array<{ id: string; priority: string; estimatedMinutes: number }>,
  availableHours: number[]
): TimeBlock[] {
  // Mock optimization: greedily assign high priority tasks to earlier hours
  const blocks: TimeBlock[] = [];
  
  // Sort by priority
  const sorted = [...tasks].sort((a, b) => {
    const pVal = { high: 3, medium: 2, low: 1 };
    return pVal[b.priority as keyof typeof pVal] - pVal[a.priority as keyof typeof pVal];
  });

  const currentHourIdx = 0;
  const currentDate = new Date();
  currentDate.setHours(availableHours[0], 0, 0, 0);

  sorted.forEach(task => {
    if (currentHourIdx < availableHours.length) {
      const startTime = new Date(currentDate);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + task.estimatedMinutes);

      blocks.push({
        id: Math.random().toString(36).substring(7),
        taskId: task.id,
        startTime,
        endTime
      });

      // advance time
      currentDate.setMinutes(currentDate.getMinutes() + task.estimatedMinutes);
    }
  });

  return blocks;
}
