export const powers = {
  drink_me: {
    label: "Drink Me",
    icon: "⚗",
    duration: 4,
    height: 0.6,
    speed: 1.1,
  },
  eat_me: {
    label: "Eat Me",
    icon: "♛",
    duration: 4,
    eyes: 2,
    fov: 10,
    speed: 1.4,
    jump: 1.3,
  },
  flamingo: { label: "Flamingo", icon: "↗", duration: 0, launch: 22, lift: 4 },
  hatter_hop: { label: "Hatter Hop", icon: "♞", duration: 5, jumps: 3 },
  tea_time: { label: "Tea Time", icon: "◷", duration: 3, scale: 0.4 },
  cheshire: { label: "Cheshire", icon: "♢", duration: 5 },
};
export type PowerId = keyof typeof powers;
