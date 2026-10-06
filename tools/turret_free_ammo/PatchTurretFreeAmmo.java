import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import org.objectweb.asm.tree.analysis.*;
import java.nio.file.*;
import java.util.*;
import java.util.function.Predicate;
import java.util.zip.*;

/**
 * Makes Immersive Engineering's Gun Turret and Chemthrower Turret fire without ammo (direct ask
 * 2026-10-05: "remove the need for ammo in the immersive turrets"). IE has no config for it.
 * An empty Gun Turret fires free Casull Cartridges and leaves no casings; an empty Chemthrower
 * Turret sprays free creosote. Ammo a player loads is fired first and used up as usual. Power and
 * the redstone signal are still required.
 *
 * What it changes (see docs/MODS.md, patched-jars section):
 *  - adds TdTurretFreeAmmo (TdTurretFreeAmmo.java beside this file, compiled separately) to the
 *    turrets' package;
 *  - TurretGunBlockEntity.canActivate: the "ammo slot is empty" test always reads false;
 *  - TurretGunBlockEntity.activate: the slot-0 stack goes through TdTurretFreeAmmo.bullet, and the
 *    casing through TdTurretFreeAmmo.casing (none for a free round);
 *  - TurretChemBlockEntity.canActivate: the "tank has fluid" test always reads true;
 *  - TurretChemBlockEntity.activate: the copied tank fluid goes through TdTurretFreeAmmo.fluid.
 * Every insert is branch-free and keeps the stack height, so javac's stack-map frames stay valid.
 * Apply it to the jar PatchTeslaCoil (tools/patch_tesla_coil_targets.java) produced; signature
 * files, if any, are dropped as in that tool.
 *
 * Build/run (JDK 17; L = the dedicated server's libraries folder, IE = the input jar):
 *   javac --release 17 -cp "L/net/minecraft/server/1.20.1-20230612.114412/server-1.20.1-20230612.114412-srg.jar;
 *         L/net/minecraftforge/forge/1.20.1-47.4.10/forge-1.20.1-47.4.10-universal.jar;IE" -d out TdTurretFreeAmmo.java
 *   javac -cp "asm-9.8.jar;asm-tree-9.8.jar;asm-analysis-9.8.jar" -d out PatchTurretFreeAmmo.java
 *   java  -cp "asm-9.8.jar;asm-tree-9.8.jar;asm-analysis-9.8.jar;out" PatchTurretFreeAmmo <in jar> <helper .class> <out jar>
 * Refuses to run if a patch site isn't found exactly once (IE updated) or the jar already has the
 * helper. Each changed method is checked with ASM's BasicVerifier before the jar is written.
 */
public class PatchTurretFreeAmmo implements Opcodes {
  static final String PKG = "blusunrize/immersiveengineering/common/blocks/metal/";
  static final String GUN = PKG + "TurretGunBlockEntity";
  static final String CHEM = PKG + "TurretChemBlockEntity";
  static final String HELPER = PKG + "TdTurretFreeAmmo";
  static final String STACK = "net/minecraft/world/item/ItemStack";
  static final String LIST = "net/minecraft/core/NonNullList";
  static final String FLUID = "net/minecraftforge/fluids/FluidStack";
  static final String TANK = "net/minecraftforge/fluids/capability/templates/FluidTank";
  static final String BULLET = "blusunrize/immersiveengineering/api/tool/BulletHandler$IBullet";

  /** next real instruction, skipping labels / line numbers / frames */
  static AbstractInsnNode nextReal(AbstractInsnNode n) {
    n = n.getNext();
    while (n != null && n.getOpcode() == -1) n = n.getNext();
    return n;
  }

  static MethodNode find(ClassNode cn, String name, String desc) {
    for (MethodNode m : cn.methods) if (m.name.equals(name) && m.desc.equals(desc)) return m;
    throw new IllegalStateException("method not found: " + cn.name + "." + name + desc);
  }

  static Predicate<AbstractInsnNode> call(int op, String owner, String name, String desc) {
    return n -> n instanceof MethodInsnNode m && m.getOpcode() == op && m.owner.equals(owner) && m.name.equals(name) && m.desc.equals(desc);
  }

  static Predicate<AbstractInsnNode> followedByStore(Predicate<AbstractInsnNode> p, int var) {
    return n -> p.test(n) && nextReal(n) instanceof VarInsnNode v && v.getOpcode() == ASTORE && v.var == var;
  }

  static MethodInsnNode helper(String name, String desc) {
    return new MethodInsnNode(INVOKESTATIC, HELPER, name, desc, false);
  }

  static AbstractInsnNode only(MethodNode m, Predicate<AbstractInsnNode> p, String what) {
    AbstractInsnNode hit = null;
    int count = 0;
    for (AbstractInsnNode n : m.instructions) if (p.test(n)) { hit = n; count++; }
    if (count != 1) throw new IllegalStateException("expected exactly one " + what + " in " + m.name + ", found " + count);
    return hit;
  }

  static InsnList of(AbstractInsnNode... ns) {
    InsnList l = new InsnList();
    for (AbstractInsnNode n : ns) l.add(n);
    return l;
  }

  static ClassNode read(byte[] bytes) {
    ClassNode cn = new ClassNode();
    new ClassReader(bytes).accept(cn, ClassReader.EXPAND_FRAMES);
    return cn;
  }

  /** Writes the class, then reads the result back and runs BasicVerifier over each changed method. */
  static byte[] write(ClassNode cn, String... changed) throws AnalyzerException {
    ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_MAXS);
    cn.accept(cw);
    byte[] bytes = cw.toByteArray();
    ClassNode check = read(bytes);
    for (String name : changed) {
      for (MethodNode m : check.methods) if (m.name.equals(name)) new Analyzer<>(new BasicVerifier()).analyze(check.name, m);
    }
    return bytes;
  }

  static byte[] patchGun(byte[] orig) throws AnalyzerException {
    ClassNode cn = read(orig);

    // canActivate: `!inventory.get(0).isEmpty()` -> the isEmpty call becomes `pop; iconst_0`
    MethodNode ca = find(cn, "canActivate", "()Z");
    AbstractInsnNode isEmpty = only(ca, call(INVOKEVIRTUAL, STACK, "m_41619_", "()Z"), "ItemStack.isEmpty call");
    ca.instructions.insert(isEmpty, of(new InsnNode(POP), new InsnNode(ICONST_0)));
    ca.instructions.remove(isEmpty);

    MethodNode act = find(cn, "activate", "()V");
    // `ItemStack stack = inventory.get(0)` -> `ItemStack stack = TdTurretFreeAmmo.bullet(inventory.get(0))`
    AbstractInsnNode load = only(act, followedByStore(n -> n instanceof TypeInsnNode t && t.getOpcode() == CHECKCAST && t.desc.equals(STACK), 2), "slot-0 load");
    act.instructions.insert(load, helper("bullet", "(L" + STACK + ";)L" + STACK + ";"));

    // `ItemStack casing = bullet.getCasing(stack)` -> `TdTurretFreeAmmo.casing(bullet.getCasing(stack), stack, inventory.get(0))`
    AbstractInsnNode getCasing = only(act, followedByStore(call(INVOKEINTERFACE, BULLET, "getCasing", "(L" + STACK + ";)L" + STACK + ";"), 4), "getCasing call");
    act.instructions.insert(getCasing, of(
        new VarInsnNode(ALOAD, 2),
        new VarInsnNode(ALOAD, 0),
        new FieldInsnNode(GETFIELD, GUN, "inventory", "L" + LIST + ";"),
        new InsnNode(ICONST_0),
        new MethodInsnNode(INVOKEVIRTUAL, LIST, "get", "(I)Ljava/lang/Object;", false),
        new TypeInsnNode(CHECKCAST, STACK),
        helper("casing", "(L" + STACK + ";L" + STACK + ";L" + STACK + ";)L" + STACK + ";")));

    return write(cn, "canActivate", "activate");
  }

  static byte[] patchChem(byte[] orig) throws AnalyzerException {
    ClassNode cn = read(orig);

    // canActivate: `tank.getFluidAmount() > 0` -> the getFluidAmount call becomes `pop; iconst_1`
    MethodNode ca = find(cn, "canActivate", "()Z");
    AbstractInsnNode amount = only(ca, call(INVOKEVIRTUAL, TANK, "getFluidAmount", "()I"), "FluidTank.getFluidAmount call");
    ca.instructions.insert(amount, of(new InsnNode(POP), new InsnNode(ICONST_1)));
    ca.instructions.remove(amount);

    // `FluidStack fs = tank.getFluid().copy()` -> `FluidStack fs = TdTurretFreeAmmo.fluid(tank.getFluid().copy())`
    MethodNode act = find(cn, "activate", "()V");
    AbstractInsnNode copy = only(act, followedByStore(call(INVOKEVIRTUAL, FLUID, "copy", "()L" + FLUID + ";"), 1), "FluidStack.copy call");
    act.instructions.insert(copy, helper("fluid", "(L" + FLUID + ";)L" + FLUID + ";"));

    return write(cn, "canActivate", "activate");
  }

  public static void main(String[] a) throws Exception {
    Path in = Paths.get(a[0]), helperClass = Paths.get(a[1]), out = Paths.get(a[2]);
    String gunEntry = GUN + ".class", chemEntry = CHEM + ".class", helperEntry = HELPER + ".class";
    Map<String, byte[]> replaced = new HashMap<>();
    try (ZipFile zf = new ZipFile(in.toFile())) {
      if (zf.getEntry(helperEntry) != null) throw new IllegalStateException("input jar already has " + helperEntry);
      replaced.put(gunEntry, patchGun(zf.getInputStream(zf.getEntry(gunEntry)).readAllBytes()));
      replaced.put(chemEntry, patchChem(zf.getInputStream(zf.getEntry(chemEntry)).readAllBytes()));
    }
    byte[] helperBytes = Files.readAllBytes(helperClass);
    if (!read(helperBytes).name.equals(HELPER)) throw new IllegalStateException("helper class is not " + HELPER);

    // write the new jar: replace the two classes, add the helper, drop signature files and keep
    // only the manifest's main section (a no-op on a jar PatchTeslaCoil already unsigned)
    try (ZipFile zf = new ZipFile(in.toFile()); ZipOutputStream zo = new ZipOutputStream(Files.newOutputStream(out))) {
      Enumeration<? extends ZipEntry> en = zf.entries();
      int copied = 0, dropped = 0;
      while (en.hasMoreElements()) {
        ZipEntry e = en.nextElement();
        String name = e.getName();
        if (name.equals("META-INF/SIGNFILE.SF") || name.equals("META-INF/SIGNFILE.DSA")) { dropped++; continue; }
        byte[] data;
        if (replaced.containsKey(name)) data = replaced.get(name);
        else if (name.equals("META-INF/MANIFEST.MF")) {
          String mf = new String(zf.getInputStream(e).readAllBytes(), "UTF-8");
          int cut = mf.indexOf("\r\n\r\n"); if (cut < 0) cut = mf.indexOf("\n\n");
          data = ((cut < 0 ? mf : mf.substring(0, cut)).trim() + "\r\n\r\n").getBytes("UTF-8");
        } else data = zf.getInputStream(e).readAllBytes();
        ZipEntry ne = new ZipEntry(name);
        ne.setTime(e.getTime());
        zo.putNextEntry(ne); zo.write(data); zo.closeEntry(); copied++;
        if (name.equals(gunEntry)) {
          ZipEntry he = new ZipEntry(helperEntry);
          he.setTime(e.getTime());
          zo.putNextEntry(he); zo.write(helperBytes); zo.closeEntry(); copied++;
        }
      }
      System.out.println("entries written=" + copied + " dropped=" + dropped + " (helper added after " + gunEntry + ")");
    }
  }
}
