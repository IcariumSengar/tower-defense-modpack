"""Quest book v4 builder (Phase 1, 2026-10-05).

Rebuilds pack/config/ftbquests/quests/chapters/*.snbt and reward_tables/ from
the spec below. Every quest that already exists is matched by its current
title (`old`), and keeps its quest id, task ids and, where the reward type is
unchanged, its reward ids, so quest_milestones.js and bounty_kills.js keep
working. New objects get ids from a hash of their key, with the first hex
digit forced to 0-7 (FTB Quests 2001.4.22 re-mints ids starting 8-F).

Fields left out of a spec entry are copied from the existing quest, so most
text that is already right stays byte-identical.

Run from the repo root:  python tools/quest_book/build_v4.py
Spec: docs/FEATURES.md "Quest book v4 plan (2026-10-05)".
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QDIR = os.path.join(ROOT, 'pack', 'config', 'ftbquests', 'quests')


# --------------------------------------------------------------------------
# SNBT read / write
# --------------------------------------------------------------------------
class D(float):
    """A double, written with the d suffix."""


class L(int):
    """A long, written with the L suffix."""


class _P:
    def __init__(self, s):
        self.s, self.i = s, 0

    def ws(self):
        while self.i < len(self.s) and self.s[self.i] in ' \t\r\n,':
            self.i += 1

    def val(self):
        self.ws()
        c = self.s[self.i]
        if c == '{':
            return self.obj()
        if c == '[':
            return self.arr()
        if c in '"\'':
            return self.string()
        return self.atom()

    def obj(self):
        self.i += 1
        d = {}
        while True:
            self.ws()
            if self.s[self.i] == '}':
                self.i += 1
                return d
            if self.s[self.i] in '"\'':
                k = self.string()
            else:
                m = re.compile(r'[A-Za-z0-9_\-.+]+').match(self.s, self.i)
                k, self.i = m.group(0), m.end()
            self.ws()
            self.i += 1  # ':'
            d[k] = self.val()

    def arr(self):
        self.i += 1
        self.ws()
        m = re.compile(r'[BIL];').match(self.s, self.i)
        if m:
            self.i = m.end()
        out = []
        while True:
            self.ws()
            if self.s[self.i] == ']':
                self.i += 1
                return out
            out.append(self.val())

    def string(self):
        q = self.s[self.i]
        self.i += 1
        buf = []
        while True:
            c = self.s[self.i]
            if c == '\\':
                buf.append(self.s[self.i + 1])
                self.i += 2
                continue
            if c == q:
                self.i += 1
                return ''.join(buf)
            buf.append(c)
            self.i += 1

    def atom(self):
        m = re.compile(r'[^\s,\]\}]+').match(self.s, self.i)
        t = m.group(0)
        self.i = m.end()
        if t in ('true', 'false'):
            return t == 'true'
        mm = re.fullmatch(r'(-?[0-9.]+)([dDfFbBsSlL]?)', t)
        if mm:
            num, suf = mm.group(1), mm.group(2).lower()
            if suf == 'd' or (suf == '' and '.' in num):
                return D(float(num))
            if suf == 'l':
                return L(int(num))
            return int(num)
        return t


def load(path):
    with open(path, encoding='utf-8') as f:
        return _P(f.read()).val()


def _q(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def fmt(v, ind):
    t = '\t'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, D):
        r = repr(float(v))
        return r + 'd'
    if isinstance(v, L):
        return f'{int(v)}L'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(v) + 'd'
    if isinstance(v, str):
        return _q(v)
    if isinstance(v, dict):
        if not v:
            return '{ }'
        lines = [f'{t * (ind + 1)}{k}: {fmt(v[k], ind + 1)}' for k in sorted(v)]
        return '{\n' + '\n'.join(lines) + '\n' + t * ind + '}'
    if isinstance(v, list):
        if not v:
            return '[ ]'
        if all(isinstance(x, str) for x in v):
            if len(v) == 1:
                return '[' + _q(v[0]) + ']'
            return '[\n' + '\n'.join(t * (ind + 1) + _q(x) for x in v) + '\n' + t * ind + ']'
        return '[\n' + '\n'.join(t * (ind + 1) + fmt(x, ind + 1) for x in v) + '\n' + t * ind + ']'
    raise TypeError(repr(v))


def dump(obj):
    return fmt(obj, 0) + '\n'


# --------------------------------------------------------------------------
# ids
# --------------------------------------------------------------------------
USED = set()


def mint(key):
    h = hashlib.sha1(('td-quests-v4:' + key).encode()).hexdigest().upper()
    n = 0
    while True:
        cand = format(int(h[n:n + 1], 16) & 7, 'X') + h[n + 1:n + 16]
        if len(cand) == 16 and cand not in USED:
            USED.add(cand)
            return cand
        n += 1
        if n + 16 > len(h):
            h = hashlib.sha1((h + key).encode()).hexdigest().upper()
            n = 0


def claim(i):
    if i[0] in '89ABCDEF':
        raise SystemExit(f'existing id {i} starts 8-F; refusing')
    USED.add(i)
    return i


# --------------------------------------------------------------------------
# old book
# --------------------------------------------------------------------------
OLD = {}  # (chapter filename, title) -> quest
OLD_CH = {}
for fn in os.listdir(os.path.join(QDIR, 'chapters')):
    ch = load(os.path.join(QDIR, 'chapters', fn))
    OLD_CH[ch['filename']] = ch
    claim(ch['id'])
    for q in ch['quests']:
        OLD[(ch['filename'], q['title'])] = q
        claim(q['id'])
        for t in q.get('tasks', []):
            claim(t['id'])
        for r in q.get('rewards', []):
            claim(r['id'])

# --------------------------------------------------------------------------
# helpers for the spec
# --------------------------------------------------------------------------
BAG = {
    'u': 'bountybags:uncommon_loot_bag', 'r': 'bountybags:rare_loot_bag',
    'e': 'bountybags:epic_loot_bag', 'l': 'bountybags:legendary_loot_bag',
}


def item(i, n=1):
    r = {'type': 'item', 'item': i}
    if n != 1:
        r['count'] = n
    return r


def bag(t, n=1):
    return item(BAG[t], n)


def xp(n):
    return {'type': 'xp_levels', 'xp_levels': n}


def toast(title, desc, icon):
    return {'type': 'toast', 'title': title, 'description': desc, 'icon': icon, 'auto': 'enabled'}


def choice(table_key):
    return {'type': 'choice', 'table': table_key}


def t_item(i, **kw):
    t = {'type': 'item', 'item': i, 'consume_items': False}
    t.update(kw)
    return t


def t_check(**kw):
    t = {'type': 'checkmark'}
    t.update(kw)
    return t


def t_observe(block, **kw):
    t = {'type': 'observation', 'observe_type': 0, 'timer': L(0), 'to_observe': block}
    t.update(kw)
    return t


def t_adv(adv, **kw):
    t = {'type': 'advancement', 'advancement': adv, 'criterion': ''}
    t.update(kw)
    return t


def t_custom(icon, **kw):
    """Completed by quest_milestones.js (its QM_TASKS must hold this task's id)."""
    t = {'type': 'custom', 'icon': icon}
    t.update(kw)
    return t


def t_stat(stat, value, **kw):
    t = {'type': 'stat', 'stat': stat, 'value': value}
    t.update(kw)
    return t


def t_structure(structure, **kw):
    t = {'type': 'structure', 'structure': structure}
    t.update(kw)
    return t


PB = '{@pagebreak}'

# --------------------------------------------------------------------------
# reward tables (choice kits)
# --------------------------------------------------------------------------
TABLES = [
    {'key': 'kit_dig_in', 'title': 'Pick a kit', 'icon': 'minecraft:chest', 'rewards': [
        {'item': {'id': 'securitycraft:bouncing_betty', 'Count': 4}},
        {'item': {'id': 'simple_guns_reworked:pistol_ammo', 'Count': 32}},
        {'item': {'id': 'minecraft:golden_carrot', 'Count': 4}},
    ]},
    {'key': 'kit_power', 'title': 'Pick a kit', 'icon': 'minecraft:chest', 'rewards': [
        {'item': {'id': 'securitycraft:sentry', 'Count': 1}},
        {'item': {'id': 'simple_guns_reworked:rifle_ammo', 'Count': 16}},
        {'item': {'id': 'minecraft:golden_carrot', 'Count': 8}},
    ]},
]

# --------------------------------------------------------------------------
# CAMPAIGN
# --------------------------------------------------------------------------
# Rows: spine y=0; above: pedestal notes / amulet y=-3; below: Tier 1 y=2.5,
# Tier 2 y=5.5-7, storage y=9-10.5; Tier 3/4 under the right half of the spine.
CAMPAIGN = [
    # ---- Act I: Arrival (spine to Open It) ----
    dict(key='own', old="You're On Your Own", x=0, y=0, rewards=[item('minecraft:torch', 16)]),
    dict(key='legend', title='Reading This Book', x=0, y=-3, shape='circle', root=True,
         subtitle='How to read the shapes on this map',
         desc=["Every shape here means something. &eRounded squares&r are the story: most of them finish on their own as the run goes on. &eGears&r open a new act of the book. &eHexagons&r are things to craft, &epentagons&r are the amulet and the world past the border, and &ecircles&r are field notes.",
               "The grey line under a title says what to do. Rewards are per player: in a party, the whole team shares progress, and each of you opens the quest and claims your own.",
               "{image:kubejs:textures/quests/legend.png width:240 height:98 align:center}",
               "Small &ediamonds&r are optional field tests: they tick over on their own when your defences do the work. The &eChallenges&r chapter has the hard ones."],
         icon='minecraft:compass', tasks=[t_check()], rewards=[]),
    dict(key='time', old='Borrowed Time', x=2, y=0, deps=['own'], rewards=[bag('u')]),
    dict(key='pedestal', old='Find the Pedestal', x=4, y=0, deps=['time'],
         desc=["Walk up to the stone pedestal in the courtyard and look at it. That's the &ePedestal&r, and it's the only thing the horde wants: every wave mob paths straight for it, not for you. It has 300 health, shown on a bar whenever you're within 64 blocks, and a mob within reach hits it for its own attack damage. &cIf it reaches zero the waves stop and the run is over. Mining or breaking the pedestal block ends the run too.&r",
               "It can be healed: right-click it holding a golden carrot for 10% back, or a nether star for a full heal. The item is used up on the spot and never sits on the stand, whether or not the amulet is there."],
         rewards=[bag('u')]),
    dict(key='horn', old='Sound the Horn', x=6, y=0, deps=['pedestal'], rewards=[bag('u')]),
    dict(key='thin', old='Thin the Horde', x=8, y=0, deps=['horn'], rewards=[item('minecraft:iron_ingot', 3)]),
    dict(key='wave1', old='Wave One, Cleared', x=10, y=0, deps=['thin'], rewards=[bag('u'), xp(6)]),
    dict(key='spoils', old='Spoils of War', x=12, y=0, deps=['wave1'], rewards=[bag('u', 2)]),
    dict(key='openit', old='Open It', x=14.5, y=0, deps=['spoils'], shape='gear', size=2.0,
         subtitle='Open a loot bag. Opens Act II: Dig In',
         desc=["Right-click a bag to open it - it does nothing sitting in your inventory. Better tiers carry better hauls, and Uncommon, Rare and Epic bags can carry &eShrapnel&r, the material the Sentry and shotgun shells need. Open them as you get them.",
               "Unlocks: the amulet, every trap branch, storage and the rest of the book."],
         rewards=[item('minecraft:iron_ingot', 2), bag('u', 2), choice('kit_dig_in'),
                  toast('New pages: Act II', 'Dig In - press Tab', 'minecraft:map')]),
    # pedestal notes (above the spine)
    dict(key='walls', title='The Walls Are a Funnel', x=4, y=-3, deps=['pedestal'], shape='circle',
         subtitle='Field notes on the compound',
         desc=["Your walls don't stop the horde, they steer it. Mobs dig through anything you place, pile up against walls and build cobblestone pillars to climb them. Only the command post's own reinforced blocks can't be dug.",
               "So build kill zones where the paths meet - the gate and the gaps in the walls - and put the traps and turrets there. A ladder up the outside of a wall is a ladder for them too: keep ladders on the inside."],
         icon='minecraft:cobblestone_wall', tasks=[t_check()], rewards=[item('simply_traps:stake', 6)]),
    dict(key='hud', title='Read the Bar', x=6, y=-3, deps=['horn'], shape='circle',
         subtitle='Field notes on the action bar',
         desc=["The line above your hotbar tells you what the base needs. &c⚔ Wave N - Hostiles remaining&r means a wave is on: that many are still alive near the pedestal. &b⏱ Next wave in&r is your build time.",
               "{image:kubejs:textures/quests/hud.png width:240 height:70 align:center}",
               "If a pedestal alert replaces the line, the pedestal is being hit right now, wherever you are. Go home."],
         icon='minecraft:clock', tasks=[t_check()], rewards=[]),
    dict(key='corpse', title='Corpse Run', x=2, y=-3, deps=['time'], shape='circle', invisible=True,
         subtitle='Appears after your first death',
         desc=["Dying doesn't cost you your gear: it waits in your corpse where you fell, and a friend can open it for you too. Your death point is marked on the map (M) - follow it back and open the corpse to take everything.",
               "You come back with a few seconds of protection, so use them to get clear."],
         icon='minecraft:skeleton_skull', tasks=[t_stat('minecraft:deaths', 1, icon='minecraft:skeleton_skull')],
         rewards=[item('minecraft:bread', 8)]),
    dict(key='clock', title='The Clock Runs', x=6, y=-4.5, deps=['hud'], shape='circle',
         subtitle='Completes when the countdown starts a wave by itself',
         desc=["Nobody blew the horn, and the wave came anyway. After every clear the countdown runs whether you're home or not, so plan trips past the border to be back before it hits zero."],
         icon='minecraft:clock', tasks=[t_custom('minecraft:clock')], rewards=[item('minecraft:bread', 4)]),
    dict(key='stragglers', title='Last Two Standing', x=8, y=-3, deps=['thin'], shape='circle',
         subtitle='Completes when the last two mobs of a wave glow',
         desc=["When a wave is down to its last two mobs, they glow red through walls so you can find them. The hostile count only covers mobs within 96 blocks of the pedestal, so a count that won't drop means stragglers: go and look for the glow."],
         icon='minecraft:glowstone_dust', tasks=[t_custom('minecraft:glowstone_dust')], rewards=[bag('u')]),
    dict(key='firstaid', title='First Aid', x=10, y=-4.5, deps=['shore'], shape='circle',
         subtitle='Heal the pedestal',
         desc=["A golden carrot gives the pedestal back 10% of its health, and a nether star heals it fully. A nether star is also the heart of a Totem of Undying, so spending one here is a real choice.",
               "Clearing a wave heals it 5%, which won't out-heal a breach. Keep carrots on you."],
         icon='minecraft:golden_carrot', tasks=[t_custom('minecraft:golden_carrot')], rewards=[item('minecraft:golden_carrot', 2)]),
    dict(key='ambush', title='Something Below', x=12, y=-3, deps=['spoils'], shape='circle', invisible=True,
         subtitle='Appears after the first ambush',
         desc=["Not everything comes over the wall. Some of the horde digs in underground and bursts out a few blocks outside your walls - a spray of dirt marks the spot. Cover the ground just outside the walls with traps too, not only the gate."],
         icon='minecraft:rooted_dirt', tasks=[t_custom('minecraft:rooted_dirt')], rewards=[item('simply_traps:spike_trap', 2)]),
    dict(key='shore', old='Shore It Up', x=10, y=-3, deps=['wave1'], shape='circle',
         subtitle='Buy any pedestal upgrade', tasks=[t_custom('minecraft:experience_bottle')],
         desc=["The pedestal can be made tougher, and you pay in &eXP levels&r. Right-click the pedestal with an empty hand to open its upgrade screen (&e/pedestal&r opens it too). Three upgrades, three tiers each: &eMax HP&r (300 up to 600), &eArmor&r (up to 45% less damage) and &eThorns&r (up to 3 damage a second back at everything hitting it). Tiers cost 6, 12 and 18 levels.",
               "One player pays a tier's whole cost from their own levels - levels can't be pooled - but the upgrade belongs to the pedestal, so everyone benefits. After a wave clears, players who can afford a tier get an &a[Upgrades]&r link in chat."],
         rewards=[xp(6)]),
    # ---- Act II: Dig In ----
    # amulet and beyond (above)
    dict(key='njj', old='Not Just Jewelry', x=16, y=-3, deps=['openit'],
         rewards=[item('kubejs:amulet'), item('minecraft:golden_carrot', 4)]),
    dict(key='wear', old='Wear It', x=18, y=-3, deps=['njj'], rewards=[item('minecraft:bread', 4)]),
    dict(key='leave', old='Leave It Behind', x=20, y=-3, deps=['wear'],
         desc=["Right-click the pedestal holding your amulet to leave it there. You lose its buffs and the border opens - but only for players whose own amulet is at the pedestal. Anyone still wearing theirs, or without one, is held at the line. The horde targets the pedestal either way.",
               "To take yours back, right-click the pedestal with an empty hand and press &eTake your amulet&r. The stand shows one amulet however many are left there, and each player can only take their own."]),
    dict(key='pastline', old='Past the Line', x=22, y=-3, deps=['leave'], rewards=[bag('r'), xp(6)],
         subtitle='Go 16 blocks past the border line', tasks=[t_custom('minecraft:cracked_stone_bricks')],
         desc=["Head out past the border line. The ruins, houses and towers out there hold the &6gold-trimmed&r stashes, and the further out, the better the haul. Watch for the spawner guarding them."]),
    dict(key='spawner', title='Silence the Spawner', x=24, y=-4.5, deps=['goldtrim'], shape='pentagon',
         subtitle='Break a monster spawner out in the ruins',
         desc=["The stashes out there are guarded by spawners. Break the spawner with a pickaxe first and the guards stop coming, then loot in peace. The further out the stash, the nastier the guards."],
         icon='minecraft:spawner', tasks=[t_custom('minecraft:spawner')], rewards=[bag('u')]),
    dict(key='bigcity', title='Big City', x=26, y=-4.5, deps=['stone'], shape='pentagon',
         subtitle='Reach a city or town',
         desc=["The cities and towns out in the wasteland are expeditions, not quick trips: the nearest is often a long walk. Set a waystone on the way, bring food, and leave your amulet at the pedestal before you go."],
         icon='minecraft:bricks', tasks=[t_structure('#kubejs:towns', icon='minecraft:bricks')], rewards=[bag('r')]),
    # spine events of Act II
    dict(key='wave5', title='Fend for Yourself', x=19, y=0, deps=['openit'], invisible=True,
         subtitle='Appears after wave 5',
         desc=["That's the end of the borrowed time. The gear you arrived in has rusted through, and the old defences at the gate are gone - the gate and the gaps in the walls are open now.",
               "From here, everything that fights for you is something you built. Rebuild the gate first: Sentries, fences, spikes."],
         icon='minecraft:iron_bars', tasks=[t_custom('minecraft:iron_bars')], rewards=[bag('r'), item('kubejs:shrapnel', 4)]),
    dict(key='delivery', title='Special Delivery', x=22.5, y=0, deps=['openit'], shape='circle',
         subtitle='Completes when a supply crate lands',
         desc=["After every fifth wave a plane drops a supply crate, and it lands well past the wall: 90 to 110 blocks from the pedestal. To reach it you'll need your amulet on the pedestal.",
               "Look up when it's announced, then follow the beam to where it came down. It's one crate for the whole team, so share it out."],
         icon='minecraft:beacon', tasks=[t_custom('minecraft:beacon')], rewards=[item('simple_guns_reworked:pistol_ammo', 16), bag('u')]),
    dict(key='goldtrim', title='Gold Trim', x=24, y=-3, deps=['pastline'], shape='pentagon',
         subtitle='Open a gold-trimmed stash chest',
         desc=["The &6gold-trimmed&r chests and barrels out in the ruins are personal: each player gets their own roll from the same container, so a stash your friend emptied is still full for you. Once you've looted one it loses its trim for you.",
               "Further out pays better. Never break one - break the guard spawner instead."],
         icon='lootr:lootr_chest', tasks=[t_adv('lootr:1chest', icon='lootr:lootr_chest')], rewards=[xp(6)]),
    dict(key='stone', old='A Stone That Remembers', x=26, y=-3, deps=['goldtrim'],
         rewards=[item('minecraft:ender_pearl', 2)]),
    # Tier 1 (below)
    dict(key='stake', old='Cheap and Cheerful', x=16, y=2.5, deps=['openit'],
         desc=["Anything that walks over a &eWooden Stake&r takes 1 damage a step, mobs and you alike, and horde mobs are slowed a little while they're on it. Cheap, fast, and worn down fast - a horde chews through a line of these in a hurry. The real cheapest defence in the pack.",
               PB, "Field notes: every placed stake has 20 points of wear, and each mob that hits it takes its own attack damage off that. Big hitters break them fastest. Rebuild the line between waves."],
         rewards=[item('simply_traps:stake', 6)]),
    dict(key='stakewall', title='Picket Line', x=16, y=4, deps=['stake'], shape='hexagon',
         subtitle='4 logs make 4 Stake Walls',
         desc=["A &eStake Wall&r doesn't block anything, whatever the name says: zombies walk straight through it and take 1 damage a step. Use it to bleed a lane you want them to use, not to close one.",
               "Like stakes, the ones you place wear out after 20 points of damage from the mobs in them."],
         icon='simply_traps:stake_wall', tasks=[t_item('simply_traps:stake_wall')],
         rewards=[item('simply_traps:stake_wall', 4)]),
    dict(key='worn', title='Wear and Tear', x=18, y=4, deps=['spike'], shape='circle',
         subtitle='Completes when one of your traps wears out',
         desc=["Traps don't last forever. Every placed stake, stake wall and spike trap has wear points (20, 20 and 60), and each mob that hits it takes its own attack damage off them. When they run out the trap breaks for good.",
               "Rebuild between waves - the big hitters chew through a line fastest."],
         icon='simply_traps:stake', tasks=[t_custom('simply_traps:stake')], rewards=[item('simply_traps:stake', 6)]),
    dict(key='spike', old='Better Than Nothing', x=18, y=2.5, deps=['stake'],
         desc=["Anything that walks over a &eSpike Trap&r takes 4 damage a step, mobs and you alike. Horde mobs caught in the spikes are also slowed hard, and it lingers for a few seconds after they step off, so a strip of spikes holds them in your turrets' fire for longer. Real iron cost, and it holds up longer than a Wooden Stake under repeated hits. Line the approach to the pedestal with them.",
               PB, "Field notes: a placed spike has 60 points of wear against a stake's 20. The slow lasts about 3 seconds after a mob steps off, so lay spikes inside your Sentry's or Tesla Coil's reach, not out on their own."],
         rewards=[item('simply_traps:spike_trap', 4)]),
    dict(key='lure', old='Dinner Bell', x=20, y=2.5, deps=['spike'], rewards=[item('kubejs:lure_block')]),
    # Tier 2 (below)
    dict(key='betty', old='Bouncing Betty', x=16, y=5.5, deps=['openit'],
         desc=["Step on it, it launches into the air, then explodes. Simple and cheap. Players set it off too, but its blast can't hurt a player or break blocks - stepping on your own just wastes the mine.",
               "Keep a stack: it's a mine, the I.M.S.'s ammunition and the core of a Claymore."],
         rewards=[item('securitycraft:bouncing_betty', 2)]),
    dict(key='claymore', old='Claymore', x=18, y=5.5, deps=['betty'], rewards=[item('securitycraft:claymore')]),
    dict(key='sentry', old='Sentry', x=20, y=5.5, deps=['claymore'],
         subtitle='Shrapnel, a Dispenser, redstone, a Portable Radar, 4 iron, an iron block',
         desc=["Set it on a solid block and it shoots by itself: &e8 damage&r a bullet, two shots a second, out to &e20 blocks&r. No ammo, no power, no wiring.",
               "It's already set to shoot hostile mobs only, whatever the placement message says. &cOnly the player who placed it can change its mode.&r",
               "Unlocks: Trigger Happy, and with the fence and the I.M.S., No Turning Back.",
               PB, "Field notes: a Speed Module doubles its fire rate. Put spikes inside its reach - slowed mobs stay in its fire longer. Break the block under it and the Sentry goes with it."],
         rewards=[item('kubejs:shrapnel', 2)]),
    dict(key='speed', title='Trigger Happy', x=22, y=5.5, deps=['sentry'], shape='hexagon',
         subtitle='7 iron, paper, sugar',
         desc=["A &eSpeed Module&r is the cheapest damage upgrade in Tier 2. Right-click your Sentry with it and the Sentry fires twice as fast: every 5 ticks instead of 10. It speeds up an I.M.S. reload too.",
               "Only the player who placed the Sentry can fit it."],
         icon='securitycraft:speed_module', tasks=[t_item('securitycraft:speed_module')],
         rewards=[item('securitycraft:speed_module')]),
    dict(key='mines', title='Watch Your Step', x=16, y=7, deps=['betty'], shape='hexagon',
         subtitle='3 iron, 1 gunpowder make 3 Mines',
         desc=["A &eMine&r stays put and goes off when something steps on it. Craft one together with a block of sand, dirt or stone and you get a block mine that looks exactly like that block - a Sand Mine is invisible in the desert.",
               "Like every trap explosion here, it can't hurt players or break blocks."],
         icon='securitycraft:mine', tasks=[t_item('securitycraft:mine')], rewards=[item('securitycraft:mine', 3)]),
    dict(key='ims', old='I.M.S.', x=18, y=7, deps=['betty'],
         desc=["Holds up to 4 Bouncing Betties and fires them at mobs that come close - the pack sets every new I.M.S. to mobs only. Each one tracks its target down before it goes off. Refill it by right-clicking with more Bouncing Betties. Breaking it returns at most 2 Bouncing Betties.",
               PB, "Field notes: put a chest of Bouncing Betties directly underneath it and it reloads itself, which is also how a teammate can keep your I.M.S. fed."],
         rewards=[item('securitycraft:bouncing_betty', 4)]),
    dict(key='cutters', title='Defuser', x=20, y=7, deps=['claymore'], shape='hexagon',
         subtitle='Shears and 4 iron',
         desc=["Right-click a Claymore or a mine with &eWire Cutters&r to defuse it before you move it. Flint and steel arms it again."],
         icon='securitycraft:wire_cutters', tasks=[t_item('securitycraft:wire_cutters')],
         rewards=[item('minecraft:gunpowder', 4)]),
    dict(key='fence', old='Electrified Fence', x=22, y=7, deps=['claymore'],
         desc=["Looks like a normal fence, but it's unbreakable and shocks any mob that touches it. It never hurts a player. Line a chokepoint with it and mobs pay for every step.",
               PB, "Field notes: zombies won't path through fences, so use them to build funnels. Anything standing beside one takes 6 damage a second, and that shock ignores armour. Build a spare: the Chemthrower Turret needs one."],
         rewards=[item('securitycraft:electrified_iron_fence', 2)]),
    dict(key='ntb', old='No Turning Back', x=24.5, y=6.25, deps=['sentry', 'fence', 'ims'], shape='gear',
         hide_lines=True),
    # storage (below)
    dict(key='barrel', old='Room to Grow', x=16, y=9, deps=['openit']),
    dict(key='stack', old='Bigger on the Inside', x=18, y=9, deps=['barrel'], rewards=[item('minecraft:iron_ingot', 4)]),
    dict(key='ironsides', old='Iron Sides', x=16, y=10.5, deps=['barrel'], rewards=[item('minecraft:iron_ingot', 4)]),
    dict(key='backpack', old='Pack Mule', x=18, y=10.5, deps=['barrel'], rewards=[item('minecraft:copper_ingot', 4)]),
    dict(key='collector', old='Waste Not', x=14, y=9, deps=['openit'], rewards=[item('minecraft:iron_ingot', 4)]),
    # ---- Act III: Power ----
    dict(key='wave8', old='The Last Written Wave', x=28, y=0, deps=['openit'], shape='gear', size=2.0,
         subtitle='Completes on its own when wave 8 is cleared. Opens Act III: Power',
         rewards=[bag('e'), item('waystones:waystone'), xp(12), choice('kit_power'),
                  toast('New pages: Act III', 'Power - press Tab', 'minecraft:map')]),
    dict(key='boss', old='The Reaper', title='Every Tenth Wave', x=34, y=0, deps=['wave8'],
         desc=["Every tenth wave brings something with it that the rest make way for. The diary only ever names one of them. You'll know it when it arrives; be ready before then."],
         rewards=[bag('l'), xp(12)]),
    dict(key='wave15', old='No Ceiling', x=40, y=0, deps=['boss'], shape='gear', size=2.0,
         subtitle='Completes on its own when wave 15 is cleared. Opens Act IV: Hordes',
         rewards=[bag('l'), xp(12), toast('New pages: Act IV', 'Hordes - press Tab', 'minecraft:map')]),
    # ---- Act IV: Hordes ----
    dict(key='horde20', title='Twenty Deep', x=44, y=0, deps=['wave15'], shape='rsquare', size=1.5,
         subtitle='Completes on its own when Horde 20 is cleared',
         desc=["Twenty waves held, and the pedestal's still standing."],
         icon='minecraft:iron_sword', tasks=[t_custom('minecraft:iron_sword')], rewards=[bag('l')]),
    dict(key='horde30', title='Thirty Deep', x=48, y=0, deps=['horde20'], shape='rsquare', size=1.5,
         subtitle='Completes on its own when Horde 30 is cleared',
         desc=["Thirty. Most runs never see this far."],
         icon='minecraft:diamond_sword', tasks=[t_custom('minecraft:diamond_sword')], rewards=[bag('l')]),
    dict(key='horde40', title='Forty Deep', x=52, y=0, deps=['horde30'], shape='rsquare', size=1.5,
         subtitle='Completes on its own when Horde 40 is cleared',
         desc=["Forty waves. You've outlasted the diary many times over, and there's still no ceiling."],
         icon='minecraft:netherite_sword', tasks=[t_custom('minecraft:netherite_sword')], rewards=[bag('l')]),
    # Tier 3 (below the right half)
    dict(key='gen', old='Wired Different', x=28, y=2.5, deps=['wave8'], rewards=[item('minecraft:copper_ingot', 4)]),
    dict(key='plug', old='No Cables Needed', x=30, y=2.5, deps=['gen'],
         desc=["A &eFlux Plug&r takes power in from whatever it touches and shares it over a named network, with no cable in between. The generator downstairs already has one, on the House Grid network."],
         rewards=[item('minecraft:redstone', 8)]),
    dict(key='point', title='Point of Use', x=32, y=2.5, deps=['plug'], shape='hexagon',
         subtitle='Recipe in JEI (press R on it)',
         desc=["A &eFlux Point&r puts the network's power back out. Set one next to a machine, right-click it and join House Grid, and the machine runs. Every machine needs its own Point."],
         icon='fluxnetworks:flux_point', tasks=[t_item('fluxnetworks:flux_point')],
         rewards=[item('minecraft:lapis_block')]),
    dict(key='tesla', old='Sparks in the Dark', x=34, y=2.5, deps=['point'],
         desc=["The &eTesla Coil&r needs Flux (a Flux Point next to it) and a redstone signal (a lever or a redstone block) to run. Then it picks one target within 6 blocks about every second and a half, hits it for 6 and stuns it, and stays quiet while nothing's in range. Put it where the horde bunches up.",
               "The netherite ingot is 4 netherite scrap and 4 gold ingots. Scrap turns up in supply crates and Epic bags.",
               PB, "Field notes: it picks a random target in range, not the nearest, and draws power whenever its lever is on. Switch it off between waves."]),
    dict(key='steel', title='Steel Yourself', x=30, y=4, deps=['gen'], shape='hexagon',
         subtitle='Iron ingots in a vanilla Blast Furnace',
         desc=["Smelt iron ingots in a vanilla &eBlast Furnace&r and they come out as &eSteel&r - no Immersive Engineering machine needed. Steel goes into the turrets and into Raw Ferronite."],
         icon='immersiveengineering:ingot_steel', tasks=[t_item('immersiveengineering:ingot_steel')],
         rewards=[item('minecraft:iron_ingot', 8)]),
    dict(key='gunturret', old='Point and Shoot', x=32, y=4, deps=['point'],
         desc=["Auto-aims at anything hostile within 16 blocks. It needs Flux (a Flux Point next to it), a redstone signal (a lever or a redstone block) and real ammunition: load &eCasull Cartridges&r into its screen, 10 damage a shot, two shots a second. No rounds, no shots.",
               "Built from a Revolver, not bought - and it eats a &eSentry&r for its targeting brain, so build one of those first if you haven't."],
         rewards=[item('immersiveengineering:casull', 8)]),
    dict(key='chemturret', old='Liquid Fire', x=34, y=4, deps=['point'], rewards=[item('minecraft:iron_ingot', 4)]),
    # Refined Storage, one quest per part
    dict(key='rs', old='The Grid', x=36, y=2.5, deps=['tesla'],
         subtitle='4 Quartz Enriched Iron, an Advanced Processor, 2 silicon, a Machine Casing',
         desc=["The &eController&r is the heart of a Refined Storage network: put a Flux Point next to it for power. Every Refined Storage block touching it, or touching another one that does, joins the network."],
         rewards=[item('minecraft:quartz', 4)]),
    dict(key='rsdrive', title='Spin Up', x=38, y=2.5, deps=['rs'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["The &eDisk Drive&r holds up to 8 storage disks, and the disks are where the items actually live. No disks, no storage."],
         icon='refinedstorage:disk_drive', tasks=[t_item('refinedstorage:disk_drive')], rewards=[item('minecraft:quartz', 2)]),
    dict(key='rsdisk', title='A Thousand Things', x=40, y=2.5, deps=['rsdrive'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["A &e1k Storage Disk&r holds 1,000 items of any mix. Put it in the Disk Drive."],
         icon='refinedstorage:1k_storage_disk', tasks=[t_item('refinedstorage:1k_storage_disk')], rewards=[item('minecraft:quartz', 2)]),
    dict(key='rsgrid', title='Find Anything', x=42, y=2.5, deps=['rsdisk'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["The &eGrid&r is the terminal: everything stored in the network, in one searchable screen. Put items in, take them out, from one place."],
         icon='refinedstorage:grid', tasks=[t_item('refinedstorage:grid')], rewards=[item('minecraft:quartz', 2)]),
    dict(key='rsext', title='Hooked In', x=44, y=2.5, deps=['rsgrid'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["Put an &eExternal Storage&r against a chest or barrel, joined to the network, and that container's contents show up in the Grid too. Your old stash stays where it is."],
         icon='refinedstorage:external_storage', tasks=[t_item('refinedstorage:external_storage')], rewards=[item('minecraft:quartz', 2)]),
    # field tests (optional diamonds; counted by field_tests.js)
    dict(key='ft_spikes', title='Spike Strip', x=20, y=4, deps=['spike'], shape='diamond', optional=True,
         subtitle='10 wave mobs die while slowed by your spikes',
         desc=["Spikes do the holding; the traps and turrets around them do the killing. Ten wave mobs that die while still slowed by spikes, whoever finishes them."],
         icon='simply_traps:spike_trap', tasks=[t_custom('simply_traps:spike_trap')], rewards=[item('simply_traps:spike_trap', 4)]),
    dict(key='ft_fence', title='Live Wire', x=22, y=8.5, deps=['fence'], shape='diamond', optional=True,
         subtitle='10 wave mobs killed by fence shocks',
         desc=["Ten wave mobs killed by the shock from an electrified fence. Funnel them along the wire and let it work."],
         icon='securitycraft:electrified_iron_fence', tasks=[t_custom('securitycraft:electrified_iron_fence')],
         rewards=[item('securitycraft:electrified_iron_fence', 2)]),
    dict(key='ft_tesla', title='Coil Whine', x=36, y=4, deps=['tesla'], shape='diamond', optional=True,
         subtitle='10 wave mobs killed by a Tesla Coil',
         desc=["Ten wave mobs killed by a Tesla Coil. It hits one random target in range at a time, so it shines where the horde bunches up."],
         icon='immersiveengineering:tesla_coil', tasks=[t_custom('immersiveengineering:tesla_coil')], rewards=[item('minecraft:redstone', 8)]),
    dict(key='ft_gunturret', title='Overwatch', x=32, y=5.5, deps=['gunturret'], shape='diamond', optional=True,
         subtitle='25 wave mobs killed by Gun Turrets',
         desc=["Twenty-five wave mobs killed by Gun Turrets. Keep them loaded: no Casull rounds, no shots."],
         icon='immersiveengineering:turret_gun', tasks=[t_custom('immersiveengineering:turret_gun')],
         rewards=[item('immersiveengineering:casull', 16)]),
    dict(key='ft_omt', title='Fire Mission', x=40, y=7, deps=['grenade'], shape='diamond', optional=True,
         subtitle='25 wave mobs killed by Tier 4 turrets',
         desc=["Twenty-five wave mobs killed by Grenade or Rocket Turrets."],
         icon='omtreborn:grenade_turret', tasks=[t_custom('omtreborn:grenade_turret')],
         rewards=[item('omtreborn:ammo_grenade', 8), item('omtreborn:ammo_rocket', 2)]),
    # Tier 4
    dict(key='ferro', title='Ferronite', x=36, y=5.5, deps=['gunturret', 'chemturret'], shape='hexagon',
         subtitle='2 Steel and a redstone',
         desc=["&eRaw Ferronite&r without the mining: 2 Steel and a redstone. Smelt it into Ferronite ingots for the Tier 4 turret parts. Nothing in Tier 4 needs the Nether or the End."],
         icon='omtreborn:raw_ferronite', tasks=[t_item('omtreborn:raw_ferronite')], rewards=[item('minecraft:redstone', 4)]),
    dict(key='base2', title='Foundations', x=38, y=5.5, deps=['ferro'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["Tier 4 turrets sit on a &eTurret Base&r, and the base tier has to match the head: a Grenade Turret needs a Tier 2 base or better, or the head pops off. Ammo goes in the base, and a Flux Point next to it powers it."],
         icon='omtreborn:turret_base_tier_2', tasks=[t_item('omtreborn:turret_base_tier_2')], rewards=[item('minecraft:redstone', 4)]),
    dict(key='grenade', old='Fragmentation', x=40, y=5.5, deps=['base2'],
         subtitle='Sensor, Chamber and Barrel Tier II, a Cauldron, 3 stone',
         desc=["Mount it on a Turret Base Tier 2 or higher and it lobs area-damage grenades at anything hostile from 4 to 18 blocks out. It can't hit what's hugging it, so keep spikes or a fence between the turret and the horde.",
               "Ammo is cheap and renewable: a redstone, 3 iron nuggets and a gunpowder per Grenade Ammo. The Sensor, Chamber and Barrel need &eFerronite&r."],
         rewards=[item('omtreborn:ammo_grenade', 8)]),
    dict(key='base3', title='Heavy Footing', x=42, y=5.5, deps=['grenade'], shape='hexagon', subtitle='Recipe in JEI',
         desc=["A Rocket Turret needs a &eTurret Base Tier 3&r or better under it. Same rules as before: ammo in the base, a Flux Point beside it."],
         icon='omtreborn:turret_base_tier_3', tasks=[t_item('omtreborn:turret_base_tier_3')], rewards=[item('minecraft:redstone', 4)]),
    dict(key='rocket', old='Fire for Effect', x=44, y=5.5, deps=['base3'],
         subtitle='2 TNT, Sensor, Chamber and Barrel Tier III, a Ferronite Frame, 2 Cobbled Deepslate',
         desc=["The elite pick: rockets with real area damage, out to 30 blocks. Mount it on a Turret Base Tier 3 or higher. Steep on Ferronite (a Sensor Tier III alone eats a full Block of Ferronite), and every shot costs 5,000 FE, so give it a Flux Point of its own."],
         rewards=[item('omtreborn:ammo_rocket', 4)]),
]

# --------------------------------------------------------------------------
# CHALLENGES (new chapter; completed by quest_milestones.js)
# --------------------------------------------------------------------------
CHALLENGES = [
    dict(key='ch_untouched', title='Not a Scratch', x=0, y=0, shape='octagon', size=1.5,
         subtitle='Clear a wave from wave 5 on without the pedestal taking damage',
         desc=["Hold a whole wave, wave 5 or later, without a single hit landing on the pedestal. Kill zones out front, not repairs afterwards."],
         icon='supplementaries:pedestal', tasks=[t_custom('supplementaries:pedestal')], rewards=[bag('l')]),
    dict(key='ch_intercept', title='Intercept', x=2.5, y=0, shape='octagon', size=1.5,
         subtitle='Kill a boss before the pedestal takes damage that wave',
         desc=["A boss dies while the pedestal is still untouched that wave. Meet it out in the ring and drag it off course."],
         icon='minecraft:crossbow', tasks=[t_custom('minecraft:crossbow')], rewards=[bag('l')]),
    dict(key='ch_maxed', title='Fortified', x=5, y=0, shape='octagon', size=1.5,
         subtitle='Every pedestal upgrade at tier III',
         desc=["Max HP, Armor and Thorns all at tier III. That's 108 levels poured into one stone block."],
         icon='minecraft:experience_bottle', tasks=[t_custom('minecraft:experience_bottle')], rewards=[bag('l')]),
    dict(key='ch_deep', title='Deep Pockets', x=7.5, y=0, shape='octagon', size=1.5,
         subtitle='Loot 25 gold-trimmed stashes',
         desc=["Twenty-five personal stashes looted out in the wasteland. Every one meant leaving the pedestal behind."],
         icon='lootr:lootr_chest', tasks=[t_adv('lootr:25loot', icon='lootr:lootr_chest')], rewards=[bag('l')]),
    dict(key='ch_hardcore20', title='Iron Will', x=10, y=0, shape='octagon', size=1.5,
         subtitle='Clear Horde 20 with hardcore on',
         desc=["Twenty waves with permadeath switched on (/hardcore enable). No second chances on the way there."],
         icon='minecraft:totem_of_undying', tasks=[t_custom('minecraft:totem_of_undying')], rewards=[bag('l'), bag('l')]),
]

# --------------------------------------------------------------------------
# FIELD NOTES (tips_and_tricks.snbt)
# --------------------------------------------------------------------------
TIPS = [
    dict(key='tip_recipe', old='View a Recipe', rewards=[]),
    dict(key='tip_uses', old="See What It's Used For", rewards=[]),
    dict(key='tip_book', old='Open the Quest Book', rewards=[]),
    dict(key='tip_bookmark', old='Bookmark an Item', rewards=[]),
    dict(key='tip_zoom', old='Zoom In', rewards=[]),
    dict(key='tip_map', old='Open the World Map', rewards=[]),
    dict(key='tip_sort', old='Auto-Sort a Container', rewards=[],
         desc=["Middle-click inside a chest or your inventory to sort the section you clicked. Sophisticated barrels and backpacks have their own sort button - use that one there."]),
    dict(key='tip_look', old='Look at Anything', rewards=[]),
    dict(key='tip_bag', old='Open a Loot Bag', rewards=[]),
    dict(key='tip_curios', old='Find the Curios Slot', rewards=[]),
    dict(key='tip_waystone', old='Use a Waystone', rewards=[]),
    dict(key='tip_reach', old='Reach Further', rewards=[],
         desc=["The Crafting Station in the command post reaches further than it looks - it pulls from any chest or barrel touching it, right there in the crafting grid. No wiring, nothing to switch on. Build your stash around it instead of hauling it all to one spot."]),
    dict(key='tip_hardcore', old='Go Hardcore', rewards=[],
         desc=["Run /hardcore enable to flip on real permadeath for this world - optional, and off by default. Die with it on and no Totem of Undying saves you: you're out, and you only come back as a spectator. With friends, the run ends once every player online is down; while someone is still standing, a death is a normal respawn. Changed your mind while you're still alive? /hardcore disable turns it back off."]),
    dict(key='tip_party', title='Playing Together', x=11.5, y=0.0, shape='circle', root=True,
         subtitle='Share one book with your friends',
         desc=["Put everyone in one FTB Teams party and the party shares this book: when anyone finishes a task, it's finished for all of you, and everyone online sees it.",
               "Rewards stay personal. Each of you opens the quest and claims your own copy, so watch for the &e!&r on a chapter. Without a party, everyone works through their own book."],
         icon='minecraft:player_head', tasks=[t_check()], rewards=[]),
    dict(key='tip_owner', title='Who Owns What', x=11.5, y=1.5, shape='circle', root=True,
         subtitle='SecurityCraft defences have one owner',
         desc=["A Sentry, an I.M.S. or any other SecurityCraft defence belongs to the player who placed it: only they can change its mode, fit modules or break it. Decide between you who builds what."],
         icon='securitycraft:sentry', tasks=[t_check()], rewards=[]),
    dict(key='tip_blast', title='Friendly Fire', x=11.5, y=3.0, shape='circle', root=True,
         subtitle='Your own explosions are safe',
         desc=["Mines, Claymores, the I.M.S., your rockets and grenades never hurt a player or break a block, so you can fight inside your own minefield. Spikes and stakes are different: they bite you just like they bite the horde."],
         icon='securitycraft:claymore', tasks=[t_check()], rewards=[]),
    dict(key='tip_beam', title='Follow the Light', x=13.0, y=0.0, shape='circle', root=True,
         subtitle='A beam means loot worth the detour',
         desc=["A coloured beam of light over something on the ground marks an item worth going back for, like a Legendary bag or good gear."],
         icon='minecraft:beacon', tasks=[t_check()], rewards=[]),
    dict(key='tip_pin', title='Drop a Pin', x=13.0, y=1.5, shape='circle', root=True,
         subtitle='Press K for a waypoint',
         desc=["Press &eK&r to drop a waypoint where you stand: a ruin worth coming back to, a town, your waystone. It shows on the minimap and the world map (M)."],
         icon='minecraft:filled_map', tasks=[t_check()], rewards=[]),
    dict(key='tip_tiers', title='Tier Tooltips', x=13.0, y=3.0, shape='circle', root=True,
         subtitle='Hover a defence to compare it',
         desc=["Hover any trap or turret in your inventory or in JEI: the tooltip shows its tier and how hard it hits. A free cheat sheet for what to build next."],
         icon='simply_traps:spike_trap', tasks=[t_check()], rewards=[]),
]

# --------------------------------------------------------------------------
# BOUNTIES
# --------------------------------------------------------------------------
SHR = 'kubejs:shrapnel'
BOUNTIES = [
    dict(key='b25', old='First Blood', x=0, y=0,
         desc=["Every wave mob that goes down counts toward this, whoever or whatever drops it - turrets and traps get credit too, and so does every other player's kill. Mobs from a structure's spawner don't count, and neither do deaths by drowning, falling, freezing, starving or /kill; fire and lava do. Twenty-five down. Just the start."],
         rewards=[bag('u'), item(SHR, 2)]),
    dict(key='b100', old='Exterminator', x=2, y=0, deps=['b25'], rewards=[bag('u', 2), item(SHR, 4)]),
    dict(key='b300', old='Culling', x=4.25, y=0, deps=['b100'], rewards=[bag('r', 2), item(SHR, 6)]),
    dict(key='b750', old='Reaper', title='Undertaker', x=6.75, y=0, deps=['b300'],
         rewards=[bag('e'), item('minecraft:golden_apple'), item(SHR, 8)]),
    dict(key='b1500', old='Zombie Masher', x=9.5, y=0, deps=['b750'], repeat=False,
         desc=["Fifteen hundred kills. The horde doesn't get thinner, but your aim is getting better. There are more marks past this one."],
         rewards=[bag('l')]),
    dict(key='b3000', title='Body Count', x=12, y=0, deps=['b1500'], shape='gear', size=2.0,
         subtitle='3,000 wave kills', icon='minecraft:skeleton_skull',
         desc=["Three thousand. Somebody should be keeping a tally on the wall."],
         tasks=[{'type': 'custom', 'icon': 'minecraft:skeleton_skull'}], rewards=[bag('l')]),
    dict(key='b4500', title='Thousand-Yard Stare', x=14.5, y=0, deps=['b3000'], shape='gear', size=2.0,
         subtitle='4,500 wave kills', icon='minecraft:wither_skeleton_skull',
         desc=["Four and a half thousand, and they still keep coming."],
         tasks=[{'type': 'custom', 'icon': 'minecraft:wither_skeleton_skull'}], rewards=[bag('l')]),
    dict(key='b6000', title='Bone Collector', x=17, y=0, deps=['b4500'], shape='gear', size=2.0,
         subtitle='6,000 wave kills', icon='minecraft:bone_block',
         desc=["Six thousand. The ground out there is more bone than sand by now."],
         tasks=[{'type': 'custom', 'icon': 'minecraft:bone_block'}], rewards=[bag('l')]),
    dict(key='b7500', title='Still Standing', x=19.5, y=0, deps=['b6000'], shape='gear', size=2.0,
         subtitle='7,500 wave kills', icon='minecraft:totem_of_undying',
         desc=["Seven and a half thousand. Whatever comes next, you've already outlasted the diary by a long way."],
         tasks=[{'type': 'custom', 'icon': 'minecraft:totem_of_undying'}], rewards=[bag('l')]),
]

# --------------------------------------------------------------------------
# ARSENAL: ammo on the left, the guns it feeds to its right
# --------------------------------------------------------------------------
G = 'simple_guns_reworked:'
ARSENAL = [
    # pistol ammo family (y=0)
    dict(key='a_pammo', old='Pistol Ammo', x=0, y=0, rewards=[item(G + 'pistol_ammo', 8)]),
    dict(key='a_pistol', old='Pistol', x=1.5, y=0, deps=['a_pammo'], rewards=[item(G + 'pistol_ammo', 16)]),
    dict(key='a_revolver', old='Revolver', x=3, y=0, deps=['a_pammo'], rewards=[item(G + 'pistol_ammo', 16)]),
    dict(key='a_smg', old='Submachine Gun', x=4.5, y=0, deps=['a_pammo'],
         desc=["Full-auto off a 32-round Pistol Ammo magazine, and a quick reload. Press R to reload."],
         rewards=[item(G + 'pistol_ammo', 16)]),
    dict(key='a_tommy', old='Tommy Gun', x=6, y=0, deps=['a_pammo'],
         desc=["A 60-round Pistol Ammo drum, nearly twice the Submachine Gun's magazine, but it takes twice as long to reload."],
         rewards=[item(G + 'pistol_ammo', 16)]),
    # shotgun family (y=1.5)
    dict(key='a_sammo', old='Shotgun Ammo', x=0, y=1.5, rewards=[item(G + 'shotgun_ammo', 8)]),
    dict(key='a_shotgun', old='Shotgun', x=1.5, y=1.5, deps=['a_sammo'], rewards=[item(G + 'shotgun_ammo', 16)]),
    dict(key='a_double', old='Double-Barrel Shotgun', x=3, y=1.5, deps=['a_sammo'], rewards=[item(G + 'shotgun_ammo', 16)]),
    dict(key='a_auto', old='Automatic Shotgun', x=4.5, y=1.5, deps=['a_sammo'], rewards=[item(G + 'shotgun_ammo', 16)]),
    # rifle family (y=3)
    dict(key='a_rammo', old='Rifle Ammo', x=0, y=3, rewards=[item(G + 'rifle_ammo', 8)]),
    dict(key='a_dmr', old='DMR', x=1.5, y=3, deps=['a_rammo'], rewards=[item(G + 'rifle_ammo', 16)]),
    dict(key='a_sniper', old='Sniper', x=3, y=3, deps=['a_rammo'], rewards=[item(G + 'rifle_ammo', 16)]),
    dict(key='a_snammo', old='Sniper Ammo', x=0, y=4.5, rewards=[item(G + 'sniper_ammo', 5)]),
    dict(key='a_heavy', old='Heavy Sniper', x=1.5, y=4.5, deps=['a_snammo'], rewards=[item(G + 'sniper_ammo', 10)]),
    # heavy and special (y=6)
    dict(key='a_rocket', old='Rocket', x=0, y=6, rewards=[item(G + 'rocket', 2)]),
    dict(key='a_bazooka', old='Bazooka', x=1.5, y=6, deps=['a_rocket'], rewards=[item(G + 'rocket', 2)]),
    dict(key='a_fuel', old='Fuel Tank', x=3, y=6, rewards=[item(G + 'fuel_tank')]),
    dict(key='a_flamer', old='Flame Thrower', x=4.5, y=6, deps=['a_fuel'], rewards=[item(G + 'fuel_tank')]),
    dict(key='a_grenade', old='Grenade', x=6, y=6, rewards=[item(G + 'grenade', 4)]),
    # airdrop and loot only (pentagons, y=7.5)
    dict(key='a_dust', old='Energized Dust', x=0, y=7.5, shape='pentagon', subtitle='Airdrop only, in practice',
         desc=["The Laser Gun's ammo, burned one at a time with no reload. JEI shows a recipe, but it needs glowstone, which turns up nowhere here - in practice it comes in the airdrop crate with the Laser Gun."],
         rewards=[item(G + 'energized_dust', 8)]),
    dict(key='a_laser', old='Laser Gun', x=1.5, y=7.5, deps=['a_dust'], shape='pentagon', subtitle='Airdrop only',
         rewards=[item(G + 'energized_dust', 8)]),
    dict(key='a_potato', old='Charged Potato', x=3, y=7.5, shape='pentagon', subtitle='Needs blaze powder from far stashes',
         rewards=[item(G + 'charged_potato', 4)]),
    dict(key='a_cannon', old='Potato Cannon', x=4.5, y=7.5, deps=['a_potato'], shape='pentagon', subtitle='Airdrop only',
         rewards=[item(G + 'charged_potato', 4)]),
    dict(key='a_minigun', old='Minigun', x=6, y=7.5, shape='pentagon', subtitle='Airdrop or Legendary bag only',
         rewards=[item(G + 'grenade', 4)]),
]


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------
TABLE_IDS = {}


def build_tables():
    out = []
    for i, t in enumerate(TABLES):
        tid = mint('table:' + t['key'])
        TABLE_IDS[t['key']] = tid
        out.append((t['key'], {
            'id': tid, 'order_index': i, 'title': t['title'], 'icon': t['icon'], 'loot_size': 1,
            'rewards': t['rewards'],
        }))
    return out


def build_reward(r, old_rewards, used_old, key, idx):
    r = dict(r)
    if r.get('type') == 'choice':
        r['table_id'] = L(int(TABLE_IDS[r.pop('table')], 16))
    # reuse an old reward id of the same type and item
    for j, o in enumerate(old_rewards):
        if j in used_old:
            continue
        if o.get('type') == r.get('type') and o.get('item') == r.get('item') and o.get('xp_levels', 0) == r.get('xp_levels', 0):
            used_old.add(j)
            r['id'] = o['id']
            break
    else:
        r['id'] = mint(f'reward:{key}:{idx}:{r.get("type")}:{r.get("item", r.get("title", ""))}')
    if 'count' in r and not isinstance(r['count'], int):
        r['count'] = int(r['count'])
    return r


def build_chapter(chfile, spec, pos_default=None):
    keyid = {}
    old_by_key = {}
    for s in spec:
        # The pre-v4 title first, then the current one, so a re-run against
        # already-built files finds renamed quests and keeps every id.
        old = None
        for name in (s.get('old'), s.get('title')):
            if name and (chfile, name) in OLD:
                old = OLD[(chfile, name)]
                break
        if s.get('old') and old is None:
            raise SystemExit(f'{chfile}: no existing quest titled {s["old"]!r} or {s.get("title")!r}')
        old_by_key[s['key']] = old
        keyid[s['key']] = old['id'] if old else mint('quest:' + chfile + ':' + s['key'])
    quests = []
    for s in spec:
        old = old_by_key[s['key']] or {}
        q = {}
        q['id'] = keyid[s['key']]
        q['title'] = s.get('title', old.get('title'))
        q['x'] = D(float(s['x'] if 'x' in s else old.get('x', 0.0)))
        q['y'] = D(float(s['y'] if 'y' in s else old.get('y', 0.0)))
        shape = s.get('shape', old.get('shape'))
        if shape:
            q['shape'] = shape
        size = s.get('size', old.get('size'))
        if size and float(size) != 1.0:
            q['size'] = D(float(size))
        icon = s.get('icon', old.get('icon'))
        if icon:
            q['icon'] = icon
        sub = s.get('subtitle', old.get('subtitle'))
        if sub:
            q['subtitle'] = sub
        desc = s.get('desc', old.get('description'))
        if desc:
            q['description'] = desc
        deps = [keyid[d] for d in s.get('deps', [])]
        if deps:
            q['dependencies'] = deps
            q['hide_until_deps_complete'] = True if chfile in ('campaign', 'bounties') else old.get('hide_until_deps_complete', False)
            if not q['hide_until_deps_complete']:
                del q['hide_until_deps_complete']
        if s.get('hide_lines'):
            q['hide_dependency_lines'] = True
        if s.get('optional'):
            q['optional'] = True
        if s.get('invisible'):
            # Hidden until completed: the discovery quests, which must not
            # announce what they explain.
            q['invisible'] = True
        if old.get('can_repeat') and s.get('repeat', True):
            q['can_repeat'] = True
            if 'repeat_cooldown' in old:
                q['repeat_cooldown'] = old['repeat_cooldown']
        # tasks: spec or old; reuse old task ids by position
        tasks = s.get('tasks')
        if tasks is None:
            tasks = [dict(t) for t in old.get('tasks', [])]
        else:
            tasks = [dict(t) for t in tasks]
            otasks = old.get('tasks', [])
            for i, t in enumerate(tasks):
                if i < len(otasks) and otasks[i].get('type') == t.get('type'):
                    t['id'] = otasks[i]['id']
        for i, t in enumerate(tasks):
            if 'id' not in t:
                t['id'] = mint(f'task:{chfile}:{s["key"]}:{i}')
            t.pop('max_progress', None)  # ignored by FTB Quests 2001.4.22; bounty_kills.js sets it
        q['tasks'] = tasks
        # rewards
        if 'rewards' in s:
            used = set()
            q['rewards'] = [build_reward(r, old.get('rewards', []), used, s['key'], i) for i, r in enumerate(s['rewards'])]
        else:
            q['rewards'] = [dict(r) for r in old.get('rewards', [])]
        if not q['rewards']:
            del q['rewards']
        quests.append(q)
    return quests, keyid


def write_chapter(chfile, quests, **chapter_over):
    old = OLD_CH[chfile]
    ch = {k: v for k, v in old.items() if k != 'quests'}
    ch.update(chapter_over)
    ch['quests'] = quests
    with open(os.path.join(QDIR, 'chapters', chfile + '.snbt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(dump(ch))


def write_new_chapter(chfile, quests, **fields):
    """A chapter that has no file yet. Once written, later runs read it like
    any other chapter and keep its id."""
    if chfile in OLD_CH:
        write_chapter(chfile, quests, **fields)
        return
    ch = {'id': mint('chapter:' + chfile), 'filename': chfile, 'group': '', 'progression_mode': 'flexible',
          'default_hide_dependency_lines': False, 'default_quest_shape': '', 'quest_links': [], 'images': []}
    ch.update(fields)
    ch['quests'] = quests
    with open(os.path.join(QDIR, 'chapters', chfile + '.snbt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(dump(ch))


# Act banners over the spine. Each draws only once the team has completed
# the act's gate quest (ChapterImage dependency), so the map grows as the run
# does. Art: tools/quest_book/quest_art.py.
ACT_BANNERS = [('act1', 6.5, None), ('act2', 21.5, 'openit'), ('act3', 34.0, 'wave8'), ('act4', 48.0, 'wave15')]


def banner_images(ids):
    out = []
    for i, (name, x, gate) in enumerate(ACT_BANNERS):
        img = {'image': f'kubejs:textures/quests/{name}.png', 'x': D(x), 'y': D(-7.0), 'width': D(10.0),
               'height': D(2.5), 'rotation': D(0.0), 'order': 0}
        if gate:
            img['dependency'] = ids[gate]
        out.append(img)
    return out


def main():
    tables = build_tables()
    camp, camp_ids = build_chapter('campaign', CAMPAIGN)
    write_chapter('campaign', camp, images=banner_images(camp_ids))
    chal, _ = build_chapter('challenges', CHALLENGES)
    write_new_chapter('challenges', chal, title='Challenges', icon='minecraft:netherite_sword', order_index=4,
                      subtitle=['Optional, and hard. For when the campaign is old news.'])
    tips_spec = []
    for s in TIPS:
        tips_spec.append(s)
    tips, _ = build_chapter('tips_and_tricks', tips_spec)
    write_chapter('tips_and_tricks', tips, title='Field Notes', subtitle=['Keys, habits and how things work'])
    bq, bq_ids = build_chapter('bounties', BOUNTIES)
    write_chapter('bounties', bq)
    ars, _ = build_chapter('arsenal', ARSENAL)
    write_chapter('arsenal', ars, subtitle=["Simple Guns: reworked - each ammo, and the guns it feeds"])
    tdir = os.path.join(QDIR, 'reward_tables')
    os.makedirs(tdir, exist_ok=True)
    for key, t in tables:
        with open(os.path.join(tdir, key + '.snbt'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(dump(t))
    # report ids the scripts need
    print('campaign custom task ids (quest_milestones.js QM_TASKS):')
    for s, q in zip(CAMPAIGN, camp):
        for t in q['tasks']:
            if t['type'] == 'custom':
                print(f'  {s["key"]}: {t["id"]}  ({q["title"]})')
    print('bounty task ids:')
    for q in bq:
        print(f'  {q["title"]}: quest {q["id"]} task {q["tasks"][0]["id"]}')
    for s_, q in zip(CHALLENGES, chal):
        for t in q['tasks']:
            if t['type'] == 'custom':
                print(f'  {s_["key"]}: {t["id"]}  ({q["title"]})')
    n = sum(len(x) for x in (camp, tips, bq, ars, chal))
    print(f'quests: campaign {len(camp)}, field notes {len(tips)}, bounties {len(bq)}, arsenal {len(ars)}, challenges {len(chal)} = {n}')


if __name__ == '__main__':
    main()
