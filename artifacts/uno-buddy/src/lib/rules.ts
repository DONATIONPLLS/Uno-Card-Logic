export interface RuleEntry {
  id: string;
  category: string;
  title: string;
  body: string;
  keywords?: string[];
}

export const RULES: RuleEntry[] = [
  {
    id: "setup",
    category: "Setup",
    title: "Dealing the cards",
    body: "Each player is dealt 7 cards. The remaining cards form the Draw Pile. The top card of the Draw Pile is flipped over to start the Discard Pile.",
    keywords: ["deal", "start", "begin"],
  },
  {
    id: "objective",
    category: "Setup",
    title: "Objective",
    body: "Be the first player to get rid of all your cards in each round. The first player to reach 500 points (across rounds) wins the match.",
    keywords: ["win", "goal", "score"],
  },
  {
    id: "match",
    category: "Play",
    title: "Matching cards",
    body: "On your turn, play a card that matches the top of the Discard Pile by COLOR or by NUMBER/SYMBOL. If you can't, draw one card from the Draw Pile.",
    keywords: ["match", "color", "number"],
  },
  {
    id: "skip",
    category: "Action Cards",
    title: "Skip",
    body: "The next player loses their turn. Color-matching still applies.",
    keywords: ["skip"],
  },
  {
    id: "reverse",
    category: "Action Cards",
    title: "Reverse",
    body: "Reverses the direction of play. With only 2 players, Reverse acts like a Skip.",
    keywords: ["reverse", "direction"],
  },
  {
    id: "draw2",
    category: "Action Cards",
    title: "Draw Two (+2)",
    body: "The next player draws 2 cards and loses their turn (unless House Rule stacking is enabled).",
    keywords: ["draw 2", "+2"],
  },
  {
    id: "wild",
    category: "Wild Cards",
    title: "Wild",
    body: "Play this anytime. The player who plays it chooses the next color in play.",
    keywords: ["wild", "color change"],
  },
  {
    id: "wild4",
    category: "Wild Cards",
    title: "Wild Draw Four (+4)",
    body: "The next player draws 4 cards, loses their turn, and you choose the next color. Officially, you can only play this if you have NO other card matching the current color.",
    keywords: ["wild 4", "+4", "draw 4"],
  },
  {
    id: "uno",
    category: "Calling UNO",
    title: 'Calling "UNO!"',
    body: 'When you have one card left, you must call out "UNO!" before your card touches the Discard Pile. If you forget and another player catches you, you must draw 2 cards as a penalty.',
    keywords: ["uno", "call", "penalty"],
  },
  {
    id: "scoring",
    category: "Scoring",
    title: "Scoring after a round",
    body: "When a player goes out, they score points from the cards left in opponents' hands. Number cards = face value. Action cards (Skip, Reverse, +2) = 20 pts. Wild & Wild +4 = 50 pts.",
    keywords: ["score", "points"],
  },
  {
    id: "faq-end-wild",
    category: "FAQ",
    title: "Can I end the round on a Wild card?",
    body: "Yes — you can end on any card, including a Wild or Wild +4. (Some house rules disallow this; check what your group plays.)",
    keywords: ["end", "last card", "wild"],
  },
  {
    id: "faq-stack",
    category: "FAQ",
    title: "Can I stack +2 / +4 cards?",
    body: "Officially, NO. Stacking is a popular house rule but not in the official rulebook. Toggle 'Allow Stacking' in Setup to enable it.",
    keywords: ["stack", "stacking", "+2", "+4"],
  },
  {
    id: "faq-jumpin",
    category: "FAQ",
    title: "What is Jump-in?",
    body: "House rule: if any player holds the EXACT same card (color + number) as the top of the discard pile, they may play it out of turn. Toggle 'Jump-in play' in Setup.",
    keywords: ["jump", "out of turn"],
  },
  {
    id: "faq-draw",
    category: "FAQ",
    title: "Do I have to play the card I just drew?",
    body: "Officially: if the drawn card is playable, you may play it immediately, otherwise play passes. Some groups force you to play it (Force Play).",
    keywords: ["draw", "play after draw"],
  },
];
