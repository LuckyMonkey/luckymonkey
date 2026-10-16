//! Lucky Monkey - isometric jungle network, Bevy port.
//!
//! Everything (world data, textures, fonts) is compiled into the binary, so the
//! web build is just `luckymonkey.js` + `luckymonkey_bg.wasm`.

mod clouds;
mod npc;
mod ops;
mod ui;
mod view;
mod water;
mod world;

use bevy::asset::RenderAssetUsages;
use bevy::image::{CompressedImageFormats, ImageSampler, ImageType};
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};
use bevy::prelude::*;

#[derive(States, Default, Clone, Copy, Eq, PartialEq, Hash, Debug)]
pub enum Screen {
    #[default]
    Welcome,
    Playing,
}

/// Fonts and textures shared by every module.
#[derive(Resource)]
pub struct Art {
    pub mono: Handle<Font>,
    pub bold: Handle<Font>,
    pub emoji: Handle<Font>,
    /// Japanese glyphs used by node names and labels (subset), fallback for mono/bold
    /// (then emoji, so HUD lines can mix them in).
    pub cjk: Handle<Font>,
    pub tiles: Handle<Image>,
    pub card: Handle<Image>,
    pub card_border: Handle<Image>,
    /// Soft white dot: bubbles, glints, packets.
    pub dot: Handle<Image>,
    pub grid: Handle<Image>,
}

impl Art {
    /// Monospace text font (regular or bold) with the Japanese subset as fallback.
    pub fn text(&self, bold: bool, size: f32) -> TextFont {
        let main = if bold { &self.bold } else { &self.mono };
        TextFont {
            font: FontSource::List(vec![main.clone().into(), self.cjk.clone().into(), self.emoji.clone().into()]),
            font_size: FontSize::Px(size),
            ..default()
        }
    }
}

/// Tiny deterministic PRNG (xorshift64*), so the game needs no getrandom/JS glue.
#[derive(Resource)]
pub struct Rng(u64);

impl Rng {
    pub fn f32(&mut self) -> f32 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        ((self.0.wrapping_mul(0x2545_f491_4f6c_dd1d) >> 40) as f32) / (1u64 << 24) as f32
    }
    pub fn below(&mut self, n: usize) -> usize {
        ((self.f32() * n as f32) as usize).min(n.saturating_sub(1))
    }
}

fn png(images: &mut Assets<Image>, bytes: &[u8], sampler: ImageSampler) -> Handle<Image> {
    let image = Image::from_buffer(
        bytes,
        ImageType::Extension("png"),
        CompressedImageFormats::NONE,
        true,
        sampler,
        RenderAssetUsages::default(),
    )
    .expect("embedded png");
    images.add(image)
}

fn dot(images: &mut Assets<Image>) -> Handle<Image> {
    const N: u32 = 32;
    let mut data = Vec::with_capacity((N * N * 4) as usize);
    for y in 0..N {
        for x in 0..N {
            let d = Vec2::new(x as f32 + 0.5, y as f32 + 0.5).distance(Vec2::splat(N as f32 / 2.0)) / (N as f32 / 2.0);
            data.extend([255, 255, 255, (((1.0 - d) * 3.0).clamp(0.0, 1.0) * 255.0) as u8]);
        }
    }
    let size = Extent3d { width: N, height: N, depth_or_array_layers: 1 };
    images.add(Image::new(size, TextureDimension::D2, data, TextureFormat::Rgba8UnormSrgb, RenderAssetUsages::default()))
}

fn load_art(mut commands: Commands, mut images: ResMut<Assets<Image>>, mut fonts: ResMut<Assets<Font>>) {
    let font = |b: &[u8]| Font::from_bytes(b.to_vec());
    commands.insert_resource(Art {
        mono: fonts.add(font(include_bytes!("../assets/fonts/DejaVuSansMono.ttf"))),
        bold: fonts.add(font(include_bytes!("../assets/fonts/DejaVuSansMono-Bold.ttf"))),
        emoji: fonts.add(font(include_bytes!("../assets/fonts/Twemoji.Mozilla.ttf"))),
        cjk: fonts.add(font(include_bytes!("../assets/fonts/NotoSansMonoCJKjp-subset.otf"))),
        tiles: png(&mut images, include_bytes!("../assets/tiles.png"), ImageSampler::nearest()),
        card: png(&mut images, include_bytes!("../assets/card.png"), ImageSampler::linear()),
        card_border: png(&mut images, include_bytes!("../assets/card_border.png"), ImageSampler::linear()),
        dot: dot(&mut images),
        grid: png(&mut images, include_bytes!("../../public/images/grid_background.png"), ImageSampler::linear()),
    });
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Lucky Monkey".into(),
                canvas: Some("#lm-canvas".into()),
                fit_canvas_to_parent: true,
                prevent_default_event_handling: true,
                ..default()
            }),
            ..default()
        }))
        .insert_resource(ClearColor(Color::BLACK))
        .insert_resource(Rng(0x9e37_79b9_7f4a_7c15))
        .init_state::<Screen>()
        .add_systems(PreStartup, load_art)
        .add_plugins((world::plugin, water::plugin, npc::plugin, clouds::plugin, view::plugin, ui::plugin, ops::plugin))
        .run();
}
