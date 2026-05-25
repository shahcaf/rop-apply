require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder and applications.json exist
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'applications.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

// Question mappings (20 questions)
const QUESTIONS = [
  { id: 'discord_tag', label: 'Discord Username' },
  { id: 'discord_id', label: 'Discord User ID' },
  { id: 'age', label: 'Age' },
  { id: 'timezone', label: 'Timezone / Country' },
  { id: 'hours_active', label: 'Hours Active Per Week' },
  { id: 'why_staff', label: 'Why do you want to join our staff team?' },
  { id: 'experience', label: 'What prior moderation/staff experience do you have?' },
  { id: 'strengths', label: 'What are your key strengths?' },
  { id: 'weaknesses', label: 'What are your weaknesses, and how do you manage them?' },
  { id: 'stress_handle', label: 'How do you handle stressful situations or conflict?' },
  { id: 'handle_spam', label: 'Scenario: A user is spamming links in chat. What do you do?' },
  { id: 'handle_argument', label: 'Scenario: Two members are arguing in text/voice. How do you de-escalate?' },
  { id: 'handle_dm_adv', label: 'Scenario: A member is reported for advertising in DMs. What do you do?' },
  { id: 'handle_abuse', label: 'Scenario: You suspect another staff member is abusing power. What do you do?' },
  { id: 'handle_nsfw', label: 'Scenario: A user posts NSFW content in general chat. What is your response?' },
  { id: 'handle_unsure', label: 'If you are unsure of a moderation decision, what do you do?' },
  { id: 'hobbies', label: 'What are your hobbies or interests outside of Discord?' },
  { id: 'server_mgmt', label: 'Do you have experience with server management, bots, or configurations?' },
  { id: 'guidelines_agree', label: 'Do you agree to follow all staff guidelines and remain active?' },
  { id: 'additional_info', label: 'Is there anything else you would like to share?' }
];

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let isBotReady = false;

client.once('ready', () => {
  console.log(`[Discord Bot] Logged in as ${client.user.tag}`);
  isBotReady = true;
});

// Helper functions for reading/writing applications database
function getApplications() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading applications file:', error);
    return {};
  }
}

function saveApplication(id, appData) {
  try {
    const apps = getApplications();
    apps[id] = appData;
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2));
  } catch (error) {
    console.error('Error saving application:', error);
  }
}

// Helper to make raw HTTPS POST requests to Discord Webhook URL
function sendDiscordWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(webhookUrl);
      const data = JSON.stringify(payload);
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      
      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(new Error(`Webhook status code ${res.statusCode}: ${responseBody}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Helper to make PATCH requests to Discord Webhook URL (for editing webhook messages)
function patchDiscordWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(webhookUrl);
      const data = JSON.stringify(payload);
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      
      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(new Error(`Webhook PATCH returned status code ${res.statusCode}: ${responseBody}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// REST Endpoint: Submit application
app.post('/api/apply', async (req, res) => {
  const formData = req.body;

  // Validate that all 20 answers are present
  const missingFields = [];
  for (const q of QUESTIONS) {
    if (!formData[q.id] || formData[q.id].trim() === '') {
      missingFields.push(q.label);
    }
  }

  if (missingFields.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `The following fields are required: ${missingFields.join(', ')}` 
    });
  }

  const useBot = isBotReady && process.env.DISCORD_CHANNEL_ID;
  const useWebhook = !useBot && process.env.DISCORD_WEBHOOK_URL;

  if (!useBot && !useWebhook) {
    return res.status(533).json({
      success: false,
      message: 'Discord integration is not configured. Please supply a valid Discord Bot token or Webhook URL.'
    });
  }

  // Generate unique ID
  const appId = 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

  // Save initial state to file
  const application = {
    id: appId,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    answers: formData
  };
  saveApplication(appId, application);

  // Get current site base URL dynamically
  const baseUrl = `${req.protocol}://${req.headers.host}`;

  // 1. Bot Method (Preferred - supports interactive Approve/Reject buttons)
  if (useBot) {
    try {
      const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        return res.status(500).json({
          success: false,
          message: 'Configured channel is not a valid text channel or is inaccessible to the bot.'
        });
      }

      // Construct Discord Embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2) // Discord Blurple
        .setTitle(`📝 New Staff Application - #${appId.split('_')[2]}`)
        .setDescription(`Submitted by: **${formData.discord_tag}** (ID: \`${formData.discord_id}\`)\nSubmitted at: <t:${Math.floor(Date.now() / 1000)}:f>`)
        .setTimestamp();

      // Add fields
      QUESTIONS.forEach((q, index) => {
        let answer = formData[q.id];
        if (answer.length > 1024) {
          answer = answer.substring(0, 1021) + '...';
        }
        embed.addFields({ name: `${index + 1}. ${q.label}`, value: answer || 'N/A', inline: false });
      });

      // Create Action Row with Buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_${appId}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_${appId}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger)
        );

      const msg = await channel.send({ embeds: [embed], components: [row] });
      
      application.discordMessageId = msg.id;
      application.discordChannelId = msg.channelId;
      saveApplication(appId, application);

      return res.json({ success: true, message: 'Application submitted successfully via Discord Bot!' });

    } catch (error) {
      console.error('Error sending application via Discord Bot:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send application to Discord via Bot.'
      });
    }
  } 
  // 2. Webhook Fallback Method (Used when bot token is not present)
  else {
    try {
      const fields = QUESTIONS.map((q, index) => {
        let answer = formData[q.id];
        if (answer.length > 1024) {
          answer = answer.substring(0, 1021) + '...';
        }
        return { name: `${index + 1}. ${q.label}`, value: answer || 'N/A', inline: false };
      });

      const webhookPayload = {
        username: 'Staff Application System',
        embeds: [
          {
            title: `📝 New Staff Application - #${appId.split('_')[2]}`,
            description: `Submitted by: **${formData.discord_tag}** (ID: \`${formData.discord_id}\`)\n` +
                         `Submitted at: <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
                         `⚡ **[🟢 Approve Application](${baseUrl}/review.html?id=${appId}&action=approve)** | **[🔴 Reject Application](${baseUrl}/review.html?id=${appId}&action=reject)**`,
            color: 5793266, // 0x5865F2
            fields: fields,
            footer: {
              text: 'Sent via Webhook | Click links above to review'
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      // Append ?wait=true to retrieve message ID in response
      const responseBody = await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL + '?wait=true', webhookPayload);
      const responseJson = JSON.parse(responseBody);
      
      application.status = 'pending'; // mark as pending (since review URL makes it interactive)
      application.discordMessageId = responseJson.id;
      saveApplication(appId, application);

      return res.json({ 
        success: true, 
        message: 'Application submitted successfully via Webhook!' 
      });

    } catch (error) {
      console.error('Error sending application via Webhook:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send application to Discord via Webhook.'
      });
    }
  }
});

// GET Endpoint: Fetch single application details (for Review Portal)
app.get('/api/application/:id', (req, res) => {
  const apps = getApplications();
  const application = apps[req.params.id];
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }
  res.json(application);
});

// POST Endpoint: Process review decision (from Review Portal)
app.post('/api/review/:id', async (req, res) => {
  const { action, reviewer } = req.body;
  const appId = req.params.id;

  if (!action || !reviewer) {
    return res.status(400).json({ success: false, message: 'Action and reviewer name are required.' });
  }

  const apps = getApplications();
  const application = apps[appId];

  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  if (application.status !== 'pending' && application.status !== 'sent_via_webhook') {
    return res.status(400).json({ success: false, message: 'Application has already been reviewed.' });
  }

  const isApprove = action === 'approve';
  application.status = isApprove ? 'approved' : 'rejected';
  application.reviewedBy = { tag: reviewer };
  application.reviewedAt = new Date().toISOString();
  saveApplication(appId, application);

  const discordMessageId = application.discordMessageId;

  // Case 1: Bot integration is active (edit message and disable buttons)
  if (isBotReady && application.discordChannelId && discordMessageId) {
    try {
      const channel = await client.channels.fetch(application.discordChannelId);
      const message = await channel.messages.fetch(discordMessageId);

      const originalEmbed = EmbedBuilder.from(message.embeds[0]);
      const newColor = isApprove ? 0x2ECC71 : 0xE74C3C;
      const newTitle = `📝 Staff Application #${appId.split('_')[2]} - ${isApprove ? 'APPROVED' : 'REJECTED'}`;

      originalEmbed.setColor(newColor);
      originalEmbed.setTitle(newTitle);
      originalEmbed.setDescription(
        `Submitted by: **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`)\n` +
        `Reviewed by: **${reviewer}** (Web Dashboard - ${isApprove ? 'Accepted' : 'Denied'})\n` +
        `Reviewed at: <t:${Math.floor(Date.now() / 1000)}:f>`
      );

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`approve_${appId}`).setLabel('Approved').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId(`reject_${appId}`).setLabel('Rejected').setStyle(ButtonStyle.Danger).setDisabled(true)
      );

      await message.edit({ embeds: [originalEmbed], components: [disabledRow] });

      // Post decision message to channel
      const actionText = isApprove 
        ? `✅ **Application Approved!** Applicant **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`) was accepted by **${reviewer}** (via Web Dashboard).`
        : `❌ **Application Rejected.** Applicant **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`) was denied by **${reviewer}** (via Web Dashboard).`;
      await channel.send(actionText);

      // DM Applicant
      try {
        const applicantUser = await client.users.fetch(application.answers.discord_id);
        if (applicantUser) {
          const dmEmbed = new EmbedBuilder()
            .setColor(newColor)
            .setTitle(`Staff Application Status - ${isApprove ? 'Accepted' : 'Rejected'}`)
            .setDescription(
              isApprove 
                ? `Congratulations **${application.answers.discord_tag}**! Your staff application has been **accepted**.\n\nA senior staff member will contact you shortly.`
                : `Hello **${application.answers.discord_tag}**.\n\nThank you for applying. Unfortunately, your staff application has been **denied** at this time.`
            )
            .setTimestamp();
          await applicantUser.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.log('Could not DM applicant:', dmError.message);
      }

    } catch (err) {
      console.error('Error updating bot message from dashboard:', err);
    }
  } 
  // Case 2: Webhook fallback is active (patch message to change color/status and remove action links)
  else if (process.env.DISCORD_WEBHOOK_URL && discordMessageId) {
    try {
      const fields = QUESTIONS.map((q, index) => {
        let answer = application.answers[q.id];
        if (answer.length > 1024) {
          answer = answer.substring(0, 1021) + '...';
        }
        return { name: `${index + 1}. ${q.label}`, value: answer || 'N/A', inline: false };
      });

      const patchPayload = {
        embeds: [
          {
            title: `📝 Staff Application #${appId.split('_')[2]} - ${isApprove ? 'APPROVED' : 'REJECTED'}`,
            description: `Submitted by: **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`)\n` +
                         `Reviewed by: **${reviewer}** (Web Dashboard - ${isApprove ? 'Accepted' : 'Denied'})\n` +
                         `Reviewed at: <t:${Math.floor(Date.now() / 1000)}:f>`,
            color: isApprove ? 3066993 : 15158332, // Green or Red
            fields: fields,
            footer: {
              text: 'Processed via Webhook'
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const patchUrl = `${process.env.DISCORD_WEBHOOK_URL}/messages/${discordMessageId}`;
      await patchDiscordWebhook(patchUrl, patchPayload);

    } catch (err) {
      console.error('Error updating webhook message:', err);
      return res.status(500).json({ success: false, message: 'Failed to update Discord webhook message.' });
    }
  }

  res.json({ success: true, message: 'Decision submitted and Discord message updated.' });
});

// Handle Button Interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, member } = interaction;
  
  // Custom IDs: approve_<appId> or reject_<appId>
  if (!customId.startsWith('approve_') && !customId.startsWith('reject_')) return;

  const isApprove = customId.startsWith('approve_');
  const appId = customId.substring(isApprove ? 8 : 7);

  // Load applications data
  const apps = getApplications();
  const application = apps[appId];

  if (!application) {
    return interaction.reply({ content: '⚠️ Error: Application not found in database.', ephemeral: true });
  }

  if (application.status !== 'pending') {
    return interaction.reply({ content: `⚠️ This application has already been marked as **${application.status.toUpperCase()}** by ${application.reviewedBy?.tag || 'unknown'}.`, ephemeral: true });
  }

  // Check Staff/Moderator permission
  const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID;
  const isAuthorized = staffRoleId 
    ? member.roles.cache.has(staffRoleId) 
    : (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild));

  if (!isAuthorized) {
    return interaction.reply({ content: '❌ You do not have the required staff permissions to review this application.', ephemeral: true });
  }

  // Defer update to prevent timeout
  await interaction.deferUpdate();

  // Update application state
  application.status = isApprove ? 'approved' : 'rejected';
  application.reviewedBy = {
    id: user.id,
    tag: user.tag
  };
  application.reviewedAt = new Date().toISOString();
  saveApplication(appId, application);

  // Edit Original Embed
  const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
  const newColor = isApprove ? 0x2ECC71 : 0xE74C3C; // Green or Red
  const newTitle = `📝 Staff Application #${appId.split('_')[2]} - ${isApprove ? 'APPROVED' : 'REJECTED'}`;
  
  originalEmbed.setColor(newColor);
  originalEmbed.setTitle(newTitle);
  originalEmbed.setDescription(
    `Submitted by: **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`)\n` +
    `Reviewed by: **${user.tag}** (${isApprove ? 'Accepted' : 'Denied'})\n` +
    `Reviewed at: <t:${Math.floor(Date.now() / 1000)}:f>`
  );

  // Disable buttons on the row
  const disabledRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${appId}`)
        .setLabel('Approved')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`reject_${appId}`)
        .setLabel('Rejected')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

  // Update message
  await interaction.editReply({ embeds: [originalEmbed], components: [disabledRow] });

  // Post announcement/alert in the moderation channel
  const announceChannel = interaction.channel;
  if (announceChannel) {
    const actionText = isApprove 
      ? `✅ **Application Approved!** Applicant **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`) was accepted by **${user.tag}**.`
      : `❌ **Application Rejected.** Applicant **${application.answers.discord_tag}** (ID: \`${application.answers.discord_id}\`) was denied by **${user.tag}**.`;
    
    await announceChannel.send(actionText);
  }

  // Attempt to DM the applicant
  try {
    const applicantUser = await client.users.fetch(application.answers.discord_id);
    if (applicantUser) {
      const dmEmbed = new EmbedBuilder()
        .setColor(newColor)
        .setTitle(`Staff Application Status - ${isApprove ? 'Accepted' : 'Rejected'}`)
        .setDescription(
          isApprove 
            ? `Congratulations **${application.answers.discord_tag}**! Your staff application has been **accepted**.\n\nA senior staff member will contact you shortly with instructions.`
            : `Hello **${application.answers.discord_tag}**.\n\nThank you for applying. Unfortunately, your staff application has been **denied** at this time. You may apply again in the future.`
        )
        .setTimestamp();
      
      await applicantUser.send({ embeds: [dmEmbed] });
    }
  } catch (dmError) {
    console.log(`Could not send DM to applicant (${application.answers.discord_tag}): DM channel closed or invalid user ID.`);
  }
});

// Start bot client if token is provided
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to log in to Discord. Check your DISCORD_TOKEN in .env:', err.message);
  });
} else {
  console.warn('[Warning] DISCORD_TOKEN is missing in the .env file. The Discord Bot will not run.');
}

// Start Express Server
app.listen(PORT, () => {
  console.log(`[Express] Server is running on http://localhost:${PORT}`);
});
