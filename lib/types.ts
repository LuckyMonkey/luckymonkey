export interface Position {
  x: number
  y: number
}

export interface NodeType {
  id: string
  name: string
  type: string
  description: string
  position: Position
  status?: "online" | "offline" | "unstable"
  connections?: string[]
}
