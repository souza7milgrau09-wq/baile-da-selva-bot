function defineCommand(definition) {
  if (!definition || !definition.name || typeof definition.execute !== "function") {
    throw new TypeError("Comando invalido: name e execute sao obrigatorios.");
  }

  return Object.freeze({
    name: String(definition.name).toLowerCase(),
    description: definition.description || "Sem descricao.",
    category: definition.category || "Outros",
    aliases: (definition.aliases || []).map((alias) => String(alias).toLowerCase()),
    usage: definition.usage || "",
    examples: definition.examples || [],
    cooldown: Number(definition.cooldown || 3),
    userPermissions: definition.userPermissions || [],
    botPermissions: definition.botPermissions || [],
    ownerOnly: Boolean(definition.ownerOnly),
    guildOnly: definition.guildOnly !== false,
    hidden: Boolean(definition.hidden),
    feature: definition.feature || "",
    allowedRoleIds: definition.allowedRoleIds || [],
    allowedChannelIds: definition.allowedChannelIds || [],
    execute: definition.execute
  });
}

module.exports = { defineCommand };
