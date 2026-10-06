package blusunrize.immersiveengineering.common.blocks.metal;

import blusunrize.immersiveengineering.common.config.IEServerConfig;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.fluids.FluidStack;
import net.minecraftforge.registries.ForgeRegistries;

/**
 * Free ammo for Immersive Engineering's Gun Turret and Chemthrower Turret. Added to the IE jar by
 * PatchTurretFreeAmmo, which also splices calls to these methods into TurretGunBlockEntity and
 * TurretChemBlockEntity. Ammo a player loads is still used first, and used up as usual.
 *
 * Compiled against the dedicated server's SRG-named Minecraft jar, so vanilla members carry SRG
 * names: m_41619_ is ItemStack#isEmpty, f_41583_ is ItemStack.EMPTY.
 */
public final class TdTurretFreeAmmo {
  private TdTurretFreeAmmo() {}

  /** The round a Gun Turret fires: the loaded stack, or a new Casull Cartridge when the slot is empty. */
  public static ItemStack bullet(ItemStack loaded) {
    if (!loaded.m_41619_()) return loaded;
    return new ItemStack(ForgeRegistries.ITEMS.getValue(new ResourceLocation("immersiveengineering", "casull")));
  }

  /**
   * The casing a shot leaves. A free round leaves none, so free fire never fills the casing slot
   * (a full slot stops the turret) or drops casings on the ground.
   */
  public static ItemStack casing(ItemStack casing, ItemStack fired, ItemStack loaded) {
    return fired == loaded ? casing : ItemStack.f_41583_;
  }

  /** The fluid a Chemthrower Turret sprays: the tank's, or creosote when the tank holds less than one shot. */
  public static FluidStack fluid(FluidStack tank) {
    int perShot = IEServerConfig.TOOLS.chemthrower_consumption.get();
    if (tank.getAmount() >= perShot) return tank;
    return new FluidStack(ForgeRegistries.FLUIDS.getValue(new ResourceLocation("immersiveengineering", "creosote")), Math.max(1000, perShot));
  }
}
