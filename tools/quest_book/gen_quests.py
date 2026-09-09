"""Quest book v3 ("fishbone") generator.

Emits pack/config/ftbquests/quests/chapters/{campaign,tips_and_tricks,bounties}.snbt
from the spec in docs/FEATURES.md ("Quest book redesign v3").

Id rules (see docs/IDEAS.md working principles, 2026-09-09):
- FTB Quests 2001.4.22 parses ids with Long.parseLong(s, 16); any id with leading
  hex digit 8-F overflows and is silently re-minted on load. Every id this script
  emits is positive (63-bit), and any explicit legacy id that is negative is
  replaced by whatever the on-disk file already carries for that object.
- Re-runs are stable: before generating, the current on-disk chapter files are
  parsed into a ledger keyed by (chapter, quest title) -> quest id, task ids and
  reward ids by position (with their types). Objects found in the ledger keep
  their ids; only genuinely new objects get minted ids. Rename a quest and it
  will get a new id - do that only when no live save has progress on it.
- The nine milestone task ids are fixed constants shared with
  pack/kubejs/server_scripts/quest_milestones.js.

Run from anywhere:  python tools/quest_book/gen_quests.py
"""
import random, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "pack", "config", "ftbquests", "quests", "chapters") + os.sep

# ---- ids ---------------------------------------------------------------
MILESTONE_TASK_IDS = {
    "horn": "5A1C0E7B93D4F216",
    "wave1": "6B2D1F8CA4E50327",
    "wave3": "7C3E209DB5F61438",
    "gear": "0D4F31AEC6072549",
    "wave8": "1E5042BFD718365A",
    "boss": "2F6153C0E829476B",
    "wave15": "307264D1F93A587C",
    "amuletWorn": "418375E20A4B698D",
    "amuletOnPedestal": "529486F31B5C7A9E",
}
ID_RE = re.compile(r'"([0-9A-F]{16})"')
def is_positive(i): return i[0] in "01234567"
assert all(is_positive(v) for v in MILESTONE_TASK_IDS.values())

# ledger: (chapter, title) -> {"id": ..., "tasks": [(id, type)], "rewards": [(id, type)]}
LEDGER = {}
used = set(MILESTONE_TASK_IDS.values())
def _entries(section):
    out = []
    for blk in re.split(r"\n\t{4}\}\n\t{4}\{\n|\n\t{4}\{\n", section):
        i = re.search(r'\n?\t{5}id: "([0-9A-F]{16})"', blk); ty = re.search(r'\n?\t{5}type: "(\w+)"', blk)
        if i and ty: out.append((i.group(1), ty.group(1)))
    return out
def load_ledger(chapter):
    p = OUT + chapter + ".snbt"
    if not os.path.exists(p): return
    t = open(p, encoding="utf-8").read()
    used.update(ID_RE.findall(t))
    for blk in t.split("\n\t\t{\n")[1:]:
        qid = re.search(r'\n\t{3}id: "([0-9A-F]{16})"', blk); title = re.search(r'\n\t{3}title: "((?:[^"\\]|\\.)*)"', blk)
        if not (qid and title): continue
        def section(name):
            m = re.search(r"\n\t{3}" + name + r": \[\n(.*?)\n\t{3}\]", blk, re.S)
            return _entries(m.group(1)) if m else []
        LEDGER[(chapter, title.group(1).replace('\\"', '"'))] = {"id": qid.group(1), "tasks": section("tasks"), "rewards": section("rewards")}
for _c in ("campaign", "tips_and_tricks", "bounties"): load_ledger(_c)

rng = random.Random(20260909)
def mint():
    while True:
        i = "%016X" % rng.getrandbits(63)   # 63 bits -> leading digit 0-7, always positive
        if i not in used:
            used.add(i); return i
CHAPTER = None

# ---- snbt writer -------------------------------------------------------
def q(s): return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
class D:
    def __init__(self, v): self.v = v
class L:
    def __init__(self, v): self.v = v
def fmt(v, ind):
    t = "\t" * ind
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, D): return "%sd" % (("%.1f" % v.v) if float(v.v).is_integer() else repr(float(v.v)))
    if isinstance(v, L): return "%dL" % v.v
    if isinstance(v, int): return str(v)
    if isinstance(v, str): return q(v)
    if isinstance(v, list):
        if not v: return "[ ]"
        if all(isinstance(x, str) for x in v):
            return "[" + ", ".join(q(x) for x in v) + "]" if len(v) == 1 else "[\n" + "".join(t + "\t" + q(x) + "\n" for x in v) + t + "]"
        return "[\n" + "".join(t + "\t" + fmt(x, ind + 1) + "\n" for x in v) + t + "]"
    if isinstance(v, dict): return "{\n" + "".join(t + "\t" + k + ": " + fmt(v[k], ind + 1) + "\n" for k in sorted(v)) + t + "}"
    raise TypeError(v)

# ---- reward / task helpers (ids resolved inside quest()) -----------------
def r_item(item, count=1, rid=None):
    d = {"item": item, "type": "item"}
    if rid: d["id"] = rid
    if count != 1: d["count"] = count
    return d
def r_lvl(n, rid=None): return {**({"id": rid} if rid else {}), "type": "xp_levels", "xp_levels": n}
def r_xp(n, rid=None): return {**({"id": rid} if rid else {}), "type": "xp", "xp": n}
def t_check(tid=None): return {**({"id": tid} if tid else {}), "type": "checkmark"}
def t_item(item, tid=None): return {**({"id": tid} if tid else {}), "consume_items": False, "item": item, "type": "item"}
def t_kill(entity, n, tid=None): return {**({"id": tid} if tid else {}), "entity": entity, "type": "kill", "value": L(n)}
def t_obs(block, tid=None): return {**({"id": tid} if tid else {}), "observe_type": 0, "timer": L(0), "to_observe": block, "type": "observation"}
def t_struct(tag, tid=None): return {**({"id": tid} if tid else {}), "structure": tag, "type": "structure"}
def t_custom(tid): return {"id": tid, "type": "custom"}
SWORD = {"Count": 1, "id": "minecraft:netherite_sword", "tag": {"Damage": 0}}

def _resolve(objs, ledger_list):
    for i, o in enumerate(objs):
        explicit = o.get("id")
        if explicit and is_positive(explicit):
            used.add(explicit); continue
        if i < len(ledger_list) and ledger_list[i][1] == o["type"]:
            o["id"] = ledger_list[i][0]
        else:
            o["id"] = mint()

def quest(title, x, y, tasks, rewards, desc, qid=None, deps=(), icon=None, shape=None, size=None, subtitle=None, extra=None):
    led = LEDGER.get((CHAPTER, title), {"id": None, "tasks": [], "rewards": []})
    if not (qid and is_positive(qid)):
        qid = led["id"] or mint()
    used.add(qid)
    _resolve(tasks, led["tasks"]); _resolve(rewards, led["rewards"])
    d = {"id": qid, "title": title, "x": D(x), "y": D(y), "tasks": tasks, "rewards": rewards, "description": desc}
    if deps: d["dependencies"] = list(deps)
    if icon is not None: d["icon"] = icon
    if shape: d["shape"] = shape
    if size: d["size"] = D(size)
    if subtitle: d["subtitle"] = subtitle
    if extra: d.update(extra)
    return d

def panel(cx, cy, w, h, color):
    return {"alpha": 70, "color": color, "height": D(h), "image": "kubejs:textures/quests/panel.png",
            "rotation": D(0), "width": D(w), "x": D(cx), "y": D(cy)}

# ======================================================================
# CAMPAIGN
# ======================================================================
CHAPTER = "campaign"
M = MILESTONE_TASK_IDS
SP = dict(shape="rsquare", size=1.5)
Q = []

# ---- spine ----
S1 = quest("You're On Your Own", 0, 0, [t_check("3BF8DCAF2F4960C2")],
    [r_lvl(2, "63AE16AB9867B80D"), r_item("minecraft:torch", 16, "BE5F1A2DB7BE00D3")],
    ["Whoever held this post before you didn't make it, but they left the place standing, and that's not nothing. Everything you need is in this book; Tab opens it. Read the next few pages before you touch the horn."],
    qid="46AB9754465218CF", icon=SWORD, **SP)
S2 = quest("Borrowed Time", 2, 0, [t_check("42E75310C2F28FF9")],
    [r_lvl(2, "5B4213658A2A99F8"), r_item("minecraft:shield", 1, "F67B78E46E99A696")],
    ["The sword and armour you're wearing were theirs. Look close and the wear's already showing. They hold for five waves, then they crumble, and whatever you've found by then is what you fight with. Use them hard while you have them."],
    qid="70DA454A61DDC3A1", deps=[S1["id"]], icon="minecraft:clock", **SP)
S3 = quest("Find the Pedestal", 4, 0, [t_obs("supplementaries:pedestal")],
    [r_item("minecraft:iron_ingot", 4), r_lvl(2)],
    ["Walk up to the stone pedestal in the courtyard and look at it. That's the &ePedestal&r, and it's the only thing the horde wants: every wave mob paths straight for it, not for you. It has 300 health, shown on a bar whenever you're within 64 blocks, and a mob within reach hits it for its own attack damage. &cIf it reaches zero the waves stop and the run is over.&r",
     "It can be healed: right-click it holding a golden carrot for 10% back, or a nether star for a full heal. The item goes onto the stand and is used up."],
    deps=[S2["id"]], icon="supplementaries:pedestal", subtitle="Look at the pedestal in the courtyard", **SP)
S4 = quest("Sound the Horn", 6, 0, [t_custom(M["horn"])], [r_lvl(2)],
    ["Hold the &eWave Horn&r and right-click to call the next wave. Nothing comes until you do, with one catch: after each clear a timer starts, and when it runs out the wave comes on its own. About a minute and a half after wave 1, a little longer each wave, four minutes and up from wave 5. Use the gap to repair, restock and build. Then blow it."],
    deps=[S3["id"]], icon="kubejs:wave_horn", subtitle="Right-click the Wave Horn", **SP)
HORN2 = quest("Lost the Horn?", 6, -1.5, [t_check("2C829246152E3F8D")], [r_item("kubejs:wave_horn", 1, "B954E5DE3CCE5286")],
    ["Right-click the checkmark for a spare Wave Horn. It doesn't run out; claim it again whenever you lose one."],
    qid="B69DA4CE08B1C6A5", deps=[S4["id"]], icon="kubejs:wave_horn", size=0.75,
    extra={"can_repeat": "true", "repeat_cooldown": 60, "optional": True})
S5 = quest("Thin the Horde", 8, 0, [t_kill("minecraft:zombie", 5, "2FBB03E59B623145")],
    [r_lvl(3, "351F6384CED5BB12"), r_item("minecraft:iron_ingot", 3, "D962E29F0A8B927B")],
    ["Five plain zombies by your own hand; turret and trap kills don't count here (they do for the Bounties tab). Wave 1 is nine mobs: five zombies, three husks, one zombie villager. Enough to find out whether your gear holds."],
    qid="7F675AEBC7301832", deps=[S4["id"]], icon="minecraft:zombie_head", **SP)
S6 = quest("Wave One, Cleared", 10, 0, [t_custom(M["wave1"])], [r_item("bountybags:uncommon_loot_bag"), r_lvl(3)],
    ["Every mob down means the wave is cleared, the timer to the next one starts, and the border grows: 5 blocks a wave for waves 1 to 3, then 10, then 15, another 5 every three waves. More ground to hold and more ground to loot."],
    deps=[S5["id"]], icon="minecraft:iron_bars", subtitle="Completes on its own when wave 1 is cleared", **SP)
S7 = quest("Spoils of War", 12, 0, [t_item("bountybags:uncommon_loot_bag", "24986BBE1C6FBBCF")],
    [r_item("minecraft:emerald", 2, "F7DF023D7AD78BE4"), r_item("bountybags:uncommon_loot_bag", 2, "80F9C1D996680B95")],
    ["Any wave mob can drop a loot bag when it dies, and every one of them rolls the same odds: 20% for an &eUncommon&r bag, 6% Rare, 3% Epic, 2% Legendary. Tougher mobs don't carry better bags; they're just harder to kill. Kill count is what pays."],
    qid="3BFCD0E4AA8C5B36", deps=[S6["id"]], icon="bountybags:uncommon_loot_bag", subtitle="Pick up a loot bag", **SP)
S8 = quest("Open It", 14, 0, [t_check("4B770968EBD48DB3")],
    [r_lvl(3, "0532F9400886F2D7"), r_item("minecraft:iron_ingot", 2, "AB71671B6AE1AAD1"), r_item("bountybags:uncommon_loot_bag", 2, "AE85176DBD4A39E5")],
    ["Right-click a bag to open it. Uncommon bags carry iron, copper, redstone, coal, gunpowder, arrows and gold nuggets. Rare bags are where gold ingots, quartz, redstone blocks, iron blocks, obsidian and ender pearls come from, which is what the amulet and the Tier 2 recipes need. Every tier can carry &eShrapnel&r, the turret material. Open bags as you get them; they do nothing in your inventory."],
    qid="538A1BBC9A1B8EAC", deps=[S7["id"]], icon="minecraft:chest", **SP)
S9 = quest("Three Down", 16, 0, [t_custom(M["wave3"])], [r_item("bountybags:rare_loot_bag"), r_lvl(3)],
    ["Three waves in, the roster changes. Wave 4 brings the first &cBoomer&r and two Split Head Zombies; wave 5 the first Elites. Check Know Your Enemy above before you blow the horn, and spend what you've got: everything below this point on the tree is buildable now."],
    deps=[S8["id"]], icon="mutantszombies:split_head_zombie_spawn_egg", subtitle="Completes on its own when wave 3 is cleared", **SP)
S10 = quest("It's Up to You Now", 18, 0, [t_custom(M["gear"])],
    [r_item("minecraft:golden_apple", 1, "957C394328E80099"), r_item("bountybags:rare_loot_bag"), r_lvl(5)],
    ["Five waves. That's where whoever wore this gear before you stopped, and it's where the gear stops too: the moment wave 5 clears, the sword and armour turn to rust in your hands. From here you fight with what you've made and what you've looted. The gaps between waves stretch to four minutes and more now. Use every one of them."],
    qid="03C4E700B07CBC15", deps=[S9["id"]], icon=SWORD, subtitle="Completes on its own when wave 5 is cleared", **SP)
S11 = quest("The Last Written Wave", 20, 0, [t_custom(M["wave8"])],
    [r_item("bountybags:epic_loot_bag"), r_item("waystones:waystone"), r_lvl(5)],
    ["Wave 8 is the last one anyone planned: a Crawler on the walls, a Mutant Brute at the gate, a Demolition Zombie throwing TNT. After this the waves don't stop and don't repeat. Every one past 8 is an endless level, and each level adds 8% health, 5% damage and 2% speed on top of the last, with the heavy mobs weighted in more as it climbs.",
     "Every fifth wave a supply crate drops near the base with a map marker on it: a Legendary bag, netherite scrap, a diamond block."],
    deps=[S10["id"]], icon="minecraft:map", subtitle="Completes on its own when wave 8 is cleared", **SP)
S12 = quest("The Behemoth", 22, 0, [t_custom(M["boss"])], [r_item("bountybags:legendary_loot_bag"), r_lvl(8)],
    ["Every tenth wave brings a boss on top of the wave. &cThe Behemoth&r is a Mutant Brute with 600 health, 30 damage a hit and full netherite, and you'll hear it coming. It drops a &eTotem of Undying&r when it dies, and that's the one reliable source of one. The same wave drops a supply crate."],
    deps=[S11["id"]], icon="mutantszombies:mutant_brute_spawn_egg", subtitle="Completes when a boss dies", **SP)
S13 = quest("No Ceiling", 24, 0, [t_custom(M["wave15"])], [r_item("bountybags:legendary_loot_bag")],
    ["Fifteen. Nobody's diary goes this far. There's no finale waiting and no ending to reach, just the next wave, bigger than the last. Whatever you've built by now is what you're taking into it."],
    deps=[S12["id"]], icon="minecraft:nether_star", subtitle="Completes on its own when wave 15 is cleared", **SP)
Q += [S1, S2, S3, S4, HORN2, S5, S6, S7, S8, S9, S10, S11, S12, S13]

# ---- Beyond the Wall (pentagon, y=-3) ----
PE = dict(shape="pentagon")
B1 = quest("Not Just Jewelry", 16, -3, [t_item("kubejs:amulet", "5C0E7A34D2F9B168")],
    [r_lvl(2, "1F84B26D9A5E307C"), r_item("minecraft:golden_carrot", 4, "B95D6FAE3CEEEF51")],
    ["Eight gold ingots in a ring make the &eAmulet&r. Gold comes as ingots from Rare bags or nuggets from Uncommon ones, nine to an ingot. It goes in the Curios necklace slot in your inventory, not an armour slot."],
    qid="7D3A5F912E6C0B48", deps=[S9["id"]], icon="kubejs:amulet", subtitle="8 gold ingots in a ring", **PE)
B2 = quest("Wear It", 18, -3, [t_custom(M["amuletWorn"])], [r_lvl(2)],
    ["While it's on you: Regeneration, and Resistance, which takes 20% off every hit. And as long as the amulet is anywhere but the pedestal, the border is a wall: step over the line and it shoves you back."],
    deps=[B1["id"]], icon="minecraft:golden_apple", subtitle="Put the amulet in the Curios slot", **PE)
B3 = quest("Leave It Behind", 20, -3, [t_custom(M["amuletOnPedestal"])], [r_item("minecraft:ender_pearl", 4, "AFAF72CBF04F1A35")],
    ["Right-click the pedestal holding the amulet to set it down. You lose the buffs and the border opens: you can walk out. Right-click the pedestal again to take it back. The horde targets the pedestal either way; what changes is whether you're inside the wall with it."],
    qid="4B8F2D6A93E7C051", deps=[B2["id"]], icon="supplementaries:pedestal", subtitle="Set the amulet on the pedestal", **PE)
B4 = quest("Past the Line", 22, -3, [t_struct("#kubejs:ruins")], [r_item("bountybags:rare_loot_bag"), r_lvl(3)],
    ["Stand inside any ruin, house, tower or city block out past the border. Chest loot out there scales with distance from the base, so the further you go the better the haul, and the longer the pedestal stands on its own."],
    deps=[B3["id"]], icon="minecraft:cracked_stone_bricks", subtitle="Stand inside any ruin beyond the border", **PE)
B5 = quest("A Stone That Remembers", 24, -3, [t_item("waystones:waystone", "0536AD0E341D2F75")],
    [r_lvl(2, "4B2522E0A3B82AA9"), r_item("minecraft:ender_pearl", 2, "3FF89D8BED4DE65A")],
    ["There's a Waystone in the courtyard. Craft another (recipe in JEI, press R on it), place it wherever you're looting, and right-click either one to jump between them."],
    qid="216966530DE6E3DB", deps=[B4["id"]], icon="waystones:waystone", subtitle="Craft a Waystone", **PE)
Q += [B1, B2, B3, B4, B5]

# ---- Know Your Enemy (diamond, y=-6, x = 6 + 1.5*i) ----
E = []
def enemy(i, title, egg, entity, n, rewards, desc, prev):
    e = quest(title, 6 + 1.5 * i, -6, [t_kill(entity, n)], rewards, [desc],
              deps=[prev], icon=egg, shape="diamond", subtitle=("Kill %d" % n) if n > 1 else "Kill one")
    E.append(e)
    return e["id"]
p = S5["id"]
p = enemy(0, "Zombie", "minecraft:zombie_spawn_egg", "minecraft:zombie", 3, [r_item("minecraft:iron_ingot", 2), r_lvl(1)],
    "Twenty health, hits for 3. The floor of the whole roster, and most of wave 1.", p)
p = enemy(1, "Husk", "minecraft:husk_spawn_egg", "minecraft:husk", 3, [r_item("minecraft:iron_ingot", 2), r_lvl(1)],
    "A zombie that gives you Hunger on hit. Same health, same speed.", p)
p = enemy(2, "Zombie Villager", "minecraft:zombie_villager_spawn_egg", "minecraft:zombie_villager", 3, [r_item("minecraft:iron_ingot", 2), r_lvl(1)],
    "A zombie in villager clothes. Nothing special about it, and no, you can't cure one mid-wave.", p)
p = enemy(3, "Drowned", "minecraft:drowned_spawn_egg", "minecraft:drowned", 3, [r_item("minecraft:iron_ingot", 2), r_lvl(1)],
    "From wave 2. Some carry tridents and throw them; kill those first.", p)
p = enemy(4, "Mutant Zombie", "mutantszombies:mutant_zombie_spawn_egg", "mutantszombies:mutant_zombie", 1, [r_item("bountybags:uncommon_loot_bag"), r_lvl(2)],
    "From wave 2. 24 health, 5 damage, and quicker than a zombie. The first step up.", p)
p = enemy(5, "Blister Zombie", "mutantszombies:blister_zombie_spawn_egg", "mutantszombies:blister_zombie", 1, [r_lvl(2)],
    "From wave 3. Same 24 health and 5 damage as the Mutant Zombie; it just swings with the other arm.", p)
p = enemy(6, "Split Head Zombie", "mutantszombies:split_head_zombie_spawn_egg", "mutantszombies:split_head_zombie", 1, [r_item("bountybags:rare_loot_bag"), r_lvl(2)],
    "From wave 4, again in wave 6. Slow, but it hits for 6.", p)
p = enemy(7, "Boomer Zombie", "zombiesmore:boomer_zombie_spawn_egg", "zombiesmore:boomer_zombie", 1, [r_item("bountybags:epic_loot_bag"), r_lvl(3)],
    "From wave 4. Slow, 20 health. &cKill it or let it touch you and it turns into a charged Boomer that can't be hurt and blows four seconds later&r: blast, poison cloud, and it takes blocks with it. Shoot it early, then get clear.", p)
p = enemy(8, "Elite Zombie", "undeadnights:elite_zombie_spawn_egg", "undeadnights:elite_zombie", 1, [r_lvl(3)],
    "From wave 5, in pairs. 5 armour, hits for 6, quicker than a zombie and slower than the horde.", p)
p = enemy(9, "Horde Zombie", "undeadnights:horde_zombie_spawn_egg", "undeadnights:horde_zombie", 3, [r_lvl(3)],
    "From wave 6, in fours. Fast, 4 armour, and they climb over each other, so a wall one block higher than the pile isn't a wall.", p)
p = enemy(10, "Crawler", "mutantszombies:crawler_spawn_egg", "mutantszombies:crawler", 1, [r_item("bountybags:epic_loot_bag"), r_lvl(4)],
    "Wave 8. Six health and dies to anything, but it's fast and it climbs straight up walls. Turrets handle it better than you do.", p)
p = enemy(11, "Mutant Brute", "mutantszombies:mutant_brute_spawn_egg", "mutantszombies:mutant_brute", 1, [r_item("bountybags:epic_loot_bag"), r_lvl(4)],
    "Wave 8, then the endless waves. 120 health, 18 damage, 18 armour, can't be knocked back, and it smashes trees in its way. Barbed wire and bear traps buy time; turrets finish it.", p)
p = enemy(12, "Demolition Zombie", "undeadnights:demolition_zombie_spawn_egg", "undeadnights:demolition_zombie", 1, [r_item("bountybags:epic_loot_bag"), r_lvl(4)],
    "Wave 8. It carries TNT, lights it and throws it, and &cthe blast breaks blocks, your walls included&r. Kill it at range.", p)
p = enemy(13, "Zombie Brute", "mutantszombies:zombie_brute_spawn_egg", "mutantszombies:zombie_brute", 1, [r_lvl(4)],
    "Endless waves only, from level 5. 100 health, 16 damage, 16 armour, knockback-immune, breaks trees.", p)
p = enemy(14, "Rotten Mutant", "mutantszombies:rotten_mutant_spawn_egg", "mutantszombies:rotten_mutant", 1, [r_lvl(4)],
    "Endless waves only. 30 health, hits for 7, slow.", p)
Q += E

# ---- Tier 1 (hexagon, y=+3) ----
HX = dict(shape="hexagon")
T1a = quest("Better Than Nothing", 14, 3, [t_item("simply_traps:spike_trap", "1D65A5F1829C7DD2")],
    [r_lvl(1, "5594A3487B739F3D"), r_item("minecraft:iron_ingot", 2, "6FCD715A4DB932C5")],
    ["Anything that walks over a &eSpike Trap&r takes 2 damage a step, mobs and you alike. The cheapest defence in the pack. Line the approach to the pedestal with them."],
    qid="67A7BF98D2C077DE", deps=[S8["id"]], icon="simply_traps:spike_trap", subtitle="4 sticks + 1 iron ingot", **HX)
T1b = quest("Slow Them Down", 16, 3, [t_item("simply_traps:slime_trap")], [r_item("minecraft:iron_ingot", 2), r_lvl(1)],
    ["A &eSlime Trap&r drags anything crossing it down to a crawl. No damage on its own, so pair it with spikes or wire, or put it where a turret can see it."],
    deps=[T1a["id"]], icon="simply_traps:slime_trap", subtitle="2 sticks + 1 smooth stone slab", **HX)
T1c = quest("Something Crueler", 18, 3, [t_item("vds_bear_traps:bear_trap_open", "5D7488609EA3E850")],
    [r_lvl(2, "6B2E8A0C41D5F937"), r_item("minecraft:redstone", 8, "44D5604B84263E75")],
    ["A &eBear Trap&r snaps shut on whatever steps in it, hurts it and pins it, then reopens on its own. In front of the pedestal a held mob is a free kill."],
    qid="3F6D91E4A2C7B850", deps=[T1b["id"]], icon="vds_bear_traps:bear_trap_open", subtitle="1 iron ingot + 1 stone pressure plate", **HX)
T1d = quest("Turn the Crank", 20, 3, [t_obs("createaddition:rolling_mill")],
    [r_xp(10, "2F71CD6D28876113"), r_item("create:hand_crank", 1, "C98B0A210AD669D6")],
    ["The house has a Mechanical Press and a &eRolling Mill&r already set up, with an empty shaft where a Hand Crank goes. Here's one. Put it on and hold right-click to turn it: the mill rolls iron ingots into iron wire."],
    qid="30DB900D8BD39277", deps=[T1c["id"]], icon="create:hand_crank", subtitle="Look at the Rolling Mill in the house", **HX)
T1e = quest("Sharpened Scrap", 22, 3, [t_item("createaddition:barbed_wire", "655A19AD37263BC9")],
    [r_xp(10, "0892955D880F0E2C"), r_item("minecraft:iron_ingot", 4, "2E48F2F054CCB1FE")],
    ["Four iron wire in a diamond make two &eBarbed Wire&r. Anything inside it takes damage and moves at a quarter speed. Two rows in front of the pedestal are worth more than a wall."],
    qid="1454951A7FB14A26", deps=[T1d["id"]], icon="createaddition:barbed_wire", subtitle="4 iron wire, diamond shape, makes 2", **HX)
Q += [T1a, T1b, T1c, T1d, T1e]

# ---- Tier 2 (hexagon, y=+6 / +7.5) ----
ATD = "advanced_tower_defense_mod:"
T2a = quest("Waste Not", 16, 6, [t_item("itemcollectors:basic_collector", "26CCD7A04ABD1646")],
    [r_lvl(2, "50CA0E4584F66F83"), r_item("minecraft:iron_ingot", 4, "7093654BA542DD9B")],
    ["Put an &eItem Collector&r on top of a chest and it pulls every dropped item within 5 blocks into that chest; right-click it to shrink the range. All three materials come out of Rare bags, so this is your first Tier 2 build."],
    qid="573EEB3757B78B97", deps=[S9["id"]], icon="itemcollectors:basic_collector", subtitle="1 quartz + 1 redstone block + 3 iron blocks", **HX)
T2b = quest("Read the Manual", 18, 6, [t_item(ATD + "tech_tablet_mechanics")], [r_item("kubejs:shrapnel", 2), r_lvl(2)],
    ["The &eTech Tablet&r unlocks the turret chain; every part below needs it or something made from it. Shrapnel drops from loot bags of every tier."],
    deps=[T2a["id"]], icon=ATD + "tech_tablet_mechanics", subtitle="Paper, book, compass, redstone, iron nuggets, 1 Shrapnel", **HX)
T2c = quest("Wind It Up", 20, 6, [t_item(ATD + "winding_mechanism")], [r_lvl(2)],
    ["The &eWinding Mechanism&r drives every turret base and the workbench itself. The Speed Module is SecurityCraft's, the Springs are the turret mod's own; both recipes are in JEI."],
    deps=[T2b["id"]], icon=ATD + "winding_mechanism", subtitle="2 Springs, clock, compass, lever, tripwire hook, Speed Module, the tablet", **HX)
T2d = quest("The Workbench", 22, 6, [t_item(ATD + "t_0_turret_workbench")], [r_lvl(3)],
    ["Turrets aren't made in a crafting table. Place the &eTurret Workbench&r, put a Blueprint in its top slot, fill the six material slots it asks for and press Assemble."],
    deps=[T2c["id"]], icon=ATD + "t_0_turret_workbench", subtitle="Anvil, paper, smithing table, winding mechanism, stripped oak log", **HX)
T2e = quest("Musket Blueprint", 24, 6, [t_item(ATD + "blueprint_musket_turret")], [r_lvl(2)],
    ["The Musket Sentry's blueprint. It goes in the workbench's blueprint slot."],
    deps=[T2d["id"]], icon=ATD + "blueprint_musket_turret", subtitle="4 paper, flint, gunpowder, iron nugget, 2 Shrapnel", **HX)
T2f = quest("A Base to Stand On", 26, 6, [t_item(ATD + "turret_base_t_0")], [r_lvl(3)],
    ["The AI-controlled &eTurret Base&r. Place it where the turret should stand, then set the assembled turret head on top. The Smart Module is SecurityCraft's, the AI Chip is the turret mod's."],
    deps=[T2e["id"]], icon=ATD + "turret_base_t_0", subtitle="Piston, barrel, button, spring, tablet, winding mechanism, Smart Module, AI Chip", **HX)
T2g = quest("Beyond the Bow", 28, 6, [t_item(ATD + "turret_head_t_0_mushket", "CEAF7D7BDF085913")],
    [r_lvl(3, "E35F7199341D70D3"), r_item(ATD + "mushket_shell", 8, "13621461570D6AD1")],
    ["The &eMusket Sentry&r picks its own targets and fires buckshot at anything in range. It eats Musket Buckshot, so keep the base stocked. First thing in the pack that guards the pedestal while you're somewhere else."],
    qid="503260000FFBD462", deps=[T2f["id"]], icon=ATD + "turret_head_t_0_mushket", subtitle="8 iron, 1 Wooden Parts, 4 Stone Parts + blueprint, at the workbench", **HX)
T2h = quest("Anvil Blueprint", 24, 7.5, [t_item(ATD + "blueprint_anvil_launcher")], [r_lvl(2)],
    ["The Anvil Launcher's blueprint. Costs more Shrapnel than the musket's."],
    deps=[T2d["id"]], icon=ATD + "blueprint_anvil_launcher", subtitle="3 paper, chain, redstone, iron nugget, 4 Shrapnel", **HX)
T2i = quest("Manual Base", 26, 7.5, [t_item(ATD + "manual_turret_base_t_0")], [r_lvl(2)],
    ["The &eManual Base&r has no AI: you set the target coordinates on it yourself. That's what the launcher wants."],
    deps=[T2h["id"]], icon=ATD + "manual_turret_base_t_0", subtitle="Same as the AI base, with redstone + a Redstone Module instead", **HX)
T2j = quest("Anvils From Above", 28, 7.5, [t_item(ATD + "turret_head_t_0_anvil_launcher", "CF4EFDBE43242D23")],
    [r_lvl(3, "DB2924EE65942CD9"), r_item("kubejs:shrapnel", 4, "93D96EE13520A11A")],
    ["Set a coordinate on the manual base and the &eAnvil Launcher&r drops an anvil on it from the sky: 60 damage to whatever's standing there. Slow and aimed by hand, and it kills a Mutant Brute in two."],
    qid="AD122F38A7F9E1FE", deps=[T2i["id"]], icon=ATD + "turret_head_t_0_anvil_launcher", subtitle="3 iron, 7 Wooden Parts, 14 Stone Parts + blueprint, at the workbench", **HX)
Q += [T2a, T2b, T2c, T2d, T2e, T2f, T2g, T2h, T2i, T2j]

# ---- Tier 3 (hexagon, y=+9 / +10.5) ----
IE = "immersiveengineering:"
T3a = quest("Room to Grow", 18, 9, [t_item("sophisticatedstorage:barrel", "52019608CE1659F9")],
    [r_lvl(2, "9133C9FE5D5DC56D"), r_item("minecraft:iron_ingot", 4, "F6C839696611D160")],
    ["A Sophisticated &eBarrel&r holds more than a chest and takes upgrades in place. No power needed. Build the storage before the power, because the power chain is long."],
    qid="F82126526999A560", deps=[S10["id"]], icon="sophisticatedstorage:barrel", subtitle="Planks, slabs and a lever", **HX)
T3b = quest("The Engineer's Manual", 20, 9, [t_item(IE + "manual")], [r_lvl(2)],
    ["Immersive Engineering has its own book, and you'll need it: every multiblock's layout is in there with a ghost preview you can build against."],
    deps=[T3a["id"]], icon=IE + "manual", subtitle="Book + lever", **HX)
T3c = quest("Wired Different", 22, 9, [t_obs(IE + "diesel_generator")],
    [r_lvl(3, "109E721603F25681"), r_item("minecraft:copper_ingot", 4, "FBBFB87F39FCBED8")],
    ["The &eDiesel Generator&r is 3 wide, 3 tall and 5 long: 13 Heavy Engineering Blocks, 9 Radiators, 6 Steel Scaffolding, 5 Fluid Pipes, 4 Generator blocks and 1 Redstone Engineering Block, formed by right-clicking it with the Engineer's Hammer. It burns Biodiesel, which means a Squeezer, a Fermenter and a Refinery first. This is the deep end of the pack."],
    qid="4B07331734543EB4", deps=[T3b["id"]], icon=IE + "diesel_generator", subtitle="Look at a formed Diesel Generator", **HX)
T3d = quest("No Cables Needed", 24, 9, [t_item("fluxnetworks:flux_plug", "6930B743A3CDA08B")],
    [r_lvl(2, "85F7215E77AB0D42"), r_item("minecraft:redstone", 8, "F53E61C8EF2A7523")],
    ["A &eFlux Plug&r takes power in, a Flux Point puts it out, and they share it over a named network with no cable between them. Plug at the generator, Point at the machine."],
    qid="C7E75E99F3A7B653", deps=[T3c["id"]], icon="fluxnetworks:flux_plug", subtitle="Recipe in JEI", **HX)
T3e = quest("Sparks in the Dark", 26, 9, [t_item(IE + "tesla_coil", "09C28999F88F8224")],
    [r_lvl(4, "9B1C9955CE1A068C"), r_item("minecraft:lightning_rod", 1, "B511A7783688070C")],
    ["Powered, the &eTesla Coil&r picks one target within 6 blocks about every second and a half, hits it for 6 and stuns it. Put it where the horde bunches up."],
    qid="04DC756B047A09D4", deps=[T3d["id"]], icon=IE + "tesla_coil", subtitle="HV Capacitor, MV Coil, 3 aluminium plates, advanced electronics, iron component", **HX)
T3f = quest("The Grid", 28, 9, [t_item("refinedstorage:controller", "A6789EF8AE0A3FA1")],
    [r_lvl(3, "4B4C22EF7409EFF4"), r_item("minecraft:iron_ingot", 4, "4C6F2A7BFB0E2D46")],
    ["Refined Storage: a &eController&r, a Disk Drive and a Grid on one power line, and every chest becomes one searchable inventory. Quartz Enriched Iron is the base material."],
    qid="C5A98E14436508F8", deps=[T3e["id"]], icon="refinedstorage:controller", subtitle="Quartz Enriched Iron, processors, a machine casing", **HX)
T3g = quest("Turn Up the Heat", 20, 10.5, [t_item("create:encased_fan")],
    [r_xp(10, "95479A859DF0BA7F"), r_item("create:nozzle", 1, "CB59BF2C503D4EB3")],
    ["An &eEncased Fan&r blowing through lava is a flamethrower: 4 damage and 10 seconds of fire to anything in the stream, refreshed every tick it stays in. A Nozzle on the fan's output turns the straight stream into a short burst all around it. Any rotation works, a Hand Crank included, so this costs no power at all."],
    qid="5F728109F9913045", deps=[T3a["id"]], icon="create:nozzle", subtitle="Shaft + Andesite Casing + Propeller", **HX)
Q += [T3a, T3b, T3c, T3d, T3e, T3f, T3g]

campaign = {
    "default_hide_dependency_lines": False,
    "default_quest_shape": "",
    "filename": "campaign",
    "group": "",
    "icon": "minecraft:book",
    "id": "1178FD42CF9984A2",
    "images": [
        panel(16.5, -6, 24.5, 2.6, 0x5A0F0F),   # Know Your Enemy, x 6..27
        panel(20, -3, 11, 2.4, 0x4A2A6A),       # Beyond the Wall, x 16..24
        panel(18, 3, 11, 2.4, 0x2E7D32),        # Tier 1, x 14..22
        panel(22, 6.75, 15, 4.2, 0xB8860B),     # Tier 2, x 16..28, rows 6 / 7.5
        panel(23, 9.75, 13, 4.2, 0x8B1A1A),     # Tier 3, x 18..28, rows 9 / 10.5
    ],
    "order_index": 0,
    "progression_mode": "flexible",
    "quest_links": [],
    "quests": Q,
    "subtitle": ["Hold the pedestal. The waves don't stop."],
    "title": "Campaign",
}

# ======================================================================
# TIPS & TRICKS (same content; keycap layout)
# chapter id was A75528A8A9B6E2C2 - negative, so FTB re-minted it on every load; 3CB264691BC5959E is the positive replacement
# ======================================================================
CHAPTER = "tips_and_tricks"
def tip(title, desc, icon, qid, tid, rid, x, y, shape, lvl=1):
    return quest(title, x, y, [t_check(tid)], [r_lvl(lvl, rid)], [desc], qid=qid, icon=icon, shape=shape)
tips = [
    tip("View a Recipe", "Hover an item and press R to see a JEI recipe for it.", "minecraft:crafting_table", "E2C952889AA1DD0D", "F86B979C88ED616B", "223B910590606981", 1.5, 0, "rsquare"),
    tip("See What It's Used For", "Hover an item and press U to see what it's used for.", "minecraft:furnace", "94508327441E80E8", "62DDF61B7C4B3FDB", "A4441C569CD511AA", 3, 0, "rsquare"),
    tip("Open the Quest Book", "Press Tab to open this quest book, any time.", "minecraft:book", "A9179F342904A400", "A9C8750C2C150EAF", "715333AC29EA6276", -0.5, 1.5, "rsquare"),
    tip("Bookmark an Item", "Hover an item and press A to bookmark it - pins it to its own row for quick access later, no more digging through the full list for something you use constantly.", "minecraft:nether_star", "DF7085CA374CB1CB", "AFE9438C0F52C2F0", "DA1AF05C49822249", 1, 1.5, "rsquare"),
    tip("Zoom In", "Press Z to zoom in - Just Zoom's own default keybind, no config needed.", "minecraft:spyglass", "FB0521968FB8F218", "DC5D8B14A89AF0D7", "F4E268155D151F86", 0.5, 3, "rsquare"),
    tip("Open the World Map", "Press M to open the full world map.", "minecraft:map", "6A0B7CF30D95AD6B", "10A450115B33F714", "E0DBC00CBB939082", 3.5, 3, "rsquare"),
    tip("Auto-Sort a Container", "Middle-click a container to auto-sort its items into it.", "minecraft:chest", "3A3562742EB7477D", "E6F41D4490F1114C", "ECD6C3B600572E91", 7, 0, "circle"),
    tip("Look at Anything", "Just look at a block or mob - no keybind needed, live info shows up on its own.", "minecraft:spider_eye", "28BF317932C2A7C3", "0ADF201F7BB32D49", "DEFA43399D34C943", 8.5, 0, "circle"),
    tip("Open a Loot Bag", "Right-click a loot bag to open it.", "bountybags:legendary_loot_bag", "3A7685999BBC71CB", "26BDCD4E3CD8666B", "EE85A8F5CDD77D51", 7, 1.5, "circle"),
    tip("Find the Curios Slot", "Open your inventory and find the Curios accessory slot - that's where the amulet goes, not the armor slots.", "minecraft:emerald", "DF78BEC33DF4093E", "6AD2A5FAC4D469F2", "91F5DDD57046D697", 8.5, 1.5, "circle"),
    tip("Use a Waystone", "Set a Waystone, then teleport back to it from any other Waystone once unlocked.", "minecraft:ender_pearl", "1F9FC168B58483E0", "5EBEC728F98A85AB", "C090EF041EBBE7B9", 7, 3, "circle"),
    tip("Reach Further", "That crafting table by the furnace reaches further than it looks - it pulls from any chest or barrel touching it, right there in the crafting grid. No wiring, nothing to switch on. Build your stash around it instead of hauling it all to one spot.", "craftingstation:crafting_station", "AE46C30DC9845EDD", "18A67B1DB7344753", "ACB049683F137722", 8.5, 3, "circle", lvl=2),
]
tips_chapter = {
    "default_hide_dependency_lines": False, "default_quest_shape": "", "filename": "tips_and_tricks", "group": "",
    "icon": "minecraft:knowledge_book", "id": "3CB264691BC5959E", "order_index": 1, "progression_mode": "flexible",
    "quest_links": [], "quests": tips, "subtitle": ["Keys and habits worth knowing"], "title": "Tips and Tricks",
}

# ======================================================================
# BOUNTIES (same tasks/rewards; chained + restyled)
# ======================================================================
CHAPTER = "bounties"
def bounty(title, desc, icon, qid, tid, maxp, rewards, x, size, shape, deps, extra=None):
    return quest(title, x, 0, [{"id": tid, "max_progress": L(maxp), "type": "custom"}], rewards, [desc],
                 qid=qid, deps=deps, icon=icon, shape=shape, size=size, extra=extra)
b1 = bounty("First Blood", "Every hostile you put down counts toward this, not just wave kills - turrets and traps get credit too. Twenty-five down. Just the start.",
    "minecraft:rotten_flesh", "B1824D758BD5259D", "42F2080CC88FFF1F", 25, [r_lvl(5, "0B03B6486BCDFA0A"), r_item("bountybags:uncommon_loot_bag", 1, "CF8DFC7225F517C0")], 0, 1.0, "diamond", [])
b2 = bounty("Exterminator", "A hundred kills. The horde doesn't get thinner, but your aim is getting better.",
    "minecraft:iron_sword", "730D290220164ACC", "A690E47C2C2FFDB5", 100, [r_lvl(10, "02ED631B6C61EDFA"), r_item("bountybags:uncommon_loot_bag", 2, "0E510FEF00F269EE")], 2, 1.25, "diamond", [b1["id"]])
b3 = bounty("Culling", "Three hundred. This stopped being self-defense a while ago.",
    "minecraft:diamond_sword", "C7A7064EA80C63C1", "57C0DB55E9655079", 300, [r_lvl(15, "DBD0BD27F9A2AE98"), r_item("bountybags:rare_loot_bag", 2, "4F0F9E11439DD724")], 4.25, 1.5, "diamond", [b2["id"]])
b4 = bounty("Reaper", "Seven hundred fifty kills. Whatever is still coming at you, you're built for it now.",
    "minecraft:netherite_sword", "716E054554316AE5", "81F132C101C25BDA", 750, [r_lvl(20, "7F52A5324A25C675"), r_item("bountybags:epic_loot_bag", 1, "E20C2DD434AA49FD"), r_item("minecraft:golden_apple", 1, "82AFACFF977AA3F0")], 6.75, 1.75, "diamond", [b3["id"]])
b5 = bounty("Zombie Masher", "Fifteen hundred kills, and counting. There's no ceiling on this one - claim it again every fifteen hundred after, for as long as they keep coming.",
    "bountybags:legendary_loot_bag", "6C33E795D76D13CF", "1355429CD45AF725", 1500, [r_item("bountybags:legendary_loot_bag", 1, "0FDBC49878804E0D")], 9.5, 2.0, "gear", [b4["id"]],
    extra={"can_repeat": "true", "repeat_cooldown": 1})
bounties_chapter = {
    "default_hide_dependency_lines": False, "default_quest_shape": "", "filename": "bounties", "group": "",
    "icon": "bountybags:legendary_loot_bag", "id": "32583EA8E824D51C", "order_index": 2, "progression_mode": "flexible",
    "quest_links": [], "quests": [b1, b2, b3, b4, b5], "subtitle": ["Every kill counts, wave or not"], "title": "Bounties",
}

# ---- write + checks ------------------------------------------------------
if __name__ == "__main__":
    texts = {}
    for name, ch in (("campaign", campaign), ("tips_and_tricks", tips_chapter), ("bounties", bounties_chapter)):
        txt = fmt(ch, 0) + "\n"
        texts[name] = txt
    alldefs = sum((re.findall(r'^\s*id: "([0-9A-F]{16})"', t, re.M) for t in texts.values()), [])
    assert len(alldefs) == len(set(alldefs)), "duplicate id definition"
    neg = [i for i in alldefs if not is_positive(i)]
    assert not neg, "negative ids emitted: %s" % neg
    deps = re.findall(r'dependencies: \["([0-9A-F]{16})"\]', "\n".join(texts.values()))
    missing = [d for d in deps if d not in alldefs]
    assert not missing, "unresolved dependencies: %s" % missing
    for name, txt in texts.items():
        open(OUT + name + ".snbt", "w", encoding="utf-8", newline="\n").write(txt)
        print("%s: %d quests, %d ids" % (name, txt.count("\n\t\t{\n"), len(re.findall(r'^\s*id: "', txt, re.M))))
    print("milestone task ids:", MILESTONE_TASK_IDS)
