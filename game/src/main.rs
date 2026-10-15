//! Lucky Monkey - isometric jungle network, Bevy port.
//!
//! Everything (world data, textures, fonts) is compiled into the binary, so the
//! web build is just `luckymonkey.js` + `luckymonkey_bg.wasm`.

mod clouds;
mod npc;
mod ui;
mod view;
mod world;

use bevy::asset::RenderAssetUsages;
use bevy::image::{CompressedImageFormats, ImageSampler, ImageType};
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
    /// Japanese glyphs used by node names and labels (subset), fallback for mono/bold.
    pub cjk: Handle<Font>,
    pub tiles: Handle<Image>,
    pub card: Handle<Image>,
    pub card_border: Handle<Image>,
    pub cloud: Handle<Image>,
    pub grid: Handle<Image>,
}

impl Art {
    /// Monospace text font (regular or bold) with the Japanese subset as fallback.
    pub fn text(&self, bold: bool, size: f32) -> TextFont {
        let main = if bold { &self.bold } else { &self.mono };
        TextFont {
            font: FontSource::List(vec![main.clone().into(), self.cjk.clone().into()]),
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
        cloud: png(&mut images, include_bytes!("../assets/cloud.png"), ImageSampler::linear()),
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
        .add_plugins((world::plugin, npc::plugin, clouds::plugin, view::plugin, ui::plugin))
        .run();
}
