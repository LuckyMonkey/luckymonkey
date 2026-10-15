//! Clouds drift across the whole map on one wind and wrap around, with a soft
//! shadow on the ground. Rain clouds drizzle; storm clouds flash and throw a bolt.

use bevy::prelude::*;

use crate::world::{World, emoji_text};
use crate::{Art, Rng};

const CLOUD_Z: f32 = 300.0;
const SHADOW_Z: f32 = 120.0;
const COUNT: usize = 10;

#[derive(Clone, Copy, PartialEq)]
enum Weather {
    Fair,
    Rain,
    Storm,
}

#[derive(Component)]
struct Cloud {
    weather: Weather,
    speed: f32,
    scale: f32,
    /// Seconds until the next lightning flash (storms only).
    next_flash: f32,
    flash: f32,
}

#[derive(Component)]
struct Shadow(Entity);

#[derive(Component)]
struct Drop {
    phase: f32,
}

#[derive(Component)]
struct Bolt;

pub fn plugin(app: &mut App) {
    app.add_systems(Startup, spawn).add_systems(Update, (drift, rain, storm));
}

/// Wind direction (Bevy coordinates): left to right, sinking slightly.
fn wind() -> Vec2 {
    Vec2::new(1.0, -0.3).normalize()
}

fn cloud_tint(w: Weather) -> Color {
    match w {
        Weather::Fair => Color::srgba(1.0, 1.0, 1.0, 0.55),
        Weather::Rain => Color::srgba(0.70, 0.80, 0.95, 0.60),
        Weather::Storm => Color::srgba(0.45, 0.48, 0.55, 0.70),
    }
}

fn spawn(mut commands: Commands, world: Res<World>, art: Res<Art>, mut rng: ResMut<Rng>) {
    let b = world.bounds;
    for i in 0..COUNT {
        let weather = match i % 5 {
            0 | 2 | 4 => Weather::Fair,
            1 => Weather::Rain,
            _ => Weather::Storm,
        };
        let scale = 0.7 + rng.f32() * 0.7;
        let pos = Vec2::new(b.min.x + rng.f32() * b.width(), b.min.y + rng.f32() * b.height());
        let size = Vec2::new(256.0, 128.0) * scale;
        let cloud = commands
            .spawn((
                Cloud { weather, speed: 10.0 + rng.f32() * 14.0, scale, next_flash: 2.0 + rng.f32() * 6.0, flash: 0.0 },
                Sprite { image: art.cloud.clone(), color: cloud_tint(weather), custom_size: Some(size), ..default() },
                Transform::from_translation(pos.extend(CLOUD_Z + i as f32 * 0.1)),
            ))
            .with_children(|c| {
                if weather != Weather::Fair {
                    for d in 0..7 {
                        c.spawn((
                            Drop { phase: d as f32 / 7.0 },
                            Sprite::from_color(Color::srgba(0.6, 0.8, 1.0, 0.6), Vec2::new(2.0, 12.0)),
                            Transform::from_xyz((d as f32 - 3.0) * 22.0 * scale, -30.0 * scale, -0.01),
                        ));
                    }
                }
                if weather == Weather::Storm {
                    c.spawn((
                        Bolt,
                        emoji_text(&art, "⚡", 30.0),
                        Transform::from_xyz(0.0, -50.0 * scale, 0.01).with_scale(Vec3::splat(0.5)),
                        Visibility::Hidden,
                    ));
                }
            })
            .id();
        // The shadow lands on the ground below and ahead of the cloud.
        commands.spawn((
            Shadow(cloud),
            Sprite { image: art.cloud.clone(), color: Color::srgba(0.0, 0.05, 0.0, 0.16), custom_size: Some(size * Vec2::new(0.9, 0.6)), ..default() },
            Transform::from_translation((pos + Vec2::new(0.0, -140.0)).extend(SHADOW_Z)),
        ));
    }
}

fn drift(
    time: Res<Time>,
    world: Res<World>,
    mut clouds: Query<(Entity, &Cloud, &mut Transform), Without<Shadow>>,
    mut shadows: Query<(&Shadow, &mut Transform), Without<Cloud>>,
) {
    let b = world.bounds;
    let margin = 300.0;
    for (_, cloud, mut tf) in &mut clouds {
        let mut p = tf.translation.truncate() + wind() * cloud.speed * time.delta_secs();
        // Wrap so the sky never empties: leave on the right/bottom, return on the left/top.
        if p.x > b.max.x + margin {
            p.x = b.min.x - margin;
        }
        if p.y < b.min.y - margin {
            p.y = b.max.y + margin;
        }
        tf.translation = p.extend(tf.translation.z);
    }
    for (shadow, mut tf) in &mut shadows {
        if let Ok((_, cloud, ctf)) = clouds.get(shadow.0) {
            tf.translation = (ctf.translation.truncate() + Vec2::new(0.0, -140.0 * cloud.scale)).extend(SHADOW_Z);
        }
    }
}

fn rain(time: Res<Time>, mut drops: Query<(&Drop, &mut Transform, &mut Sprite)>) {
    let t = time.elapsed_secs();
    for (drop, mut tf, mut sprite) in &mut drops {
        let k = (t + drop.phase).fract();
        tf.translation.y = -25.0 - k * 40.0;
        sprite.color = sprite.color.with_alpha(0.7 * (k * 3.0).min(1.0) * (1.0 - k));
    }
}

fn storm(
    time: Res<Time>,
    mut rng: ResMut<Rng>,
    mut clouds: Query<(&mut Cloud, &mut Sprite, &Children)>,
    mut bolts: Query<&mut Visibility, With<Bolt>>,
) {
    let dt = time.delta_secs();
    for (mut cloud, mut sprite, children) in &mut clouds {
        if cloud.weather != Weather::Storm {
            continue;
        }
        cloud.next_flash -= dt;
        if cloud.next_flash <= 0.0 {
            cloud.flash = 0.35;
            cloud.next_flash = 4.0 + rng.f32() * 5.0;
        }
        cloud.flash = (cloud.flash - dt).max(0.0);
        // Double flicker inside the flash window.
        let lit = cloud.flash > 0.0 && ((cloud.flash * 20.0) as i32) % 3 != 1;
        sprite.color = if lit { Color::srgba(1.0, 0.92, 0.45, 0.8) } else { cloud_tint(Weather::Storm) };
        for c in children.iter() {
            if let Ok(mut v) = bolts.get_mut(c) {
                *v = if lit { Visibility::Inherited } else { Visibility::Hidden };
            }
        }
    }
}
