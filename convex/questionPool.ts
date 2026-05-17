export type QuestionEntry = {
  prompt: string;
  emoji: string;
  tint: "pink" | "yellow" | "blue" | "green";
};

export const QUESTION_POOL: QuestionEntry[] = [
  { prompt: "What's a small thing I do that secretly makes you smile?", emoji: "😊", tint: "pink" },
  { prompt: "If we could teleport anywhere right now, where would you choose?", emoji: "✈️", tint: "blue" },
  { prompt: "What's your favourite memory of us from the last month?", emoji: "🌸", tint: "pink" },
  { prompt: "What song reminds you of us the most?", emoji: "🎵", tint: "yellow" },
  { prompt: "What's one thing you wish we did more often together?", emoji: "🌿", tint: "green" },
  { prompt: "Describe our relationship in exactly three words.", emoji: "💬", tint: "blue" },
  { prompt: "What's a dream trip you'd love us to plan together?", emoji: "🗺️", tint: "yellow" },
  { prompt: "What's something you learned about yourself from being with me?", emoji: "🌱", tint: "green" },
  { prompt: "If today were our last day together, what would you want to do?", emoji: "💗", tint: "pink" },
  { prompt: "What's a little ritual of ours that you treasure?", emoji: "☕", tint: "yellow" },
  { prompt: "What's the funniest moment we've shared?", emoji: "😂", tint: "blue" },
  { prompt: "What does 'home' mean to you?", emoji: "🏡", tint: "green" },
  { prompt: "If we could have dinner anywhere in the world, where?", emoji: "🍽️", tint: "yellow" },
  { prompt: "What's a book, film or show you'd love for us to experience together?", emoji: "📚", tint: "blue" },
  { prompt: "What quality do you admire most in me?", emoji: "✨", tint: "pink" },
  { prompt: "What would you do with a full free Saturday together?", emoji: "🌞", tint: "yellow" },
  { prompt: "What's something you've never told me but want to share?", emoji: "🤍", tint: "blue" },
  { prompt: "What's a small act of kindness I can do for you tomorrow?", emoji: "🎀", tint: "pink" },
  { prompt: "What's one thing you're grateful for about us today?", emoji: "🙏", tint: "green" },
  { prompt: "What's a childhood memory you'd love to share with me?", emoji: "🎠", tint: "yellow" },
  { prompt: "If we had a theme song, what would it be?", emoji: "🎶", tint: "pink" },
  { prompt: "What's a new hobby you'd like us to try together?", emoji: "🎨", tint: "blue" },
  { prompt: "What does a perfect morning look like for you?", emoji: "🌄", tint: "yellow" },
  { prompt: "What's something I do that makes you feel most loved?", emoji: "💕", tint: "pink" },
  { prompt: "Where do you see us in five years?", emoji: "🔭", tint: "green" },
  { prompt: "What's a challenge we've overcome together that made us stronger?", emoji: "💪", tint: "blue" },
  { prompt: "What's a city you've always wanted to explore?", emoji: "🏙️", tint: "yellow" },
  { prompt: "What's the kindest thing a stranger has ever done for you?", emoji: "🌟", tint: "green" },
  { prompt: "What's your love language, and has it changed since we met?", emoji: "❤️", tint: "pink" },
  { prompt: "What's a comfort food that always cheers you up?", emoji: "🍜", tint: "yellow" },
  { prompt: "What's one thing on your personal bucket list?", emoji: "🪣", tint: "blue" },
  { prompt: "What's something small that happened today that you want to remember?", emoji: "📝", tint: "green" },
  { prompt: "What's a trait you hope we pass on (or have already)?", emoji: "🌺", tint: "pink" },
  { prompt: "If money were no object, what gift would you give me?", emoji: "🎁", tint: "yellow" },
  { prompt: "What makes you feel most at peace?", emoji: "🕊️", tint: "blue" },
  { prompt: "What's a fear you've overcome since we've been together?", emoji: "🦋", tint: "green" },
  { prompt: "What's the most spontaneous thing you'd want us to do together?", emoji: "🎲", tint: "pink" },
  { prompt: "What's a simple pleasure you never want to take for granted?", emoji: "☀️", tint: "yellow" },
  { prompt: "Which season best describes how you feel about us?", emoji: "🍂", tint: "blue" },
  { prompt: "What's a tradition from your family you'd love to keep?", emoji: "🎄", tint: "green" },
  { prompt: "What was your first impression of me?", emoji: "🤔", tint: "pink" },
  { prompt: "What's something you're looking forward to this week?", emoji: "🌈", tint: "yellow" },
  { prompt: "If you could relive one day with me, which would it be?", emoji: "⏳", tint: "blue" },
  { prompt: "What's a compliment you've always wanted to give me but haven't?", emoji: "💌", tint: "pink" },
  { prompt: "What's something about our future that excites you most?", emoji: "🚀", tint: "green" },
  { prompt: "What's a small annoyance in life that I help make easier?", emoji: "🛠️", tint: "yellow" },
  { prompt: "What's the most beautiful place you've ever been?", emoji: "🏔️", tint: "blue" },
  { prompt: "What's a question you've always wanted to ask me?", emoji: "❓", tint: "pink" },
  { prompt: "What does a perfect evening at home look like to you?", emoji: "🌙", tint: "green" },
  { prompt: "What's one word you'd use to describe this chapter of our life?", emoji: "📖", tint: "yellow" },
];

export function pickForDay(spaceId: string, date: string): number[] {
  const seed = `${spaceId}:${date}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  const picks: number[] = [];
  let cur = h;
  while (picks.length < 3) {
    const idx = Math.abs(cur) % QUESTION_POOL.length;
    if (!picks.includes(idx)) picks.push(idx);
    cur = ((cur << 5) + cur + 17) | 0;
  }
  return picks;
}
