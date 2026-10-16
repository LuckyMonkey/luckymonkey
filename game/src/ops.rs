#![allow(deprecated)] // Interaction: see ui.rs.

//! On-call shifts - the game loop.
//!
//! The nodes are wired together by their API connections (vines with packets
//! running along them). A shift is a run of turns. Each turn new incidents hit
//! healthy nodes; you have until the turn timer runs out to find each one, read
//! its symptoms and pick the right fix (1-4). Fast fixes score more. Anything
//! still broken when the turn ends escalates: degraded nodes go down, worms
//! crawl to a neighbour, stampedes spill over, and the SLA bleeds. The shift
//! ends when the SLA hits zero. Storm clouds can strike a node mid-turn.

use std::collections::VecDeque;

use bevy::prelude::*;

use crate::clouds::Strike;
use crate::ui::{Blocks, GREEN_300, GREEN_400, GREEN_500, GREEN_900, RED_400};
use crate::view::ViewState;
use crate::world::{emoji_text, iso, node_color, NodeCard, World, NODE_Z};
use crate::{Art, Rng, Screen};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Failure {
    Ddos,
    Worm,
    Disparity,
    BadDeploy,
    Migration,
    Surge,
    Cert,
    Leak,
}

impl Failure {
    pub fn emoji(self) -> &'static str {
        match self {
            Failure::Ddos => "🐘",
            Failure::Worm => "🐛",
            Failure::Disparity => "⚖️",
            Failure::BadDeploy | Failure::Migration => "📦",
            Failure::Surge => "⚡",
            Failure::Cert => "🔐",
            Failure::Leak => "🍌",
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Failure::Ddos => "DDoS stampede",
            Failure::Worm => "Worm",
            Failure::Disparity => "Replica disparity",
            Failure::BadDeploy => "Bad deploy",
            Failure::Migration => "Bad deploy + migration",
            Failure::Surge => "Lightning strike",
            Failure::Cert => "Expired certificate",
            Failure::Leak => "Memory leak",
        }
    }
    pub fn symptom(self) -> &'static str {
        match self {
            Failure::Ddos => "Requests x40. A herd of 9,000 monkeys is hammering one endpoint. Spills onto neighbours if it lasts.",
            Failure::Worm => "Unknown process copying itself over every API connection. Spreads each turn.",
            Failure::Disparity => "Replica checksums disagree: two copies, two different banana counts. Data loss when it goes down.",
            Failure::BadDeploy => "v2.4 went out 3 min ago, error rate 30%. No schema change - v2.3 is still compatible.",
            Failure::Migration => "v2.4 migrated the schema and the error rate is 30%. v2.3 can't read the new tables.",
            Failure::Surge => "Lightning hit the rack. The primary power supply is dead.",
            Failure::Cert => "TLS handshakes failing since 00:00 UTC. The certificate expired.",
            Failure::Leak => "Banana heap growing 2 GB/min, swap is thrashing. Nothing else is wrong.",
        }
    }
    pub fn fix(self) -> Action {
        match self {
            Failure::Ddos => Action::RateLimit,
            Failure::Worm => Action::Quarantine,
            Failure::Disparity => Action::Resync,
            Failure::BadDeploy => Action::Rollback,
            Failure::Migration => Action::FallForward,
            Failure::Surge => Action::Failover,
            Failure::Cert => Action::RotateCert,
            Failure::Leak => Action::Restart,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Action {
    RateLimit,
    Quarantine,
    Resync,
    Rollback,
    FallForward,
    Failover,
    RotateCert,
    Restart,
}

impl Action {
    const ALL: [Action; 8] = [
        Action::RateLimit,
        Action::Quarantine,
        Action::Resync,
        Action::Rollback,
        Action::FallForward,
        Action::Failover,
        Action::RotateCert,
        Action::Restart,
    ];
    pub fn emoji(self) -> &'static str {
        match self {
            Action::RateLimit => "🛡️",
            Action::Quarantine => "🚧",
            Action::Resync => "🔁",
            Action::Rollback => "⏪",
            Action::FallForward => "⏩",
            Action::Failover => "🔌",
            Action::RotateCert => "🔑",
            Action::Restart => "🔄",
        }
    }
    pub fn label(self) -> &'static str {
        match self {
            Action::RateLimit => "Rate-limit at the firewall",
            Action::Quarantine => "Quarantine the node",
            Action::Resync => "Resync replicas from primary",
            Action::Rollback => "Roll back the deploy",
            Action::FallForward => "Fall forward: ship a hotfix",
            Action::Failover => "Fail over to standby",
            Action::RotateCert => "Rotate the certificate",
            Action::Restart => "Restart the service",
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Health {
    Online,
    Degraded,
    Down,
}

impl Health {
    pub fn label(self) -> &'static str {
        match self {
            Health::Online => "online",
            Health::Degraded => "unstable",
            Health::Down => "offline",
        }
    }
}

#[derive(Clone, Copy)]
pub struct Incident {
    pub failure: Failure,
    /// Elapsed seconds when it hit.
    pub since: f32,
    pub options: [Action; 4],
    /// Bitmask of options already tried (wrong).
    pub tried: u8,
    pub stage: u8,
}

/// Live state of the network. `version` bumps on every change so the panel can rebuild.
#[derive(Resource)]
pub struct Net {
    pub health: Vec<Health>,
    pub incidents: Vec<Option<Incident>>,
    links: Vec<(usize, usize)>,
    neighbours: Vec<Vec<usize>>,
    /// World position of each node card.
    at: Vec<Vec2>,
    pub version: u32,
}

#[derive(Clone, Copy, PartialEq, Eq, Default)]
pub enum Phase {
    #[default]
    Idle,
    Running,
    Over,
}

#[derive(Resource, Default)]
pub struct Shift {
    pub phase: Phase,
    turn: u32,
    left: f32,
    len: f32,
    sla: f32,
    score: u32,
    fixes: u32,
    reactions: Vec<f32>,
    log: VecDeque<(String, f32)>,
}

const START_SLA: f32 = 100.0;
const MAX_LOG: usize = 5;

#[derive(Component)]
struct Link(usize);
#[derive(Component)]
struct Packet {
    link: usize,
    forward: bool,
    phase: f32,
}
#[derive(Component)]
struct Badge(usize);
#[derive(Component)]
struct Popup {
    born: f32,
}
#[derive(Component)]
struct HudText;
#[derive(Component)]
struct HudBar;
#[derive(Component)]
struct LogText;
#[derive(Component)]
struct StartButton;
#[derive(Component)]
struct StartLabel;
/// An incident fix button in the node panel (built by ui.rs), by option index.
#[derive(Component)]
pub struct ActionButton(pub usize);

pub fn plugin(app: &mut App) {
    app.init_resource::<Shift>()
        .add_systems(Startup, setup_net)
        .add_systems(PostStartup, spawn_overlay)
        .add_systems(OnEnter(Screen::Playing), spawn_hud)
        .add_systems(Update, (links, packets, cards, popups))
        .add_systems(Update, (controls, turns, strikes, hud).chain().run_if(in_state(Screen::Playing)));
}

fn data_health(status: Option<&str>) -> Health {
    match status {
        Some("offline") => Health::Down,
        Some("unstable" | "erupting") => Health::Degraded,
        _ => Health::Online,
    }
}

fn setup_net(mut commands: Commands, world: Res<World>) {
    let n = world.nodes.len();
    let mut links = Vec::new();
    for (i, node) in world.nodes.iter().enumerate() {
        for c in &node.connections {
            if let Some(j) = world.nodes.iter().position(|o| &o.id == c) {
                let l = (i.min(j), i.max(j));
                if i != j && !links.contains(&l) {
                    links.push(l);
                }
            }
        }
    }
    let mut neighbours = vec![Vec::new(); n];
    for &(a, b) in &links {
        neighbours[a].push(b);
        neighbours[b].push(a);
    }
    let at = world
        .nodes
        .iter()
        .map(|node| {
            let p = &node.position;
            iso(p.x, p.y, world.ground(p.x, p.y).max(p.height))
        })
        .collect();
    commands.insert_resource(Net {
        health: world.nodes.iter().map(|n| data_health(n.status.as_deref())).collect(),
        incidents: vec![None; n],
        links,
        neighbours,
        at,
        version: 0,
    });
}

/// Vines between connected nodes, packets on them, and an alert badge per node card.
fn spawn_overlay(mut commands: Commands, net: Res<Net>, art: Res<Art>, cards: Query<(Entity, &NodeCard)>) {
    for (i, &(a, b)) in net.links.iter().enumerate() {
        let (pa, pb) = (net.at[a], net.at[b]);
        let d = pb - pa;
        commands.spawn((
            Link(i),
            Sprite::from_color(Color::WHITE, Vec2::new(d.length(), 3.0)),
            Transform::from_translation(((pa + pb) / 2.0).extend(NODE_Z - 2.0)).with_rotation(Quat::from_rotation_z(d.to_angle())),
        ));
        for (k, forward) in [(0.0, true), (0.5, false)] {
            commands.spawn((
                Packet { link: i, forward, phase: k + i as f32 * 0.37 },
                Sprite { image: art.dot.clone(), color: Color::WHITE, custom_size: Some(Vec2::splat(9.0)), ..default() },
                Transform::from_translation(pa.extend(NODE_Z - 1.0)),
            ));
        }
    }
    for (e, card) in &cards {
        commands.entity(e).with_children(|c| {
            c.spawn((Badge(card.0), emoji_text(&art, "⚠️", 30.0), Transform::from_xyz(0.0, 58.0, 0.01).with_scale(Vec3::splat(0.5)), Visibility::Hidden));
        });
    }
}

fn link_health(net: &Net, l: usize) -> Health {
    let (a, b) = net.links[l];
    match (net.health[a], net.health[b]) {
        (Health::Down, _) | (_, Health::Down) => Health::Down,
        (Health::Degraded, _) | (_, Health::Degraded) => Health::Degraded,
        _ => Health::Online,
    }
}

const AMBER: Color = Color::srgb(0.98, 0.75, 0.14);
const RED: Color = Color::srgb(0.94, 0.27, 0.27);

fn links(net: Res<Net>, time: Res<Time>, mut q: Query<(&Link, &mut Sprite)>) {
    let pulse = 0.5 + 0.5 * (time.elapsed_secs() * 6.0).sin();
    for (link, mut sprite) in &mut q {
        sprite.color = match link_health(&net, link.0) {
            Health::Online => GREEN_400.with_alpha(0.35),
            Health::Degraded => AMBER.with_alpha(0.35 + 0.35 * pulse),
            Health::Down => RED.with_alpha(0.25),
        };
    }
}

fn packets(net: Res<Net>, time: Res<Time>, mut q: Query<(&Packet, &mut Transform, &mut Sprite, &mut Visibility)>) {
    let t = time.elapsed_secs();
    for (p, mut tf, mut sprite, mut vis) in &mut q {
        let (a, b) = net.links[p.link];
        let health = link_health(&net, p.link);
        // A stampede floods its links with fast red packets heading in.
        let flood = [a, b].iter().find(|&&n| net.incidents[n].is_some_and(|i| i.failure == Failure::Ddos)).copied();
        if health == Health::Down && flood.is_none() {
            *vis = Visibility::Hidden;
            continue;
        }
        *vis = Visibility::Inherited;
        let len = net.at[a].distance(net.at[b]).max(1.0);
        let speed = if flood.is_some() { 420.0 } else { 90.0 };
        let k = (t * speed / len + p.phase).fract();
        let (from, to) = match flood {
            Some(n) => (if n == a { b } else { a }, n),
            None if p.forward => (a, b),
            None => (b, a),
        };
        tf.translation = net.at[from].lerp(net.at[to], k).extend(NODE_Z - 1.0);
        sprite.color = match (flood, health) {
            (Some(_), _) => RED,
            (_, Health::Degraded) => AMBER,
            _ => Color::srgb(0.75, 1.0, 0.85),
        };
    }
}

fn cards(
    net: Res<Net>,
    time: Res<Time>,
    world: Res<World>,
    mut cards: Query<(&NodeCard, &mut Sprite)>,
    mut badges: Query<(&Badge, &mut Text2d, &mut Transform, &mut Visibility)>,
) {
    let t = time.elapsed_secs();
    let pulse = 0.5 + 0.5 * (t * 7.0).sin();
    for (card, mut sprite) in &mut cards {
        let base = node_color(&world.nodes[card.0].kind);
        sprite.color = match net.health[card.0] {
            Health::Online => base.with_alpha(0.9),
            Health::Degraded => Color::Srgba(base.to_srgba().mix(&AMBER.to_srgba(), pulse)).with_alpha(0.95),
            Health::Down => Color::srgba(0.18, 0.1, 0.1, 0.95),
        };
    }
    for (badge, mut text, mut tf, mut vis) in &mut badges {
        match net.incidents[badge.0] {
            Some(inc) => {
                text.0 = inc.failure.emoji().into();
                tf.translation.y = 58.0 + (t * 4.0 + badge.0 as f32).sin() * 4.0;
                *vis = Visibility::Inherited;
            }
            None => *vis = Visibility::Hidden,
        }
    }
}

fn popup(commands: &mut Commands, art: &Art, at: Vec2, text: String, color: Color, now: f32) {
    commands.spawn((
        Popup { born: now },
        Text2d::new(text),
        art.text(true, 22.0),
        TextColor(color),
        Transform::from_translation((at + Vec2::Y * 50.0).extend(NODE_Z + 50.0)).with_scale(Vec3::splat(0.5)),
    ));
}

fn popups(mut commands: Commands, time: Res<Time>, mut q: Query<(Entity, &Popup, &mut Transform, &mut TextColor)>) {
    let now = time.elapsed_secs();
    for (e, p, mut tf, mut color) in &mut q {
        let age = now - p.born;
        if age > 1.6 {
            commands.entity(e).despawn();
            continue;
        }
        tf.translation.y += 30.0 * time.delta_secs();
        color.0 = color.0.with_alpha((1.6 - age).min(1.0));
    }
}

impl Shift {
    fn say(&mut self, s: impl Into<String>, now: f32) {
        self.log.push_front((s.into(), now));
        self.log.truncate(MAX_LOG);
    }
}

/// Is this node a data store (gets replica disparity)?
fn is_store(kind: &str) -> bool {
    matches!(kind, "database" | "banana-cache" | "vault" | "river")
}

fn roll_failure(rng: &mut Rng, kind: &str) -> Failure {
    if is_store(kind) && rng.f32() < 0.45 {
        return Failure::Disparity;
    }
    if kind == "volcano" && rng.f32() < 0.5 {
        return Failure::Surge;
    }
    [Failure::Ddos, Failure::Worm, Failure::BadDeploy, Failure::Migration, Failure::Cert, Failure::Leak][rng.below(6)]
}

fn new_incident(rng: &mut Rng, failure: Failure, now: f32) -> Incident {
    let fix = failure.fix();
    let mut pool: Vec<Action> = Action::ALL.into_iter().filter(|a| *a != fix).collect();
    // Rollback and fall-forward are the classic confusion; offer the other one when it applies.
    let twin = match fix {
        Action::Rollback => Some(Action::FallForward),
        Action::FallForward => Some(Action::Rollback),
        _ => None,
    };
    let mut options = vec![fix];
    if let Some(t) = twin {
        pool.retain(|a| *a != t);
        options.push(t);
    }
    while options.len() < 4 {
        options.push(pool.remove(rng.below(pool.len())));
    }
    for i in (1..4).rev() {
        options.swap(i, rng.below(i + 1));
    }
    Incident { failure, since: now, options: [options[0], options[1], options[2], options[3]], tried: 0, stage: 0 }
}

impl Net {
    fn strike(&mut self, node: usize, inc: Incident) -> bool {
        if self.incidents[node].is_some() || self.health[node] == Health::Down {
            return false;
        }
        self.incidents[node] = Some(inc);
        self.health[node] = Health::Degraded;
        self.version += 1;
        true
    }
}

fn start(shift: &mut Shift, net: &mut Net, now: f32) {
    *shift = Shift { phase: Phase::Running, turn: 0, left: 0.0, len: 16.0, sla: START_SLA, ..default() };
    net.health.iter_mut().for_each(|h| *h = Health::Online);
    net.incidents.iter_mut().for_each(|i| *i = None);
    net.version += 1;
    shift.say("Shift started. Space jumps to the next alert, 1-4 applies a fix.", now);
}

fn controls(
    mut commands: Commands,
    keys: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    art: Res<Art>,
    world: Res<World>,
    mut shift: ResMut<Shift>,
    mut net: ResMut<Net>,
    mut view: ResMut<ViewState>,
    start_button: Query<&Interaction, (With<StartButton>, Changed<Interaction>)>,
    action_buttons: Query<(&Interaction, &ActionButton), Changed<Interaction>>,
) {
    let now = time.elapsed_secs();
    let start_pressed = start_button.iter().any(|i| *i == Interaction::Pressed);
    if shift.phase != Phase::Running {
        if start_pressed || keys.just_pressed(KeyCode::Enter) {
            start(&mut shift, &mut net, now);
        }
        return;
    }
    if keys.just_pressed(KeyCode::Space) {
        // Jump to the oldest open incident.
        if let Some((i, _)) = net.incidents.iter().enumerate().filter_map(|(i, x)| x.map(|x| (i, x.since))).min_by(|a, b| a.1.total_cmp(&b.1)) {
            view.selected = Some(i);
            view.focus = Some(net.at[i]);
        }
    }
    let mut choice = None;
    for (n, k) in [KeyCode::Digit1, KeyCode::Digit2, KeyCode::Digit3, KeyCode::Digit4].into_iter().enumerate() {
        if keys.just_pressed(k) {
            choice = Some(n);
        }
    }
    for (i, b) in &action_buttons {
        if *i == Interaction::Pressed {
            choice = Some(b.0);
        }
    }
    let (Some(choice), Some(node)) = (choice, view.selected) else { return };
    let Some(mut inc) = net.incidents[node] else { return };
    if inc.tried & (1 << choice) != 0 {
        return;
    }
    let action = inc.options[choice];
    let name = &world.nodes[node].name;
    if action == inc.failure.fix() {
        let reaction = now - inc.since;
        let points = (100.0 * (1.0 - reaction / 20.0).clamp(0.1, 1.0)) as u32 + 10 * shift.turn;
        shift.score += points;
        shift.fixes += 1;
        shift.reactions.push(reaction);
        net.incidents[node] = None;
        net.health[node] = Health::Online;
        shift.say(format!("✓ {name}: {} fixed in {reaction:.1}s (+{points})", inc.failure.name()), now);
        popup(&mut commands, &art, net.at[node], format!("+{points}  {reaction:.1}s"), GREEN_400, now);
    } else {
        inc.tried |= 1 << choice;
        inc.stage += 1;
        shift.sla -= 3.0;
        net.health[node] = if inc.stage >= 2 { Health::Down } else { Health::Degraded };
        net.incidents[node] = Some(inc);
        shift.say(format!("✗ {name}: \"{}\" made it worse", action.label()), now);
        popup(&mut commands, &art, net.at[node], "✗ SLA -3".into(), RED_400, now);
    }
    net.version += 1;
}

fn turns(time: Res<Time>, world: Res<World>, mut rng: ResMut<Rng>, mut shift: ResMut<Shift>, mut net: ResMut<Net>) {
    if shift.phase != Phase::Running {
        return;
    }
    let now = time.elapsed_secs();
    shift.left -= time.delta_secs();
    if shift.left > 0.0 {
        if shift.sla <= 0.0 {
            end(&mut shift, now);
        }
        return;
    }
    // End of turn: everything still broken escalates.
    let n = net.health.len();
    let mut damage = 0.0;
    let mut spread = Vec::new();
    for i in 0..n {
        let Some(mut inc) = net.incidents[i] else { continue };
        inc.stage += 1;
        net.health[i] = if inc.stage >= 2 { Health::Down } else { Health::Degraded };
        net.incidents[i] = Some(inc);
        match inc.failure {
            Failure::Worm => spread.push((i, Failure::Worm)),
            Failure::Ddos if inc.stage >= 2 => spread.push((i, Failure::Ddos)),
            _ => {}
        }
        if inc.failure == Failure::Disparity && inc.stage == 2 {
            damage += 6.0;
            shift.say(format!("💥 {}: replicas diverged, data lost", world.nodes[i].name), now);
        }
    }
    for (from, failure) in spread {
        let healthy: Vec<usize> = net.neighbours[from].iter().copied().filter(|&j| net.incidents[j].is_none() && net.health[j] != Health::Down).collect();
        if healthy.is_empty() {
            continue;
        }
        let j = healthy[rng.below(healthy.len())];
        let inc = new_incident(&mut rng, failure, now);
        if net.strike(j, inc) {
            shift.say(format!("{} {} spread from {} to {}", failure.emoji(), failure.name(), world.nodes[from].name, world.nodes[j].name), now);
        }
    }
    for h in &net.health {
        damage += match h {
            Health::Online => 0.0,
            Health::Degraded => 1.0,
            Health::Down => 4.0,
        };
    }
    shift.sla -= damage;
    if shift.sla <= 0.0 {
        end(&mut shift, now);
        net.version += 1;
        return;
    }
    // Next turn: shorter, with more incidents.
    shift.turn += 1;
    shift.len = (16.0 - shift.turn as f32 * 0.8).max(6.0);
    shift.left = shift.len;
    let count = (1 + shift.turn / 3).min(4) as usize;
    let mut candidates: Vec<usize> = (0..n).filter(|&i| net.incidents[i].is_none() && net.health[i] == Health::Online).collect();
    for _ in 0..count.min(candidates.len()) {
        let i = candidates.swap_remove(rng.below(candidates.len()));
        let failure = roll_failure(&mut rng, &world.nodes[i].kind);
        let inc = new_incident(&mut rng, failure, now);
        net.strike(i, inc);
        shift.say(format!("🚨 {} {} on {}", failure.emoji(), failure.name(), world.nodes[i].name), now);
    }
    let banner = format!("— Turn {} · {:.0}s —", shift.turn, shift.len);
    shift.say(banner, now);
    net.version += 1;
}

fn end(shift: &mut Shift, now: f32) {
    shift.phase = Phase::Over;
    shift.sla = shift.sla.max(0.0);
    let avg = if shift.reactions.is_empty() { 0.0 } else { shift.reactions.iter().sum::<f32>() / shift.reactions.len() as f32 };
    let (turns, fixes, score) = (shift.turn, shift.fixes, shift.score);
    shift.say(format!("SLA breached. {turns} turns, {fixes} fixes, avg {avg:.1}s, score {score}"), now);
}

/// Lightning from a storm cloud knocks out the power of the node it hits.
fn strikes(mut reader: MessageReader<Strike>, time: Res<Time>, world: Res<World>, mut rng: ResMut<Rng>, mut shift: ResMut<Shift>, mut net: ResMut<Net>) {
    for Strike(at) in reader.read() {
        if shift.phase != Phase::Running {
            continue;
        }
        let Some((i, d)) = net.at.iter().enumerate().map(|(i, p)| (i, p.distance(*at))).min_by(|a, b| a.1.total_cmp(&b.1)) else { continue };
        if d > 110.0 || rng.f32() > 0.6 {
            continue;
        }
        let now = time.elapsed_secs();
        let inc = new_incident(&mut rng, Failure::Surge, now);
        if net.strike(i, inc) {
            shift.say(format!("⚡ Lightning hit {}!", world.nodes[i].name), now);
        }
    }
}

fn spawn_hud(mut commands: Commands, art: Res<Art>) {
    commands.spawn((
        Node {
            position_type: PositionType::Absolute,
            top: px(16),
            left: px(16),
            max_width: px(420),
            margin: UiRect::right(px(60)),
            flex_direction: FlexDirection::Column,
            row_gap: px(6),
            ..default()
        },
        children![
            (
                Blocks,
                Interaction::default(),
                Node {
                    flex_direction: FlexDirection::Column,
                    padding: UiRect::axes(px(10), px(8)),
                    row_gap: px(6),
                    border: UiRect::all(px(1)),
                    border_radius: BorderRadius::all(px(8)),
                    ..default()
                },
                BorderColor::all(GREEN_500.with_alpha(0.4)),
                BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.85)),
                children![
                    (HudText, Text::new("🐵 ON-CALL"), art.text(true, 13.0), TextColor(GREEN_400)),
                    (
                        Node { width: percent(100), height: px(4), border_radius: BorderRadius::MAX, overflow: Overflow::clip(), ..default() },
                        BackgroundColor(GREEN_900.with_alpha(0.6)),
                        children![(HudBar, Node { width: percent(0), height: percent(100), ..default() }, BackgroundColor(GREEN_500))],
                    ),
                    (
                        StartButton,
                        Interaction::default(),
                        Node {
                            padding: UiRect::axes(px(10), px(6)),
                            justify_content: JustifyContent::Center,
                            border: UiRect::all(px(1)),
                            border_radius: BorderRadius::MAX,
                            ..default()
                        },
                        BorderColor::all(GREEN_500.with_alpha(0.6)),
                        BackgroundColor(GREEN_900.with_alpha(0.5)),
                        children![(StartLabel, Text::new("START SHIFT (Enter)"), art.text(true, 12.0), TextColor(GREEN_400))],
                    ),
                ],
            ),
            (LogText, Text::new(""), art.text(false, 11.0), TextColor(GREEN_300), Node { padding: UiRect::horizontal(px(4)), ..default() }),
        ],
    ));
}

fn hud(
    time: Res<Time>,
    shift: Res<Shift>,
    net: Res<Net>,
    mut texts: Query<&mut Text>,
    hud_text: Single<Entity, With<HudText>>,
    log_text: Single<Entity, With<LogText>>,
    start_label: Single<Entity, With<StartLabel>>,
    mut bar: Single<(&mut Node, &mut BackgroundColor), With<HudBar>>,
    mut start_node: Single<&mut Node, (With<StartButton>, Without<HudBar>)>,
) {
    let open = net.incidents.iter().filter(|i| i.is_some()).count();
    let line = match shift.phase {
        Phase::Idle => "🐵 ON-CALL · keep the jungle network up".to_string(),
        Phase::Running => format!(
            "TURN {}  ⏱ {:.1}s  SLA {:.0}%  ★ {}  🚨 {}",
            shift.turn.max(1),
            shift.left.max(0.0),
            shift.sla.max(0.0),
            shift.score,
            open
        ),
        Phase::Over => format!("SHIFT OVER  ★ {}  turns {}  fixes {}", shift.score, shift.turn, shift.fixes),
    };
    if let Ok(mut t) = texts.get_mut(*hud_text) {
        if t.0 != line {
            t.0 = line;
        }
    }
    let running = shift.phase == Phase::Running;
    start_node.display = if running { Display::None } else { Display::Flex };
    if let Ok(mut t) = texts.get_mut(*start_label) {
        let want = if shift.phase == Phase::Over { "AGAIN (Enter)" } else { "START SHIFT (Enter)" };
        if t.0 != want {
            t.0 = want.into();
        }
    }
    let (node, bg) = &mut *bar;
    let frac = if running && shift.len > 0.0 { (shift.left / shift.len).clamp(0.0, 1.0) } else { 0.0 };
    node.width = percent(frac * 100.0);
    bg.0 = if frac < 0.3 { RED } else { GREEN_500 };
    let now = time.elapsed_secs();
    let log: Vec<&str> = shift.log.iter().filter(|(_, at)| now - at < 12.0 || shift.phase == Phase::Over).map(|(s, _)| s.as_str()).collect();
    let log = log.join("\n");
    if let Ok(mut t) = texts.get_mut(*log_text) {
        if t.0 != log {
            t.0 = log;
        }
    }
}
