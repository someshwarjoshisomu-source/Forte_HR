// utils/insightsAI.ts

// ---------------------------------------------------------
//  🚀 OFFLINE AI MODE (No API key required)
//  This generates realistic insights locally using rules.
// ---------------------------------------------------------

// Generic fallback generator (like an AI summary)
function fallbackAI(text: string) {
    return `🔍 Insight:\n${text}`;
  }
  
  // ---------------- HR INSIGHTS ----------------
  export function getHRInsight(data: any) {
    const total = data.totalEmployees || 0;
    const engagement = data.avgEngagement || 0;
    const risk = data.highRisk || 0;
    const sad = data.sadMoodsLast7Days || 0;
    const recognitions = data.recognitionsLast30 || 0;
  
    return `
  • The organization has ${total} active employees.
  • Engagement remains stable at ${engagement}% across teams.
  • ${risk} employees show elevated attrition risk.
  • ${sad} sad mood entries were logged in the past week.
  • ${recognitions} recognition messages were shared recently.
    `.trim();
  }
  
  // ---------------- MANAGER INSIGHTS ----------------
  export function getManagerInsight(data: any) {
    const team = data.teamSize || 0;
    const engagement = data.avgEngagement || 0;
    const sad = data.sadMoods || 0;
    const rec = data.recognitionCount || 0;
  
    return `
  • Your team has ${team} members with an avg engagement of ${engagement}%.
  • ${sad} negative mood entries detected — consider checking in with the team.
  • ${rec} recognitions shared this month, indicating collaboration strength.
    `.trim();
  }
  
  // ---------------- EMPLOYEE INSIGHTS ----------------
  export function getEmployeeInsight(data: any) {
    const lastMood = data.lastMood || "neutral";
    const happy = data.happyCount || 0;
    const neutral = data.neutralCount || 0;
    const sad = data.sadCount || 0;
  
    if (lastMood === "happy") {
      return `Great energy today! You've logged ${happy} happy check-ins this month — keep it up!`;
    }
  
    if (lastMood === "sad") {
      return `It's okay to have tough days. You've had ${sad} sad check-ins. Take breaks and look after yourself.`;
    }
  
    return `A balanced day. With ${neutral} neutral check-ins, try mindful pauses to stay energized.`;
  }
  