export type QuestionEntry = {
  prompt: string;
  emoji: string;
  tint: "pink" | "yellow" | "blue" | "green";
};

export const QUESTION_POOL: QuestionEntry[] = [
  // Light and Cute
  { prompt: "What made you smile today?", emoji: "😊", tint: "pink" },
  { prompt: "What was one tiny thing I did recently that you appreciated?", emoji: "🌸", tint: "pink" },
  { prompt: "What song reminds you of us right now?", emoji: "🎵", tint: "yellow" },
  { prompt: "What is one thing you want us to do together this week?", emoji: "🌿", tint: "green" },
  { prompt: "What is your favorite ordinary moment with me?", emoji: "☕", tint: "yellow" },
  { prompt: "What emoji describes your mood today?", emoji: "💬", tint: "blue" },
  { prompt: "What is one thing you wish we did more often?", emoji: "✨", tint: "pink" },
  { prompt: "What is a small habit of mine that you secretly like?", emoji: "🤍", tint: "pink" },
  { prompt: "What would our perfect lazy Sunday look like?", emoji: "🌞", tint: "yellow" },
  { prompt: "What food feels like 'our' food?", emoji: "🍜", tint: "green" },

  // Emotional Check In
  { prompt: "How loved did you feel today?", emoji: "💕", tint: "pink" },
  { prompt: "What is something you need more of from me lately?", emoji: "🫂", tint: "blue" },
  { prompt: "What is something you have been holding in?", emoji: "💭", tint: "blue" },
  { prompt: "What made today hard for you?", emoji: "☁️", tint: "blue" },
  { prompt: "What made today better?", emoji: "🌈", tint: "yellow" },
  { prompt: "What is one way I can support you tomorrow?", emoji: "🙏", tint: "green" },
  { prompt: "Is there anything you wish I understood better?", emoji: "💌", tint: "pink" },
  { prompt: "What has been on your mind recently?", emoji: "🌙", tint: "blue" },
  { prompt: "What is something you are proud of yourself for?", emoji: "🌟", tint: "yellow" },
  { prompt: "What do you want reassurance about?", emoji: "🫶", tint: "pink" },

  // Relationship Reflection
  { prompt: "What is something we have gotten better at as a couple?", emoji: "💪", tint: "green" },
  { prompt: "What is one moment when you felt really close to me?", emoji: "💗", tint: "pink" },
  { prompt: "What is one thing we should protect in our relationship?", emoji: "🌿", tint: "green" },
  { prompt: "What is one pattern we should improve?", emoji: "🔄", tint: "blue" },
  { prompt: "What makes you feel safest with me?", emoji: "🏡", tint: "yellow" },
  { prompt: "What is one thing you think we do differently from other couples?", emoji: "✦", tint: "green" },
  { prompt: "What is a small tradition we should start?", emoji: "🎀", tint: "pink" },
  { prompt: "What is one thing you hope never changes about us?", emoji: "🕊️", tint: "blue" },
  { prompt: "What is one thing you want us to learn together?", emoji: "📚", tint: "yellow" },
  { prompt: "What does 'quality time' mean to you right now?", emoji: "⏳", tint: "green" },

  // Fun and Imaginative
  { prompt: "If we had a shared theme song, what would it be?", emoji: "🎶", tint: "pink" },
  { prompt: "If our relationship were a movie, what genre would it be?", emoji: "🎬", tint: "blue" },
  { prompt: "If we opened a cafe together, what would it be called?", emoji: "☕", tint: "yellow" },
  { prompt: "If we could teleport anywhere tonight, where would we go?", emoji: "✈️", tint: "blue" },
  { prompt: "What fictional couple are we most like?", emoji: "📖", tint: "pink" },
  { prompt: "What would our dream home have to include?", emoji: "🏠", tint: "green" },
  { prompt: "If we had a couple mascot, what would it be?", emoji: "🐾", tint: "yellow" },
  { prompt: "What would our couple superpower be?", emoji: "⚡", tint: "blue" },
  { prompt: "What is a random adventure you want to go on with me?", emoji: "🗺️", tint: "green" },
  { prompt: "What would our perfect anniversary day look like?", emoji: "🌸", tint: "pink" },

  // Deeper Love Questions
  { prompt: "When do you feel most loved by me?", emoji: "❤️", tint: "pink" },
  { prompt: "What does commitment mean to you?", emoji: "💍", tint: "blue" },
  { prompt: "What is something about love you believe now that you did not before?", emoji: "🌱", tint: "green" },
  { prompt: "What fear do you have in relationships?", emoji: "🫧", tint: "blue" },
  { prompt: "What kind of future do you imagine for us?", emoji: "🔭", tint: "yellow" },
  { prompt: "What is something you want us to build together?", emoji: "🏗️", tint: "green" },
  { prompt: "What makes you feel chosen?", emoji: "🌟", tint: "pink" },
  { prompt: "What do you think we bring out in each other?", emoji: "✨", tint: "yellow" },
  { prompt: "What does emotional intimacy mean to you?", emoji: "🤍", tint: "blue" },
  { prompt: "What is one promise you want us to keep?", emoji: "🎀", tint: "pink" },

  // Conflict and Repair
  { prompt: "What helps you calm down during conflict?", emoji: "🌬️", tint: "blue" },
  { prompt: "What makes conflict harder for you?", emoji: "⚡", tint: "yellow" },
  { prompt: "How do you prefer to be comforted after an argument?", emoji: "🫂", tint: "pink" },
  { prompt: "What is one thing I can do better when we disagree?", emoji: "💬", tint: "green" },
  { prompt: "What is one thing you want me to know about your triggers?", emoji: "💭", tint: "blue" },
  { prompt: "What does a good apology look like to you?", emoji: "🙏", tint: "pink" },
  { prompt: "What is something we handled well recently?", emoji: "💪", tint: "green" },
  { prompt: "What is one thing we should talk about before it becomes bigger?", emoji: "📝", tint: "yellow" },
  { prompt: "How can we make hard conversations feel safer?", emoji: "🕊️", tint: "blue" },
  { prompt: "What is one thing you want to forgive or let go of?", emoji: "🦋", tint: "green" },

  // Future and Growth
  { prompt: "What are you excited for in our future?", emoji: "🚀", tint: "yellow" },
  { prompt: "What is one goal you want us to work toward together?", emoji: "🎯", tint: "green" },
  { prompt: "What kind of couple do you want us to become?", emoji: "🌱", tint: "pink" },
  { prompt: "What is one life experience you want to share with me?", emoji: "🌍", tint: "blue" },
  { prompt: "What is something we should save up for?", emoji: "🪙", tint: "yellow" },
  { prompt: "What is a skill we should learn together?", emoji: "🎨", tint: "green" },
  { prompt: "What is one dream you want me to support?", emoji: "💫", tint: "pink" },
  { prompt: "Where do you see us one year from now?", emoji: "🗓️", tint: "blue" },
  { prompt: "What is one thing we should prioritize this month?", emoji: "📌", tint: "yellow" },
  { prompt: "What would make our relationship stronger this year?", emoji: "💪", tint: "green" },

  // Daily App Style Prompts
  { prompt: "Today, I felt closest to you when...", emoji: "💗", tint: "pink" },
  { prompt: "One thing I wanted to tell you today was...", emoji: "💬", tint: "blue" },
  { prompt: "I appreciated you today because...", emoji: "🌸", tint: "pink" },
  { prompt: "Tomorrow, I hope we...", emoji: "🌈", tint: "yellow" },
  { prompt: "A tiny memory from today I want to keep is...", emoji: "📷", tint: "green" },
  { prompt: "Something I noticed about you recently is...", emoji: "👀", tint: "blue" },
  { prompt: "I felt loved when...", emoji: "❤️", tint: "pink" },
  { prompt: "I missed you when...", emoji: "🌙", tint: "blue" },
  { prompt: "I want to thank you for...", emoji: "🙏", tint: "yellow" },
  { prompt: "My heart felt full when...", emoji: "🫶", tint: "pink" },

  // Spicy but Still Sweet
  { prompt: "What is one thing I do that makes you feel attracted to me?", emoji: "🌹", tint: "pink" },
  { prompt: "What kind of date makes you feel most connected?", emoji: "🕯️", tint: "yellow" },
  { prompt: "What is one compliment you want to hear more often?", emoji: "💌", tint: "pink" },
  { prompt: "What is one memory of us that still gives you butterflies?", emoji: "🦋", tint: "blue" },
  { prompt: "When do you feel most confident around me?", emoji: "✨", tint: "yellow" },
  { prompt: "What is one way we can make our relationship feel more romantic?", emoji: "🌷", tint: "pink" },
  { prompt: "What is one small gesture that feels intimate to you?", emoji: "🤍", tint: "blue" },
  { prompt: "What is something about me you find underrated?", emoji: "💫", tint: "green" },
  { prompt: "What is one romantic habit we should bring back?", emoji: "🌸", tint: "pink" },
  { prompt: "What makes you feel desired?", emoji: "🔥", tint: "yellow" },

  // Quick Daily Questions
  { prompt: "Rate your day from 1 to 10. Why?", emoji: "🌡️", tint: "blue" },
  { prompt: "What was your highlight today?", emoji: "⭐", tint: "yellow" },
  { prompt: "What was your low point today?", emoji: "☁️", tint: "blue" },
  { prompt: "What do you need tonight?", emoji: "🌙", tint: "green" },
  { prompt: "What are you grateful for today?", emoji: "🙏", tint: "yellow" },
  { prompt: "What is one word for your mood?", emoji: "💬", tint: "pink" },
  { prompt: "What is one thing you want to celebrate?", emoji: "🎉", tint: "yellow" },
  { prompt: "What is one thing you want to release?", emoji: "🕊️", tint: "blue" },
  { prompt: "What do you want from tomorrow?", emoji: "🌅", tint: "green" },
  { prompt: "What should we remember about today?", emoji: "📝", tint: "pink" },
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
