//! Live data: the world, critters and all gameplay tuning come from JSON files.
//!
//! The host page fetches `game/data/{world,npcs,tuning}.json` before starting the
//! wasm and leaves them on `window.LM_DATA` (see app/page.tsx). Editing those files
//! and running `tools/deploy.sh data` changes the game in seconds, with no Rust
//! build. A copy of each file is compiled in as a fallback, so a missing or broken
//! file never stops the game: tuning is deep-merged over the built-in copy (partial
//! files work), and an unreadable world falls back whole.

use std::collections::HashMap;
use std::sync::OnceLock;

use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
pub struct ForecastDef {
    pub emoji: String,
    pub text: String,
    pub prevent: String,
}

#[derive(Deserialize)]
pub struct FailureDef {
    pub emoji: String,
    pub name: String,
    pub symptom: String,
    pub fix: String,
    pub ttl: f32,
    #[serde(default)]
    pub forecast: Option<ForecastDef>,
}

#[derive(Deserialize)]
pub struct ActionDef {
    pub emoji: String,
    pub label: String,
    pub secs: f32,
}

#[derive(Deserialize)]
pub struct Tuning {
    pub shift_secs: f32,
    pub start_sla: f32,
    pub link_speed: f32,
    pub hike_speed: f32,
    pub drain_degraded: f32,
    pub drain_down: f32,
    pub wrong_fix_sla: f32,
    pub wrong_fix_ttl: f32,
    pub down_ttl: f32,
    pub disparity_loss: f32,
    pub down_work_mult: f32,
    pub first_incident: f32,
    pub first_forecast: f32,
    /// [morning, reduction by evening]: interval = a - b * progress
    pub incident_every: [f32; 2],
    pub forecast_every: [f32; 2],
    /// [min, max] seconds
    pub forecast_ttl: [f32; 2],
    pub lightning_range: f32,
    pub lightning_chance: f32,
    pub points_fix: f32,
    pub points_per_ttl_sec: f32,
    pub points_prevent: f32,
    pub survive_mult: f32,
    pub bananas_start: u32,
    pub banana_fix: u32,
    pub banana_prevent: u32,
    pub swing_cost: u32,
    pub swing_speed: f32,
    pub combo_step: f32,
    pub combo_max: f32,
    pub failures: HashMap<String, FailureDef>,
    pub actions: HashMap<String, ActionDef>,
    pub node_colors: HashMap<String, String>,
}

struct Data {
    world: String,
    npcs: String,
    tuning: Tuning,
}

static DATA: OnceLock<Data> = OnceLock::new();

const BUILTIN_WORLD: &str = include_str!("../data/world.json");
const BUILTIN_NPCS: &str = include_str!("../data/npcs.json");
const BUILTIN_TUNING: &str = include_str!("../data/tuning.json");

/// The JSON text the page fetched for `name`, if any.
fn fetched(name: &str) -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        let win = web_sys::window()?;
        let data = js_sys::Reflect::get(&win, &"LM_DATA".into()).ok()?;
        js_sys::Reflect::get(&data, &name.into()).ok()?.as_string()
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = name;
        None
    }
}

/// Overlay `over` onto `base`, object keys recursively.
fn merge(base: &mut Value, over: Value) {
    match (base, over) {
        (Value::Object(b), Value::Object(o)) => {
            for (k, v) in o {
                match b.get_mut(&k) {
                    Some(slot) => merge(slot, v),
                    None => {
                        b.insert(k, v);
                    }
                }
            }
        }
        (b, o) => *b = o,
    }
}

/// A fetched file if it parses as `T`, else the built-in copy.
fn whole<T: for<'a> Deserialize<'a>>(name: &str, builtin: &str) -> String {
    match fetched(name) {
        Some(s) if serde_json::from_str::<T>(&s).is_ok() => s,
        Some(_) => {
            bevy::log::warn!("{name}.json from the server is invalid; using the built-in copy");
            builtin.to_string()
        }
        None => builtin.to_string(),
    }
}

fn load() -> Data {
    let mut tuning: Value = serde_json::from_str(BUILTIN_TUNING).expect("built-in tuning.json");
    if let Some(s) = fetched("tuning") {
        match serde_json::from_str::<Value>(&s) {
            Ok(v) => merge(&mut tuning, v),
            Err(e) => bevy::log::warn!("tuning.json from the server is invalid ({e}); using the built-in copy"),
        }
    }
    let tuning = serde_json::from_value(tuning.clone()).unwrap_or_else(|e| {
        bevy::log::warn!("tuning.json has a bad value ({e}); using the built-in copy");
        serde_json::from_str(BUILTIN_TUNING).expect("built-in tuning.json")
    });
    Data {
        world: whole::<crate::world::WorldFileCheck>("world", BUILTIN_WORLD),
        npcs: whole::<Vec<Value>>("npcs", BUILTIN_NPCS),
        tuning,
    }
}

fn data() -> &'static Data {
    DATA.get_or_init(load)
}

pub fn tuning() -> &'static Tuning {
    &data().tuning
}

pub fn world_json() -> &'static str {
    &data().world
}

pub fn npcs_json() -> &'static str {
    &data().npcs
}

/// `#rrggbb` → Color (grey if malformed).
pub fn hex_color(s: &str) -> bevy::color::Color {
    let h = s.trim_start_matches('#');
    match u32::from_str_radix(h, 16) {
        Ok(v) if h.len() == 6 => bevy::color::Color::srgb_u8((v >> 16) as u8, (v >> 8) as u8, v as u8),
        _ => bevy::color::Color::srgb(0.42, 0.45, 0.5),
    }
}
