package com.mattf.examplemod;

import net.minecraftforge.fml.common.Mod;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod(ExampleMod.MOD_ID)
public class ExampleMod {

    public static final String MOD_ID = "examplemod";
    private static final Logger LOGGER = LogManager.getLogger();

    public ExampleMod() {
        LOGGER.info("ExampleMod loaded");
    }
}
