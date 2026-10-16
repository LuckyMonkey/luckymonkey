---
title: Lucky Monkey source - ops.rs
---

# Source: game/src/ops.rs

**The game itself: failures and fixes, the network model, the shift clock, the monkey, routing, alerts, the HUD.** Explained in [simulation](../simulation.md). 1399 lines. [On GitHub](https://github.com/LuckyMonkey/luckymonkey/blob/main/game/src/ops.rs) (needs repo access). This page is generated from the code on every deploy by `tools/wiki-source.py`; back to the [source index](index.md).

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
| [const SHIFT_SECS](#const_shift_secs) |  |
| [const START_HOUR](#const_start_hour) |  |
| [const HOURS](#const_hours) |  |
| [struct Shift](#struct_shift) |  |
| [impl Shift](#impl_shift) |  |
| [struct Monkey](#struct_monkey) | The on-call monkey. |
| [struct Job](#struct_job) |  |
| [const LINK_SPEED](#const_link_speed) |  |
| [const HIKE_SPEED](#const_hike_speed) |  |
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
| [fn controls](#fn_controls) |  |
| [fn walk](#fn_walk) | Move the monkey along its path. |
| [fn work](#fn_work) | Do the queued fix once on site. |
| [fn clock](#fn_clock) | The shift clock: countdowns, escalation, SLA drain, new trouble. |
| [fn strikes](#fn_strikes) | Lightning from a storm cloud knocks out the power of the node it hits. |
| [fn apply_link](#fn_apply_link) | A deep link (see link.rs): fly to a node, open its panel, maybe stage trouble. |
| [fn spawn_hud](#fn_spawn_hud) |  |
| [fn set](#fn_set) |  |
| [fn hud](#fn_hud) |  |
| [fn alert_list](#fn_alert_list) | Open alerts, most urgent first, clickable. Rebuilt when the network changes. |
| [fn live_ttls](#fn_live_ttls) | Countdown texts in the alert list and node panel. |
| [fn alert_box](#fn_alert_box) | The node panel's top section: the open alert with its fixes (keys 1-4), or a "go here" button. |

## Imports

```rust
use bevy::prelude::*;
use crate::clouds::Strike;
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
    pub fn emoji(self) -> &'static str {
        match self {
            Failure::Ddos => "🐘",
            Failure::Worm => "🐛",
            Failure::Disparity => "⚖️",
            Failure::BadDeploy | Failure::Migration => "📦",
            Failure::Surge => "⚡",
            Failure::Cert => "🔐",
            Failure::Leak => "🍌",
            Failure::DiskFull => "💾",
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
            Failure::DiskFull => "Disk full",
        }
    }
    pub fn symptom(self) -> &'static str {
        match self {
            Failure::Ddos => "Requests x40. A herd of 9,000 monkeys is hammering one endpoint. Spills onto neighbours once the node falls over.",
            Failure::Worm => "Unknown process copying itself over every API connection. Crawls to a neighbour each time its timer runs out.",
            Failure::Disparity => "Replica checksums disagree: two copies, two different banana counts. Data is lost if it goes down.",
            Failure::BadDeploy => "v2.4 went out and the error rate is 30%. No schema change: v2.3 is still compatible.",
            Failure::Migration => "v2.4 migrated the schema and the error rate is 30%. v2.3 can't read the new tables.",
            Failure::Surge => "Lightning hit the rack. The primary power supply is dead.",
            Failure::Cert => "TLS handshakes failing. The certificate expired.",
            Failure::Leak => "Banana heap growing 2 GB/min, swap is thrashing. Nothing else is wrong.",
            Failure::DiskFull => "Disk 100%. Writes failing, logs can't rotate, the replicas are stuck.",
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
            Failure::DiskFull => Action::Cleanup,
        }
    }
    /// What the Watchtower says before it happens, and the action that prevents it.
    pub fn forecast(self) -> Option<(&'static str, &'static str, Action)> {
        match self {
            Failure::Cert => Some(("🔐", "The TLS certificate is about to expire. Renew it before the countdown ends.", Action::RotateCert)),
            Failure::BadDeploy | Failure::Migration => {
                Some(("📅", "A deploy of v2.4 is scheduled. Push it through a canary first and a bad build never reaches everyone.", Action::Canary))
            }
            Failure::DiskFull => Some(("💾", "Disk at 85% and climbing. Clear old snapshots before it fills.", Action::Cleanup)),
            Failure::Worm => Some(("🧬", "A worm signature is spreading in the wild and this node is unpatched.", Action::Patch)),
            _ => None,
        }
    }
    /// Seconds from appearing to escalating.
    fn ttl(self) -> f32 {
        match self {
            Failure::Ddos => 30.0,
            Failure::Worm => 35.0,
            Failure::Disparity => 50.0,
            Failure::BadDeploy | Failure::Migration => 45.0,
            Failure::Surge => 28.0,
            Failure::Cert => 40.0,
            Failure::Leak => 45.0,
            Failure::DiskFull => 40.0,
        }
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
            Action::Canary => "🐤",
            Action::Cleanup => "🧹",
            Action::Patch => "🩹",
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
            Action::Canary => "Canary the deploy",
            Action::Cleanup => "Clean up old snapshots",
            Action::Patch => "Patch the node",
        }
    }
    /// Seconds of work at the node.
    pub fn secs(self) -> f32 {
        match self {
            Action::RateLimit => 3.0,
            Action::Quarantine => 2.5,
            Action::Resync => 7.0,
            Action::Rollback => 5.0,
            Action::FallForward => 8.0,
            Action::Failover => 4.0,
            Action::RotateCert => 3.0,
            Action::Restart => 3.0,
            Action::Canary => 5.0,
            Action::Cleanup => 4.0,
            Action::Patch => 4.0,
        }
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

### const SHIFT_SECS

```rust
const SHIFT_SECS: f32 = 480.0;
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
        (self.clock / SHIFT_SECS).clamp(0.0, 1.0)
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

### const LINK_SPEED

```rust
const LINK_SPEED: f32 = 240.0;
```

### const HIKE_SPEED

```rust
const HIKE_SPEED: f32 = 70.0;
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

### fn plugin

```rust
pub fn plugin(app: &mut App) {
    app.init_resource::<Shift>()
        .init_resource::<AlertListVersion>()
        .add_systems(Startup, setup_net)
        .add_systems(PostStartup, spawn_overlay)
        .add_systems(OnEnter(Screen::Playing), (spawn_hud, apply_link).chain())
        .add_systems(Update, (links, frames, cards, popups, monkey_token))
        .add_systems(
            Update,
            (controls, walk, work, clock, strikes, hud, alert_list, live_ttls).chain().run_if(in_state(Screen::Playing)),
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
    commands.insert_resource(Monkey { at: home, path: VecDeque::new(), leg: 0.0, leg_len: 1.0, overland: false, job: None, pos: at[home] });
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
    let hop = if walking { (t * 12.0).sin().abs() * 6.0 } else { 0.0 };
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
    Alert { failure, forecast: true, ttl: 50.0 + rng.f32() * 30.0, options: options_for(rng, right), tried: 0, since: now }
}
```

### fn start

```rust
fn start(shift: &mut Shift, net: &mut Net, monkey: &mut Monkey) {
    *shift = Shift { phase: Phase::Running, sla: 100.0, next_incident: 6.0, next_forecast: 14.0, ..default() };
    net.health.iter_mut().for_each(|h| *h = Health::Online);
    net.alerts.iter_mut().for_each(|a| *a = None);
    net.queued = None;
    net.touch();
    monkey.path.clear();
    monkey.job = None;
    shift.say("09:00, shift started. Click a node and pick a fix: the monkey walks there and does it.");
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
        return if monkey.at == to { 0.0 } else { net.at[monkey.at].distance(net.at[to]) / LINK_SPEED };
    };
    let speed = |overland: bool| if overland { HIKE_SPEED } else { LINK_SPEED };
    let mut t = (1.0 - monkey.leg) * monkey.leg_len / speed(monkey.overland);
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
    fn begin_leg(&mut self, net: &Net) {
        self.leg = 0.0;
        if let Some(&next) = self.path.front() {
            self.leg_len = net.at[self.at].distance(net.at[next]).max(1.0);
            self.overland = !net.neighbours[self.at].contains(&next);
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
    if keys.just_pressed(KeyCode::KeyG) || go_button.iter().any(|i| *i == Interaction::Pressed) {
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
    let total = action.secs() * if net.health[node] == Health::Down { 1.5 } else { 1.0 };
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
        let base = if monkey.overland { HIKE_SPEED } else { LINK_SPEED };
        let slow = if net.health[next] == Health::Degraded || net.health[monkey.at] == Health::Degraded { 0.5 } else { 1.0 };
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
        Some(&next) => net.at[monkey.at].lerp(net.at[next], monkey.leg),
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
        let points = if alert.forecast { 150 } else { 100 + (alert.ttl.max(0.0) * 2.0) as u32 };
        shift.score += points;
        net.alerts[node] = None;
        net.health[node] = Health::Online;
        if alert.forecast {
            shift.prevented += 1;
            shift.say(format!("✓ {name}: {} prevented (+{points})", alert.failure.name()));
            popup(&mut commands, &art, net.at[node], format!("prevented +{points}"), AMBER, now);
        } else {
            shift.fixes += 1;
            shift.say(format!("✓ {name}: {} fixed (+{points})", alert.failure.name()));
            popup(&mut commands, &art, net.at[node], format!("fixed +{points}"), GREEN_400, now);
        }
    } else {
        alert.tried |= 1 << job.option;
        shift.sla -= 2.0;
        if !alert.forecast {
            alert.ttl = (alert.ttl - 8.0).max(0.5);
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
                a.ttl = 40.0;
                if net.health[i] != Health::Down {
                    net.health[i] = Health::Down;
                    shift.say(format!("⛔ {name} is down ({})", a.failure.name()));
                    if a.failure == Failure::Disparity {
                        shift.sla -= 6.0;
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
            Health::Degraded => 0.04,
            Health::Down => 0.2,
        })
        .sum();
    shift.sla -= drain * dt;

    // New trouble, more often as the day goes on: reactive incidents and Watchtower forecasts.
    let p = shift.progress();
    let free = |net: &Net| -> Vec<usize> { (0..n).filter(|&i| net.alerts[i].is_none() && net.health[i] == Health::Online).collect() };
    if shift.clock >= shift.next_incident {
        shift.next_incident = shift.clock + (26.0 - 14.0 * p) * (0.7 + rng.f32() * 0.6);
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
        shift.next_forecast = shift.clock + (30.0 - 14.0 * p) * (0.7 + rng.f32() * 0.6);
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
    } else if shift.clock >= SHIFT_SECS {
        shift.phase = Phase::Won;
        let bonus = (shift.sla * 10.0) as u32;
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
        if d > 110.0 || rng.f32() > 0.5 {
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
            "🕘 {}  SLA {:.0}%  ★ {}  🚨 {}  🔮 {}",
            shift.time_of_day(),
            shift.sla.max(0.0),
            shift.score,
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

### fn alert_box

The node panel's top section: the open alert with its fixes (keys 1-4), or a "go here" button.

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
        return;
    };
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
