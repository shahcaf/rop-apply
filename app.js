// ============================================================
// CONFIGURATION — Edit these values for your Discord server
// ============================================================
const CONFIG = {
  WEBHOOK_URL: 'https://discord.com/api/webhooks/1508490753784152229/2wKdOZuCETLKraReRhbHuCkWFJ0B7OsB690dzcSaMF_dxruSjjoG_ScyYdmxJg3kxBvL',
  SERVER_NAME: 'Our Discord Server'
};
// ============================================================

const QUESTIONS = [
  { id: 'discord_tag',     label: 'Discord Username' },
  { id: 'discord_id',     label: 'Discord User ID' },
  { id: 'age',            label: 'Age' },
  { id: 'timezone',       label: 'Timezone / Country' },
  { id: 'hours_active',   label: 'Hours Active Per Week' },
  { id: 'why_staff',      label: 'Why do you want to join our staff team?' },
  { id: 'experience',     label: 'What prior moderation/staff experience do you have?' },
  { id: 'strengths',      label: 'What are your key strengths?' },
  { id: 'weaknesses',     label: 'What are your weaknesses, and how do you manage them?' },
  { id: 'stress_handle',  label: 'How do you handle stressful situations or conflict?' },
  { id: 'handle_spam',    label: 'Scenario: A user is spamming links in chat. What do you do?' },
  { id: 'handle_argument',label: 'Scenario: Two members are arguing in text/voice. How do you de-escalate?' },
  { id: 'handle_dm_adv',  label: 'Scenario: A member is reported for advertising in DMs. What do you do?' },
  { id: 'handle_abuse',   label: 'Scenario: You suspect another staff member is abusing power. What do you do?' },
  { id: 'handle_nsfw',    label: 'Scenario: A user posts NSFW content in general chat. What is your response?' },
  { id: 'handle_unsure',  label: 'If you are unsure of a moderation decision, what do you do?' },
  { id: 'hobbies',        label: 'What are your hobbies or interests outside of Discord?' },
  { id: 'server_mgmt',    label: 'Do you have experience with server management, bots, or configurations?' },
  { id: 'guidelines_agree', label: 'Do you agree to follow all staff guidelines and remain active?' },
  { id: 'additional_info', label: 'Is there anything else you would like to share?' }
];

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('staff-app-form');
  const sections   = document.querySelectorAll('.form-section');
  const stepNodes  = document.querySelectorAll('.step-node');
  const progressBar = document.getElementById('progress-indicator');
  const prevBtn    = document.getElementById('prev-btn');
  const nextBtn    = document.getElementById('next-btn');
  const submitBtn  = document.getElementById('submit-btn');
  const statusCard = document.getElementById('status-card');
  const statusIconSuccess = document.getElementById('status-icon-success');
  const statusIconError   = document.getElementById('status-icon-error');
  const statusTitle   = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');
  const statusResetBtn = document.getElementById('status-reset-btn');

  let currentStep = 1;
  const totalSteps = 5;

  updateNavigation();

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) { currentStep++; updateNavigation(); }
  });
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; updateNavigation(); }
  });

  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input',  () => el.closest('.form-group')?.classList.remove('invalid'));
    el.addEventListener('change', () => el.closest('.form-group')?.classList.remove('invalid'));
  });

  function updateNavigation() {
    sections.forEach(s => s.classList.toggle('active', parseInt(s.dataset.section) === currentStep));
    stepNodes.forEach(n => {
      const step = parseInt(n.dataset.step);
      n.classList.remove('active', 'completed');
      if (step === currentStep) n.classList.add('active');
      else if (step < currentStep) n.classList.add('completed');
    });
    progressBar.style.width = `${((currentStep - 1) / (totalSteps - 1)) * 100}%`;
    prevBtn.classList.toggle('disabled', currentStep === 1);
    prevBtn.disabled = currentStep === 1;
    nextBtn.classList.toggle('hidden', currentStep === totalSteps);
    submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateStep(step) {
    const section = document.querySelector(`.form-section[data-section="${step}"]`);
    let isValid = true;
    section.querySelectorAll('input, textarea').forEach(input => {
      const group = input.closest('.form-group');
      let fieldValid = true;
      if (input.hasAttribute('required')) {
        fieldValid = input.type === 'checkbox' ? input.checked : input.value.trim() !== '';
      }
      if (fieldValid) {
        if (input.id === 'discord_id') fieldValid = /^\d{17,19}$/.test(input.value.trim());
        else if (input.id === 'age') { const v = parseInt(input.value); fieldValid = !isNaN(v) && v >= 13 && v <= 100; }
        else if (input.id === 'hours_active') { const v = parseInt(input.value); fieldValid = !isNaN(v) && v >= 1 && v <= 168; }
      }
      group?.classList.toggle('invalid', !fieldValid);
      if (!fieldValid) isValid = false;
    });
    return isValid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    const payload = {};
    QUESTIONS.forEach(q => {
      const el = document.getElementById(q.id);
      if (el) payload[q.id] = el.type === 'checkbox' ? (el.checked ? 'Yes, I agree' : '') : el.value.trim();
    });

    // Show loading
    form.classList.add('hidden');
    document.querySelector('.progress-container').classList.add('hidden');
    statusCard.classList.remove('hidden');
    statusIconSuccess.classList.add('hidden');
    statusIconError.classList.add('hidden');
    statusTitle.innerText = 'Submitting…';
    statusMessage.innerText = 'Sending your application to Discord. Please wait.';
    statusResetBtn.classList.add('hidden');

    try {
      // Build review URL (for the Approve/Reject links in the embed)
      const reviewBase = window.location.origin + window.location.pathname.replace('index.html', '') + 'review.html';
      const encodedTag = encodeURIComponent(payload.discord_tag);
      const encodedAnswers = encodeURIComponent(JSON.stringify(payload));
      const approveUrl = `${reviewBase}?action=approve&tag=${encodedTag}&answers=${encodedAnswers}`;
      const rejectUrl  = `${reviewBase}?action=reject&tag=${encodedTag}&answers=${encodedAnswers}`;

      // Build embed fields
      const fields = QUESTIONS.map((q, i) => ({
        name: `${i + 1}. ${q.label}`,
        value: (payload[q.id] || 'N/A').substring(0, 1024),
        inline: false
      }));

      const webhookBody = {
        username: 'Staff Application System',
        embeds: [{
          title: `📝 New Staff Application — ${payload.discord_tag}`,
          description:
            `Submitted by: **${payload.discord_tag}** (ID: \`${payload.discord_id}\`)\n` +
            `Submitted at: <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
            `[🟢 Approve](${approveUrl})  •  [🔴 Reject](${rejectUrl})`,
          color: 5793266,
          fields,
          footer: { text: 'Click the links above to review this application' },
          timestamp: new Date().toISOString()
        }]
      };

      const resp = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody)
      });

      if (resp.ok || resp.status === 204) {
        statusTitle.innerText = 'Application Submitted!';
        statusMessage.innerText = 'Your application was sent to the staff review room successfully. You will be notified on Discord once a decision is made!';
        statusIconSuccess.classList.remove('hidden');
      } else {
        const err = await resp.text();
        throw new Error(`Discord returned ${resp.status}: ${err}`);
      }
    } catch (error) {
      statusTitle.innerText = 'Submission Failed';
      statusMessage.innerText = error.message || 'Could not send your application. Please try again later.';
      statusIconError.classList.remove('hidden');
      statusResetBtn.classList.remove('hidden');
    }
  });

  statusResetBtn.addEventListener('click', () => {
    statusCard.classList.add('hidden');
    document.querySelector('.progress-container').classList.remove('hidden');
    form.classList.remove('hidden');
    currentStep = 1;
    updateNavigation();
  });
});
