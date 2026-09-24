// Define the structure of a map section
import { cloudData } from "./cloud-types"

export interface MapSection {
  id: string
  name: string
  description: string
  basePosition: { x: number; y: number }
  baseHeight: number
  connections: {
    north: boolean
    northeast: boolean
    east: boolean
    southeast: boolean
    south: boolean
    southwest: boolean
    west: boolean
    northwest: boolean
  }
  tiles: {
    x: number
    y: number
    type: number // 0: grass, 1: water, 2: sand, 3: path, 4: platform, 5: connection point, 6: volcano
    height: number
  }[]
  nodes: {
    id: string
    name: string
    type: string
    emoji: string
    x: number
    y: number
    height: number
    description: string
    status: "online" | "offline" | "unstable" | "erupting"
    ipAddress: string
    securityLevel: number
    connections: string[]
    assets?: string[]
  }[]
  decorations: {
    type: string
    x: number
    y: number
    height: number
  }[]
  hasRiver: boolean
}

// Generate a dense grid of tiles for each section to avoid black spaces
function generateSectionTiles(
  width: number,
  height: number,
  type: number,
  baseHeight: number,
  heightVariation = false,
): { x: number; y: number; type: number; height: number }[] {
  const tiles: { x: number; y: number; type: number; height: number }[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Add height variation if requested
      let tileHeight = baseHeight
      if (heightVariation) {
        // Create hills with varying heights
        const distFromCenter = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2))
        const maxDist = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2))
        const heightFactor = 1 - distFromCenter / maxDist

        // Add some randomness to height
        const randomFactor = Math.random() * 0.5
        tileHeight += Math.floor(heightFactor * 3 * randomFactor)
      }

      tiles.push({ x, y, type, height: tileHeight })
    }
  }

  return tiles
}

// Map sections data - positioned along the river
export const mapSections: MapSection[] = [
  // Central Hub Section - Monkey Temple
  {
    id: "central-hub",
    name: "Central Hub",
    description: "The main control center of the Lucky Monkey network.",
    basePosition: { x: 15, y: 15 },
    baseHeight: 1,
    connections: {
      north: true,
      northeast: true,
      east: true,
      southeast: true,
      south: true,
      southwest: true,
      west: true,
      northwest: true,
    },
    tiles: [
      // Generate a 5x5 grid of tiles with height variation
      ...generateSectionTiles(5, 5, 0, 1, true),
      // Connection points
      { x: 2, y: -1, type: 5, height: 1 }, // North
      { x: 5, y: -1, type: 5, height: 1 }, // Northeast
      { x: 5, y: 2, type: 5, height: 1 }, // East
      { x: 5, y: 5, type: 5, height: 1 }, // Southeast
      { x: 2, y: 5, type: 5, height: 1 }, // South
      { x: -1, y: 5, type: 5, height: 1 }, // Southwest
      { x: -1, y: 2, type: 5, height: 1 }, // West
      { x: -1, y: -1, type: 5, height: 1 }, // Northwest
    ],
    nodes: [
      {
        id: "monkey-statue",
        name: "Lucky Monkey Guardian",
        type: "monkey",
        emoji: "🐵",
        x: 2,
        y: 2,
        height: 1,
        description:
          "The Guardian Construct. A memetic security avatar that protects the network. Approach with caution.",
        status: "online",
        ipAddress: "192.168.1.1",
        securityLevel: 5,
        connections: ["logical-lagoon", "banana-sector", "node-temple-1", "volcano-core"],
        assets: ["guardian_protocol.bin", "security_matrix.dat", "memetic_defense_v3.sys", "avatar_config.json"],
      },
    ],
    decorations: [
      { type: "tree", x: 0, y: 0, height: 1 },
      { type: "tree", x: 4, y: 0, height: 1 },
      { type: "tree", x: 0, y: 4, height: 1 },
      { type: "tree", x: 4, y: 4, height: 1 },
    ],
    hasRiver: false,
  },

  // Logical Lagoon Section - positioned near the top of the river
  {
    id: "logical-lagoon-section",
    name: "Logical Lagoon",
    description: "A sacred API pool where memory fragments drift like lotus petals.",
    basePosition: { x: 20, y: 8 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: true,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of water tiles
      ...generateSectionTiles(5, 5, 1, 0),
      // Shore tiles
      { x: -1, y: 0, type: 3, height: 0 },
      { x: -1, y: 1, type: 3, height: 0 },
      { x: -1, y: 2, type: 3, height: 0 },
      { x: -1, y: 3, type: 3, height: 0 },
      { x: -1, y: 4, type: 3, height: 0 },
      { x: 5, y: 0, type: 3, height: 0 },
      { x: 5, y: 1, type: 3, height: 0 },
      { x: 5, y: 2, type: 3, height: 0 },
      { x: 5, y: 3, type: 3, height: 0 },
      { x: 5, y: 4, type: 3, height: 0 },
      { x: 0, y: -1, type: 3, height: 0 },
      { x: 1, y: -1, type: 3, height: 0 },
      { x: 2, y: -1, type: 3, height: 0 },
      { x: 3, y: -1, type: 3, height: 0 },
      { x: 4, y: -1, type: 3, height: 0 },

      // Connection point
      { x: 2, y: 5, type: 5, height: 0 }, // South
    ],
    nodes: [
      {
        id: "logical-lagoon",
        name: "Logical Lagoon API",
        type: "river",
        emoji: "🌊",
        x: 2,
        y: 2,
        height: 0,
        description:
          "A sacred API pool where memory fragments drift like lotus petals. Home to bytefish and static frogs.",
        status: "online",
        ipAddress: "192.168.1.42",
        securityLevel: 3,
        connections: ["monkey-statue", "digital-river"],
        assets: ["api_endpoints.json", "memory_fragments.dat", "lotus_protocol.bin", "static_frog.gif"],
      },
    ],
    decorations: [
      { type: "flower", x: 0, y: 0, height: 0 },
      { type: "flower", x: 4, y: 0, height: 0 },
      { type: "flower", x: 0, y: 4, height: 0 },
      { type: "flower", x: 4, y: 4, height: 0 },
    ],
    hasRiver: true,
  },

  // Digital River Section - positioned at the first bend of the river
  {
    id: "digital-river-section",
    name: "Digital River",
    description: "Channels raw signal through the jungle.",
    basePosition: { x: 22, y: 13 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: true,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid with mixed tiles
      ...generateSectionTiles(5, 5, 3, 0),
      // River area
      { x: 1, y: 1, type: 1, height: 0 },
      { x: 2, y: 1, type: 1, height: 0 },
      { x: 3, y: 1, type: 1, height: 0 },
      { x: 1, y: 2, type: 1, height: 0 },
      { x: 2, y: 2, type: 1, height: 0 },
      { x: 3, y: 2, type: 1, height: 0 },
      { x: 1, y: 3, type: 1, height: 0 },
      { x: 2, y: 3, type: 1, height: 0 },
      { x: 3, y: 3, type: 1, height: 0 },

      // Connection point
      { x: 5, y: -1, type: 5, height: 0 }, // Northeast
    ],
    nodes: [
      {
        id: "digital-river",
        name: "Digital River Stream",
        type: "river",
        emoji: "🌊",
        x: 2,
        y: 2,
        height: 0,
        description: "Channels raw signal through the jungle. Its rapids form when external pings overload the stream.",
        status: "online",
        ipAddress: "192.168.1.101",
        securityLevel: 2,
        connections: ["logical-lagoon", "crashed-sector"],
        assets: ["stream_flow.dat", "signal_patterns.bin", "ping_monitor.log", "rapids_config.json"],
      },
    ],
    decorations: [
      { type: "flower", x: 0, y: 0, height: 0 },
      { type: "flower", x: 4, y: 0, height: 0 },
      { type: "flower", x: 0, y: 4, height: 0 },
      { type: "flower", x: 4, y: 4, height: 0 },
    ],
    hasRiver: true,
  },

  // Volcano Core Section - new volcano node
  {
    id: "volcano-core-section",
    name: "Volcano Core",
    description: "A dangerous but powerful processing center built inside an active digital volcano.",
    basePosition: { x: 8, y: 8 },
    baseHeight: 3,
    connections: {
      north: false,
      northeast: true,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate volcano tiles with height variation
      { x: 0, y: 0, type: 6, height: 3 },
      { x: 1, y: 0, type: 6, height: 4 },
      { x: 2, y: 0, type: 6, height: 5 },
      { x: 3, y: 0, type: 6, height: 4 },
      { x: 4, y: 0, type: 6, height: 3 },

      { x: 0, y: 1, type: 6, height: 4 },
      { x: 1, y: 1, type: 6, height: 5 },
      { x: 2, y: 1, type: 6, height: 6 },
      { x: 3, y: 1, type: 6, height: 5 },
      { x: 4, y: 1, type: 6, height: 4 },

      { x: 0, y: 2, type: 6, height: 5 },
      { x: 1, y: 2, type: 6, height: 6 },
      { x: 2, y: 2, type: 6, height: 7 },
      { x: 3, y: 2, type: 6, height: 6 },
      { x: 4, y: 2, type: 6, height: 5 },

      { x: 0, y: 3, type: 6, height: 4 },
      { x: 1, y: 3, type: 6, height: 5 },
      { x: 2, y: 3, type: 6, height: 6 },
      { x: 3, y: 3, type: 6, height: 5 },
      { x: 4, y: 3, type: 6, height: 4 },

      { x: 0, y: 4, type: 6, height: 3 },
      { x: 1, y: 4, type: 6, height: 4 },
      { x: 2, y: 4, type: 6, height: 5 },
      { x: 3, y: 4, type: 6, height: 4 },
      { x: 4, y: 4, type: 6, height: 3 },

      // Connection point
      { x: 5, y: -1, type: 5, height: 3 }, // Northeast
    ],
    nodes: [
      {
        id: "volcano-core",
        name: "Volcano Core Processor",
        type: "volcano",
        emoji: "🌋",
        x: 2,
        y: 2,
        height: 7,
        description:
          "A dangerous but powerful processing center built inside an active digital volcano. Processes data at extreme speeds but occasionally erupts, causing system-wide instabilities.",
        status: "erupting",
        ipAddress: "192.168.1.666",
        securityLevel: 4,
        connections: ["monkey-statue"],
        assets: [
          "magma_cooling.sys",
          "eruption_schedule.dat",
          "heat_resistant_protocols.bin",
          "lava_flow_control.json",
        ],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 3 },
      { type: "crystal", x: 4, y: 0, height: 3 },
      { type: "crystal", x: 0, y: 4, height: 3 },
      { type: "crystal", x: 4, y: 4, height: 3 },
    ],
    hasRiver: false,
  },

  // Banana Sector Section - positioned away from the river
  {
    id: "banana-sector-section",
    name: "Banana Sector",
    description: "A playful but volatile subgrid.",
    basePosition: { x: 30, y: 22 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: true,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of sand tiles
      ...generateSectionTiles(5, 5, 2, 0, true),

      // Connection point
      { x: -1, y: 2, type: 5, height: 0 }, // West
    ],
    nodes: [
      {
        id: "banana-sector",
        name: "Banana Sector Cache",
        type: "banana",
        emoji: "🍌",
        x: 2,
        y: 2,
        height: 0,
        description: "A playful but volatile subgrid where corrupted metadata manifests in humorous, unstable objects.",
        status: "unstable",
        ipAddress: "192.168.1.99",
        securityLevel: 1,
        connections: ["monkey-statue", "node-temple-2"],
        assets: ["corrupted_metadata.bin", "unstable_objects.dat", "humor_algorithm.js", "banana_manifest.json"],
      },
    ],
    decorations: [
      { type: "bush", x: 0, y: 0, height: 0 },
      { type: "bush", x: 4, y: 0, height: 0 },
      { type: "bush", x: 0, y: 4, height: 0 },
      { type: "bush", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },

  // Node Temple 1 Section - positioned near the river
  {
    id: "node-temple-1-section",
    name: "Node Temple Alpha",
    description: "Ancient structure that predates the current grid.",
    basePosition: { x: 12, y: 22 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: true,
      east: true,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of grass tiles with height variation
      ...generateSectionTiles(5, 5, 0, 0, true),

      // Connection points
      { x: 5, y: -1, type: 5, height: 0 }, // Northeast
      { x: 5, y: 2, type: 5, height: 0 }, // East
    ],
    nodes: [
      {
        id: "node-temple-1",
        name: "Node Temple Alpha",
        type: "temple",
        emoji: "🏯",
        x: 2,
        y: 2,
        height: 0,
        description:
          "Ancient structure that predates the current grid. Maintained by Ghostpackets, semi-aware maintenance protocols.",
        status: "online",
        ipAddress: "10.0.0.1",
        securityLevel: 4,
        connections: ["monkey-statue", "crashed-sector"],
        assets: ["ancient_code.bin", "ghostpacket_protocol.dat", "maintenance_routines.sys", "temple_history.txt"],
      },
    ],
    decorations: [
      { type: "bamboo", x: 0, y: 0, height: 0 },
      { type: "bamboo", x: 4, y: 0, height: 0 },
      { type: "bamboo", x: 0, y: 4, height: 0 },
      { type: "bamboo", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },
  // Restore the missing map sections to the mapSections array after the existing sections

  // Add these sections back after the existing ones in the mapSections array:

  // Node Temple 2 Section - positioned near the river
  {
    id: "node-temple-2-section",
    name: "Node Temple Beta",
    description: "Ancient structure with mysterious origins.",
    basePosition: { x: 27, y: 17 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: true,
      southeast: false,
      south: false,
      southwest: false,
      west: true,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of grass tiles with height variation
      ...generateSectionTiles(5, 5, 0, 0, true),

      // Connection points
      { x: 5, y: 2, type: 5, height: 0 }, // East
      { x: -1, y: 2, type: 5, height: 0 }, // West
    ],
    nodes: [
      {
        id: "node-temple-2",
        name: "Node Temple Beta",
        type: "temple",
        emoji: "🏯",
        x: 2,
        y: 2,
        height: 0,
        description:
          "Ancient structure with mysterious origins. Contains a Hash of Belief required to access deeper sectors.",
        status: "online",
        ipAddress: "10.0.0.2",
        securityLevel: 4,
        connections: ["banana-sector", "server-hub"],
        assets: ["hash_of_belief.key", "mysterious_origins.log", "deeper_sector_map.dat", "ancient_symbols.svg"],
      },
    ],
    decorations: [
      { type: "bamboo", x: 0, y: 0, height: 0 },
      { type: "bamboo", x: 4, y: 0, height: 0 },
      { type: "bamboo", x: 0, y: 4, height: 0 },
      { type: "bamboo", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },

  // Crashed Sector Section - positioned near the river delta
  {
    id: "crashed-sector-section",
    name: "Crashed Sector",
    description: "A barren dead zone filled with 404 skeletons.",
    basePosition: { x: 13, y: 28 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: true,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of path tiles with height variation
      ...generateSectionTiles(5, 5, 3, 0, true),

      // Connection point
      { x: 5, y: 2, type: 5, height: 0 }, // East
    ],
    nodes: [
      {
        id: "crashed-sector",
        name: "Crashed Sector 404",
        type: "server",
        emoji: "💻",
        x: 2,
        y: 2,
        height: 0,
        description: "A barren dead zone filled with 404 skeletons and server husks. Haunted by Ghostpackets.",
        status: "offline",
        ipAddress: "192.168.1.404",
        securityLevel: 0,
        connections: ["node-temple-1", "digital-river"],
        assets: ["404_error_log.txt", "server_husks.dat", "ghostpacket_traces.bin", "crash_report.json"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 0 },
      { type: "crystal", x: 4, y: 0, height: 0 },
      { type: "crystal", x: 0, y: 4, height: 0 },
      { type: "crystal", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },

  // Server Hub Section - positioned away from the river
  {
    id: "server-hub-section",
    name: "Server Hub",
    description: "A cluster of ancient servers processing unknown data.",
    basePosition: { x: 35, y: 17 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: true,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of grass tiles with height variation
      ...generateSectionTiles(5, 5, 0, 0, true),

      // Connection point
      { x: -1, y: 2, type: 5, height: 0 }, // West
    ],
    nodes: [
      {
        id: "server-hub",
        name: "Server Hub Cluster",
        type: "server",
        emoji: "💻",
        x: 2,
        y: 2,
        height: 0,
        description:
          "A cluster of ancient servers processing unknown data. The terminals occasionally display cryptic messages.",
        status: "online",
        ipAddress: "192.168.1.200",
        securityLevel: 3,
        connections: ["node-temple-2"],
        assets: ["unknown_data.bin", "cryptic_messages.log", "terminal_output.txt", "processing_algorithms.js"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 0 },
      { type: "crystal", x: 4, y: 0, height: 0 },
      { type: "crystal", x: 0, y: 4, height: 0 },
      { type: "crystal", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },

  // Main Router Section - positioned on elevated terrain near the river
  {
    id: "main-router-section",
    name: "Main Router",
    description: "Central routing node that manages all network traffic.",
    basePosition: { x: 19, y: 19 },
    baseHeight: 4,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Elevated platform with height variation
      { x: 0, y: 0, type: 4, height: 4 },
      { x: 1, y: 0, type: 4, height: 4 },
      { x: 0, y: 1, type: 4, height: 4 },
      { x: 1, y: 1, type: 4, height: 5 },
    ],
    nodes: [
      {
        id: "main-router",
        name: "メインルーター Router",
        type: "router",
        emoji: "📡",
        x: 0,
        y: 0,
        height: 4,
        description:
          "Central routing node that manages all network traffic. Elevated position provides optimal signal distribution.",
        status: "online",
        ipAddress: "192.168.0.1",
        securityLevel: 5,
        connections: ["monkey-statue", "firewall-north", "firewall-south"],
        assets: ["routing_table.dat", "network_traffic.log", "signal_distribution.bin", "router_config.json"],
      },
    ],
    decorations: [
      { type: "bamboo", x: 0, y: 0, height: 4 },
      { type: "bamboo", x: 1, y: 0, height: 4 },
      { type: "bamboo", x: 0, y: 1, height: 4 },
      { type: "bamboo", x: 1, y: 1, height: 5 },
    ],
    hasRiver: false,
  },

  // Firewall North Section - positioned near the top of the river
  {
    id: "firewall-north-section",
    name: "Firewall North",
    description: "Northern security barrier that filters incoming traffic.",
    basePosition: { x: 27, y: 5 },
    connections: {
      north: false,
      northeast: false,
      east: true,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of platform tiles with height variation
      ...generateSectionTiles(5, 5, 4, 3, true),

      // Connection point
      { x: 5, y: 2, type: 5, height: 3 }, // East
    ],
    nodes: [
      {
        id: "firewall-north",
        name: "北ファイアウォール Firewall",
        type: "firewall",
        emoji: "🔥",
        x: 2,
        y: 2,
        height: 3,
        description:
          "Northern security barrier that filters incoming traffic. Runs on ancient code that nobody fully understands.",
        status: "online",
        ipAddress: "192.168.0.10",
        securityLevel: 4,
        connections: ["main-router", "database-cluster"],
        assets: ["filter_rules.dat", "ancient_code.bin", "traffic_logs.txt", "security_protocols.json"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 3 },
      { type: "crystal", x: 4, y: 0, height: 3 },
      { type: "crystal", x: 0, y: 4, height: 3 },
      { type: "crystal", x: 4, y: 4, height: 3 },
    ],
    hasRiver: false,
  },

  // Firewall South Section - positioned near the river delta
  {
    id: "firewall-south-section",
    name: "Firewall South",
    description: "Southern security barrier with additional encryption layers.",
    basePosition: { x: 28, y: 28 },
    baseHeight: 2,
    connections: {
      north: true,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of platform tiles with height variation
      ...generateSectionTiles(5, 5, 4, 2, true),

      // Connection point
      { x: 2, y: -1, type: 5, height: 2 }, // North
    ],
    nodes: [
      {
        id: "firewall-south",
        name: "南ファイアウォール Firewall",
        type: "firewall",
        emoji: "🔥",
        x: 2,
        y: 2,
        height: 2,
        description:
          "Southern security barrier with additional encryption layers. Frequently targeted by digital predators.",
        status: "online",
        ipAddress: "192.168.0.11",
        securityLevel: 4,
        connections: ["main-router"],
        assets: ["encryption_keys.dat", "predator_logs.txt", "defense_patterns.bin", "security_breach_history.json"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 2 },
      { type: "crystal", x: 4, y: 0, height: 2 },
      { type: "crystal", x: 0, y: 4, height: 2 },
      { type: "crystal", x: 4, y: 4, height: 2 },
    ],
    hasRiver: false,
  },

  // Database Cluster Section - positioned away from the river
  {
    id: "database-cluster-section",
    name: "Database Cluster",
    description: "Massive storage facility containing all historical records.",
    basePosition: { x: 35, y: 5 },
    baseHeight: 0,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: true,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of platform tiles with height variation
      ...generateSectionTiles(5, 5, 0, 0, true),

      // Connection point
      { x: -1, y: 2, type: 5, height: 0 }, // West
    ],
    nodes: [
      {
        id: "database-cluster",
        name: "データベース Database",
        type: "database",
        emoji: "🗄️",
        x: 2,
        y: 2,
        height: 0,
        description:
          "Massive storage facility containing all historical records. Access requires multiple authentication factors.",
        status: "online",
        ipAddress: "192.168.0.50",
        securityLevel: 5,
        connections: ["firewall-north"],
        assets: ["historical_records.db", "authentication_factors.dat", "storage_index.bin", "access_logs.txt"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 0 },
      { type: "crystal", x: 4, y: 0, height: 0 },
      { type: "crystal", x: 0, y: 4, height: 0 },
      { type: "crystal", x: 4, y: 4, height: 0 },
    ],
    hasRiver: false,
  },

  // Data Archive Section - positioned away from the river
  {
    id: "data-archive-section",
    name: "Data Archive",
    description: "Ancient repository of forgotten code and lost algorithms.",
    basePosition: { x: 38, y: 24 },
    baseHeight: 1,
    connections: {
      north: false,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: true,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of grass tiles with height variation
      ...generateSectionTiles(5, 5, 0, 1, true),

      // Connection point
      { x: -1, y: 2, type: 5, height: 1 }, // West
    ],
    nodes: [
      {
        id: "data-archive",
        name: "Ancient Data Archive",
        type: "database",
        emoji: "📚",
        x: 2,
        y: 2,
        height: 1,
        description:
          "Repository of forgotten code and lost algorithms. The oldest data dates back to the pre-digital era, somehow preserved in binary form.",
        status: "online",
        ipAddress: "10.0.1.42",
        securityLevel: 4,
        connections: ["banana-sector"],
        assets: ["forgotten_code.bin", "lost_algorithms.dat", "pre_digital_artifacts.sys", "binary_preservation.log"],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 1 },
      { type: "crystal", x: 4, y: 0, height: 1 },
      { type: "crystal", x: 0, y: 4, height: 1 },
      { type: "crystal", x: 4, y: 4, height: 1 },
    ],
    hasRiver: false,
  },

  // Quantum Nexus Section - positioned near the river delta
  {
    id: "quantum-nexus-section",
    name: "Quantum Nexus",
    description: "Experimental quantum computing node with unstable properties.",
    basePosition: { x: 8, y: 27 },
    baseHeight: 2,
    connections: {
      north: true,
      northeast: false,
      east: false,
      southeast: false,
      south: false,
      southwest: false,
      west: false,
      northwest: false,
    },
    tiles: [
      // Generate a 5x5 grid of platform tiles with height variation
      ...generateSectionTiles(5, 5, 4, 2, true),

      // Connection point
      { x: 2, y: -1, type: 5, height: 2 }, // North
    ],
    nodes: [
      {
        id: "quantum-nexus",
        name: "Quantum Nexus Core",
        type: "server",
        emoji: "⚛️",
        x: 2,
        y: 2,
        height: 2,
        description:
          "Experimental quantum computing node that exists in multiple states simultaneously. Calculations performed here may have different results each time they're observed.",
        status: "unstable",
        ipAddress: "192.168.q.∞",
        securityLevel: 5,
        connections: ["node-temple-1"],
        assets: [
          "quantum_states.dat",
          "superposition_matrix.bin",
          "observation_effects.log",
          "uncertainty_calculations.js",
        ],
      },
    ],
    decorations: [
      { type: "crystal", x: 0, y: 0, height: 2 },
      { type: "crystal", x: 4, y: 0, height: 2 },
      { type: "crystal", x: 0, y: 4, height: 2 },
      { type: "crystal", x: 4, y: 4, height: 2 },
    ],
    hasRiver: false,
  },
]

// Generate river path from top to bottom
export function generateRiverPath() {
  // Define the main river path
  const riverPath: { x: number; y: number; type: string; height: number }[] = []

  // Start at the top with a waterfall
  for (let y = 0; y < 5; y++) {
    for (let x = 19; x <= 21; x++) {
      riverPath.push({ x, y, type: "water", height: 3 })
    }
  }

  // Waterfall section
  for (let y = 5; y < 8; y++) {
    for (let x = 19; x <= 21; x++) {
      riverPath.push({ x, y, type: "waterfall", height: 2 })
    }
  }

  // Continue river after waterfall
  for (let y = 8; y < 12; y++) {
    for (let x = 19; x <= 21; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  // River bend to the right
  for (let y = 12; y < 15; y++) {
    for (let x = 21; x < 24; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  // River flows down again
  for (let y = 15; y < 20; y++) {
    for (let x = 23; x <= 25; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  // River bend to the left
  for (let y = 20; y < 23; y++) {
    for (let x = 20; x <= 23; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  // River continues down
  for (let y = 23; y < 30; y++) {
    for (let x = 18; x <= 20; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  // River delta at the bottom
  for (let y = 30; y < 35; y++) {
    for (let x = 16; x <= 22; x++) {
      riverPath.push({ x, y, type: "water", height: 0 })
    }
  }

  return riverPath
}

// Function to get all tiles from map sections - OPTIMIZED to only return essential tiles
export function getAllTiles() {
  const essentialTiles: { x: number; y: number; type: number; height: number }[] = []

  // Add river tiles
  const riverPath = generateRiverPath()
  riverPath.forEach((path) => {
    essentialTiles.push({
      x: path.x,
      y: path.y,
      type: path.type === "water" ? 1 : path.type === "waterfall" ? 1 : 0,
      height: path.height,
    })
  })

  // Add tiles from map sections - but only a subset for optimization
  mapSections.forEach((section) => {
    // Only add a subset of tiles from each section
    section.tiles.forEach((tile, index) => {
      // Only add every other tile or tiles with special types
      if (index % 2 === 0 || tile.type > 1) {
        essentialTiles.push({
          x: tile.x + section.basePosition.x,
          y: tile.y + section.basePosition.y,
          type: tile.type,
          height: tile.height + section.baseHeight,
        })
      }
    })
  })

  return essentialTiles
}

// Function to get all nodes from map sections
export function getAllNodes() {
  const allNodes: any[] = []

  mapSections.forEach((section) => {
    section.nodes.forEach((node) => {
      allNodes.push({
        ...node,
        x: node.x + section.basePosition.x,
        y: node.y + section.basePosition.y,
        height: node.height + section.baseHeight,
      })
    })
  })

  return allNodes
}

// Function to get all decorations from map sections
export function getAllDecorations() {
  const allDecorations: { type: string; x: number; y: number; height: number }[] = []

  mapSections.forEach((section) => {
    section.decorations.forEach((deco) => {
      allDecorations.push({
        type: deco.type,
        x: deco.x + section.basePosition.x,
        y: deco.y + section.basePosition.y,
        height: deco.height + section.baseHeight,
      })
    })
  })

  return allDecorations
}

// Function to get river blocks based on map sections and river path
export function getRiverBlocks() {
  // Get the main river path
  const riverPath = generateRiverPath()

  // Convert to the format needed
  const riverBlocks = riverPath.map((block) => ({
    x: block.x,
    y: block.y,
    height: block.height,
  }))

  // Add river blocks from map sections
  mapSections.forEach((section) => {
    if (section.hasRiver) {
      section.tiles.forEach((tile) => {
        if (tile.type === 1) {
          // Water type
          riverBlocks.push({
            x: tile.x + section.basePosition.x,
            y: tile.y + section.basePosition.y,
            height: tile.height + section.baseHeight,
          })
        }
      })
    }
  })

  return riverBlocks
}

export { cloudData }
