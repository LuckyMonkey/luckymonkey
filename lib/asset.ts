/** Prefix a public/ path with the app's base path (e.g. /luckymonkey). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`

/** Every sprite the world uses, loaded up front on the welcome screen. */
export const SPRITES = {
  grass: ["grass1", "grass2", "grass3", "grass4"],
  water: ["water", "water1", "water3", "water4", "water5"],
  lava: ["lava1", "lava2", "lava3", "lava4", "lava_tile"],
  temple: ["temple_tile"],
} as const

export const spriteUrl = (name: string) => asset(`/sprites/${name}.png`)
export const ALL_SPRITE_URLS = Object.values(SPRITES).flat().map(spriteUrl)
