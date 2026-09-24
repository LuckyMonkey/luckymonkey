export interface CloudData {
  id: string
  x: number
  y: number
  size: "small" | "medium" | "large"
  speed: "slow" | "medium" | "fast"
  direction: "clockwise" | "counterclockwise"
  type: "normal" | "storm" | "rain"
  emoji: string
}

// Cloud positions - centered more around the middle of the viewport
// Will move with map when panning
export const cloudData: CloudData[] = [
  // Central clouds (more visible)
  {
    id: "cloud-1",
    x: 50,
    y: 150,
    size: "large",
    speed: "slow",
    direction: "clockwise",
    type: "normal",
    emoji: "☁️",
  },
  {
    id: "cloud-2",
    x: -100,
    y: 200,
    size: "medium",
    speed: "medium",
    direction: "counterclockwise",
    type: "normal",
    emoji: "☁️",
  },
  {
    id: "cloud-3",
    x: 200,
    y: 100,
    size: "small",
    speed: "fast",
    direction: "clockwise",
    type: "rain",
    emoji: "🌧️",
  },
  // Upper area
  {
    id: "cloud-4",
    x: -180,
    y: 50,
    size: "medium",
    speed: "slow",
    direction: "counterclockwise",
    type: "storm",
    emoji: "⛈️",
  },
  {
    id: "cloud-5",
    x: 150,
    y: 250,
    size: "small",
    speed: "medium",
    direction: "clockwise",
    type: "storm",
    emoji: "⛈️",
  },
  // Spread around
  {
    id: "cloud-6",
    x: -50,
    y: 300,
    size: "large",
    speed: "fast",
    direction: "counterclockwise",
    type: "rain",
    emoji: "🌧️",
  },
  {
    id: "cloud-7",
    x: 280,
    y: 180,
    size: "medium",
    speed: "medium",
    direction: "clockwise",
    type: "normal",
    emoji: "☁️",
  },
  {
    id: "cloud-8",
    x: -250,
    y: 220,
    size: "small",
    speed: "slow",
    direction: "counterclockwise",
    type: "normal",
    emoji: "☁️",
  },
]
