//! The seeded world: terrain mesh, decorations, floating edge islands, nodes.
//!
//! Terrain is one mesh per iso diagonal row (x + y), with z = row, so anything
//! standing on row k (decorations, NPCs at z = k + 0.5) is correctly hidden by
//! taller terrain in front of it.

use std::collections::HashMap;

use bevy::asset::RenderAssetUsages;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;
use bevy::sprite::Anchor;
use serde::Deserialize;

use crate::Art;

pub const TILE_W: f32 = 64.0;
pub const TILE_H: f32 = 32.0;
/// Screen pixels per unit of height.
pub const ELEV: f32 = 16.0;
/// Every island has a slab this thick (in height units) under its lowest tiles;
/// the first unit is the tile sprite's own side skirt.
const BASE: f32 = 1.0;
pub const NODE_Z: f32 = 200.0;
const PYRAMID: (i32, i32) = (17, 17);
const PYRAMID_HEIGHT: f32 = 5.0;

pub mod kind {
    pub const GRASS: u8 = 0;
    pub const WATER: u8 = 1;
    pub const PLATFORM: u8 = 4;
    pub const SCORCHED: u8 = 5;
    pub const VOLCANO: u8 = 6;
    pub const TEMPLE: u8 = 7;
}

#[derive(Deserialize)]
struct WorldFile {
    tiles: Vec<TileIn>,
    nodes: Vec<NodeData>,
    decorations: Vec<Deco>,
    #[serde(default)]
    streams: Vec<Vec<Pos>>,
}

#[derive(Deserialize)]
struct TileIn {
    x: f32,
    y: f32,
    #[serde(rename = "type")]
    kind: u8,
    height: f32,
    #[serde(default)]
    fall: bool,
    #[serde(default)]
    lagoon: bool,
}

#[derive(Deserialize, Clone, Copy)]
pub struct Pos {
    pub x: f32,
    pub y: f32,
    #[serde(default)]
    pub height: f32,
}

#[derive(Deserialize, Clone)]
pub struct NodeData {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(rename = "ipAddress")]
    pub ip: String,
    pub emoji: String,
    #[serde(default)]
    pub description: String,
    pub position: Pos,
    #[serde(default)]
    pub connections: Vec<String>,
    pub status: Option<String>,
    #[serde(rename = "securityLevel")]
    pub security: Option<u8>,
    #[serde(default)]
    pub assets: Vec<String>,
}

#[derive(Deserialize)]
struct Deco {
    #[serde(rename = "type")]
    kind: String,
    position: Pos,
}

#[derive(Clone, Copy)]
pub struct Tile {
    pub kind: u8,
    pub height: f32,
    /// Part of the waterfall at the river's source.
    pub fall: bool,
    /// Part of the logical lagoon (bubbles).
    pub lagoon: bool,
}

impl Tile {
    fn ground(kind: u8, height: f32) -> Tile {
        Tile { kind, height, fall: false, lagoon: false }
    }
}

#[derive(Resource)]
pub struct World {
    pub tiles: HashMap<(i32, i32), Tile>,
    pub nodes: Vec<NodeData>,
    /// River centrelines, upstream first (the main river, the Digital River).
    pub streams: Vec<Vec<Pos>>,
    /// Screen-space bounds of the whole map (Bevy coordinates, y up).
    pub bounds: Rect,
}

impl World {
    pub fn tile_at(&self, x: f32, y: f32) -> Option<Tile> {
        self.tiles.get(&(x.round() as i32, y.round() as i32)).copied()
    }
    pub fn ground(&self, x: f32, y: f32) -> f32 {
        self.tile_at(x, y).map_or(0.0, |t| t.height)
    }
}

/// Grid position -> Bevy world position of the top surface (y up).
pub fn iso(x: f32, y: f32, h: f32) -> Vec2 {
    Vec2::new((x - y) * TILE_W / 2.0, -((x + y) * TILE_H / 2.0) + h * ELEV)
}

/// Draw depth for something standing on grid cell (x, y).
pub fn row_z(x: f32, y: f32) -> f32 {
    x.round() + y.round() + 0.5
}

/// Stable pseudo-random number in [0,1) for a grid cell (same as the old TS cellHash).
pub fn cell_hash(x: i32, y: i32) -> f32 {
    let mut h = x.wrapping_mul(374_761_393).wrapping_add(y.wrapping_mul(668_265_263));
    h = (h ^ ((h as u32) >> 13) as i32).wrapping_mul(1_274_126_177);
    ((h ^ ((h as u32) >> 16) as i32) as u32) as f32 / 4_294_967_296.0
}

#[derive(Component)]
pub struct NodeCard(pub usize);

const EDGE_ISLANDS: [(i32, i32, i32); 10] = [
    (-5, 5, 4), (-8, 10, 3), (45, 5, 4), (48, 12, 3), (-6, 35, 4),
    (-3, 42, 3), (45, 38, 5), (50, 32, 3), (-12, 20, 3), (55, 22, 3),
];

pub fn plugin(app: &mut App) {
    let file: WorldFile = serde_json::from_str(include_str!("../assets/world.json")).expect("world.json");
    // Several generators write the same cell; keep the tallest so stacked
    // platforms read as solid ground instead of whichever was written last.
    let mut tiles: HashMap<(i32, i32), Tile> = HashMap::new();
    for t in &file.tiles {
        let key = (t.x.round() as i32, t.y.round() as i32);
        let new = Tile { kind: t.kind, height: t.height.max(0.0), fall: t.fall, lagoon: t.lagoon };
        tiles
            .entry(key)
            .and_modify(|old| {
                let (fall, lagoon) = (old.fall || new.fall, old.lagoon || new.lagoon);
                if new.height > old.height {
                    *old = new;
                }
                if old.kind == kind::WATER {
                    (old.fall, old.lagoon) = (fall, lagoon);
                }
            })
            .or_insert(new);
    }
    // The temple pyramid generator stacks its layers upside down (widest layer
    // highest). Rebuild it as a stepped pyramid: the more layers cover a cell,
    // the higher it is, so the centre (where the Guardian sits) is the summit.
    let mut layers: HashMap<(i32, i32), f32> = HashMap::new();
    for t in file.tiles.iter().filter(|t| t.kind == kind::TEMPLE) {
        let key = (t.x.round() as i32, t.y.round() as i32);
        if (key.0 - PYRAMID.0).abs() + (key.1 - PYRAMID.1).abs() <= 8 {
            let e = layers.entry(key).or_insert(f32::MAX);
            *e = e.min(t.height);
        }
    }
    for (key, lowest) in layers {
        tiles.insert(key, Tile::ground(kind::TEMPLE, (PYRAMID_HEIGHT + 1.0 - lowest).max(1.0)));
    }
    // The river was generated on its own and floated in the void. Give it banks:
    // a full ring of grass, plus a ragged second ring so the edge isn't a ruler line.
    let mut banks: HashMap<(i32, i32), f32> = HashMap::new();
    for (&(x, y), t) in tiles.iter().filter(|(_, t)| t.kind == kind::WATER) {
        for dx in -2..=2i32 {
            for dy in -2..=2i32 {
                let k = (x + dx, y + dy);
                let ring = dx.abs().max(dy.abs());
                if ring == 0 || tiles.contains_key(&k) || (ring == 2 && cell_hash(k.0 * 3 + 1, k.1 * 5 + 2) > 0.45) {
                    continue;
                }
                let h = banks.entry(k).or_insert(0.0);
                *h = h.max(t.height);
            }
        }
    }
    let mut bank_decos = Vec::new();
    for (&k, &h) in &banks {
        tiles.insert(k, Tile::ground(kind::GRASS, h));
        let r = cell_hash(k.0 * 7 + 3, k.1 * 11 + 5);
        if r < 0.22 {
            let kind = ["bush", "tree", "flower", "bamboo", "bush", "rock"][((r / 0.22) * 6.0) as usize % 6];
            bank_decos.push(Deco { kind: kind.into(), position: Pos { x: k.0 as f32, y: k.1 as f32, height: h } });
        }
    }
    let mut bounds = Rect::EMPTY;
    for (&(x, y), t) in &tiles {
        let p = iso(x as f32, y as f32, t.height);
        bounds = bounds.union_point(p + Vec2::new(-TILE_W, TILE_H)).union_point(p + Vec2::new(TILE_W, -TILE_H - BASE * ELEV));
    }
    app.insert_resource(World { tiles, nodes: file.nodes, streams: file.streams, bounds });
    let mut decorations = file.decorations;
    decorations.extend(bank_decos);
    app.insert_resource(Decos(decorations));
    app.add_systems(Startup, (spawn_terrain, spawn_islands, spawn_backdrop, spawn_decorations, spawn_nodes));
}

#[derive(Resource)]
struct Decos(Vec<Deco>);

/// Atlas cell (4x4 grid of 34px cells, 32px payload) for a tile.
fn atlas_cell(t: Tile, x: i32, y: i32) -> usize {
    let pick = |first: usize, n: usize| first + ((cell_hash(x, y) * n as f32) as usize).min(n - 1);
    match t.kind {
        kind::WATER => pick(4, 5),
        kind::VOLCANO => pick(9, 5),
        kind::TEMPLE => 14,
        _ => pick(0, 4),
    }
}
const WHITE_CELL: usize = 15;

fn cell_uv(cell: usize) -> (Vec2, Vec2) {
    let (cx, cy) = ((cell % 4) as f32, (cell / 4) as f32);
    let px = 1.0 / 136.0;
    (Vec2::new((cx * 34.0 + 1.0) * px, (cy * 34.0 + 1.0) * px), Vec2::new((cx * 34.0 + 33.0) * px, (cy * 34.0 + 33.0) * px))
}

fn wall_color(kind: u8) -> Color {
    match kind {
        kind::WATER => Color::srgb(0.16, 0.36, 0.62),
        kind::VOLCANO => Color::srgb(0.48, 0.16, 0.10),
        kind::TEMPLE => Color::srgb(0.72, 0.56, 0.16),
        kind::SCORCHED => Color::srgb(0.30, 0.22, 0.17),
        _ => Color::srgb(0.30, 0.40, 0.18),
    }
}

fn top_tint(t: Tile) -> Color {
    let lift = 1.0 + t.height * 0.025;
    let base = match t.kind {
        kind::SCORCHED => Vec3::new(0.78, 0.62, 0.50),
        kind::PLATFORM => Vec3::new(0.90, 1.0, 0.94),
        _ => Vec3::ONE,
    } * lift;
    Color::srgb(base.x.min(1.0), base.y.min(1.0), base.z.min(1.0))
}

#[derive(Default)]
struct MeshBuf {
    pos: Vec<[f32; 3]>,
    uv: Vec<[f32; 2]>,
    col: Vec<[f32; 4]>,
    idx: Vec<u32>,
}

impl MeshBuf {
    fn quad(&mut self, v: [Vec2; 4], uv: [Vec2; 4], c: Color) {
        let base = self.pos.len() as u32;
        let c = c.to_linear().to_f32_array();
        for i in 0..4 {
            self.pos.push([v[i].x, v[i].y, 0.0]);
            self.uv.push(uv[i].into());
            self.col.push(c);
        }
        self.idx.extend([base, base + 1, base + 2, base, base + 2, base + 3]);
    }
    fn mesh(self) -> Mesh {
        let mut m = Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::default());
        m.insert_attribute(Mesh::ATTRIBUTE_POSITION, self.pos);
        m.insert_attribute(Mesh::ATTRIBUTE_UV_0, self.uv);
        m.insert_attribute(Mesh::ATTRIBUTE_COLOR, self.col);
        m.insert_indices(Indices::U32(self.idx));
        m
    }
}

fn spawn_terrain(
    mut commands: Commands,
    world: Res<World>,
    art: Res<Art>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    let material = materials.add(ColorMaterial::from(art.tiles.clone()));
    let mut rows: HashMap<i32, Vec<(i32, i32, Tile)>> = HashMap::new();
    for (&(x, y), &t) in &world.tiles {
        rows.entry(x + y).or_default().push((x, y, t));
    }
    let (w0, w1) = cell_uv(WHITE_CELL);
    let white = [(w0 + w1) / 2.0; 4];
    for (row, cells) in rows {
        let mut buf = MeshBuf::default();
        for (x, y, t) in cells {
            let c = iso(x as f32, y as f32, t.height);
            let (e, s, w) = (c + Vec2::X * 32.0, c - Vec2::Y * 16.0, c - Vec2::X * 32.0);
            // Front walls drop to the neighbour in front, or to the bottom of the island slab.
            let drop = |nx: i32, ny: i32| match world.tiles.get(&(nx, ny)) {
                Some(o) => (t.height - o.height).max(0.0) * ELEV,
                None => (t.height + BASE) * ELEV,
            };
            let wall = wall_color(t.kind);
            let dl = drop(x, y + 1);
            if dl > 0.0 {
                let d = Vec2::Y * dl;
                buf.quad([w, s, s - d, w - d], white, wall.darker(0.18));
            }
            let dr = drop(x + 1, y);
            if dr > 0.0 {
                let d = Vec2::Y * dr;
                buf.quad([s, e, e - d, s - d], white, wall);
            }
            // The sprites are 32px iso blocks: top diamond at rows 8..24, an 8px side
            // skirt below. Drawn at 2x, the diamond lands exactly on the grid cell.
            let (a, b) = cell_uv(atlas_cell(t, x, y));
            let (tl, br) = (c + Vec2::new(-32.0, 32.0), c + Vec2::new(32.0, -32.0));
            buf.quad(
                [tl, Vec2::new(br.x, tl.y), br, Vec2::new(tl.x, br.y)],
                [a, Vec2::new(b.x, a.y), b, Vec2::new(a.x, b.y)],
                top_tint(t),
            );
        }
        commands.spawn((
            Mesh2d(meshes.add(buf.mesh())),
            MeshMaterial2d(material.clone()),
            Transform::from_xyz(0.0, 0.0, row as f32),
        ));
    }
}

fn spawn_islands(mut commands: Commands, mut meshes: ResMut<Assets<Mesh>>, mut materials: ResMut<Assets<ColorMaterial>>) {
    let mut buf = MeshBuf::default();
    for (cx, cy, r) in EDGE_ISLANDS {
        for dx in -r..=r {
            for dy in -r..=r {
                let dist = ((dx * dx + dy * dy) as f32).sqrt();
                if dist > r as f32 {
                    continue;
                }
                let alpha = 0.15 - dist / r as f32 * 0.1;
                let c = iso((cx + dx) as f32, (cy + dy) as f32, 0.0);
                let v = [c + Vec2::Y * 15.0, c + Vec2::X * 30.0, c - Vec2::Y * 15.0, c - Vec2::X * 30.0];
                buf.quad(v, [Vec2::ZERO; 4], Color::srgba(0.0, 1.0, 0.8, alpha * 1.6));
            }
        }
    }
    commands.spawn((
        Mesh2d(meshes.add(buf.mesh())),
        MeshMaterial2d(materials.add(ColorMaterial::default())),
        Transform::from_xyz(0.0, 0.0, -50.0),
    ));
}

fn spawn_backdrop(mut commands: Commands, world: Res<World>, art: Res<Art>) {
    let size = world.bounds.size() + Vec2::splat(4000.0);
    commands.spawn((
        Sprite {
            image: art.grid.clone(),
            color: Color::srgba(1.0, 1.0, 1.0, 0.35),
            custom_size: Some(size),
            image_mode: SpriteImageMode::Tiled { tile_x: true, tile_y: true, stretch_value: 0.25 },
            ..default()
        },
        Transform::from_translation(world.bounds.center().extend(-100.0)),
    ));
}

fn deco_emoji(kind: &str) -> &'static str {
    match kind {
        "tree" => "🌴",
        "flower" => "🌸",
        "bush" => "🌿",
        "crystal" => "💎",
        "bamboo" => "🎋",
        "mushroom" => "🍄",
        "lotus" => "🪷",
        "rock" => "🪨",
        _ => "🌱",
    }
}

/// Emoji text rendered at 2x and scaled down, so it stays crisp when zoomed in.
pub fn emoji_text(art: &Art, emoji: &str, size: f32) -> impl Bundle {
    (
        Text2d::new(emoji),
        TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(size * 2.0), ..default() },
    )
}

fn spawn_decorations(mut commands: Commands, world: Res<World>, decos: Res<Decos>, art: Res<Art>) {
    for d in &decos.0 {
        let Some(t) = world.tile_at(d.position.x, d.position.y) else { continue };
        // Lotus floats on water; everything else grows on land.
        if (d.kind == "lotus") != (t.kind == kind::WATER) {
            continue;
        }
        let jitter = Vec2::new(cell_hash(d.position.x as i32, 7) - 0.5, cell_hash(9, d.position.y as i32) - 0.5) * 0.5;
        let (x, y) = (d.position.x + jitter.x, d.position.y + jitter.y);
        let p = iso(x, y, t.height);
        commands.spawn((
            emoji_text(&art, deco_emoji(&d.kind), 18.0),
            Anchor::BOTTOM_CENTER,
            Transform::from_translation(p.extend(row_z(d.position.x, d.position.y)) + Vec3::Y * 2.0).with_scale(Vec3::splat(0.5)),
        ));
    }
}

pub fn node_color(kind: &str) -> Color {
    let hex = match kind {
        "monkey" => 0x22c55e,
        "banana-cache" => 0xfacc15,
        "temple" => 0x15803d,
        "server" => 0x4b5563,
        "river" => 0x0ea5e9,
        "router" => 0xa855f7,
        "firewall" => 0xef4444,
        "database" => 0x3b82f6,
        "volcano" => 0xdc2626,
        "ai-core" => 0x8b5cf6,
        "vault" => 0x6366f1,
        "switch" => 0x14b8a6,
        "terminal" => 0x64748b,
        "lizard" => 0x84cc16,
        "lake" => 0x0284c7,
        "dns" => 0xb91c1c,
        "balancer" => 0xdb2777,
        "queue" => 0x0891b2,
        "monitor" => 0xd97706,
        "auth" => 0x7c3aed,
        "cdn" => 0x059669,
        _ => 0x6b7280,
    };
    Color::srgb_u8((hex >> 16) as u8, (hex >> 8) as u8, hex as u8)
}

pub const ACCENT: Color = Color::srgb(0.0, 1.0, 0.533);

fn spawn_nodes(mut commands: Commands, world: Res<World>, art: Res<Art>) {
    for (i, node) in world.nodes.iter().enumerate() {
        let p = &node.position;
        let h = world.ground(p.x, p.y).max(p.height);
        let at = iso(p.x, p.y, h);
        let label = if node.name.chars().count() > 12 {
            format!("{}..", node.name.chars().take(10).collect::<String>())
        } else {
            node.name.clone()
        };
        commands
            .spawn((
                NodeCard(i),
                Sprite { image: art.card.clone(), color: node_color(&node.kind).with_alpha(0.9), custom_size: Some(Vec2::splat(80.0)), ..default() },
                Transform::from_translation(at.extend(NODE_Z + (p.x + p.y) * 0.01)),
            ))
            .with_children(|c| {
                c.spawn((
                    Sprite { image: art.card_border.clone(), color: ACCENT.with_alpha(0.8), custom_size: Some(Vec2::splat(80.0)), ..default() },
                    Transform::from_xyz(0.0, 0.0, 0.001),
                ));
                c.spawn((emoji_text(&art, &node.emoji, 32.0), Transform::from_xyz(0.0, 5.0, 0.002).with_scale(Vec3::splat(0.5))));
                c.spawn((
                    Text2d::new(label),
                    art.text(true, 20.0),
                    TextColor(Color::WHITE),
                    Transform::from_xyz(0.0, -28.0, 0.002).with_scale(Vec3::splat(0.5)),
                ));
            });
    }
}
