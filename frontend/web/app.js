/**
 * GymSlot — Campus Slot Allocation & Digital Card Simulator
 * Interactive behaviors for the Live Thing, QR Token Rotation, and Facility Tabs
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Data Models for the 4 SRM-AP Campus Facilities ---
  const facilities = {
    cvraman: {
      name: 'C. V. Raman Gym',
      fullName: 'C. V. Raman Central Complex',
      desc: '120 session capacity. Olympic barbells, squat cages, cardio deck, and conditioning zones for all enrolled students.',
      capacity: 120,
      allocated: 106,
      photo: 'assets/young-attractive-man-athlete-doing-exercise-with.jpg',
      slots: [
        { time: '06:00 – 07:00', seats: 8, status: 'Available' },
        { time: '07:15 – 08:15', seats: 2, status: 'Available' },
        { time: '16:30 – 17:30', seats: 0, status: 'Waitlist Open' },
        { time: '17:45 – 18:45', seats: 14, status: 'Available' },
        { time: '19:00 – 20:00', seats: 5, status: 'Available' }
      ]
    },
    ganga: {
      name: 'Ganga Gym',
      fullName: 'Ganga Hostel Training Center',
      desc: '65 session capacity. Free weights, cable crossovers, and evening strength training sessions for resident scholars.',
      capacity: 65,
      allocated: 58,
      photo: 'assets/fit-young-man-doing-deadlift-exercise-in.jpg',
      slots: [
        { time: '06:00 – 07:00', seats: 4, status: 'Available' },
        { time: '07:15 – 08:15', seats: 1, status: 'Available' },
        { time: '16:30 – 17:30', seats: 7, status: 'Available' },
        { time: '17:45 – 18:45', seats: 0, status: 'Waitlist Open' },
        { time: '19:00 – 20:00', seats: 3, status: 'Available' }
      ]
    },
    krishna: {
      name: 'Krishna Gym',
      fullName: 'Krishna Hostel Strength Lab',
      desc: '65 session capacity. Dumbbell racks, power benches, and calisthenics rigs with morning and twilight access.',
      capacity: 65,
      allocated: 61,
      photo: 'assets/person-preparing-to-lift-a-barbell-at.jpg',
      slots: [
        { time: '06:00 – 07:00', seats: 3, status: 'Available' },
        { time: '07:15 – 08:15', seats: 0, status: 'Waitlist Open' },
        { time: '16:30 – 17:30', seats: 2, status: 'Available' },
        { time: '17:45 – 18:45', seats: 4, status: 'Available' },
        { time: '19:00 – 20:00', seats: 0, status: 'Waitlist Open' }
      ]
    },
    narmada: {
      name: 'Narmada Gym',
      fullName: 'Narmada Dedicated Athletic Facility',
      desc: '75 session capacity. Strength machines, resistance circuits, and functional fitness floor with dedicated women trainers.',
      capacity: 75,
      allocated: 62,
      photo: 'assets/woman-doing-squat-workout-in-gym-with.jpg',
      slots: [
        { time: '06:00 – 07:00', seats: 6, status: 'Available' },
        { time: '07:15 – 08:15', seats: 5, status: 'Available' },
        { time: '16:30 – 17:30', seats: 4, status: 'Available' },
        { time: '17:45 – 18:45', seats: 2, status: 'Available' },
        { time: '19:00 – 20:00', seats: 8, status: 'Available' }
      ]
    }
  };

  let currentFacility = 'cvraman';
  let currentSlot = '17:45 – 18:45';

  // DOM Elements
  const folderName = document.getElementById('folderName');
  const folderDesc = document.getElementById('folderDesc');
  const folderTabBtns = document.querySelectorAll('.folder-tab-btn');

  const cardGymName = document.getElementById('cardGymName');
  const cardSlotTiming = document.getElementById('cardSlotTiming');
  const cardStatusBadge = document.getElementById('cardStatusBadge');
  const cardPhoto = document.getElementById('cardPhoto');
  const qrTokenDisplay = document.getElementById('qrTokenDisplay');
  const qrRefreshTimer = document.getElementById('qrRefreshTimer');
  const qrMatrixGroup = document.getElementById('qrMatrixGroup');

  const simTitle = document.getElementById('simTitle');
  const slotPicker = document.getElementById('slotPicker');
  const capNumbers = document.getElementById('capNumbers');
  const capStatus = document.getElementById('capStatus');
  const capacityFill = document.getElementById('capacityFill');
  const transferAlert = document.getElementById('transferAlert');

  const btnApplySlot = document.getElementById('btnApplySlot');
  const btnRequestTransfer = document.getElementById('btnRequestTransfer');
  const btnGoogleAuth = document.getElementById('btnGoogleAuth');

  // --- Dynamic Opaque QR Token Generator ---
  function generateOpaqueToken() {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 8; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    const hourPrefix = currentSlot.substring(0, 2) + currentSlot.substring(3, 5);
    return `#tok-srm-${hash}-${hourPrefix}`;
  }

  function rotateQrToken() {
    if (qrTokenDisplay) {
      const newToken = generateOpaqueToken();
      qrTokenDisplay.textContent = newToken;
      
      // Subtly shift random matrix dots to visually indicate dynamic rotation
      if (qrMatrixGroup) {
        const dots = qrMatrixGroup.querySelectorAll('rect');
        dots.forEach((dot, idx) => {
          if (idx % 3 === 0) {
            const currentX = parseFloat(dot.getAttribute('x'));
            const offset = (Math.random() > 0.5 ? 2 : -2);
            dot.setAttribute('x', Math.max(8, Math.min(88, currentX + offset)));
          }
        });
      }

      if (qrRefreshTimer) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        qrRefreshTimer.textContent = `Rotated at ${timeStr} · Bound to @srmap.edu.in identity`;
      }
    }
  }

  // Token auto-rotation every 30 seconds
  setInterval(rotateQrToken, 30000);

  // --- Render Slot Picker for Facility ---
  function renderSlots(facKey) {
    const fac = facilities[facKey];
    if (!fac || !slotPicker) return;

    slotPicker.innerHTML = '';
    fac.slots.forEach((slot) => {
      const btn = document.createElement('button');
      btn.className = `slot-pill ${slot.time === currentSlot ? 'active' : ''}`;
      btn.dataset.time = slot.time;
      btn.dataset.seats = slot.seats;
      btn.dataset.cap = fac.capacity;
      btn.dataset.status = slot.status;

      const availText = slot.seats > 0 
        ? `${slot.seats} seats free` 
        : `Waitlist (3 queue)`;

      btn.innerHTML = `
        <span class="slot-hour nums">${slot.time}</span>
        <span class="slot-avail ${slot.seats === 0 ? 'slot-full' : 'nums'}">${availText}</span>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        currentSlot = slot.time;
        updateCard();
      });

      slotPicker.appendChild(btn);
    });

    // Update capacity meter
    const pct = Math.round((fac.allocated / fac.capacity) * 100);
    if (capNumbers) capNumbers.textContent = `${fac.allocated} / ${fac.capacity} Allocated`;
    if (capacityFill) capacityFill.style.width = `${pct}%`;
    if (capStatus) capStatus.textContent = pct >= 95 ? 'High Demand' : 'Open Registration';
    if (simTitle) simTitle.textContent = `${fac.name} Slots`;
  }

  // --- Update Digital Gym Card ---
  function updateCard() {
    const fac = facilities[currentFacility];
    if (cardGymName) cardGymName.textContent = fac.name;
    if (cardSlotTiming) cardSlotTiming.textContent = currentSlot;
    if (cardPhoto) cardPhoto.src = fac.photo;
    rotateQrToken();
  }

  // --- Hero Folder Tabs Navigation ---
  folderTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      folderTabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const targetFolder = btn.dataset.folder;
      if (targetFolder && facilities[targetFolder]) {
        currentFacility = targetFolder;
        if (folderName) folderName.textContent = facilities[targetFolder].fullName;
        if (folderDesc) folderDesc.textContent = facilities[targetFolder].desc;
        
        // Sync simulator tabs as well
        const simTab = document.querySelector(`.fac-tab[data-facility="${targetFolder}"]`);
        if (simTab) {
          document.querySelectorAll('.fac-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          simTab.classList.add('active');
          simTab.setAttribute('aria-selected', 'true');
        }

        renderSlots(currentFacility);
        updateCard();
      }
    });
  });

  // --- Facility Tabs Navigation (Simulator) ---
  const tabButtons = document.querySelectorAll('.fac-tab');
  tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      tabButtons.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      currentFacility = tab.dataset.facility;
      renderSlots(currentFacility);
      updateCard();

      // Sync hero folder tabs
      const heroTab = document.querySelector(`.folder-tab-btn[data-folder="${currentFacility}"]`);
      if (heroTab) {
        folderTabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        heroTab.classList.add('active');
        heroTab.setAttribute('aria-selected', 'true');
        if (folderName) folderName.textContent = facilities[currentFacility].fullName;
        if (folderDesc) folderDesc.textContent = facilities[currentFacility].desc;
      }
    });
  });

  // --- Action Button: Select This Slot ---
  if (btnApplySlot) {
    btnApplySlot.addEventListener('click', () => {
      if (cardStatusBadge) {
        cardStatusBadge.textContent = 'Allocated · Turnstile Active';
        cardStatusBadge.style.background = '#2e4a3e';
      }
      if (transferAlert) {
        transferAlert.innerHTML = `
          <span class="guarantee-bold">Slot Confirmed:</span>
          <span>You have successfully selected ${facilities[currentFacility].name} at ${currentSlot}. Your digital card is active for check-in.</span>
        `;
        transferAlert.style.borderLeftColor = '#2e4a3e';
        transferAlert.style.background = '#eaf2ed';
      }
    });
  }

  // --- Action Button: Request Slot Change (Protected Transfer Guarantee) ---
  if (btnRequestTransfer) {
    btnRequestTransfer.addEventListener('click', () => {
      if (cardStatusBadge) {
        cardStatusBadge.textContent = 'Transfer Pending';
        cardStatusBadge.style.background = '#b87c28';
      }
      if (transferAlert) {
        transferAlert.innerHTML = `
          <span class="guarantee-bold">Transfer Request Submitted:</span>
          <span>Requested switch to ${facilities[currentFacility].name} (${currentSlot}). <strong>Your active slot remains 100% valid for gym entry</strong> until sports administration validates and confirms the swap!</span>
        `;
        transferAlert.style.borderLeftColor = '#b87c28';
        transferAlert.style.background = '#fef6e9';
      }
    });
  }

  // --- Google OAuth Action ---
  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener('click', () => {
      alert('Connecting to SRM University-AP Google OAuth 2.0 gateway...\nRestricted to verified @srmap.edu.in accounts.');
    });
  }

  // Initialize
  renderSlots(currentFacility);
  updateCard();
});
