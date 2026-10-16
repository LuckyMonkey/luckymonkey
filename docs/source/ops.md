---
title: Lucky Monkey source - ops.rs
---

# Source: game/src/ops.rs

**The game itself: failures and fixes, the network model, the shift clock, the monkey, routing, alerts, the HUD.** Explained in [simulation](../simulation.md). 1621 lines. [On GitHub](https://github.com/LuckyMonkey/luckymonkey/blob/main/game/src/ops.rs) (needs repo access). This page is generated from the code on every deploy by `tools/wiki-source.py`; back to the [source index](index.md).

## What this file says about itself

On-call shifts - the game loop.

You are the on-call monkey (🐒). Nodes are wired by their API connections;
frames stream along every link. A shift runs 09:00-17:00 on the clock.

- **Incidents** (reactive) break a node now and carry a TTL. When the TTL
runs out the node goes down, worms crawl on, stampedes spill over.
- **Forecasts** (proactive) come from the Watchtower: a cert expiring, a
deploy scheduled, a disk filling. Act before the countdown and the
incident never happens. If the Watchtower is down you fly blind.

Every fix takes time and is done where the monkey stands: pick a fix on any
node and the monkey walks the links there (routing around down nodes, or
hiking overland, slowly, when there's no route), then works. Down and
degraded nodes drain the SLA; the shift is lost when it hits zero.

## Contents

| Item | What it is |
|---|---|
| [enum Failure](#enum_failure) |  |
| [impl Failure](#impl_failure) |  |
| [enum Action](#enum_action) |  |
| [impl Action](#impl_action) |  |
| [enum Health](#enum_health) |  |
| [impl Health](#impl_health) |  |
| [struct Alert](#struct_alert) | Something wrong (or about to be) on a node. |
| [impl Alert](#impl_alert) |  |
| [struct Net](#struct_net) | Live state of the network. `version` bumps on every change so the UI can rebuild. |
| [impl Net](#impl_net) |  |
| [enum Phase](#enum_phase) |  |
| [const START_HOUR](#const_start_hour) |  |
| [const HOURS](#const_hours) |  |
| [struct Shift](#struct_shift) |  |
| [impl Shift](#impl_shift) |  |
| [struct Monkey](#struct_monkey) | The on-call monkey. |
| [struct Job](#struct_job) |  |
| [struct LinkLine](#struct_linkline) |  |
| [struct LinkFrame](#struct_linkframe) |  |
| [struct Badge](#struct_badge) |  |
| [struct BadgeTtl](#struct_badgettl) |  |
| [struct MonkeyToken](#struct_monkeytoken) |  |
| [struct WorkBar](#struct_workbar) |  |
| [struct Popup](#struct_popup) |  |
| [struct HudText](#struct_hudtext) |  |
| [struct MonkeyText](#struct_monkeytext) |  |
| [struct HudBar](#struct_hudbar) |  |
| [struct LogText](#struct_logtext) |  |
| [struct AlertList](#struct_alertlist) |  |
| [struct AlertRow](#struct_alertrow) |  |
| [struct StartButton](#struct_startbutton) |  |
| [struct StartLabel](#struct_startlabel) |  |
| [struct ActionButton](#struct_actionbutton) | A fix button in the node panel (built by `alert_box`), by option index. |
| [struct GoButton](#struct_gobutton) | "Send the monkey here" button in the node panel. |
| [struct PanelTtl](#struct_panelttl) | Live countdown text (alert list and node panel). |
| [struct AlertListVersion](#struct_alertlistversion) |  |
| [struct EdgePin](#struct_edgepin) | A node's stand-in pinned to the screen edge while the node is off screen. |
| [struct NextText](#struct_nexttext) |  |
| [struct SwingButton](#struct_swingbutton) | "Swing here" button in the node panel. |
| [fn plugin](#fn_plugin) |  |
| [fn data_health](#fn_data_health) |  |
| [fn setup_net](#fn_setup_net) |  |
| [const FRAME_GAP](#const_frame_gap) |  |
| [fn spawn_overlay](#fn_spawn_overlay) | Links with a stream of frames each way, the monkey, and an alert badge per node card. |
| [fn link_health](#fn_link_health) |  |
| [const AMBER](#const_amber) |  |
| [const RED](#const_red) |  |
| [fn links](#fn_links) |  |
| [fn frames](#fn_frames) | Frames ride each link both ways, in two lanes. A stampede floods its links |
| [fn spreads](#fn_spreads) |  |
| [fn ttl_text](#fn_ttl_text) |  |
| [fn cards](#fn_cards) |  |
| [fn monkey_token](#fn_monkey_token) |  |
| [fn popup](#fn_popup) |  |
| [fn popups](#fn_popups) |  |
| [fn is_store](#fn_is_store) | Data stores get replica trouble and full disks. |
| [fn options_for](#fn_options_for) |  |
| [fn incident](#fn_incident) |  |
| [fn forecast](#fn_forecast) |  |
| [fn start](#fn_start) |  |
| [fn route](#fn_route) | Shortest walk from `from` to `to` over the links. Down nodes can't be |
| [fn eta](#fn_eta) | Seconds until the monkey reaches `to` on its current plan (roughly). |
| [impl Monkey](#impl_monkey) |  |
| [const ARROWS](#const_arrows) | Screen direction of an arrow key. |
| [fn island_of](#fn_island_of) |  |
| [fn island_entry](#fn_island_entry) |  |
| [fn navigate](#fn_navigate) | Jumping the selection around: arrows hop to the nearest node in that |
| [const PIN](#const_pin) |  |
| [const PIN_MARGIN](#const_pin_margin) |  |
| [fn spawn_pins](#fn_spawn_pins) |  |
| [fn pins](#fn_pins) | Nodes out of view turn into their icon, stuck to the screen edge in the |
| [fn pin_clicks](#fn_pin_clicks) |  |
| [fn controls](#fn_controls) |  |
| [fn walk](#fn_walk) | Move the monkey along its path. |
| [fn work](#fn_work) | Do the queued fix once on site. |
| [fn clock](#fn_clock) | The shift clock: countdowns, escalation, SLA drain, new trouble. |
| [fn strikes](#fn_strikes) | Lightning from a storm cloud knocks out the power of the node it hits. |
| [fn apply_link](#fn_apply_link) | A deep link (see link.rs): fly to a node, open its panel, maybe stage trouble. |
| [fn spawn_hud](#fn_spawn_hud) |  |
| [fn set](#fn_set) |  |
| [fn hud](#fn_hud) |  |
| [fn next_step](#fn_next_step) | One line telling the player what to do now. |
| [fn alert_list](#fn_alert_list) | Open alerts, most urgent first, clickable. Rebuilt when the network changes. |
| [fn live_ttls](#fn_live_ttls) | Countdown texts in the alert list and node panel. |
| [fn swing_button](#fn_swing_button) | The node panel's top section: the open alert with its fixes (keys 1-4), or a "go here" button. |
| [fn alert_box](#fn_alert_box) |  |

## Imports

```rust
use bevy::prelude::*;
use crate::clouds::Strike;
use crate::data::{tuning, ActionDef, FailureDef};
use crate::ui::{Blocks, GREEN_300, GREEN_400, GREEN_500, GREEN_900, RED_400, RED_500};
use crate::view::ViewState;
use crate::world::{emoji_text, iso, node_color, NodeCard, World, NODE_Z};
use crate::{Art, Rng, Screen};
```

## Code

### enum Failure

```rust
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
    DiskFull,
}
```

### impl Failure

```rust
impl Failure {
    /// Key in tuning.json `failures`.
    fn key(self) -> &'static str {
        match self {
            Failure::Ddos => "ddos",
            Failure::Worm => "worm",
            Failure::Disparity => "disparity",
            Failure::BadDeploy => "deploy",
            Failure::Migration => "migration",
            Failure::Surge => "lightning",
            Failure::Cert => "cert",
            Failure::Leak => "leak",
            Failure::DiskFull => "disk",
        }
    }
    fn def(self) -> Option<&'static FailureDef> {
        tuning().failures.get(self.key())
    }
    pub fn emoji(self) -> &'static str {
        self.def().map_or("⚠️", |d| d.emoji.as_str())
    }
    pub fn name(self) -> &'static str {
        self.def().map_or(self.key(), |d| d.name.as_str())
    }
    pub fn symptom(self) -> &'static str {
        self.def().map_or("", |d| d.symptom.as_str())
    }
    pub fn fix(self) -> Action {
        self.def().and_then(|d| Action::from_key(&d.fix)).unwrap_or(Action::Restart)
    }
    /// What the Watchtower says before it happens, and the action that prevents it.
    pub fn forecast(self) -> Option<(&'static str, &'static str, Action)> {
        let f = self.def()?.forecast.as_ref()?;
        Some((f.emoji.as_str(), f.text.as_str(), Action::from_key(&f.prevent)?))
    }
    /// Seconds from appearing to escalating.
    fn ttl(self) -> f32 {
        self.def().map_or(40.0, |d| d.ttl)
    }
}
```

### enum Action

```rust
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
    Canary,
    Cleanup,
    Patch,
}
```

### impl Action

```rust
impl Action {
    const ALL: [Action; 11] = [
        Action::RateLimit,
        Action::Quarantine,
        Action::Resync,
        Action::Rollback,
        Action::FallForward,
        Action::Failover,
        Action::RotateCert,
        Action::Restart,
        Action::Canary,
        Action::Cleanup,
        Action::Patch,
    ];
    /// Key in tuning.json `actions`.
    fn key(self) -> &'static str {
        match self {
            Action::RateLimit => "ratelimit",
            Action::Quarantine => "quarantine",
            Action::Resync => "resync",
            Action::Rollback => "rollback",
            Action::FallForward => "fallforward",
            Action::Failover => "failover",
            Action::RotateCert => "rotatecert",
            Action::Restart => "restart",
            Action::Canary => "canary",
            Action::Cleanup => "cleanup",
            Action::Patch => "patch",
        }
    }
    fn from_key(k: &str) -> Option<Action> {
        Action::ALL.into_iter().find(|a| a.key() == k)
    }
    fn def(self) -> Option<&'static ActionDef> {
        tuning().actions.get(self.key())
    }
    pub fn emoji(self) -> &'static str {
        self.def().map_or("🔧", |d| d.emoji.as_str())
    }
    pub fn label(self) -> &'static str {
        self.def().map_or(self.key(), |d| d.label.as_str())
    }
    /// Seconds of work at the node.
    pub fn secs(self) -> f32 {
        self.def().map_or(3.0, |d| d.secs)
    }
}
```

### enum Health

```rust
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Health {
    Online,
    Degraded,
    Down,
}
```

### impl Health

```rust
impl Health {
    pub fn label(self) -> &'static str {
        match self {
            Health::Online => "online",
            Health::Degraded => "unstable",
            Health::Down => "offline",
        }
    }
}
```

### struct Alert

Something wrong (or about to be) on a node.

```rust
#[derive(Clone, Copy)]
pub struct Alert {
    pub failure: Failure,
    /// Not broken yet: act before `ttl` runs out to prevent it.
    pub forecast: bool,
    /// Seconds until it hits (forecast) or escalates (incident).
    pub ttl: f32,
    pub options: [Action; 4],
    /// Bitmask of options already tried (wrong).
    pub tried: u8,
    /// Shift time it appeared; also identifies it.
    pub since: f32,
}
```

### impl Alert

```rust
impl Alert {
    pub fn right(&self) -> Action {
        if self.forecast { self.failure.forecast().map_or(self.failure.fix(), |f| f.2) } else { self.failure.fix() }
    }
}
```

### struct Net

Live state of the network. `version` bumps on every change so the UI can rebuild.

```rust
#[derive(Resource)]
pub struct Net {
    pub health: Vec<Health>,
    pub alerts: Vec<Option<Alert>>,
    links: Vec<(usize, usize)>,
    neighbours: Vec<Vec<usize>>,
    /// World position of each node card.
    at: Vec<Vec2>,
    kinds: Vec<String>,
    pub names: Vec<String>,
    /// The Watchtower node (forecasts need it up).
    watchtower: Option<usize>,
    /// The fix the monkey is on its way to do, if any: (node, option).
    pub queued: Option<(usize, usize)>,
    pub version: u32,
}
```

### impl Net

```rust
impl Net {
    /// Forecasts are visible while the Watchtower is up.
    pub fn sighted(&self) -> bool {
        self.watchtower.is_none_or(|w| self.health[w] != Health::Down)
    }
    fn touch(&mut self) {
        self.version = self.version.wrapping_add(1);
    }
    /// Raise an alert on a node that has none. Incidents degrade it right away.
    fn raise(&mut self, node: usize, alert: Alert) -> bool {
        if self.alerts[node].is_some() || self.health[node] == Health::Down {
            return false;
        }
        if !alert.forecast {
            self.health[node] = Health::Degraded;
        }
        self.alerts[node] = Some(alert);
        self.touch();
        true
    }
}
```

### enum Phase

```rust
#[derive(Clone, Copy, PartialEq, Eq, Default)]
pub enum Phase {
    #[default]
    Idle,
    Running,
    Won,
    Lost,
}
```

### const START_HOUR

```rust
const START_HOUR: f32 = 9.0;
```

### const HOURS

```rust
const HOURS: f32 = 8.0;
```

### struct Shift

```rust
#[derive(Resource, Default)]
pub struct Shift {
    pub phase: Phase,
    /// Seconds into the shift.
    clock: f32,
    sla: f32,
    score: u32,
    fixes: u32,
    prevented: u32,
    next_incident: f32,
    next_forecast: f32,
    /// Spent on vine swings (J): straight to any node, fast, over anything.
    bananas: u32,
    /// Right fixes in a row; multiplies points.
    combo: u32,
    log: VecDeque<(String, f32)>,
}
```

### impl Shift

```rust
impl Shift {
    fn say(&mut self, s: impl Into<String>) {
        let now = self.clock;
        self.log.push_front((s.into(), now));
        self.log.truncate(5);
    }
    /// 0 at 09:00, 1 at 17:00.
    fn progress(&self) -> f32 {
        (self.clock / tuning().shift_secs).clamp(0.0, 1.0)
    }
    fn time_of_day(&self) -> String {
        let h = START_HOUR + self.progress() * HOURS;
        format!("{:02}:{:02}", h as u32, ((h.fract() * 60.0) as u32 / 5) * 5)
    }
}
```

### struct Monkey

The on-call monkey.

```rust
#[derive(Resource)]
pub struct Monkey {
    /// Node it is at (or last left).
    at: usize,
    /// Nodes still to walk to, in order.
    path: VecDeque<usize>,
    /// Progress along the current leg (0..1) and its length.
    leg: f32,
    leg_len: f32,
    /// The current leg isn't a link: hiking overland, slowly.
    overland: bool,
    /// Pending or running work.
    job: Option<Job>,
    pos: Vec2,
    /// The current leg is a vine swing (fast, straight, from `origin`).
    swing: bool,
    origin: Option<Vec2>,
}
```

### struct Job

```rust
#[derive(Clone, Copy)]
struct Job {
    node: usize,
    option: usize,
    action: Action,
    /// Which alert it was ordered for (its `since`).
    alert: f32,
    /// Seconds of work left once on site.
    left: f32,
    total: f32,
}
```

### struct LinkLine

```rust
#[derive(Component)]
struct LinkLine(usize);
```

### struct LinkFrame

```rust
#[derive(Component)]
struct LinkFrame {
    link: usize,
    forward: bool,
    offset: f32,
}
```

### struct Badge

```rust
#[derive(Component)]
struct Badge(usize);
```

### struct BadgeTtl

```rust
#[derive(Component)]
struct BadgeTtl(usize);
```

### struct MonkeyToken

```rust
#[derive(Component)]
struct MonkeyToken;
```

### struct WorkBar

```rust
#[derive(Component)]
struct WorkBar;
```

### struct Popup

```rust
#[derive(Component)]
struct Popup {
    born: f32,
}
```

### struct HudText

```rust
#[derive(Component)]
struct HudText;
```

### struct MonkeyText

```rust
#[derive(Component)]
struct MonkeyText;
```

### struct HudBar

```rust
#[derive(Component)]
struct HudBar;
```

### struct LogText

```rust
#[derive(Component)]
struct LogText;
```

### struct AlertList

```rust
#[derive(Component)]
struct AlertList;
```

### struct AlertRow

```rust
#[derive(Component)]
struct AlertRow(usize);
```

### struct StartButton

```rust
#[derive(Component)]
struct StartButton;
```

### struct StartLabel

```rust
#[derive(Component)]
struct StartLabel;
```

### struct ActionButton

A fix button in the node panel (built by `alert_box`), by option index.

```rust
#[derive(Component)]
pub struct ActionButton(pub usize);
```

### struct GoButton

"Send the monkey here" button in the node panel.

```rust
#[derive(Component)]
pub struct GoButton;
```

### struct PanelTtl

Live countdown text (alert list and node panel).

```rust
#[derive(Component)]
pub struct PanelTtl(pub usize);
```

### struct AlertListVersion

```rust
#[derive(Resource, Default)]
struct AlertListVersion(Option<u32>);
```

### struct EdgePin

A node's stand-in pinned to the screen edge while the node is off screen.

```rust
#[derive(Component)]
struct EdgePin(usize);
```

### struct NextText

```rust
#[derive(Component)]
struct NextText;
```

### struct SwingButton

"Swing here" button in the node panel.

```rust
#[derive(Component)]
pub struct SwingButton;
```

### fn plugin

```rust
pub fn plugin(app: &mut App) {
    app.init_resource::<Shift>()
        .init_resource::<AlertListVersion>()
        .add_systems(Startup, setup_net)
        .add_systems(PostStartup, spawn_overlay)
        .add_systems(OnEnter(Screen::Playing), (spawn_hud, spawn_pins, apply_link).chain())
        .add_systems(Update, (pins, pin_clicks).run_if(in_state(Screen::Playing)))
        .add_systems(Update, (links, frames, cards, popups, monkey_token))
        .add_systems(
            Update,
            (navigate, controls, walk, work, clock, strikes, hud, alert_list, live_ttls).chain().run_if(in_state(Screen::Playing)),
        );
}
```

### fn data_health

```rust
fn data_health(status: Option<&str>) -> Health {
    match status {
        Some("offline") => Health::Down,
        Some("unstable" | "erupting") => Health::Degraded,
        _ => Health::Online,
    }
}
```

### fn setup_net

```rust
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
    let at: Vec<Vec2> = world
        .nodes
        .iter()
        .map(|node| {
            let p = &node.position;
            iso(p.x, p.y, world.ground(p.x, p.y).max(p.height))
        })
        .collect();
    let home = world.nodes.iter().position(|n| n.kind == "monkey").unwrap_or(0);
    commands.insert_resource(Monkey { at: home, path: VecDeque::new(), leg: 0.0, leg_len: 1.0, overland: false, job: None, pos: at[home], swing: false, origin: None });
    commands.insert_resource(Net {
        health: world.nodes.iter().map(|n| data_health(n.status.as_deref())).collect(),
        alerts: vec![None; n],
        links,
        neighbours,
        at,
        kinds: world.nodes.iter().map(|n| n.kind.clone()).collect(),
        names: world.nodes.iter().map(|n| n.name.clone()).collect(),
        watchtower: world.nodes.iter().position(|n| n.kind == "monitor"),
        queued: None,
        version: 0,
    });
}
```

### const FRAME_GAP

```rust
const FRAME_GAP: f32 = 34.0;
```

### fn spawn_overlay

Links with a stream of frames each way, the monkey, and an alert badge per node card.

```rust
fn spawn_overlay(mut commands: Commands, net: Res<Net>, monkey: Res<Monkey>, art: Res<Art>, cards: Query<(Entity, &NodeCard)>) {
    for (i, &(a, b)) in net.links.iter().enumerate() {
        let (pa, pb) = (net.at[a], net.at[b]);
        let d = pb - pa;
        commands.spawn((
            LinkLine(i),
            Sprite::from_color(Color::WHITE, Vec2::new(d.length(), 2.0)),
            Transform::from_translation(((pa + pb) / 2.0).extend(NODE_Z - 2.0)).with_rotation(Quat::from_rotation_z(d.to_angle())),
        ));
        let count = (d.length() / FRAME_GAP).max(1.0) as usize;
        for forward in [true, false] {
            for k in 0..count {
                commands.spawn((
                    LinkFrame { link: i, forward, offset: (k as f32 + if forward { 0.0 } else { 0.5 }) / count as f32 },
                    Sprite { image: art.frame.clone(), color: Color::WHITE, custom_size: Some(Vec2::new(12.0, 7.0)), ..default() },
                    Transform::from_translation(pa.extend(NODE_Z - 1.0)),
                ));
            }
        }
    }
    for (e, card) in &cards {
        commands.entity(e).with_children(|c| {
            c.spawn((Badge(card.0), emoji_text(&art, "⚠️", 30.0), Transform::from_xyz(0.0, 62.0, 0.01).with_scale(Vec3::splat(0.5)), Visibility::Hidden))
                .with_child((BadgeTtl(card.0), Text2d::new(""), art.text(true, 22.0), TextColor(RED_400), Transform::from_xyz(0.0, 40.0, 0.01)));
        });
    }
    commands
        .spawn((MonkeyToken, emoji_text(&art, "🐒", 34.0), Transform::from_translation(monkey.pos.extend(NODE_Z + 30.0)).with_scale(Vec3::splat(0.5))))
        .with_child((WorkBar, Sprite::from_color(Color::srgb(1.0, 0.85, 0.2), Vec2::new(60.0, 6.0)), Transform::from_xyz(0.0, -44.0, 0.01), Visibility::Hidden));
}
```

### fn link_health

```rust
fn link_health(net: &Net, l: usize) -> Health {
    let (a, b) = net.links[l];
    match (net.health[a], net.health[b]) {
        (Health::Down, _) | (_, Health::Down) => Health::Down,
        (Health::Degraded, _) | (_, Health::Degraded) => Health::Degraded,
        _ => Health::Online,
    }
}
```

### const AMBER

```rust
const AMBER: Color = Color::srgb(0.98, 0.75, 0.14);
```

### const RED

```rust
const RED: Color = Color::srgb(0.94, 0.27, 0.27);
```

### fn links

```rust
fn links(net: Res<Net>, mut q: Query<(&LinkLine, &mut Sprite)>) {
    for (link, mut sprite) in &mut q {
        sprite.color = match link_health(&net, link.0) {
            Health::Online => GREEN_400.with_alpha(0.18),
            Health::Degraded => AMBER.with_alpha(0.3),
            Health::Down => RED.with_alpha(0.22),
        };
    }
}
```

### fn frames

Frames ride each link both ways, in two lanes. A stampede floods its links with fast red frames heading in; a down link stalls (frames stop, dim red).

```rust
fn frames(net: Res<Net>, time: Res<Time>, mut q: Query<(&LinkFrame, &mut Transform, &mut Sprite)>) {
    let t = time.elapsed_secs();
    for (f, mut tf, mut sprite) in &mut q {
        let (a, b) = net.links[f.link];
        let health = link_health(&net, f.link);
        let flood = [a, b].into_iter().find(|&n| net.alerts[n].is_some_and(|x| !x.forecast && x.failure == Failure::Ddos));
        let len = net.at[a].distance(net.at[b]).max(1.0);
        let (speed, color) = match (flood, health) {
            (Some(_), _) => (300.0, RED.with_alpha(0.9)),
            (None, Health::Down) => (0.0, RED.with_alpha(0.3)),
            (None, Health::Degraded) => (25.0, AMBER.with_alpha(0.8)),
            (None, Health::Online) => (60.0, Color::srgba(0.7, 1.0, 0.85, 0.75)),
        };
        let k = (t * speed / len + f.offset).fract();
        let (from, to) = match flood {
            Some(n) => (if n == a { b } else { a }, n),
            None if f.forward => (a, b),
            None => (b, a),
        };
        let dir = (net.at[to] - net.at[from]).normalize_or_zero();
        // Keep to the right so the two directions don't overlap.
        let lane = Vec2::new(dir.y, -dir.x) * if flood.is_some() { 0.0 } else { 4.0 };
        // Stay clear of the node cards at either end.
        let margin = (42.0 / len).min(0.45);
        let k = margin + k * (1.0 - 2.0 * margin);
        tf.translation = (net.at[from].lerp(net.at[to], k) + lane).extend(NODE_Z - 1.0);
        tf.rotation = Quat::from_rotation_z(dir.to_angle());
        sprite.color = color;
    }
}
```

### fn spreads

```rust
fn spreads(f: Failure) -> bool {
    matches!(f, Failure::Worm | Failure::Ddos)
}
```

### fn ttl_text

```rust
fn ttl_text(a: &Alert, health: Health) -> String {
    if a.forecast {
        format!("in {:.0}s", a.ttl.max(0.0))
    } else if health == Health::Down && !spreads(a.failure) {
        "DOWN".into()
    } else {
        format!("⏳{:.0}s", a.ttl.max(0.0))
    }
}
```

### fn cards

```rust
fn cards(
    net: Res<Net>,
    time: Res<Time>,
    world: Res<World>,
    mut cards: Query<(&NodeCard, &mut Sprite)>,
    mut badges: Query<(&Badge, &mut Text2d, &mut Transform, &mut Visibility), Without<BadgeTtl>>,
    mut ttls: Query<(&BadgeTtl, &mut Text2d, &mut TextColor), Without<Badge>>,
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
    let sighted = net.sighted();
    for (badge, mut text, mut tf, mut vis) in &mut badges {
        match net.alerts[badge.0].filter(|a| !a.forecast || sighted) {
            Some(a) => {
                let glyph = if a.forecast { a.failure.forecast().map_or("🔮", |f| f.0) } else { a.failure.emoji() };
                if text.0 != glyph {
                    text.0 = glyph.into();
                }
                tf.translation.y = 62.0 + (t * 4.0 + badge.0 as f32).sin() * 3.0;
                *vis = Visibility::Inherited;
            }
            None => *vis = Visibility::Hidden,
        }
    }
    for (ttl, mut text, mut color) in &mut ttls {
        if let Some(a) = net.alerts[ttl.0] {
            let s = ttl_text(&a, net.health[ttl.0]);
            if text.0 != s {
                text.0 = s;
            }
            color.0 = if a.forecast { AMBER } else { RED_400 };
        }
    }
}
```

### fn monkey_token

```rust
fn monkey_token(
    time: Res<Time>,
    monkey: Res<Monkey>,
    mut token: Single<&mut Transform, (With<MonkeyToken>, Without<WorkBar>)>,
    mut bar: Single<(&mut Transform, &mut Visibility), (With<WorkBar>, Without<MonkeyToken>)>,
) {
    let t = time.elapsed_secs();
    let walking = !monkey.path.is_empty();
    // Every leg is a leap: an arc scaled to its length (higher on a vine swing).
    let hop = if !walking {
        0.0
    } else if monkey.overland {
        (t * 12.0).sin().abs() * 6.0
    } else {
        let peak = (monkey.leg_len * 0.22).clamp(18.0, if monkey.swing { 240.0 } else { 90.0 });
        (std::f32::consts::PI * monkey.leg).sin() * peak
    };
    // Stand beside the card, not on it.
    token.translation = (monkey.pos + Vec2::new(34.0, 30.0 + hop)).extend(NODE_Z + 30.0);
    let (bar_tf, vis) = &mut *bar;
    match monkey.job.filter(|j| !walking && j.node == monkey.at) {
        Some(j) => {
            let done = 1.0 - (j.left / j.total).clamp(0.0, 1.0);
            bar_tf.scale.x = done.max(0.02);
            bar_tf.translation.x = -30.0 * (1.0 - done);
            **vis = Visibility::Inherited;
        }
        None => **vis = Visibility::Hidden,
    }
}
```

### fn popup

```rust
fn popup(commands: &mut Commands, art: &Art, at: Vec2, text: String, color: Color, now: f32) {
    commands.spawn((
        Popup { born: now },
        Text2d::new(text),
        art.text(true, 22.0),
        TextColor(color),
        Transform::from_translation((at + Vec2::Y * 50.0).extend(NODE_Z + 50.0)).with_scale(Vec3::splat(0.5)),
    ));
}
```

### fn popups

```rust
fn popups(mut commands: Commands, time: Res<Time>, mut q: Query<(Entity, &Popup, &mut Transform, &mut TextColor)>) {
    let now = time.elapsed_secs();
    for (e, p, mut tf, mut color) in &mut q {
        let age = now - p.born;
        if age > 2.0 {
            commands.entity(e).despawn();
            continue;
        }
        tf.translation.y += 25.0 * time.delta_secs();
        color.0 = color.0.with_alpha((2.0 - age).min(1.0));
    }
}
```

### fn is_store

Data stores get replica trouble and full disks.

```rust
fn is_store(kind: &str) -> bool {
    matches!(kind, "database" | "banana-cache" | "vault" | "lake" | "queue")
}
```

### fn options_for

```rust
fn options_for(rng: &mut Rng, right: Action) -> [Action; 4] {
    let mut pool: Vec<Action> = Action::ALL.into_iter().filter(|a| *a != right).collect();
    // Rollback vs fall-forward is the classic confusion: offer the other one when it applies.
    let twin = match right {
        Action::Rollback => Some(Action::FallForward),
        Action::FallForward => Some(Action::Rollback),
        _ => None,
    };
    let mut options = vec![right];
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
    [options[0], options[1], options[2], options[3]]
}
```

### fn incident

```rust
fn incident(rng: &mut Rng, failure: Failure, now: f32) -> Alert {
    Alert { failure, forecast: false, ttl: failure.ttl(), options: options_for(rng, failure.fix()), tried: 0, since: now }
}
```

### fn forecast

```rust
fn forecast(rng: &mut Rng, failure: Failure, now: f32) -> Alert {
    let right = failure.forecast().map_or(failure.fix(), |f| f.2);
    Alert { failure, forecast: true, ttl: { let [lo, hi] = tuning().forecast_ttl; lo + rng.f32() * (hi - lo) }, options: options_for(rng, right), tried: 0, since: now }
}
```

### fn start

```rust
fn start(shift: &mut Shift, net: &mut Net, monkey: &mut Monkey) {
    *shift = Shift { phase: Phase::Running, sla: tuning().start_sla, bananas: tuning().bananas_start, next_incident: tuning().first_incident, next_forecast: tuning().first_forecast, ..default() };
    net.health.iter_mut().for_each(|h| *h = Health::Online);
    net.alerts.iter_mut().for_each(|a| *a = None);
    net.queued = None;
    net.touch();
    monkey.path.clear();
    monkey.job = None;
    monkey.swing = false;
    monkey.origin = None;
    shift.say("09:00, shift started. Space jumps to the worst alert, 1-4 picks a fix: the monkey hops there and does it.");
}
```

### fn route

Shortest walk from `from` to `to` over the links. Down nodes can't be crossed (only arrived at); links touching degraded nodes are slow.

```rust
fn route(net: &Net, from: usize, to: usize) -> Option<Vec<usize>> {
    let n = net.at.len();
    let mut dist = vec![f32::INFINITY; n];
    let mut prev = vec![usize::MAX; n];
    let mut done = vec![false; n];
    dist[from] = 0.0;
    while let Some(u) = (0..n).filter(|&i| !done[i] && dist[i].is_finite()).min_by(|&a, &b| dist[a].total_cmp(&dist[b])) {
        if u == to {
            break;
        }
        done[u] = true;
        if u != from && net.health[u] == Health::Down {
            continue;
        }
        for &v in &net.neighbours[u] {
            let slow = if net.health[u] == Health::Degraded || net.health[v] == Health::Degraded { 2.0 } else { 1.0 };
            let d = dist[u] + net.at[u].distance(net.at[v]) * slow;
            if d < dist[v] {
                dist[v] = d;
                prev[v] = u;
            }
        }
    }
    if !dist[to].is_finite() {
        return None;
    }
    let mut path = vec![to];
    while *path.last().unwrap() != from {
        path.push(prev[*path.last().unwrap()]);
    }
    path.reverse();
    Some(path)
}
```

### fn eta

Seconds until the monkey reaches `to` on its current plan (roughly).

```rust
fn eta(net: &Net, monkey: &Monkey, to: usize) -> f32 {
    let Some(&next) = monkey.path.front() else {
        return if monkey.at == to { 0.0 } else { net.at[monkey.at].distance(net.at[to]) / tuning().link_speed };
    };
    let speed = |overland: bool| if overland { tuning().hike_speed } else { tuning().link_speed };
    let first = if monkey.swing { tuning().swing_speed } else { speed(monkey.overland) };
    let mut t = (1.0 - monkey.leg) * monkey.leg_len / first;
    let mut prev = next;
    for &p in monkey.path.iter().skip(1) {
        t += net.at[prev].distance(net.at[p]) / speed(!net.neighbours[prev].contains(&p));
        prev = p;
    }
    t
}
```

### impl Monkey

```rust
impl Monkey {
    /// Head for `to`. A leg in progress is finished first.
    fn send(&mut self, net: &Net, to: usize) {
        let walking = self.path.front().copied();
        let from = walking.unwrap_or(self.at);
        self.path.clear();
        if let Some(next) = walking {
            self.path.push_back(next);
        }
        if from != to {
            match route(net, from, to) {
                Some(p) => self.path.extend(p.into_iter().skip(1)),
                None => self.path.push_back(to),
            }
        }
        if walking.is_none() {
            self.begin_leg(net);
        }
    }
    /// Swing on a vine straight to `to`, from wherever the monkey is now.
    fn swing_to(&mut self, net: &Net, to: usize) {
        self.path.clear();
        self.path.push_back(to);
        self.origin = Some(self.pos);
        self.leg = 0.0;
        self.leg_len = self.pos.distance(net.at[to]).max(1.0);
        self.overland = false;
        self.swing = true;
    }
    fn begin_leg(&mut self, net: &Net) {
        self.leg = 0.0;
        self.swing = false;
        self.origin = None;
        if let Some(&next) = self.path.front() {
            self.leg_len = net.at[self.at].distance(net.at[next]).max(1.0);
            self.overland = !net.neighbours[self.at].contains(&next);
        }
    }
}
```

### const ARROWS

Screen direction of an arrow key.

```rust
const ARROWS: [(KeyCode, Vec2); 4] =
    [(KeyCode::ArrowUp, Vec2::Y), (KeyCode::ArrowDown, Vec2::NEG_Y), (KeyCode::ArrowLeft, Vec2::NEG_X), (KeyCode::ArrowRight, Vec2::X)];
```

### fn island_of

```rust
fn island_of(world: &World, node: usize) -> Option<usize> {
    world.islands.iter().position(|i| i.id == world.nodes[node].island)
}
```

### fn island_entry

```rust
fn island_entry(world: &World, island: usize) -> Option<usize> {
    let id = world.islands[island].nodes.first()?;
    world.nodes.iter().position(|n| &n.id == id)
}
```

### fn navigate

Jumping the selection around: arrows hop to the nearest node in that direction (links preferred), Q/E step between islands, Tab cycles alerts, edge pins fly to their node. Works in and out of a shift.

```rust
fn navigate(
    keys: Res<ButtonInput<KeyCode>>,
    world: Res<World>,
    net: Res<Net>,
    monkey: Res<Monkey>,
    mut view: ResMut<ViewState>,
) {
    let from = view.selected.unwrap_or(monkey.at);
    let mut pick = None;
    for (k, dir) in ARROWS {
        if !keys.just_pressed(k) {
            continue;
        }
        pick = (0..net.at.len())
            .filter(|&j| j != from)
            .filter_map(|j| {
                let v = net.at[j] - net.at[from];
                let cos = v.normalize_or_zero().dot(dir);
                (cos > 0.45).then(|| {
                    let linked = if net.neighbours[from].contains(&j) { 0.6 } else { 1.0 };
                    (j, v.length() * (2.0 - cos) * linked)
                })
            })
            .min_by(|a, b| a.1.total_cmp(&b.1))
            .map(|(j, _)| j);
    }
    let islands = world.islands.len();
    if islands > 0 {
        let here = island_of(&world, from).unwrap_or(0);
        let step = if keys.just_pressed(KeyCode::KeyE) {
            Some(1)
        } else if keys.just_pressed(KeyCode::KeyQ) {
            Some(islands - 1)
        } else {
            None
        };
        if let Some(step) = step {
            pick = island_entry(&world, (here + step) % islands);
        }
    }
    if keys.just_pressed(KeyCode::Tab) {
        let sighted = net.sighted();
        let mut open: Vec<(usize, Alert)> = net.alerts.iter().enumerate().filter_map(|(i, a)| a.filter(|a| !a.forecast || sighted).map(|a| (i, a))).collect();
        open.sort_by(|a, b| a.1.forecast.cmp(&b.1.forecast).then(a.1.ttl.total_cmp(&b.1.ttl)));
        if !open.is_empty() {
            let next = view.selected.and_then(|s| open.iter().position(|(i, _)| *i == s)).map_or(0, |p| (p + 1) % open.len());
            pick = Some(open[next].0);
        }
    }
    if let Some(j) = pick {
        view.selected = Some(j);
        view.focus = Some(net.at[j]);
    }
}
```

### const PIN

```rust
const PIN: f32 = 38.0;
```

### const PIN_MARGIN

```rust
const PIN_MARGIN: f32 = 10.0;
```

### fn spawn_pins

```rust
fn spawn_pins(mut commands: Commands, art: Res<Art>, world: Res<World>) {
    for (i, node) in world.nodes.iter().enumerate() {
        commands.spawn((
            EdgePin(i),
            Blocks,
            Interaction::default(),
            Node {
                position_type: PositionType::Absolute,
                width: px(PIN),
                height: px(PIN),
                display: Display::None,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                border: UiRect::all(px(2)),
                border_radius: BorderRadius::all(px(8)),
                ..default()
            },
            BorderColor::all(GREEN_400),
            BackgroundColor(node_color(&node.kind).with_alpha(0.92)),
            GlobalZIndex(30),
            children![(Text::new(node.emoji.clone()), TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(20.0), ..default() })],
        ));
    }
}
```

### fn pins

Nodes out of view turn into their icon, stuck to the screen edge in the direction they lie; back in view, the pin hides and the card is the node again.

```rust
fn pins(
    time: Res<Time>,
    net: Res<Net>,
    window: Single<&Window>,
    camera: Single<(&Camera, &GlobalTransform)>,
    mut q: Query<(&EdgePin, &mut Node, &mut BorderColor)>,
) {
    let (cam, cam_tf) = *camera;
    let size = window.size();
    // Pins live inside the screen minus a margin; the bottom keeps clear of the controls hint.
    let (lo, hi) = (Vec2::splat(PIN_MARGIN + PIN / 2.0), size - Vec2::new(PIN_MARGIN + PIN / 2.0, 40.0 + PIN / 2.0));
    let centre = (lo + hi) / 2.0;
    let half = (hi - lo) / 2.0;
    let pulse = 0.5 + 0.5 * (time.elapsed_secs() * 6.0).sin();
    for (pin, mut node, mut border) in &mut q {
        let Ok(p) = cam.world_to_viewport(cam_tf, net.at[pin.0].extend(0.0)) else { continue };
        // The card is 80 world px; count it as visible while any of it is on screen.
        let inside = p.x > -20.0 && p.y > -20.0 && p.x < size.x + 20.0 && p.y < size.y + 20.0;
        if inside {
            node.display = Display::None;
            continue;
        }
        let d = p - centre;
        let t = (half.x / d.x.abs().max(1e-3)).min(half.y / d.y.abs().max(1e-3));
        let at = centre + d * t - Vec2::splat(PIN / 2.0);
        node.display = Display::Flex;
        node.left = px(at.x);
        node.top = px(at.y);
        let base = match (net.alerts[pin.0], net.health[pin.0]) {
            (_, Health::Down) => RED,
            (Some(a), _) if !a.forecast => RED_400,
            (Some(_), _) if net.sighted() => AMBER,
            _ => GREEN_400,
        };
        let c = if base == GREEN_400 { base.with_alpha(0.7) } else { base.with_alpha(0.4 + 0.6 * pulse) };
        *border = BorderColor::all(c);
    }
}
```

### fn pin_clicks

```rust
fn pin_clicks(net: Res<Net>, mut view: ResMut<ViewState>, q: Query<(&Interaction, &EdgePin), Changed<Interaction>>) {
    for (i, pin) in &q {
        if *i == Interaction::Pressed {
            view.selected = Some(pin.0);
            view.focus = Some(net.at[pin.0]);
        }
    }
}
```

### fn controls

```rust
fn controls(
    keys: Res<ButtonInput<KeyCode>>,
    mut shift: ResMut<Shift>,
    mut net: ResMut<Net>,
    mut monkey: ResMut<Monkey>,
    mut view: ResMut<ViewState>,
    start_button: Query<&Interaction, (With<StartButton>, Changed<Interaction>)>,
    swing_button: Query<&Interaction, (With<SwingButton>, Changed<Interaction>)>,
    go_button: Query<&Interaction, (With<GoButton>, Changed<Interaction>)>,
    action_buttons: Query<(&Interaction, &ActionButton), Changed<Interaction>>,
    rows: Query<(&Interaction, &AlertRow), Changed<Interaction>>,
) {
    let start_pressed = start_button.iter().any(|i| *i == Interaction::Pressed);
    if shift.phase != Phase::Running {
        if start_pressed || keys.just_pressed(KeyCode::Enter) {
            start(&mut shift, &mut net, &mut monkey);
        }
        return;
    }
    for (i, row) in &rows {
        if *i == Interaction::Pressed {
            view.selected = Some(row.0);
            view.focus = Some(net.at[row.0]);
        }
    }
    if keys.just_pressed(KeyCode::Space) {
        // Most urgent visible alert first; incidents before forecasts.
        let sighted = net.sighted();
        let pick = net
            .alerts
            .iter()
            .enumerate()
            .filter_map(|(i, a)| a.filter(|a| !a.forecast || sighted).map(|a| (i, a.ttl + if a.forecast { 30.0 } else { 0.0 })))
            .min_by(|a, b| a.1.total_cmp(&b.1));
        if let Some((i, _)) = pick {
            view.selected = Some(i);
            view.focus = Some(net.at[i]);
        }
    }
    if keys.just_pressed(KeyCode::KeyF) {
        view.focus = Some(monkey.pos);
    }
    let Some(node) = view.selected else { return };
    if keys.just_pressed(KeyCode::KeyJ) || swing_button.iter().any(|i| *i == Interaction::Pressed) {
        let cost = tuning().swing_cost;
        if node == monkey.at && monkey.path.is_empty() {
            // Already here.
        } else if shift.bananas >= cost {
            shift.bananas -= cost;
            if monkey.job.is_some_and(|j| j.node != node) {
                monkey.job = None;
                net.queued = None;
            }
            monkey.swing_to(&net, node);
            let msg = format!("🌿 swinging to {} (-{cost} 🍌)", net.names[node]);
            shift.say(msg);
        } else {
            shift.say("🍌 no bananas for a swing: fix things to earn them");
        }
        net.touch();
    }
    if keys.just_pressed(KeyCode::KeyG) || keys.just_pressed(KeyCode::Enter) || go_button.iter().any(|i| *i == Interaction::Pressed) {
        monkey.job = None;
        net.queued = None;
        monkey.send(&net, node);
        let msg = format!("🐒 heading to {}", net.names[node]);
        shift.say(msg);
        net.touch();
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
    let Some(choice) = choice else { return };
    let Some(alert) = net.alerts[node] else { return };
    if (alert.forecast && !net.sighted()) || alert.tried & (1 << choice) != 0 {
        return;
    }
    let action = alert.options[choice];
    let total = action.secs() * if net.health[node] == Health::Down { tuning().down_work_mult } else { 1.0 };
    monkey.job = Some(Job { node, option: choice, action, alert: alert.since, left: total, total });
    monkey.send(&net, node);
    net.queued = Some((node, choice));
    let msg = format!("🐒 {} {} at {}", action.emoji(), action.label(), net.names[node]);
    shift.say(msg);
    net.touch();
}
```

### fn walk

Move the monkey along its path.

```rust
fn walk(time: Res<Time>, shift: Res<Shift>, net: Res<Net>, mut monkey: ResMut<Monkey>) {
    if shift.phase != Phase::Running {
        return;
    }
    let mut dt = time.delta_secs();
    while dt > 0.0 {
        let Some(&next) = monkey.path.front() else { break };
        let base = if monkey.swing { tuning().swing_speed } else if monkey.overland { tuning().hike_speed } else { tuning().link_speed };
        let degraded = net.health[next] == Health::Degraded || net.health[monkey.at] == Health::Degraded;
        let slow = if degraded && !monkey.swing { 0.5 } else { 1.0 };
        let speed = base * slow;
        let step = speed * dt / monkey.leg_len;
        if monkey.leg + step < 1.0 {
            monkey.leg += step;
            dt = 0.0;
        } else {
            dt -= (1.0 - monkey.leg) * monkey.leg_len / speed;
            monkey.at = next;
            monkey.path.pop_front();
            monkey.begin_leg(&net);
        }
    }
    monkey.pos = match monkey.path.front() {
        Some(&next) => monkey.origin.unwrap_or(net.at[monkey.at]).lerp(net.at[next], monkey.leg),
        None => net.at[monkey.at],
    };
}
```

### fn work

Do the queued fix once on site.

```rust
fn work(mut commands: Commands, time: Res<Time>, art: Res<Art>, mut shift: ResMut<Shift>, mut net: ResMut<Net>, mut monkey: ResMut<Monkey>) {
    if shift.phase != Phase::Running {
        return;
    }
    let Some(mut job) = monkey.job else { return };
    if !monkey.path.is_empty() || monkey.at != job.node {
        return;
    }
    job.left -= time.delta_secs();
    if job.left > 0.0 {
        monkey.job = Some(job);
        return;
    }
    monkey.job = None;
    net.queued = None;
    net.touch();
    let now = time.elapsed_secs();
    let node = job.node;
    let name = net.names[node].clone();
    let Some(mut alert) = net.alerts[node].filter(|a| a.since == job.alert) else {
        shift.say(format!("🐒 {name}: nothing left to fix"));
        return;
    };
    if job.action == alert.right() {
        let t = tuning();
        shift.combo += 1;
        let mult = (1.0 + t.combo_step * (shift.combo - 1) as f32).min(t.combo_max);
        let base = if alert.forecast { t.points_prevent } else { t.points_fix + alert.ttl.max(0.0) * t.points_per_ttl_sec };
        let points = (base * mult) as u32;
        shift.score += points;
        shift.bananas += if alert.forecast { t.banana_prevent } else { t.banana_fix };
        let combo = if shift.combo > 1 { format!(" x{mult:.2}").trim_end_matches('0').trim_end_matches('.').to_string() } else { String::new() };
        net.alerts[node] = None;
        net.health[node] = Health::Online;
        if alert.forecast {
            shift.prevented += 1;
            shift.say(format!("✓ {name}: {} prevented (+{points})", alert.failure.name()));
            popup(&mut commands, &art, net.at[node], format!("prevented +{points}{combo} 🍌"), AMBER, now);
        } else {
            shift.fixes += 1;
            shift.say(format!("✓ {name}: {} fixed (+{points})", alert.failure.name()));
            popup(&mut commands, &art, net.at[node], format!("fixed +{points}{combo} 🍌"), GREEN_400, now);
        }
    } else {
        alert.tried |= 1 << job.option;
        shift.combo = 0;
        shift.sla -= tuning().wrong_fix_sla;
        if !alert.forecast {
            alert.ttl = (alert.ttl - tuning().wrong_fix_ttl).max(0.5);
        }
        net.alerts[node] = Some(alert);
        shift.say(format!("✗ {name}: \"{}\" didn't help", job.action.label()));
        popup(&mut commands, &art, net.at[node], "✗ didn't help".into(), RED_400, now);
    }
}
```

### fn clock

The shift clock: countdowns, escalation, SLA drain, new trouble.

```rust
fn clock(time: Res<Time>, mut rng: ResMut<Rng>, mut shift: ResMut<Shift>, mut net: ResMut<Net>) {
    if shift.phase != Phase::Running {
        return;
    }
    let dt = time.delta_secs();
    shift.clock += dt;
    let n = net.health.len();
    let mut spread = Vec::new();
    for i in 0..n {
        let Some(mut a) = net.alerts[i] else { continue };
        a.ttl -= dt;
        if a.ttl <= 0.0 {
            let name = net.names[i].clone();
            if a.forecast {
                // Nobody acted in time: it happens.
                let hit = match a.failure {
                    Failure::BadDeploy | Failure::Migration if rng.f32() < 0.5 => Failure::Migration,
                    Failure::BadDeploy | Failure::Migration => Failure::BadDeploy,
                    f => f,
                };
                a = incident(&mut rng, hit, shift.clock);
                net.health[i] = Health::Degraded;
                shift.say(format!("🚨 {} {} on {name}", hit.emoji(), hit.name()));
            } else {
                a.ttl = tuning().down_ttl;
                if net.health[i] != Health::Down {
                    net.health[i] = Health::Down;
                    shift.say(format!("⛔ {name} is down ({})", a.failure.name()));
                    if a.failure == Failure::Disparity {
                        shift.sla -= tuning().disparity_loss;
                        shift.say(format!("💥 {name}: replicas diverged, data lost"));
                    }
                }
                if spreads(a.failure) {
                    spread.push((i, a.failure));
                }
            }
            net.touch();
        }
        net.alerts[i] = Some(a);
    }
    for (from, failure) in spread {
        let healthy: Vec<usize> = net.neighbours[from].iter().copied().filter(|&j| net.alerts[j].is_none() && net.health[j] == Health::Online).collect();
        if healthy.is_empty() {
            continue;
        }
        let j = healthy[rng.below(healthy.len())];
        let alert = incident(&mut rng, failure, shift.clock);
        if net.raise(j, alert) {
            let msg = format!("{} {} spread from {} to {}", failure.emoji(), failure.name(), net.names[from], net.names[j]);
            shift.say(msg);
        }
    }
    let drain: f32 = net
        .health
        .iter()
        .map(|h| match h {
            Health::Online => 0.0,
            Health::Degraded => tuning().drain_degraded,
            Health::Down => tuning().drain_down,
        })
        .sum();
    shift.sla -= drain * dt;

    // New trouble, more often as the day goes on: reactive incidents and Watchtower forecasts.
    let p = shift.progress();
    let free = |net: &Net| -> Vec<usize> { (0..n).filter(|&i| net.alerts[i].is_none() && net.health[i] == Health::Online).collect() };
    if shift.clock >= shift.next_incident {
        shift.next_incident = shift.clock + (tuning().incident_every[0] - tuning().incident_every[1] * p) * (0.7 + rng.f32() * 0.6);
        let free = free(&net);
        if !free.is_empty() {
            let i = free[rng.below(free.len())];
            let failure = if is_store(&net.kinds[i]) && rng.f32() < 0.4 {
                Failure::Disparity
            } else {
                [Failure::Ddos, Failure::Worm, Failure::Leak, Failure::Ddos][rng.below(4)]
            };
            let alert = incident(&mut rng, failure, shift.clock);
            net.raise(i, alert);
            let msg = format!("🚨 {} {} on {}", failure.emoji(), failure.name(), net.names[i]);
            shift.say(msg);
        }
    }
    if shift.clock >= shift.next_forecast {
        shift.next_forecast = shift.clock + (tuning().forecast_every[0] - tuning().forecast_every[1] * p) * (0.7 + rng.f32() * 0.6);
        let free = free(&net);
        if !free.is_empty() {
            let i = free[rng.below(free.len())];
            let failure = if is_store(&net.kinds[i]) && rng.f32() < 0.5 {
                Failure::DiskFull
            } else {
                [Failure::Cert, Failure::BadDeploy, Failure::Worm, Failure::Cert][rng.below(4)]
            };
            let alert = forecast(&mut rng, failure, shift.clock);
            net.raise(i, alert);
            if net.sighted() {
                let msg = format!("🔭 forecast for {} in {:.0}s", net.names[i], alert.ttl);
                shift.say(msg);
            }
        }
    }

    if shift.sla <= 0.0 {
        shift.sla = 0.0;
        shift.phase = Phase::Lost;
        let s = format!("SLA breached at {}. ★ {}  fixes {}  prevented {}", shift.time_of_day(), shift.score, shift.fixes, shift.prevented);
        shift.say(s);
        net.touch();
    } else if shift.clock >= tuning().shift_secs {
        shift.phase = Phase::Won;
        let bonus = (shift.sla * tuning().survive_mult) as u32;
        shift.score += bonus;
        let s = format!("17:00, shift survived! SLA bonus +{bonus}. ★ {}", shift.score);
        shift.say(s);
        net.touch();
    }
}
```

### fn strikes

Lightning from a storm cloud knocks out the power of the node it hits.

```rust
fn strikes(mut reader: MessageReader<Strike>, mut rng: ResMut<Rng>, mut shift: ResMut<Shift>, mut net: ResMut<Net>) {
    for Strike(at) in reader.read() {
        if shift.phase != Phase::Running {
            continue;
        }
        let Some((i, d)) = net.at.iter().enumerate().map(|(i, p)| (i, p.distance(*at))).min_by(|a, b| a.1.total_cmp(&b.1)) else { continue };
        if d > tuning().lightning_range || rng.f32() > tuning().lightning_chance {
            continue;
        }
        let alert = incident(&mut rng, Failure::Surge, shift.clock);
        if net.raise(i, alert) {
            let msg = format!("⚡ Lightning hit {}!", net.names[i]);
            shift.say(msg);
        }
    }
}
```

### fn apply_link

A deep link (see link.rs): fly to a node, open its panel, maybe stage trouble.

```rust
fn apply_link(
    link: Res<crate::link::DeepLink>,
    mut rng: ResMut<Rng>,
    mut shift: ResMut<Shift>,
    mut net: ResMut<Net>,
    mut monkey: ResMut<Monkey>,
    mut view: ResMut<ViewState>,
    world: Res<World>,
) {
    let node = link.node.as_deref().and_then(|id| world.nodes.iter().position(|n| n.id == id));
    view.zoom_to = link.zoom;
    if let Some(i) = node {
        view.selected = Some(i);
        view.focus = Some(net.at[i]);
    }
    let incident_kind = link.incident.as_deref().and_then(|k| match k {
        "ddos" => Some(Failure::Ddos),
        "worm" => Some(Failure::Worm),
        "disparity" => Some(Failure::Disparity),
        "deploy" => Some(Failure::BadDeploy),
        "migration" => Some(Failure::Migration),
        "lightning" | "surge" => Some(Failure::Surge),
        "cert" => Some(Failure::Cert),
        "leak" => Some(Failure::Leak),
        "disk" => Some(Failure::DiskFull),
        _ => None,
    });
    let forecast_kind = link.forecast.as_deref().and_then(|k| match k {
        "cert" => Some(Failure::Cert),
        "deploy" => Some(Failure::BadDeploy),
        "disk" => Some(Failure::DiskFull),
        "worm" => Some(Failure::Worm),
        _ => None,
    });
    if !(link.shift || incident_kind.is_some() || forecast_kind.is_some()) {
        return;
    }
    start(&mut shift, &mut net, &mut monkey);
    // Give the staged problem the stage for a while before the day's own trouble starts.
    shift.next_incident = 25.0;
    shift.next_forecast = 35.0;
    if let Some(i) = node {
        if let Some(f) = incident_kind {
            let alert = incident(&mut rng, f, 0.0);
            net.raise(i, alert);
            let msg = format!("🚨 {} {} on {}", f.emoji(), f.name(), net.names[i]);
            shift.say(msg);
        } else if let Some(f) = forecast_kind {
            let alert = forecast(&mut rng, f, 0.0);
            net.raise(i, alert);
            let msg = format!("🔭 forecast for {} in {:.0}s", net.names[i], alert.ttl);
            shift.say(msg);
        }
    }
}
```

### fn spawn_hud

```rust
fn spawn_hud(mut commands: Commands, art: Res<Art>) {
    commands.spawn((
        Node {
            position_type: PositionType::Absolute,
            top: px(16),
            left: px(16),
            max_width: px(440),
            margin: UiRect::right(px(64)),
            flex_direction: FlexDirection::Column,
            row_gap: px(6),
            ..default()
        },
        GlobalZIndex(40),
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
                BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.96)),
                children![
                    (HudText, Text::new("🐵 ON-CALL"), art.text(true, 13.0), TextColor(GREEN_400)),
                    (
                        Node { width: percent(100), height: px(4), border_radius: BorderRadius::MAX, overflow: Overflow::clip(), ..default() },
                        BackgroundColor(GREEN_900.with_alpha(0.6)),
                        children![(HudBar, Node { width: percent(0), height: percent(100), ..default() }, BackgroundColor(GREEN_500))],
                    ),
                    (MonkeyText, Text::new(""), art.text(false, 11.0), TextColor(GREEN_300)),
                    (NextText, Text::new(""), art.text(true, 11.0), TextColor(AMBER)),
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
            (AlertList, Blocks, Interaction::default(), Node { flex_direction: FlexDirection::Column, align_items: AlignItems::Start, row_gap: px(3), ..default() }),
            (LogText, Text::new(""), art.text(false, 11.0), TextColor(GREEN_300), Node { padding: UiRect::horizontal(px(4)), ..default() }),
        ],
    ));
}
```

### fn set

```rust
fn set(texts: &mut Query<&mut Text>, e: Entity, s: String) {
    if let Ok(mut t) = texts.get_mut(e) {
        if t.0 != s {
            t.0 = s;
        }
    }
}
```

### fn hud

```rust
fn hud(
    shift: Res<Shift>,
    net: Res<Net>,
    monkey: Res<Monkey>,
    mut texts: Query<&mut Text>,
    hud_text: Single<Entity, With<HudText>>,
    monkey_text: Single<Entity, With<MonkeyText>>,
    next_text: Single<Entity, With<NextText>>,
    view: Res<ViewState>,
    log_text: Single<Entity, With<LogText>>,
    start_label: Single<Entity, With<StartLabel>>,
    mut bar: Single<(&mut Node, &mut BackgroundColor), With<HudBar>>,
    mut start_node: Single<&mut Node, (With<StartButton>, Without<HudBar>)>,
) {
    let incidents = net.alerts.iter().flatten().filter(|a| !a.forecast).count();
    let forecasts = net.alerts.iter().flatten().filter(|a| a.forecast).count();
    let line = match shift.phase {
        Phase::Idle => "🐵 ON-CALL · keep the jungle network up until 17:00".to_string(),
        Phase::Running => format!(
            "🕘 {}  SLA {:.0}%  ★ {}{}  🍌 {}  🚨 {}  🔮 {}",
            shift.time_of_day(),
            shift.sla.max(0.0),
            shift.score,
            if shift.combo > 1 { format!(" 🔥{}", shift.combo) } else { String::new() },
            shift.bananas,
            incidents,
            if net.sighted() { forecasts.to_string() } else { "?".into() }
        ),
        Phase::Won => format!("SHIFT SURVIVED  ★ {}  fixes {}  prevented {}", shift.score, shift.fixes, shift.prevented),
        Phase::Lost => format!("SLA BREACHED at {}  ★ {}", shift.time_of_day(), shift.score),
    };
    set(&mut texts, *hud_text, line);
    let status = if shift.phase != Phase::Running {
        String::new()
    } else {
        let here = &net.names[monkey.at];
        let hiking = if monkey.overland && !monkey.path.is_empty() { ", hiking overland" } else { "" };
        match (monkey.job, monkey.path.back()) {
            (Some(j), Some(_)) => {
                format!("🐒 → {} ({:.0}s{hiking}), then {} {}", net.names[j.node], eta(&net, &monkey, j.node), j.action.emoji(), j.action.label())
            }
            (Some(j), None) => format!("🐒 {} {} at {here} · {:.1}s", j.action.emoji(), j.action.label(), j.left.max(0.0)),
            (None, Some(&dest)) => format!("🐒 → {} ({:.0}s{hiking})", net.names[dest], eta(&net, &monkey, dest)),
            (None, None) => format!("🐒 at {here}"),
        }
    };
    set(&mut texts, *monkey_text, status);
    set(&mut texts, *next_text, next_step(&shift, &net, &monkey, &view));
    let running = shift.phase == Phase::Running;
    start_node.display = if running { Display::None } else { Display::Flex };
    let want = if matches!(shift.phase, Phase::Won | Phase::Lost) { "NEW SHIFT (Enter)" } else { "START SHIFT (Enter)" };
    set(&mut texts, *start_label, want.to_string());
    let (node, bg) = &mut *bar;
    node.width = percent(shift.progress() * 100.0);
    bg.0 = if shift.sla < 30.0 { RED } else { GREEN_500 };
    let log: Vec<&str> = shift.log.iter().filter(|(_, at)| shift.clock - at < 15.0 || !running).map(|(s, _)| s.as_str()).collect();
    set(&mut texts, *log_text, log.join("\n"));
}
```

### fn next_step

One line telling the player what to do now.

```rust
fn next_step(shift: &Shift, net: &Net, monkey: &Monkey, view: &ViewState) -> String {
    if shift.phase != Phase::Running {
        return "▶ Enter: start the shift · arrows hop nodes · Q/E islands".into();
    }
    let sighted = net.sighted();
    let visible = |i: usize| net.alerts[i].filter(|a| !a.forecast || sighted);
    if let Some(sel) = view.selected {
        if let Some(a) = visible(sel) {
            if monkey.job.is_some_and(|j| j.node == sel) {
                return "▶ 🐒 is on it. Tab: next alert, line up the next job".into();
            }
            let far = sel != monkey.at || !monkey.path.is_empty();
            let swing = if far && shift.bananas >= tuning().swing_cost { " · J: swing there first (🍌)" } else { "" };
            return if a.forecast {
                format!("▶ Prevent it: 1-4 before the countdown ends{swing}")
            } else {
                format!("▶ Pick a fix: 1-4 (wrong ones cost SLA and time){swing}")
            };
        }
    }
    let worst = (0..net.alerts.len())
        .filter_map(|i| visible(i).map(|a| (i, a, a.ttl + if a.forecast { 30.0 } else { 0.0 })))
        .min_by(|a, b| a.2.total_cmp(&b.2));
    match worst {
        Some((i, a, _)) => {
            let glyph = if a.forecast { a.failure.forecast().map_or("🔮", |f| f.0) } else { a.failure.emoji() };
            format!("▶ {glyph} {} ({:.0}s): Space jumps there", net.names[i], a.ttl.max(0.0))
        }
        None => "▶ All quiet: patrol with the arrows, Q/E between islands, G to go".into(),
    }
}
```

### fn alert_list

Open alerts, most urgent first, clickable. Rebuilt when the network changes.

```rust
fn alert_list(
    mut commands: Commands,
    art: Res<Art>,
    net: Res<Net>,
    shift: Res<Shift>,
    mut seen: ResMut<AlertListVersion>,
    list: Single<(Entity, Option<&Children>), With<AlertList>>,
) {
    if seen.0 == Some(net.version) {
        return;
    }
    seen.0 = Some(net.version);
    let (root, children) = *list;
    if let Some(children) = children {
        for c in children.iter() {
            commands.entity(c).despawn();
        }
    }
    if shift.phase != Phase::Running {
        return;
    }
    let sighted = net.sighted();
    let mut rows: Vec<(usize, Alert)> = net.alerts.iter().enumerate().filter_map(|(i, a)| a.filter(|a| !a.forecast || sighted).map(|a| (i, a))).collect();
    rows.sort_by(|a, b| a.1.forecast.cmp(&b.1.forecast).then(a.1.ttl.total_cmp(&b.1.ttl)));
    commands.entity(root).with_children(|list| {
        if !sighted {
            list.spawn((
                Node { padding: UiRect::axes(px(8), px(3)), border_radius: BorderRadius::all(px(4)), ..default() },
                BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.93)),
                children![(Text::new("🔭 Watchtower down: no forecasts"), art.text(true, 11.0), TextColor(AMBER))],
            ));
        }
        for (i, a) in rows.into_iter().take(7) {
            let (glyph, title, color) = if a.forecast {
                (a.failure.forecast().map_or("🔮", |f| f.0), "forecast", AMBER)
            } else {
                (a.failure.emoji(), a.failure.name(), RED_400)
            };
            list.spawn((
                AlertRow(i),
                Interaction::default(),
                Node { column_gap: px(6), align_items: AlignItems::Center, padding: UiRect::axes(px(8), px(3)), border_radius: BorderRadius::all(px(4)), ..default() },
                BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.93)),
            ))
            .with_children(|r| {
                r.spawn((PanelTtl(i), Text::new(""), art.text(true, 11.0), TextColor(color), Node { min_width: px(48), ..default() }));
                r.spawn((Text::new(glyph), TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(12.0), ..default() }));
                r.spawn((Text::new(format!("{title} · {}", net.names[i])), art.text(false, 11.0), TextColor(color)));
            });
        }
    });
}
```

### fn live_ttls

Countdown texts in the alert list and node panel.

```rust
fn live_ttls(net: Res<Net>, mut q: Query<(&PanelTtl, &mut Text)>) {
    for (p, mut text) in &mut q {
        let s = net.alerts.get(p.0).copied().flatten().map_or(String::new(), |a| ttl_text(&a, net.health[p.0]));
        if text.0 != s {
            text.0 = s;
        }
    }
}
```

### fn swing_button

The node panel's top section: the open alert with its fixes (keys 1-4), or a "go here" button.

```rust
fn swing_button(body: &mut ChildSpawnerCommands, art: &Art, shift: &Shift) {
    let can = shift.bananas >= tuning().swing_cost;
    let fg = if can { Color::srgb(1.0, 0.88, 0.3) } else { Color::srgb(0.45, 0.45, 0.45) };
    body.spawn((
        SwingButton,
        Interaction::default(),
        Node {
            justify_content: JustifyContent::Center,
            padding: UiRect::axes(px(8), px(6)),
            margin: UiRect::bottom(px(10)),
            border: UiRect::all(px(1)),
            border_radius: BorderRadius::all(px(4)),
            ..default()
        },
        BorderColor::all(fg.with_alpha(0.5)),
        BackgroundColor(Color::srgba(0.25, 0.2, 0.0, 0.4)),
        children![(Text::new(format!("🌿 Swing here (J) · {} of {} 🍌", tuning().swing_cost, shift.bananas)), art.text(true, 12.0), TextColor(fg))],
    ));
}
```

### fn alert_box

```rust
pub fn alert_box(body: &mut ChildSpawnerCommands, art: &Art, net: &Net, shift: &Shift, node: usize) {
    if shift.phase != Phase::Running {
        return;
    }
    let Some(a) = net.alerts[node].filter(|a| !a.forecast || net.sighted()) else {
        body.spawn((
            GoButton,
            Interaction::default(),
            Node {
                justify_content: JustifyContent::Center,
                padding: UiRect::axes(px(8), px(6)),
                margin: UiRect::bottom(px(10)),
                border: UiRect::all(px(1)),
                border_radius: BorderRadius::all(px(4)),
                ..default()
            },
            BorderColor::all(GREEN_500.with_alpha(0.5)),
            BackgroundColor(GREEN_900.with_alpha(0.4)),
            children![(Text::new("🐒 Send the monkey here (G)"), art.text(true, 12.0), TextColor(GREEN_300))],
        ));
        swing_button(body, art, shift);
        return;
    };
    swing_button(body, art, shift);
    let (accent, bg, glyph, title, text) = if a.forecast {
        let (g, t, _) = a.failure.forecast().unwrap_or(("🔮", "", Action::Patch));
        (AMBER, Color::srgba(0.3, 0.2, 0.0, 0.5), g, "FORECAST ·".to_string(), t)
    } else {
        (RED_400, Color::srgba(0.3, 0.04, 0.04, 0.5), a.failure.emoji(), format!("INCIDENT · {} ·", a.failure.name()), a.failure.symptom())
    };
    body.spawn((
        Node {
            flex_direction: FlexDirection::Column,
            padding: UiRect::all(px(8)),
            margin: UiRect::bottom(px(10)),
            row_gap: px(6),
            border: UiRect::all(px(1)),
            border_radius: BorderRadius::all(px(6)),
            ..default()
        },
        BorderColor::all(if a.forecast { AMBER.with_alpha(0.6) } else { RED_500.with_alpha(0.6) }),
        BackgroundColor(bg),
    ))
    .with_children(|b| {
        b.spawn(Node { align_items: AlignItems::Center, column_gap: px(6), ..default() }).with_children(|r| {
            r.spawn((Text::new(glyph), TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(16.0), ..default() }));
            r.spawn((Text::new(title), art.text(true, 12.0), TextColor(accent)));
            r.spawn((PanelTtl(node), Text::new(""), art.text(true, 12.0), TextColor(accent)));
        });
        b.spawn((Text::new(text), art.text(false, 11.0), TextColor(Color::srgb(1.0, 0.9, 0.85))));
        for (i, action) in a.options.iter().enumerate() {
            let tried = a.tried & (1 << i) != 0;
            let queued = net.queued == Some((node, i));
            let fg = if tried {
                Color::srgb(0.45, 0.45, 0.45)
            } else if queued {
                AMBER
            } else {
                GREEN_300
            };
            b.spawn((
                ActionButton(i),
                Interaction::default(),
                Node {
                    align_items: AlignItems::Center,
                    column_gap: px(8),
                    padding: UiRect::axes(px(8), px(6)),
                    border: UiRect::all(px(1)),
                    border_radius: BorderRadius::all(px(4)),
                    ..default()
                },
                BorderColor::all(if tried {
                    Color::srgba(0.4, 0.4, 0.4, 0.4)
                } else if queued {
                    AMBER
                } else {
                    GREEN_500.with_alpha(0.5)
                }),
                BackgroundColor(if tried { Color::NONE } else { GREEN_900.with_alpha(0.4) }),
            ))
            .with_children(|r| {
                r.spawn((Text::new(format!("{}", i + 1)), art.text(true, 12.0), TextColor(fg)));
                r.spawn((Text::new(action.emoji()), TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(14.0), ..default() }));
                let suffix = if queued { " · 🐒 on it" } else { "" };
                r.spawn((Text::new(format!("{} · {:.0}s{suffix}", action.label(), action.secs())), art.text(false, 12.0), TextColor(fg)));
            });
        }
    });
}
```
