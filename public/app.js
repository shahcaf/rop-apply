document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('staff-app-form');
  const sections = document.querySelectorAll('.form-section');
  const stepNodes = document.querySelectorAll('.step-node');
  const progressBar = document.getElementById('progress-indicator');
  
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const submitBtn = document.getElementById('submit-btn');
  
  const statusCard = document.getElementById('status-card');
  const statusIconSuccess = document.getElementById('status-icon-success');
  const statusIconError = document.getElementById('status-icon-error');
  const statusTitle = document.getElementById('status-title');
  const statusMessage = document.getElementById('status-message');
  const statusResetBtn = document.getElementById('status-reset-btn');

  // Application State
  let currentStep = 1;
  const totalSteps = 5;

  // Initialize view
  updateNavigation();

  // Event Listeners for Navigation Buttons
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      currentStep++;
      updateNavigation();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateNavigation();
    }
  });

  // Clear validation styling when user interacts
  form.querySelectorAll('input, textarea').forEach(element => {
    const handleInput = () => {
      const group = element.closest('.form-group');
      if (group && group.classList.contains('invalid')) {
        group.classList.remove('invalid');
      }
    };

    element.addEventListener('input', handleInput);
    element.addEventListener('change', handleInput);
  });

  // Step Navigation Logic
  function updateNavigation() {
    // Show/Hide form sections
    sections.forEach(section => {
      const step = parseInt(section.getAttribute('data-section'), 10);
      if (step === currentStep) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Update Step Progress Nodes
    stepNodes.forEach(node => {
      const step = parseInt(node.getAttribute('data-step'), 10);
      node.classList.remove('active', 'completed');
      
      if (step === currentStep) {
        node.classList.add('active');
      } else if (step < currentStep) {
        node.classList.add('completed');
      }
    });

    // Update Progress Indicator Line Width
    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Update Buttons State
    if (currentStep === 1) {
      prevBtn.classList.add('disabled');
      prevBtn.disabled = true;
    } else {
      prevBtn.classList.remove('disabled');
      prevBtn.disabled = false;
    }

    if (currentStep === totalSteps) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }

    // Scroll to top of card on step change
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Real-time Input Validation
  function validateStep(step) {
    const activeSection = document.querySelector(`.form-section[data-section="${step}"]`);
    const inputs = activeSection.querySelectorAll('input, textarea');
    let isValid = true;

    inputs.forEach(input => {
      const formGroup = input.closest('.form-group');
      let fieldValid = true;

      // Handle individual field validations
      if (input.hasAttribute('required')) {
        if (input.type === 'checkbox') {
          fieldValid = input.checked;
        } else {
          fieldValid = input.value.trim() !== '';
        }
      }

      // Special format validation
      if (fieldValid) {
        if (input.id === 'discord_id') {
          // Discord ID must be 17-19 digit number
          const idRegex = /^\d{17,19}$/;
          fieldValid = idRegex.test(input.value.trim());
        } else if (input.id === 'age') {
          const ageVal = parseInt(input.value, 10);
          fieldValid = !isNaN(ageVal) && ageVal >= 13 && ageVal <= 100;
        } else if (input.id === 'hours_active') {
          const hoursVal = parseInt(input.value, 10);
          fieldValid = !isNaN(hoursVal) && hoursVal >= 1 && hoursVal <= 168;
        }
      }

      // Mark visual errors
      if (!fieldValid) {
        formGroup.classList.add('invalid');
        isValid = false;
      } else {
        formGroup.classList.remove('invalid');
      }
    });

    return isValid;
  }

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Verify all steps (specifically the final step)
    if (!validateStep(currentStep)) {
      return;
    }

    // Capture and prepare Form Data
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    // Handle checkboxes that aren't sent if empty
    payload.guidelines_agree = document.getElementById('guidelines_agree').checked ? 'yes' : '';

    // Show Loading/Submitting View
    form.classList.add('hidden');
    document.querySelector('.progress-container').classList.add('hidden');
    statusCard.classList.remove('hidden');
    
    statusIconSuccess.classList.add('hidden');
    statusIconError.classList.add('hidden');
    statusTitle.innerText = 'Submitting...';
    statusMessage.innerText = 'Sending your answers to the Discord review server. Please wait.';
    statusResetBtn.classList.add('hidden');

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success
        statusTitle.innerText = 'Application Submitted!';
        statusMessage.innerText = 'Your application was posted to the staff review room successfully. You will receive a direct message on Discord once our team reviews your application!';
        statusIconSuccess.classList.remove('hidden');
      } else {
        // Server error response
        throw new Error(result.message || 'An unknown error occurred during submission.');
      }
    } catch (error) {
      // Error
      statusTitle.innerText = 'Submission Failed';
      statusMessage.innerText = error.message || 'Could not connect to the application server. Please try again later.';
      statusIconError.classList.remove('hidden');
      statusResetBtn.classList.remove('hidden');
    }
  });

  // Try Again Button resets the form
  statusResetBtn.addEventListener('click', () => {
    statusCard.classList.add('hidden');
    document.querySelector('.progress-container').classList.remove('hidden');
    form.classList.remove('hidden');
    currentStep = 1;
    updateNavigation();
  });
});
