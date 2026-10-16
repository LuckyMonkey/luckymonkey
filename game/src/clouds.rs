//! Clouds are the original floating "divs": translucent pills with a rounded
//! border and a cloud emoji inside. They drift across the map on one wind and
//! wrap; rain clouds drizzle, storm clouds flash yellow and drop a ⚡ - and in a
//! shift, a strike on a node knocks its power out (see `ops`).

use bevy::prelude::*;

use crate::view::ViewState;
use crate::world::World;
use crate::{Art, Rng};

const COUNT: usize = 10;

#[derive(Clone, Copy, PartialEq)]
enum Weather {
    Fair,
    Rain,
    Storm,
}

/// Lightning hit the ground at this world position.
#[derive(Message)]
pub struct Strike(pub Vec2);

#[derive(Component)]
struct Cloud {
    weather: Weather,
    /// World-space centre.
    pos: Vec2,
    speed: f32,
    /// Size at 100% zoom (the old small/medium/large divs).
    size: Vec2,
    emoji_px: f32,
    next_flash: f32,
    /// Seconds into the current flash, if one is running.
    flash: Option<f32>,
    emoji: Entity,
    bolt: Option<Entity>,
}

#[derive(Component)]
struct Drop {
    phase: f32,
}

const FLASH_SECS: f32 = 0.6;

pub fn plugin(app: &mut App) {
    app.add_message::<Strike>().add_systems(Startup, spawn).add_systems(Update, (drift, rain, storm));
}

/// Wind direction (Bevy coordinates): left to right, sinking slightly.
fn wind() -> Vec2 {
    Vec2::new(1.0, -0.3).normalize()
}

fn fill(w: Weather) -> Color {
    match w {
        Weather::Fair => Color::srgba(1.0, 1.0, 1.0, 0.2),
        Weather::Rain => Color::srgba(0.376, 0.647, 0.98, 0.2),
        Weather::Storm => Color::srgba(0.42, 0.447, 0.502, 0.35),
    }
}

fn border(w: Weather) -> Color {
    match w {
        Weather::Fair => Color::srgba(1.0, 1.0, 1.0, 0.3),
        Weather::Rain => Color::srgba(0.576, 0.773, 0.992, 0.3),
        Weather::Storm => Color::srgba(0.612, 0.639, 0.686, 0.4),
    }
}

fn glow(color: Color, blur: f32) -> BoxShadow {
    BoxShadow(vec![ShadowStyle { color, x_offset: Val::ZERO, y_offset: Val::ZERO, spread_radius: Val::ZERO, blur_radius: px(blur) }])
}

fn spawn(mut commands: Commands, world: Res<World>, art: Res<Art>, mut rng: ResMut<Rng>) {
    let b = world.bounds;
    for i in 0..COUNT {
        let weather = match i % 5 {
            0 | 2 | 4 => Weather::Fair,
            1 => Weather::Rain,
            _ => Weather::Storm,
        };
        let (size, emoji_px) = [(Vec2::new(80.0, 40.0), 24.0), (Vec2::new(120.0, 55.0), 30.0), (Vec2::new(160.0, 75.0), 36.0)][rng.below(3)];
        let glyph = match weather {
            Weather::Fair => "☁️",
            Weather::Rain => "🌧️",
            Weather::Storm => "⛈️",
        };
        let pos = Vec2::new(b.min.x + rng.f32() * b.width(), b.min.y + rng.f32() * b.height());
        let emoji = commands
            .spawn((Text::new(glyph), TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(emoji_px), ..default() }, TextColor(Color::srgba(1.0, 1.0, 1.0, 0.9))))
            .id();
        let bolt = (weather == Weather::Storm).then(|| {
            commands
                .spawn((
                    Text::new("⚡"),
                    TextFont { font: art.emoji.clone().into(), font_size: FontSize::Px(30.0), ..default() },
                    TextColor(Color::srgba(1.0, 1.0, 1.0, 0.0)),
                    Node { position_type: PositionType::Absolute, bottom: px(-30), ..default() },
                ))
                .id()
        });
        let mut root = commands.spawn((
            Node {
                position_type: PositionType::Absolute,
                width: px(size.x),
                height: px(size.y),
                border: UiRect::all(px(1)),
                border_radius: BorderRadius::MAX,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                ..default()
            },
            BackgroundColor(fill(weather)),
            BorderColor::all(border(weather)),
            glow(Color::srgba(1.0, 1.0, 1.0, 0.1), 20.0),
            GlobalZIndex(-10),
            Visibility::Hidden,
        ));
        root.add_child(emoji);
        if let Some(bolt) = bolt {
            root.add_child(bolt);
        }
        if weather == Weather::Rain {
            root.with_children(|c| {
                c.spawn(Node { position_type: PositionType::Absolute, top: percent(100), width: percent(100), height: px(25), overflow: Overflow::clip(), ..default() })
                    .with_children(|r| {
                        for d in 0..5 {
                            r.spawn((
                                Drop { phase: d as f32 * 0.15 },
                                Node { position_type: PositionType::Absolute, left: percent(15 + d * 18), width: px(2), height: px(16), border_radius: BorderRadius::MAX, ..default() },
                                BackgroundColor(Color::srgba(0.576, 0.773, 0.992, 0.0)),
                            ));
                        }
                    });
            });
        }
        root.insert(Cloud {
            weather,
            pos,
            speed: 10.0 + rng.f32() * 14.0,
            size,
            emoji_px,
            next_flash: 2.0 + rng.f32() * 6.0,
            flash: None,
            emoji,
            bolt,
        });
    }
}

/// Move on the wind, then pin each div over its world position for the current camera.
fn drift(
    time: Res<Time>,
    world: Res<World>,
    view: Res<ViewState>,
    camera: Single<(&Camera, &GlobalTransform)>,
    mut clouds: Query<(&mut Cloud, &mut Node, &mut Visibility)>,
    mut fonts: Query<&mut TextFont>,
) {
    let b = world.bounds;
    let margin = 300.0;
    let (cam, cam_tf) = *camera;
    let z = view.zoom;
    for (mut cloud, mut node, mut vis) in &mut clouds {
        let mut p = cloud.pos + wind() * cloud.speed * time.delta_secs();
        // Wrap so the sky never empties: leave on the right/bottom, return on the left/top.
        if p.x > b.max.x + margin {
            p.x = b.min.x - margin;
        }
        if p.y < b.min.y - margin {
            p.y = b.max.y + margin;
        }
        cloud.pos = p;
        let Ok(screen) = cam.world_to_viewport(cam_tf, p.extend(0.0)) else { continue };
        let size = cloud.size * z;
        node.left = px(screen.x - size.x / 2.0);
        node.top = px(screen.y - size.y / 2.0);
        if view.is_changed() || *vis == Visibility::Hidden {
            node.width = px(size.x);
            node.height = px(size.y);
            if let Ok(mut f) = fonts.get_mut(cloud.emoji) {
                f.font_size = FontSize::Px(cloud.emoji_px * z);
            }
            if let Some(Ok(mut f)) = cloud.bolt.map(|e| fonts.get_mut(e)) {
                f.font_size = FontSize::Px(30.0 * z);
            }
        }
        *vis = Visibility::Inherited;
    }
}

fn rain(time: Res<Time>, mut drops: Query<(&Drop, &mut Node, &mut BackgroundColor)>) {
    let t = time.elapsed_secs();
    for (drop, mut node, mut bg) in &mut drops {
        // The old `rain-drop` keyframes: fall 25 px, fade in by 30%, out by the end.
        let k = (t + drop.phase).fract();
        node.top = px(-5.0 + k * 25.0);
        let a = if k < 0.3 { k / 0.3 * 0.8 } else { 0.8 * (1.0 - k) / 0.7 };
        bg.0 = bg.0.with_alpha(a * 0.6);
    }
}

fn storm(
    time: Res<Time>,
    mut rng: ResMut<Rng>,
    mut strikes: MessageWriter<Strike>,
    mut clouds: Query<(&mut Cloud, &mut BackgroundColor, &mut BoxShadow)>,
    mut colors: Query<&mut TextColor>,
) {
    let dt = time.delta_secs();
    for (mut cloud, mut bg, mut shadow) in &mut clouds {
        if cloud.weather != Weather::Storm {
            continue;
        }
        cloud.next_flash -= dt;
        if cloud.next_flash <= 0.0 {
            cloud.flash = Some(0.0);
            cloud.next_flash = 4.0 + rng.f32() * 5.0;
        }
        // Ramp up, hold, ramp down: the div itself lights up yellow and glows.
        let lit = match cloud.flash {
            Some(f) => {
                let before = f;
                let f = f + dt;
                if before < FLASH_SECS / 2.0 && f >= FLASH_SECS / 2.0 {
                    strikes.write(Strike(cloud.pos + Vec2::Y * -60.0));
                }
                cloud.flash = (f < FLASH_SECS).then_some(f);
                (1.0 - ((f / FLASH_SECS - 0.5).abs() * 2.0 - 0.34).max(0.0) / 0.66).clamp(0.0, 1.0)
            }
            None => 0.0,
        };
        let gray = fill(Weather::Storm).to_srgba();
        let yellow = Srgba::new(0.992, 0.878, 0.278, 0.5);
        bg.0 = Color::Srgba(gray.mix(&yellow, lit));
        *shadow = if lit > 0.0 {
            BoxShadow(vec![
                ShadowStyle { color: Color::srgba(0.98, 0.8, 0.08, 0.7 * lit), x_offset: Val::ZERO, y_offset: Val::ZERO, spread_radius: Val::ZERO, blur_radius: px(40) },
                ShadowStyle { color: Color::srgba(0.98, 0.8, 0.08, 0.3 * lit), x_offset: Val::ZERO, y_offset: Val::ZERO, spread_radius: Val::ZERO, blur_radius: px(80) },
            ])
        } else {
            glow(Color::srgba(1.0, 1.0, 1.0, 0.1), 20.0)
        };
        if let Some(Ok(mut c)) = cloud.bolt.map(|e| colors.get_mut(e)) {
            c.0 = c.0.with_alpha(lit);
        }
    }
}
