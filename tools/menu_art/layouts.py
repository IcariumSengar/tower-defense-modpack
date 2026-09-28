"""Writes the FancyMenu 3.9.12 / Drippy 3.1.5 layouts and option files for the
menu reskin into pack/config/.

Usage (from the repo root):  python tools/menu_art/layouts.py

Hand-written layouts with no graphical editor, so the rules that bite are
encoded here rather than remembered:
- UTF-8 without BOM (a BOM hides the 'type =' line and the layout silently
  fails to load); no trailing whitespace (values keep it, so an identifier
  with a trailing space never matches).
- A screen only takes a layout if its class is in customizablemenus.txt.
- vanilla_button x/y/width/height are ignored unless anchor_point is a real
  anchor ('vanilla' / omitted keeps the widget where it was).
- instance_identifier must be unique across ALL layouts (element memory is
  keyed globally by it).
- text_v2 has no alignment key: a line that is exactly ^^^ opens/closes a
  centred markdown block. Tip lines are parsed as markdown too.
- 'customization { action = backgroundoptions keepaspectratio = true }' is
  the only switch for cover-scaled image backgrounds.
Widget ids, keys and screen identifiers were read from the decompiled 3.9.12
source and match editor-written 3.9.9 layouts.
"""

import os
import re

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG = os.path.join(REPO, "pack", "config")
FM = os.path.join(CONFIG, "fancymenu")
ASSETS = "config/fancymenu/assets/td"

BONE = "#E9DCC4FF"
EMBER = "#D6683AFF"
DUSTY = "#B98A6EFF"
SPLASH = "#FFB35CFF"
HOVER_LABEL = "#FFE2AA"
TIP_INTERVAL = 10  # seconds between tip re-rolls (0 would freeze one tip all session)


def pack_version():
    with open(os.path.join(REPO, "pack", "pack.toml"), encoding="utf-8") as f:
        m = re.search(r'^version\s*=\s*"([^"]+)"', f.read(), re.M)
    return m.group(1) if m else "?"


def src(name):
    return f"[source:local]{ASSETS}/{name}"


# ---------------------------------------------------------------- elements

def _base(eid, anchor, x, y, w, h, sticky=False, stretch_x=False, stretch_y=False,
          opacity=1.0, fade_in="no_fading"):
    req = f"{eid}-req"
    return [
        ("element_type", None),  # filled by caller
        ("instance_identifier", eid),
        ("appearance_delay", "no_delay"),
        ("disappearance_delay", "no_delay"),
        ("fade_in_v2", fade_in),
        ("fade_out", "no_fading"),
        ("auto_sizing", "false"),
        ("auto_sizing_base_screen_width", "0"),
        ("auto_sizing_base_screen_height", "0"),
        ("auto_sizing_base_gui_scale", "0.0"),
        ("sticky_anchor", str(sticky).lower()),
        ("anchor_point", anchor),
        ("x", str(x)),
        ("y", str(y)),
        ("width", str(w)),
        ("height", str(h)),
        ("stay_on_screen", "false"),
        ("element_loading_requirement_container_identifier", req),
        (f"[loading_requirement_container_meta:{req}]", "[groups:][instances:]"),
        ("enable_parallax", "false"),
        ("invert_parallax", "false"),
        ("animated_offset_x", "0"),
        ("animated_offset_y", "0"),
        ("load_once_per_session", "false"),
        ("layer_hidden_in_editor", "false"),
        ("advanced_rotation_mode", "false"),
        ("advanced_vertical_tilt_mode", "false"),
        ("advanced_horizontal_tilt_mode", "false"),
        ("should_be_affected_by_decoration_overlays", "false"),
        ("in_editor_color", "#FFC800FF"),
        ("advanced_posx", "-2147483648"),
        ("advanced_posy", "-2147483648"),
        ("advanced_width", "-2147483648"),
        ("advanced_height", "-2147483648"),
        ("stretch_x", str(stretch_x).lower()),
        ("stretch_y", str(stretch_y).lower()),
        ("appearance_delay_seconds", "1.0"),
        ("disappearance_delay_seconds", "1.0"),
        ("fade_in_speed", "2.0"),
        ("fade_out_speed", "1.0"),
        ("base_opacity", str(opacity)),
        ("parallax_intensity_x", "0.5"),
        ("parallax_intensity_y", "0.5"),
        ("rotation_degrees", "0.0"),
        ("advanced_rotation_degrees", "0.0"),
        ("vertical_tilt_degrees", "0.0"),
        ("advanced_vertical_tilt_degrees", "0.0"),
        ("horizontal_tilt_degrees", "0.0"),
        ("advanced_horizontal_tilt_degrees", "0.0"),
    ]


def _typed(kind, base):
    return [("element_type", kind) if k == "element_type" else (k, v) for k, v in base]


def image(eid, asset, anchor, x, y, w, h, **kw):
    keys = _typed("image", _base(eid, anchor, x, y, w, h, **kw))
    keys += [
        ("source", src(asset)),
        ("repeat_texture", "false"),
        ("nine_slice_texture", "false"),
        ("nine_slice_texture_border_x", "5"),
        ("nine_slice_texture_border_y", "5"),
        ("restart_animated_on_menu_load", "false"),
        ("image_tint", "#FFFFFF"),
        ("rounding_radius_top_left", "0.0"),
        ("rounding_radius_top_right", "0.0"),
        ("rounding_radius_bottom_right", "0.0"),
        ("rounding_radius_bottom_left", "0.0"),
    ]
    return ("element", keys)


def text(eid, source, anchor, x, y, w, h, color=BONE, centered=False, **kw):
    if centered:
        source = f"^^^%n%{source}%n%^^^"
    keys = [
        ("interactable", "false"),
        ("source", source),
        ("source_mode", "direct"),
        ("shadow", "true"),
        ("enable_scrolling", "false"),
        ("auto_line_wrapping", "true"),
        ("remove_html_breaks", "true"),
        ("code_block_single_color", "#737373FF"),
        ("code_block_multi_color", "#565656FF"),
        ("headline_line_color", "#A9A9A9FF"),
        ("separation_line_color", "#A9A9A9FF"),
        ("hyperlink_color", "#0771FCFF"),
        ("click_event_color", "#0771FCFF"),
        ("hover_event_color", "#0771FCFF"),
        ("quote_color", "#818181FF"),
        ("quote_italic", "false"),
        ("bullet_list_dot_color", "#A9A9A9FF"),
        ("parse_markdown", "true"),
        ("table_show_header", "true"),
        ("table_alternate_row_colors", "true"),
        ("table_line_color", "#787878FF"),
        ("table_header_background_color", "#323232FF"),
        ("table_row_background_color", "#282828FF"),
        ("table_alternate_row_color", "#3C3C3CFF"),
    ]
    keys += _typed("text_v2", _base(eid, anchor, x, y, w, h, **kw))
    keys += [
        ("base_color", color),
        ("scale", "1.0"),
        ("text_border", "2"),
        ("line_spacing", "2"),
        ("quote_indent", "8"),
        ("bullet_list_indent", "8"),
        ("bullet_list_spacing", "3"),
        ("table_line_thickness", "1.0"),
        ("table_cell_padding", "8.0"),
        ("table_margin", "4.0"),
    ]
    return ("element", keys)


def splash(eid, asset, anchor, x, y, w, h, rotation, scale, color=SPLASH):
    keys = [
        ("source", src(asset)),
        ("source_mode", "text_file"),
        ("shadow", "true"),
        ("refresh", "true"),     # re-roll each time the title screen opens
        ("bouncing", "true"),
    ]
    keys += _typed("splash_text", _base(eid, anchor, x, y, w, h))
    keys += [("scale", str(scale)), ("rotation", str(rotation)), ("base_color", color)]
    return ("element", keys)


def progress(eid, placeholder, anchor, x, y, w, h, **kw):
    keys = [
        ("bar_texture", src("bar_progress.png")),
        ("bar_nine_slice", "false"),
        ("background_texture", src("bar_background.png")),
        ("background_nine_slice", "false"),
        ("direction", "right"),
        ("progress_for_element_anchor", "false"),
        ("value_mode", "percentage"),
        ("smooth_filling_animation", "true"),
    ]
    keys += _typed("progress_bar", _base(eid, anchor, x, y, w, h, **kw))
    keys += [(f"{p}_nine_slice_border_{side}", "5")
             for p in ("bar", "background") for side in ("top", "right", "bottom", "left")]
    keys += [
        ("progress_source", '{"placeholder":"%s"}' % placeholder),
        ("bar_color", "#D6683AFF"),
        ("background_color", "#160F1AFF"),
    ]
    return ("element", keys)


def vbutton(wid, hidden=False, anchor=None, x=0, y=0, w=0, h=0, plate=False):
    """Customise a vanilla widget by its FancyMenu widget id."""
    keys = [("element_type", "vanilla_button"), ("instance_identifier", wid)]
    if anchor:
        keys += [("anchor_point", anchor), ("sticky_anchor", "false"),
                 ("x", str(x)), ("y", str(y)), ("width", str(w)), ("height", str(h)),
                 ("stay_on_screen", "false")]
    if plate:
        keys += [
            ("backgroundnormal", src("button_normal.png")),
            ("backgroundhovered", src("button_hover.png")),
            ("background_texture_inactive", src("button_inactive.png")),
            ("nine_slice_custom_background", "true"),
            ("nine_slice_border_x", "4"),
            ("nine_slice_border_y", "4"),
            ("restartbackgroundanimations", "true"),
            ("label_hover_color", HOVER_LABEL),
        ]
    keys.append(("is_hidden", str(hidden).lower()))
    return ("vanilla_button", keys)


# ------------------------------------------------------------- composites

def tip_strip(prefix, bottom=-8, label=True, plate="tip_plate.png"):
    """Field-note tip on a dark plate, bottom centre. The plate is 26 tall;
    the text box starts 4px lower so one line sits mid-plate and two fill it."""
    tip = '{"placeholder":"randomtext","values":{"source":"/%s/tips.txt","interval":"%d"}}' % (
        ASSETS, TIP_INTERVAL)
    out = [image(f"td-{prefix}-tip-plate", plate, "bottom-centered", 0, bottom, 400, 26, sticky=True)]
    if label:
        out.append(text(f"td-{prefix}-tip-label", "FIELD NOTE", "bottom-centered", 0, bottom - 26, 120, 13,
                        color=EMBER, centered=True, sticky=True))
    out.append(text(f"td-{prefix}-tip", tip, "bottom-centered", 0, bottom + 2, 384, 26,
                    centered=True, sticky=True))
    return out


def button_template(eid):
    """A custom_button with is_template=true becomes the texture source for
    every button on its screen (ButtonElement.getPropertySource), including
    buttons other mods add, and is never drawn itself. Labels are untouched
    (template_apply_label=false). Not for screens with icon ImageButtons."""
    keys = [
        ("backgroundnormal", src("button_normal.png")),
        ("backgroundhovered", src("button_hover.png")),
        ("background_texture_inactive", src("button_inactive.png")),
        ("nine_slice_custom_background", "true"),
        ("nine_slice_border_x", "4"),
        ("nine_slice_border_y", "4"),
        ("restartbackgroundanimations", "true"),
        ("is_template", "true"),
        ("template_share_with", "buttons"),
    ]
    keys += [(f"template_apply_{k}", "false")
             for k in ("width", "height", "posx", "posy", "opacity", "visibility", "label")]
    keys += _typed("custom_button", _base(eid, "top-left", 0, 0, 100, 20))
    return ("element", keys)


def background(eid, asset):
    return [
        ("menu_background", [
            ("instance_identifier", eid),
            ("background_type", "image"),
            ("show_background", "true"),
            ("image_path", src(asset)),
            ("slide", "false"),
            ("repeat_texture", "false"),
            ("parallax", "false"),
            ("parallax_intensity_x", "0.02"),
            ("parallax_intensity_y", "0.02"),
            ("invert_parallax", "false"),
            ("restart_animated_on_menu_load", "false"),
        ]),
        ("customization", [("action", "backgroundoptions"), ("keepaspectratio", "true")]),
    ]


def layout(identifier, sections, behind_vanilla):
    meta = [
        ("identifier", identifier),
        ("render_custom_elements_behind_vanilla", str(behind_vanilla).lower()),
        ("last_edited_time", "-1"),
        ("is_enabled", "true"),
        ("randommode", "false"),
        ("randomgroup", "1"),
        ("randomonlyfirsttime", "false"),
        ("layout_index", "0"),
    ]
    out = ["type = fancymenu_layout", ""]
    for name, keys in [("layout-meta", meta)] + sections:
        out.append(f"{name} {{")
        for k, v in keys:
            assert v is not None and v == v.strip() and "\n" not in v, (identifier, k, v)
            out.append(f"  {k} = {v}")
        out.append("}")
        out.append("")
    return "\n".join(out)


# ---------------------------------------------------------------- screens
# GUI units. The title block is sized for 240-270 GUI px tall (1080p at the
# default auto GUI scale is 480x270; 720p is 427x240).

def title_screen():
    col_x, col_w = 20, 184
    s = background("td-title-bg", "bg_dusk.png")
    s += [
        image("td-title-column", "column.png", "top-left", 0, 0, 220, 100, stretch_y=True),
        image("td-title-embers", "embers.apng", "bottom-right", -320, -224, 320, 224),
        image("td-title-logo", "logo.png", "mid-left", 18, -113, 184, 78, fade_in="first_time"),
        image("td-title-rule", "rule.png", "mid-left", 22, -31, 150, 3),
        text("td-title-version", f"modpack  ·  v{pack_version()}", "mid-left", col_x, -29, 180, 13,
             color=DUSTY),
        splash("td-title-splash", "splashes.txt", "mid-left", 150, -104, 100, 20, rotation=-18.0, scale=0.6),
    ]
    rows = [("mc_titlescreen_singleplayer_button", -8, col_w),
            ("mc_titlescreen_multiplayer_button", 16, col_w),
            ("forge_titlescreen_mods_button", 40, col_w),
            ("mc_titlescreen_options_button", 64, col_w),
            ("mc_titlescreen_quit_button", 88, col_w - 48)]
    for wid, y, w in rows:
        s.append(vbutton(wid, anchor="mid-left", x=col_x, y=y, w=w, h=20, plate=True))
    # icon buttons keep their own art; they just move into the Quit row
    s.append(vbutton("mc_titlescreen_language_button", anchor="mid-left", x=col_x + col_w - 44, y=88, w=20, h=20))
    s.append(vbutton("mc_titlescreen_accessibility_button", anchor="mid-left", x=col_x + col_w - 20, y=88, w=20, h=20))
    # Forge's bottom-left branding is 5 lines (Forge/MC/MCP/ModernFix/mod count);
    # at the 4K/1080p auto GUI height (~250) it lands on the Options/Quit rows.
    for wid in ("mc_titlescreen_realms_button", "minecraft_realms_notification_icons_widget",
                "minecraft_logo_widget", "minecraft_splash_widget", "minecraft_branding_widget"):
        s.append(vbutton(wid, hidden=True))
    return layout("title_screen", s, behind_vanilla=True)


def pause_screen():
    # Wordmark top-left: top-centre collides with the pedestal/wave boss bars.
    # No FIELD NOTE label and a solid plate: mods that add a pause row push
    # Save and Quit down onto the label, and the HUD shows through otherwise.
    s = [
        image("td-pause-shade", "shade.png", "top-left", 0, 0, 100, 100, stretch_x=True, stretch_y=True),
        image("td-pause-logo", "logo_small.png", "top-left", 6, 6, 103, 41),
        button_template("td-pause-button-template"),
    ]
    s += tip_strip("pause", label=False, plate="tip_plate_solid.png")
    for wid in ("pause_return_to_game_button", "pause_advancements_button", "pause_stats_button",
                "pause_send_feedback_button", "pause_report_bugs_button", "pause_options_button",
                "pause_share_to_lan_button", "pause_disconnect_button"):
        s.append(vbutton(wid, plate=True))
    s.append(vbutton("40", hidden=True))  # the "Game Menu" title (long id: x=0,y=40)
    return layout("pause_screen", s, behind_vanilla=True)


def loading_overlay():
    """Drippy: the startup / resource-reload loading screen."""
    s = background("td-drippy-bg", "bg_night.png")
    s += [
        image("td-drippy-logo", "logo.png", "mid-centered", 0, -40, 184, 78, sticky=True),
        progress("td-drippy-bar", "game_loading_progress", "mid-centered", 0, 16, 204, 10, sticky=True),
    ]
    s += tip_strip("drippy")
    s += [vbutton("mojang_logo", hidden=True), vbutton("progress_bar", hidden=True)]
    return layout("drippy_loading_overlay", s, behind_vanilla=False)


def level_loading_screen():
    """'Preparing spawn area' while a singleplayer world generates/loads."""
    s = background("td-level-bg", "bg_night_dim.png")
    s += [
        image("td-level-logo", "logo.png", "mid-centered", 0, -40, 184, 78, sticky=True),
        progress("td-level-bar", "world_load_progress", "mid-centered", 0, 16, 204, 10, sticky=True),
    ]
    s += tip_strip("level")
    s += [vbutton("chunks", hidden=True), vbutton("percentage", hidden=True)]
    return layout("level_loading_screen", s, behind_vanilla=False)


def message_screen(identifier, prefix):
    """Screens whose only content is vanilla status text near y=70 or h/2-50
    (saving, connecting, downloading terrain): small wordmark above it."""
    s = background(f"td-{prefix}-bg", "bg_night_dim.png")
    s.append(image(f"td-{prefix}-logo", "logo_small.png", "top-centered", 0, 20, 103, 41, sticky=True))
    s += tip_strip(prefix)
    return layout(identifier, s, behind_vanilla=False)


LAYOUTS = {
    "td_title_screen.txt": title_screen,
    "td_pause_screen.txt": pause_screen,
    "td_loading_overlay.txt": loading_overlay,
    "td_level_loading_screen.txt": level_loading_screen,
    "td_receiving_level_screen.txt": lambda: message_screen("receiving_level_screen", "receiving"),
    "td_generic_dirt_message_screen.txt": lambda: message_screen("generic_dirt_message_screen", "message"),
    "td_progress_screen.txt": lambda: message_screen("progress_screen", "progress"),
    "td_connect_screen.txt": lambda: message_screen("connect_screen", "connect"),
}

CUSTOMIZABLE = [
    "net.minecraft.client.gui.screens.TitleScreen",
    "net.minecraft.client.gui.screens.PauseScreen",
    "de.keksuccino.drippyloadingscreen.customization.DrippyOverlayScreen",
    "net.minecraft.client.gui.screens.LevelLoadingScreen",
    "net.minecraft.client.gui.screens.ReceivingLevelScreen",
    "net.minecraft.client.gui.screens.GenericDirtMessageScreen",
    "net.minecraft.client.gui.screens.ProgressScreen",
    "net.minecraft.client.gui.screens.ConnectScreen",
]

# Konkrete config: '##[category]' headers, 'X:key = 'value';' entries at
# column 0. Missing keys get defaults; FancyMenu rewrites the file on launch.
FANCYMENU_OPTIONS = f"""##[customization]

B:modpack_mode = 'true';
B:show_customization_overlay = 'false';
B:advanced_customization_mode = 'false';


##[tutorial]

B:show_welcome_screen = 'false';


##[debug_overlay]

B:show_debug_overlay = 'false';


##[window]

B:show_custom_window_icon = 'true';
S:custom_window_icon_16 = '/{ASSETS}/icon16.png';
S:custom_window_icon_32 = '/{ASSETS}/icon32.png';
S:custom_window_icon_macos = '';
S:custom_window_title = 'Tower Defense Modpack';


##[global_customizations]

S:global_menu_background_texture = '{src("bg_dusk_dim.png")}';
"""

DRIPPY_OPTIONS = """##[general]

B:allow_universal_layouts = 'false';
B:early_fade_out_elements = 'true';
B:wait_for_textures_in_loading = 'true';
B:fade_out_loading_screen = 'true';
"""


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = content.encode("utf-8")
    assert not data.startswith(b"\xef\xbb\xbf")
    for line in content.split("\n"):
        assert line == line.rstrip(), f"trailing whitespace in {path}: {line!r}"
    with open(path, "wb") as f:
        f.write(data)


def main():
    ids = []
    for name, fn in LAYOUTS.items():
        body = fn()
        ids += re.findall(r"^  instance_identifier = (td-\S+)$", body, re.M)
        write(os.path.join(FM, "customization", name), body)
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"instance_identifier reused across layouts: {dupes}"
    menus = "type = customizablemenus\n\n" + "".join(f"{c} {{\n}}\n\n" for c in CUSTOMIZABLE)
    write(os.path.join(FM, "customizablemenus.txt"), menus)
    write(os.path.join(FM, "options.txt"), FANCYMENU_OPTIONS)
    write(os.path.join(CONFIG, "drippyloadingscreen", "options.txt"), DRIPPY_OPTIONS)
    print(f"wrote {len(LAYOUTS)} layouts, customizablemenus.txt, 2 options files ({len(ids)} unique element ids)")


if __name__ == "__main__":
    main()
