//! Sound: the game names a cue, the page plays it.
//!
//! All sound is synthesized in the browser by public/sfx.js (WebAudio: square
//! blips, bit-crushed noise, little arpeggios, jungle music (drone, birds, then bongos and cuica) that grows with the
//! threat level), in the spirit of the old Spybotics hacking game. No audio
//! files, nothing in the wasm. Natively these are no-ops.

#[cfg(target_arch = "wasm32")]
fn call(f: &str, arg: wasm_bindgen::JsValue) {
    use wasm_bindgen::JsCast;
    let Some(w) = web_sys::window() else { return };
    if let Ok(func) = js_sys::Reflect::get(&w, &f.into()) {
        if let Some(func) = func.dyn_ref::<js_sys::Function>() {
            let _ = func.call1(&w, &arg);
        }
    }
}

/// Play a named cue (see public/sfx.js for the list).
pub fn play(name: &str) {
    #[cfg(target_arch = "wasm32")]
    call("lmSfx", name.into());
    #[cfg(not(target_arch = "wasm32"))]
    let _ = name;
}

/// Music intensity: 0 silent .. ~1.5 all-out cyberstorm (faster, fuller).
pub fn ambient(level: f32) {
    #[cfg(target_arch = "wasm32")]
    call("lmAmbient", (level as f64).into());
    #[cfg(not(target_arch = "wasm32"))]
    let _ = level;
}

/// Toggle mute; returns whether sound is now on.
pub fn toggle() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        use wasm_bindgen::JsCast;
        let Some(w) = web_sys::window() else { return false };
        if let Ok(func) = js_sys::Reflect::get(&w, &"lmSfxToggle".into()) {
            if let Some(func) = func.dyn_ref::<js_sys::Function>() {
                return func.call0(&w).ok().and_then(|v| v.as_bool()).unwrap_or(false);
            }
        }
        false
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}

/// Is sound on (page setting, remembered in this browser)?
pub fn enabled() -> bool {
    #[cfg(target_arch = "wasm32")]
    {
        let Some(w) = web_sys::window() else { return false };
        js_sys::Reflect::get(&w, &"lmSfxOn".into()).ok().and_then(|v| v.as_bool()).unwrap_or(false)
    }
    #[cfg(not(target_arch = "wasm32"))]
    false
}
