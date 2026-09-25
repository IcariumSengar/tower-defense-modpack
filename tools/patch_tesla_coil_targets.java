import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/**
 * Rewrites Immersive Engineering's TeslaCoilBlockEntity so players and SecurityCraft Sentries are
 * never Tesla Coil targets (2026-09-22, third "the tesla coil is still zapping me" report - the
 * mod has no ownership concept, and a KubeJS hurt-event cancel can only react after the coil has
 * already picked its target, fired the bolt and spent the active-shock energy).
 *
 * What it changes in the class (see docs/MODS.md, patched-jars section):
 *  - adds  private static boolean td$blocked(Entity)  = instanceof Player | class name equals
 *    net.geforcemods.securitycraft.entity.sentry.Sentry (name match: no hard SecurityCraft ref);
 *  - rewrites the target predicate lambda$tickServer$1(AABB, Entity) branch-free (no stack-map
 *    frames to maintain) to also require !td$blocked(e);
 *  - in tickServer's residual-field loop, jumps to the existing "skip this entity" label when
 *    td$blocked(e) - reuses javac's own frame at that label, so no new frames there either.
 * The original jar is signed: the two signature files are dropped and the manifest is cut to its
 * main section, otherwise the modified entry would fail digest verification at load.
 *
 * Build/run (JDK 17, ASM 9.8 from the dedicated server's Forge libraries):
 *   javac -cp "asm-9.8.jar;asm-tree-9.8.jar" tools/patch_tesla_coil_targets.java   (class name PatchTeslaCoil)
 *   java  -cp "asm-9.8.jar;asm-tree-9.8.jar;." PatchTeslaCoil <original IE jar> <patched jar>
 * Verify: javap -c -p on the patched class; entry count = original - 2. Refuses to run if the
 * lambda's shape no longer matches (IE updated) - re-derive the patch from a fresh decompile then.
 */
public class PatchTeslaCoil implements Opcodes {
  static final String CLS = "blusunrize/immersiveengineering/common/blocks/metal/TeslaCoilBlockEntity";
  static final String ENTITY = "net/minecraft/world/entity/Entity";
  static final String LIVING = "net/minecraft/world/entity/LivingEntity";
  static final String PLAYER = "net/minecraft/world/entity/player/Player";
  static final String AABB = "net/minecraft/world/phys/AABB";
  static final String SENTRY = "net.geforcemods.securitycraft.entity.sentry.Sentry";

  /** next real instruction, skipping labels / line numbers / frames */
  static AbstractInsnNode nextReal(AbstractInsnNode n) {
    n = n.getNext();
    while (n != null && n.getOpcode() == -1) n = n.getNext();
    return n;
  }

  static MethodNode find(ClassNode cn, String name, String desc) {
    for (MethodNode m : cn.methods) if (m.name.equals(name) && m.desc.equals(desc)) return m;
    throw new IllegalStateException("method not found: " + name + desc);
  }

  public static void main(String[] a) throws Exception {
    Path in = Paths.get(a[0]), out = Paths.get(a[1]);
    String entry = CLS + ".class";
    byte[] orig;
    try (ZipFile zf = new ZipFile(in.toFile())) { orig = zf.getInputStream(zf.getEntry(entry)).readAllBytes(); }
    ClassNode cn = new ClassNode();
    new ClassReader(orig).accept(cn, ClassReader.EXPAND_FRAMES);

    // 1) new helper: private static boolean td$blocked(Entity e) { return e instanceof Player | e.getClass().getName().equals(SENTRY); }
    MethodNode blocked = new MethodNode(ACC_PRIVATE | ACC_STATIC | ACC_SYNTHETIC, "td$blocked", "(L" + ENTITY + ";)Z", null, null);
    InsnList b = blocked.instructions;
    b.add(new VarInsnNode(ALOAD, 0));
    b.add(new TypeInsnNode(INSTANCEOF, PLAYER));
    b.add(new VarInsnNode(ALOAD, 0));
    b.add(new MethodInsnNode(INVOKEVIRTUAL, "java/lang/Object", "getClass", "()Ljava/lang/Class;", false));
    b.add(new MethodInsnNode(INVOKEVIRTUAL, "java/lang/Class", "getName", "()Ljava/lang/String;", false));
    b.add(new LdcInsnNode(SENTRY));
    b.add(new MethodInsnNode(INVOKEVIRTUAL, "java/lang/String", "equals", "(Ljava/lang/Object;)Z", false));
    b.add(new InsnNode(IOR));
    b.add(new InsnNode(IRETURN));
    cn.methods.add(blocked);

    // 2) target-pick predicate lambda$tickServer$1(AABB, Entity): rewritten branch-free (no stack-map frames needed)
    MethodNode lam = find(cn, "lambda$tickServer$1", "(L" + AABB + ";L" + ENTITY + ";)Z");
    boolean sawInstanceof = false, sawIntersects = false;
    for (AbstractInsnNode n : lam.instructions) {
      if (n instanceof TypeInsnNode t && t.getOpcode() == INSTANCEOF && t.desc.equals(LIVING)) sawInstanceof = true;
      if (n instanceof MethodInsnNode m && m.owner.equals(AABB) && m.name.equals("m_82381_")) sawIntersects = true;
    }
    if (!sawInstanceof || !sawIntersects) throw new IllegalStateException("lambda shape changed - refusing to patch");
    lam.instructions.clear(); lam.tryCatchBlocks.clear(); lam.localVariables = null;
    InsnList l = lam.instructions;
    l.add(new VarInsnNode(ALOAD, 1));
    l.add(new TypeInsnNode(INSTANCEOF, LIVING));
    l.add(new VarInsnNode(ALOAD, 0));
    l.add(new VarInsnNode(ALOAD, 1));
    l.add(new MethodInsnNode(INVOKEVIRTUAL, ENTITY, "m_20191_", "()L" + AABB + ";", false));
    l.add(new MethodInsnNode(INVOKEVIRTUAL, AABB, "m_82381_", "(L" + AABB + ";)Z", false));
    l.add(new InsnNode(IAND));
    l.add(new VarInsnNode(ALOAD, 1));
    l.add(new MethodInsnNode(INVOKESTATIC, CLS, "td$blocked", "(L" + ENTITY + ";)Z", false));
    l.add(new InsnNode(ICONST_1));
    l.add(new InsnNode(IXOR));
    l.add(new InsnNode(IAND));
    l.add(new InsnNode(IRETURN));

    // 3) tickServer residual-field loop: `checkcast Entity; astore 11; aload 11; aload 9; if_acmpeq L` -> also skip blocked entities via the same L
    MethodNode ts = find(cn, "tickServer", "()V");
    int patched = 0;
    for (AbstractInsnNode n : ts.instructions.toArray()) {
      if (!(n instanceof TypeInsnNode cc) || cc.getOpcode() != CHECKCAST || !cc.desc.equals(ENTITY)) continue;
      AbstractInsnNode s = nextReal(cc);
      if (!(s instanceof VarInsnNode st) || st.getOpcode() != ASTORE || st.var != 11) continue;
      AbstractInsnNode a1 = nextReal(st), a2 = a1 == null ? null : nextReal(a1), j = a2 == null ? null : nextReal(a2);
      if (!(a1 instanceof VarInsnNode v1) || v1.getOpcode() != ALOAD || v1.var != 11) continue;
      if (!(a2 instanceof VarInsnNode v2) || v2.getOpcode() != ALOAD || v2.var != 9) continue;
      if (!(j instanceof JumpInsnNode jn) || jn.getOpcode() != IF_ACMPEQ) continue;
      InsnList ins = new InsnList();
      ins.add(new VarInsnNode(ALOAD, 11));
      ins.add(new MethodInsnNode(INVOKESTATIC, CLS, "td$blocked", "(L" + ENTITY + ";)Z", false));
      ins.add(new JumpInsnNode(IFNE, jn.label));
      ts.instructions.insert(st, ins);
      patched++;
    }
    if (patched != 1) throw new IllegalStateException("expected exactly one residual-loop site, found " + patched);

    ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_MAXS);
    cn.accept(cw);
    byte[] bytes = cw.toByteArray();

    // 4) write the new jar: replace the class, drop the (now invalid) signature files, keep only the manifest's main section
    try (ZipFile zf = new ZipFile(in.toFile()); ZipOutputStream zo = new ZipOutputStream(Files.newOutputStream(out))) {
      Enumeration<? extends ZipEntry> en = zf.entries();
      int copied = 0, dropped = 0;
      while (en.hasMoreElements()) {
        ZipEntry e = en.nextElement();
        String name = e.getName();
        if (name.equals("META-INF/SIGNFILE.SF") || name.equals("META-INF/SIGNFILE.DSA")) { dropped++; continue; }
        byte[] data;
        if (name.equals(entry)) data = bytes;
        else if (name.equals("META-INF/MANIFEST.MF")) {
          String mf = new String(zf.getInputStream(e).readAllBytes(), "UTF-8");
          int cut = mf.indexOf("\r\n\r\n"); if (cut < 0) cut = mf.indexOf("\n\n");
          data = (mf.substring(0, cut).trim() + "\r\n\r\n").getBytes("UTF-8");
        } else data = zf.getInputStream(e).readAllBytes();
        ZipEntry ne = new ZipEntry(name);
        ne.setTime(e.getTime());
        zo.putNextEntry(ne); zo.write(data); zo.closeEntry(); copied++;
      }
      System.out.println("entries copied=" + copied + " dropped=" + dropped + " class bytes " + orig.length + " -> " + bytes.length);
    }
  }
}
