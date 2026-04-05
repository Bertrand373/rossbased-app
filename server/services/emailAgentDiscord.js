// server/services/emailAgentDiscord.js
// ============================================================
// EMAIL AGENT — Discord Integration Layer
// ============================================================
//
// Wires the email agent into the Discord bot:
// - Admin DM commands (!agent status, !agent send, etc.)
// - Cron trigger: fires every Sunday at noon ET
// - Approval flow (reaction-based send/cancel)
//
// USAGE: Import and wire into discord-bot.js (see wiring instructions below)

const { EmbedBuilder } = require('discord.js');
const emailAgent = require('./emailAgent');
const EmailAgentState = require('../models/EmailAgentState');

const AGENT_COLOR = 0x7C3AED; // Purple for agent messages

// Track pending approval messages
const pendingApprovals = new Map(); // messageId -> { kitBroadcastId, sendAt }

// ============================================================
// ADMIN COMMAND HANDLER — called from discord-bot.js
// ============================================================

async function handleAgentCommand(message, adminDmFooter) {
  const args = message.content.trim().split(/\s+/).slice(1); // remove "!agent"
  const subCommand = (args[0] || '').toLowerCase();

  switch (subCommand) {
    case 'status':  return handleStatus(message, adminDmFooter);
    case 'send':
    case 'run':     return handleManualRun(message, adminDmFooter);
    case 'tier':    return handleTierConfig(message, args.slice(1), adminDmFooter);
    case 'mode':    return handleModeConfig(message, args.slice(1));
    case 'cadence': return handleCadenceConfig(message, args.slice(1));
    case 'stats':
    case 'eval':    return handleEvalStats(message, adminDmFooter);
    case 'help':
    default:        return handleHelp(message);
  }
}

// ============================================================
// !agent status
// ============================================================

async function handleStatus(message, footer) {
  try {
    const status = await emailAgent.getAgentStatus();

    let desc = `**Warmup Tier:** ${status.currentTier} — ${status.tierLabel}\n`;
    desc += `**Mode:** ${status.approvalMode}\n`;
    desc += `**Schedule:** ${status.sendDay} at ${status.sendHour}\n`;
    desc += `**Cadence:** ${status.cadence}\n`;
    desc += `**Total Sent:** ${status.totalSent}\n`;
    desc += `**Consecutive Good Sends:** ${status.consecutiveGoodSends}\n\n`;

    if (status.lastSend) {
      desc += `**Last Send:**\n`;
      desc += `Subject: "${status.lastSend.subject}"\n`;
      desc += `Sent: ${status.lastSend.sentAt ? new Date(status.lastSend.sentAt).toLocaleDateString() : 'N/A'}\n`;
      desc += `Open Rate: ${status.lastSend.openRate}\n`;
      desc += `Recipients: ${status.lastSend.recipients || 'N/A'}\n`;
      desc += `Tier: ${status.lastSend.tier}\n\n`;
    }

    desc += `**Tier Tags (Kit):**\n`;
    desc += `T1: ${status.tierTags.tier1 || '⚠️ NOT SET'}\n`;
    desc += `T2: ${status.tierTags.tier2 || 'not set'}\n`;
    desc += `T3: ${status.tierTags.tier3 || 'not set'}\n`;
    desc += `T4: ${status.tierTags.tier4 || 'full list (default)'}\n`;

    await message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(AGENT_COLOR)
        .setTitle('📧 Email Agent Status')
        .setDescription(desc)
        .setTimestamp()
    ]});
  } catch (err) {
    await message.channel.send(`Agent status error: ${err.message}`);
  }
}

// ============================================================
// !agent send — Manually trigger the pipeline
// ============================================================

async function handleManualRun(message, footer) {
  await message.reply({ embeds: [
    new EmbedBuilder()
      .setColor(AGENT_COLOR)
      .setDescription('⏳ Email Agent is analyzing community data and drafting...')
  ]});

  try {
    const result = await emailAgent.runEmailPipeline();

    // Send intelligence summary
    let intelDesc = `**Targeting:** Tier ${result.tier} — ${result.tierLabel}\n`;
    intelDesc += `**Mode:** ${result.mode}\n`;
    if (result.kitBroadcastId) intelDesc += `**Kit Broadcast ID:** ${result.kitBroadcastId}\n`;
    if (result.intel.topTopics.length > 0) {
      intelDesc += `**Top Topics:** ${result.intel.topTopics.map(t => `${t.topic}(${t.count})`).join(', ')}\n`;
    }
    if (result.intel.lunar?.label) {
      intelDesc += `**Lunar:** ${result.intel.lunar.label}\n`;
    }
    const sd = result.intel.streaks;
    intelDesc += `**Streaks:** ${sd.totalTracking} tracking (${sd.under30} early, ${sd.range30to90} building, ${sd.range90to180} deep, ${sd.over180} masters)\n`;
    intelDesc += `**YT Comments:** ${result.intel.ytCommentCount} this week`;

    await message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(AGENT_COLOR)
        .setTitle('📊 Agent Intelligence')
        .setDescription(intelDesc)
        .setTimestamp()
    ]});

    // Send the draft as plain text (so Ross can read/copy it)
    const draftHeader = `📧 **Email Draft — "${result.subject}"**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    const fullDraft = draftHeader + result.body;

    // Chunk for Discord 2000 char limit
    const chunks = chunkText(fullDraft, 1900);
    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }

    // Approval flow
    if (result.mode === 'approve' && result.kitBroadcastId) {
      const approvalMsg = await message.channel.send({ embeds: [
        new EmbedBuilder()
          .setColor(0x22C55E)
          .setTitle('✅ Approve or ❌ Cancel')
          .setDescription(
            `React ✅ to confirm the broadcast will send\n` +
            `React ❌ to cancel and delete it from Kit\n\n` +
            `Kit Broadcast ID: ${result.kitBroadcastId}\n` +
            `If no reaction in 25 min, you'll need to handle it in Kit manually.`
          )
          .setFooter({ text: 'Email Agent' })
      ]});

      await approvalMsg.react('✅');
      await approvalMsg.react('❌');

      pendingApprovals.set(approvalMsg.id, {
        kitBroadcastId: result.kitBroadcastId,
        sendAt: result.sendAt
      });

      // Auto-clear after 30 min
      setTimeout(() => pendingApprovals.delete(approvalMsg.id), 30 * 60 * 1000);

    } else if (result.mode === 'draft-only') {
      await message.channel.send({ embeds: [
        new EmbedBuilder()
          .setColor(AGENT_COLOR)
          .setDescription(
            result.kitBroadcastId
              ? `📝 Draft created in Kit. ID: ${result.kitBroadcastId}\nLog into Kit to review and send manually.`
              : `📝 Draft generated above. Copy into Kit manually.`
          )
      ]});
    } else if (!result.kitBroadcastId) {
      await message.channel.send({ embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setDescription('⚠️ Kit broadcast creation failed. Copy the draft above into Kit manually.')
      ]});
    }

  } catch (err) {
    console.error('[EmailAgent] Pipeline error:', err);
    await message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0xEF4444)
        .setDescription(`Email Agent pipeline failed: ${err.message}`)
    ]});
  }
}

// ============================================================
// !agent tier <1-4> <tagId>
// ============================================================

async function handleTierConfig(message, args, footer) {
  const tier = parseInt(args[0]);
  const tagId = args[1];

  if (!tier || tier < 1 || tier > 4) {
    return message.channel.send('Usage: `!agent tier <1-4> <kit_tag_id>`\nExample: `!agent tier 2 17485999`');
  }
  if (!tagId) {
    return message.channel.send(
      `Set tag ID for tier ${tier}.\n` +
      `Usage: \`!agent tier ${tier} <tag_id>\`\n` +
      `Find tag IDs in Kit → Subscribers → Tags (click tag, ID is in the URL)`
    );
  }

  await emailAgent.setTierTag(tier, tagId);
  await message.channel.send({ embeds: [
    new EmbedBuilder()
      .setColor(0x22C55E)
      .setDescription(`✅ Tier ${tier} tag set to \`${tagId}\``)
  ]});
}

// ============================================================
// !agent mode <approve|auto-send|draft-only>
// ============================================================

async function handleModeConfig(message, args) {
  const mode = (args[0] || '').toLowerCase();
  const valid = ['approve', 'auto-send', 'draft-only'];
  if (!valid.includes(mode)) {
    return message.channel.send(`Usage: \`!agent mode <${valid.join('|')}>\``);
  }
  await emailAgent.setApprovalMode(mode);
  await message.channel.send({ embeds: [
    new EmbedBuilder()
      .setColor(0x22C55E)
      .setDescription(`✅ Approval mode set to **${mode}**`)
  ]});
}

// ============================================================
// !agent cadence <weekly|twice-weekly>
// ============================================================

async function handleCadenceConfig(message, args) {
  const cadence = (args[0] || '').toLowerCase();
  if (!['weekly', 'twice-weekly'].includes(cadence)) {
    return message.channel.send('Usage: `!agent cadence <weekly|twice-weekly>`');
  }
  await emailAgent.setCadence(cadence);
  await message.channel.send({ embeds: [
    new EmbedBuilder()
      .setColor(0x22C55E)
      .setDescription(`✅ Cadence set to **${cadence}**`)
  ]});
}

// ============================================================
// !agent stats — Evaluate last broadcast
// ============================================================

async function handleEvalStats(message, footer) {
  try {
    const state = await EmailAgentState.getState();
    const broadcastId = state.lastBroadcast?.kitBroadcastId;

    if (!broadcastId) {
      return message.channel.send('No previous broadcast to evaluate.');
    }

    const result = await emailAgent.evaluateLastSend(broadcastId);
    if (!result) {
      return message.channel.send('Could not fetch broadcast stats. Try again later.');
    }

    let desc = `**Open Rate:** ${(result.openRate * 100).toFixed(1)}%\n`;
    desc += `**Click Rate:** ${(result.clickRate * 100).toFixed(1)}%\n`;
    desc += `**Recipients:** ${result.recipients}\n`;
    desc += `**Unsubscribes:** ${result.unsubscribes}\n\n`;
    desc += `**Tier Decision:** ${result.tierDecision}\n`;
    desc += `**Current Tier:** ${result.newTier} — ${emailAgent.TIER_LABELS[result.newTier]}`;

    await message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(result.openRate >= 0.40 ? 0x22C55E : result.openRate >= 0.20 ? 0xF59E0B : 0xEF4444)
        .setTitle('📊 Broadcast Evaluation')
        .setDescription(desc)
        .setTimestamp()
    ]});
  } catch (err) {
    await message.channel.send(`Evaluation error: ${err.message}`);
  }
}

// ============================================================
// !agent help
// ============================================================

async function handleHelp(message) {
  const help = `**Email Agent Commands:**\n\n` +
    `\`!agent status\` — Current tier, mode, last send stats\n` +
    `\`!agent send\` — Manually trigger the pipeline NOW\n` +
    `\`!agent tier <1-4> <tag_id>\` — Set Kit tag for a warmup tier\n` +
    `\`!agent mode <approve|auto-send|draft-only>\` — Set approval mode\n` +
    `\`!agent cadence <weekly|twice-weekly>\` — Set send frequency\n` +
    `\`!agent stats\` — Evaluate last broadcast open rates\n` +
    `\`!agent help\` — This message`;

  await message.channel.send({ embeds: [
    new EmbedBuilder()
      .setColor(AGENT_COLOR)
      .setTitle('📧 Email Agent')
      .setDescription(help)
  ]});
}

// ============================================================
// REACTION HANDLER — Approve or cancel broadcasts
// ============================================================

async function handleAgentReaction(reaction, user) {
  const pending = pendingApprovals.get(reaction.message.id);
  if (!pending) return false; // Not an agent message

  if (reaction.emoji.name === '❌') {
    const success = await emailAgent.cancelScheduledBroadcast(pending.kitBroadcastId);
    await reaction.message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(success ? 0xF59E0B : 0xEF4444)
        .setDescription(success
          ? `❌ Broadcast ${pending.kitBroadcastId} cancelled and deleted from Kit.`
          : `Failed to cancel broadcast. Check Kit manually.`)
    ]});
    pendingApprovals.delete(reaction.message.id);
    return true;
  }

  if (reaction.emoji.name === '✅') {
    await reaction.message.channel.send({ embeds: [
      new EmbedBuilder()
        .setColor(0x22C55E)
        .setDescription(`✅ Broadcast ${pending.kitBroadcastId} confirmed. It will send from Kit as scheduled.`)
    ]});
    pendingApprovals.delete(reaction.message.id);
    return true;
  }

  return false;
}

// ============================================================
// CRON REGISTRATION — Called once from discord-bot.js on ready
// ============================================================

function registerEmailAgentCron(client, findAdminMember) {
  console.log('[EmailAgent] Cron registered — Sunday noon ET');

  function getETHour() {
    return parseInt(new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York', hour: 'numeric', hour12: false
    }));
  }

  function getETDay() {
    // Returns 0=Sunday, 1=Monday, ... 6=Saturday
    return new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'narrow' }) === 'S'
      ? (() => {
          const d = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
          return d === 'Sunday' ? 0 : 6;
        })()
      : parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'numeric' })) - 1;
    // toLocaleString weekday numeric: Sunday=1, Monday=2, etc. → subtract 1
  }

  function getTodayET() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }

  let lastAgentRunDate = null;

  // ---- EMAIL AGENT CRON (check every hour) ----
  setInterval(async () => {
    try {
      const state = await EmailAgentState.getState();
      const dayOfWeek = getETDay();
      const etHour = getETHour();

      // Check if it's the right day and hour
      if (dayOfWeek !== state.sendDay) return;  // Default: 0 (Sunday)
      if (etHour !== state.sendHour) return;     // Default: 12 (noon ET)

      const today = getTodayET();
      if (lastAgentRunDate === today) return;
      lastAgentRunDate = today;

      console.log('[EmailAgent] Sunday noon cron trigger firing...');

      // Verify tier 1 tag is set
      if (!state.tierTags.tier1) {
        console.log('[EmailAgent] Tier 1 tag not set. Skipping.');
        const admin = await findAdminMember();
        if (admin) {
          await admin.send({ embeds: [
            new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle('⚠️ Email Agent — Tag Missing')
              .setDescription('Tier 1 tag is not configured. Run `!agent tier 1 <tag_id>` to set it.')
          ]});
        }
        return;
      }

      // Run the pipeline
      const result = await emailAgent.runEmailPipeline();

      // DM Ross
      const admin = await findAdminMember();
      if (!admin) return;

      // Intelligence embed
      let intelDesc = `**Tier:** ${result.tier} — ${result.tierLabel}\n`;
      if (result.kitBroadcastId) intelDesc += `**Kit ID:** ${result.kitBroadcastId}\n`;
      const sd = result.intel.streaks;
      intelDesc += `**Streaks:** ${sd.totalTracking} tracking\n`;
      if (result.intel.topTopics.length > 0) {
        intelDesc += `**Topics:** ${result.intel.topTopics.slice(0, 3).map(t => t.topic).join(', ')}\n`;
      }

      await admin.send({ embeds: [
        new EmbedBuilder()
          .setColor(AGENT_COLOR)
          .setTitle('📧 Email Agent — Sunday Email')
          .setDescription(intelDesc)
          .setTimestamp()
      ]});

      // Send draft as plain text
      const draftText = `📧 **"${result.subject}"**\n━━━━━━━━━━━━━━━━━━\n\n${result.body}`;
      const chunks = chunkText(draftText, 1900);
      for (const chunk of chunks) {
        await admin.send(chunk);
      }

      // Approval embed if needed
      if (result.mode === 'approve' && result.kitBroadcastId) {
        const approvalMsg = await admin.send({ embeds: [
          new EmbedBuilder()
            .setColor(0x22C55E)
            .setTitle('✅ Approve or ❌ Cancel')
            .setDescription(
              `React ✅ to confirm | ❌ to cancel and delete from Kit\n` +
              `Kit ID: ${result.kitBroadcastId}\n\n` +
              `If no reaction in 25 min, handle in Kit manually.`
            )
        ]});
        await approvalMsg.react('✅');
        await approvalMsg.react('❌');
        pendingApprovals.set(approvalMsg.id, {
          kitBroadcastId: result.kitBroadcastId,
          sendAt: result.sendAt
        });
        setTimeout(() => pendingApprovals.delete(approvalMsg.id), 30 * 60 * 1000);

      } else if (!result.kitBroadcastId) {
        await admin.send({ embeds: [
          new EmbedBuilder()
            .setColor(0xF59E0B)
            .setDescription('⚠️ Kit broadcast creation failed. Copy draft above into Kit manually.')
        ]});
      }

    } catch (err) {
      console.error('[EmailAgent] Cron error:', err.message);
    }
  }, 60 * 60 * 1000); // Check every hour
}

// ============================================================
// UTILITY
// ============================================================

function chunkText(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let splitAt = remaining.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }
  return chunks;
}

module.exports = {
  handleAgentCommand,
  handleAgentReaction,
  registerEmailAgentCron
};
