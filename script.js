/* ============================================
   BDS PORTFOLIO - MAIN JAVASCRIPT (WITH SAVE FIX)
   ============================================ */

// ============================================
// GLOBAL STATE
// ============================================
let isEditMode = false;
let isAdmin = false;
let cropper = null;
let currentLightboxIndex = 0;
let currentLightboxImages = [];

// ============================================
// ADMIN AUTHENTICATION SYSTEM
// ============================================
function initAdminAuth() {
    console.log('Checking admin auth...');

    // Check if admin is already authenticated in this session
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
        console.log('Admin already authenticated in this session');
        isAdmin = true;
        enableAdminMode();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin');

    console.log('Admin param found:', adminParam !== null);

    if (adminParam !== null) {
        const password = prompt("Enter Admin Password:");
        console.log('Password entered:', password ? 'Yes' : 'No');

        if (password === "1381075") {
            console.log('Password correct! Enabling admin mode...');
            isAdmin = true;
            sessionStorage.setItem('admin_authenticated', 'true');
            enableAdminMode();

            // Clean URL without reload
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        } else {
            console.log('Password incorrect');
            alert("Wrong Password! Access Denied.");
            sessionStorage.removeItem('admin_authenticated');

            // Clean URL without reload
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    } else {
        console.log('No admin param in URL');
    }
}

function enableAdminMode() {
    console.log('Enabling admin mode...');
    document.body.classList.add('admin-mode');

    const adminBar = document.getElementById('adminBar');
    if (adminBar) {
        adminBar.style.display = 'flex';
        console.log('Admin bar shown');
    } else {
        console.error('Admin bar not found!');
    }

    const adminButtons = ['addCertBtn', 'addGalleryBtn', 'addSectionBtn'];
    adminButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = 'inline-flex';
    });

    const heroWrapper = document.querySelector('.hero-image-wrapper');
    if (heroWrapper) {
        heroWrapper.style.cursor = 'pointer';
        heroWrapper.style.pointerEvents = 'auto';
        heroWrapper.addEventListener('click', function(e) {
            if (isEditMode) {
                document.getElementById('profileUpload').click();
            }
        });
    }

    console.log("Admin mode enabled. Click 'Unlock to Edit' to make content editable.");
}

// ============================================
// LOCALSTORAGE SAVE/LOAD SYSTEM
// ============================================
const STORAGE_KEY = 'bds_portfolio_data';

function savePortfolioData() {
    const data = {};
    let savedCount = 0;

    // Save ALL elements with data-save-id
    document.querySelectorAll('[data-save-id]').forEach(el => {
        const id = el.getAttribute('data-save-id');
        if (id) {
            data[id] = el.innerHTML;
            savedCount++;
        }
    });

    // Save profile image
    const profileImg = document.getElementById('profileImage');
    if (profileImg && profileImg.src && !profileImg.src.includes('placeholder')) {
        data['profile_image'] = profileImg.src;
        savedCount++;
    }

    // Save dynamic sections HTML
    const dynamicSections = document.getElementById('dynamicSections');
    if (dynamicSections) {
        data['dynamic_sections'] = dynamicSections.innerHTML;
        savedCount++;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`Portfolio saved to localStorage! (${savedCount} items saved)`);

    // Note: Images are saved individually when uploaded, not here
    // to avoid duplicating large base64 data

    // Show save notification
    showSaveNotification('Changes Saved!');
}

function loadPortfolioData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
        console.log('No saved data found in localStorage');
        return;
    }

    try {
        const data = JSON.parse(saved);
        let loadedCount = 0;

        console.log('Loading data keys:', Object.keys(data));

        // Restore text content by data-save-id
        document.querySelectorAll('[data-save-id]').forEach(el => {
            const id = el.getAttribute('data-save-id');
            if (!id) return;

            // Restore innerHTML
            if (data[id] !== undefined) {
                el.innerHTML = data[id];
                loadedCount++;
            }

            // Restore href for links
            if (el.tagName === 'A' && data[id + '_href'] !== undefined) {
                el.setAttribute('href', data[id + '_href']);
                loadedCount++;
                console.log('Restored href for', id, ':', data[id + '_href']);
            }

            // Restore src for images
            if (el.tagName === 'IMG' && data[id + '_src'] !== undefined) {
                el.setAttribute('src', data[id + '_src']);
                loadedCount++;
            }
        });

        // Restore profile image
        if (data['profile_image']) {
            const profileImg = document.getElementById('profileImage');
            if (profileImg) {
                profileImg.src = data['profile_image'];
                loadedCount++;
            }
        }

        // Restore dynamic sections
        if (data['dynamic_sections']) {
            const dynamicSections = document.getElementById('dynamicSections');
            if (dynamicSections) {
                dynamicSections.innerHTML = data['dynamic_sections'];
                loadedCount++;
            }
        }

        // Restore gallery images
        document.querySelectorAll('.gallery-item').forEach(item => {
            const caseId = item.getAttribute('data-case-id');
            if (caseId && data['gallery_image_' + caseId]) {
                const img = item.querySelector('img');
                if (img) {
                    img.src = data['gallery_image_' + caseId];
                    loadedCount++;
                }
                // Also update caseData
                if (caseData[caseId] && caseData[caseId].images.length > 0) {
                    caseData[caseId].images[0].src = data['gallery_image_' + caseId];
                }
            }
        });

        // Restore cert images
        document.querySelectorAll('.cert-card').forEach(card => {
            const certId = card.getAttribute('data-cert-id');
            if (certId && data['cert_image_' + certId]) {
                const img = card.querySelector('.cert-image img');
                if (img) {
                    img.src = data['cert_image_' + certId];
                    loadedCount++;
                }
                if (certData[certId]) {
                    certData[certId].image = data['cert_image_' + certId];
                }
            }
        });

        // Load saved case images
        for (let caseId = 1; caseId <= 20; caseId++) {
            if (caseData[caseId]) {
                caseData[caseId].images.forEach((img, index) => {
                    const saved = localStorage.getItem('case_image_' + caseId + '_' + index);
                    if (saved) {
                        img.src = saved;
                    }
                });
            }
        }

        console.log(`Portfolio loaded from localStorage! (${loadedCount} items restored)`);
    } catch (e) {
        console.error('Error loading portfolio data:', e);
    }
}

function showSaveNotification(message) {
    // Remove existing notification
    const existing = document.getElementById('saveNotification');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'saveNotification';
    notif.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, var(--accent), var(--accent-light));
        color: var(--primary);
        padding: 14px 28px;
        border-radius: 50px;
        font-weight: 600;
        font-size: 0.95rem;
        z-index: 10000;
        box-shadow: 0 8px 30px var(--accent-glow);
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(style);


// ============================================
// CERTIFICATE & GALLERY IMAGE UPLOAD
// ============================================

// Handle certificate image upload
function handleCertUpload(event, certId) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Update the cert card image
        const img = document.getElementById('cert-img-' + certId);
        if (img) {
            img.src = e.target.result;
        }

        // Update certData for modal
        if (certData[certId]) {
            certData[certId].image = e.target.result;
        }

        // Save to localStorage
        saveImageToStorage('cert_image_' + certId, e.target.result);

        showSaveNotification('Certificate Image Updated!');
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
}

// Handle gallery case image upload
function handleGalleryUpload(event, caseId) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Gallery upload triggered for case:', caseId);

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('Gallery image loaded, updating...');

        // Update the gallery card image
        const img = document.getElementById('gallery-img-' + caseId);
        if (img) {
            img.src = e.target.result;
            console.log('Gallery img-' + caseId + ' updated');
        } else {
            console.error('Gallery img-' + caseId + ' not found!');
        }

        // Update caseData for modal
        if (caseData[caseId] && caseData[caseId].images.length > 0) {
            caseData[caseId].images[0].src = e.target.result;
        }

        // Save to localStorage
        saveImageToStorage('gallery_image_' + caseId, e.target.result);

        showSaveNotification('Gallery Image Updated!');
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
}

// Gallery upload handler - called when file is selected
function handleGalleryUpload(event, caseId) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Gallery upload triggered for case:', caseId);

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('Gallery image loaded, updating...');

        // Update the gallery card image
        const img = document.getElementById('gallery-img-' + caseId);
        if (img) {
            img.src = e.target.result;
            console.log('Gallery img-' + caseId + ' updated');
        }

        // Update caseData for modal
        if (caseData[caseId] && caseData[caseId].images.length > 0) {
            caseData[caseId].images[0].src = e.target.result;
        }

        // Save to localStorage
        saveImageToStorage('gallery_image_' + caseId, e.target.result);

        showSaveNotification('Gallery Image Updated!');
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
}

// Save image to localStorage (with size check)
function saveImageToStorage(key, dataUrl) {
    try {
        localStorage.setItem(key, dataUrl);
        console.log('Image saved to localStorage:', key);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('Image too large for localStorage. Consider using a smaller image.');
            showSaveNotification('Image too large! Use smaller image.');
        } else {
            console.error('Error saving image:', e);
        }
    }
}

// Load saved images from localStorage
function loadSavedImages() {
    console.log('Loading saved images...');

    // Load certificate images
    for (let i = 1; i <= 20; i++) {
        const saved = localStorage.getItem('cert_image_' + i);
        if (saved) {
            const img = document.getElementById('cert-img-' + i);
            if (img) {
                img.src = saved;
                console.log('Loaded cert image', i);
            }
            if (certData[i]) {
                certData[i].image = saved;
            }
        }
    }

    // Load gallery images
    for (let i = 1; i <= 20; i++) {
        const saved = localStorage.getItem('gallery_image_' + i);
        if (saved) {
            const img = document.getElementById('gallery-img-' + i);
            if (img) {
                img.src = saved;
                console.log('Loaded gallery image', i);
            }
            if (caseData[i] && caseData[i].images.length > 0) {
                caseData[i].images[0].src = saved;
            }
        }
    }

    // Load case images (for all cases and all their images)
    for (let caseId = 1; caseId <= 20; caseId++) {
        if (caseData[caseId]) {
            caseData[caseId].images.forEach((img, index) => {
                const saved = localStorage.getItem('case_image_' + caseId + '_' + index);
                if (saved) {
                    img.src = saved;
                    console.log('Loaded case image', caseId, 'index', index);
                }
            });
        }
    }
}

// Setup click-to-upload for cert images (admin only)
function setupCertUploadClicks() {
    console.log('Setting up cert upload clicks...');
    document.querySelectorAll('.cert-image').forEach(el => {
        // Remove old listeners first to avoid duplicates
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);

        newEl.addEventListener('click', function(e) {
            if (!isEditMode) return;

            const certCard = this.closest('.cert-card');
            const certId = certCard ? certCard.getAttribute('data-cert-id') : null;

            if (certId) {
                e.stopPropagation();
                e.preventDefault();
                console.log('Cert clicked for upload:', certId);
                const uploadInput = document.getElementById('cert-upload-' + certId);
                if (uploadInput) {
                    uploadInput.click();
                }
            }
        });
    });
}

// Setup gallery file inputs for admin mode
function setupGalleryUploadClicks() {
    console.log('Setting up gallery file inputs...');

    document.querySelectorAll('.gallery-file-input').forEach(input => {
        // In edit mode, file inputs are visible and clickable
        // In view mode, they're hidden behind the image
        if (isEditMode) {
            input.style.display = 'block';
            input.style.opacity = '0';
            input.style.position = 'absolute';
            input.style.inset = '0';
            input.style.width = '100%';
            input.style.height = '100%';
            input.style.cursor = 'pointer';
            input.style.zIndex = '10';
        }
    });
}


// Setup link editing in admin mode



// ============================================
// LINK EDITING - BULLETPROOF VERSION
// ============================================

function setupLinkEditButtons() {
    console.log('=== Setting up link edit buttons ===');

    // Remove any existing edit buttons first
    document.querySelectorAll('.link-edit-btn').forEach(btn => btn.remove());

    // Get ALL editable links - both hero contact and footer
    const selectors = [
        'a[data-save-id^="link_"]',
        'a[data-save-id^="footer_social_"]'
    ];

    let totalLinks = 0;

    selectors.forEach(selector => {
        const links = document.querySelectorAll(selector);
        console.log(`Found ${links.length} links for selector: ${selector}`);

        links.forEach((link, index) => {
            totalLinks++;

            // Create edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'link-edit-btn';
            editBtn.innerHTML = '<i class="fas fa-pen"></i>';
            editBtn.type = 'button';
            editBtn.title = 'Click to Edit URL';

            // CRITICAL: Use onclick attribute instead of addEventListener
            // This ensures it works even if other handlers exist
            editBtn.setAttribute('onclick', 'event.preventDefault(); event.stopPropagation(); editLinkUrl(this.previousElementSibling); return false;');

            // Insert button AFTER the link
            link.parentNode.insertBefore(editBtn, link.nextSibling);

            console.log(`Added edit button to link ${index}:`, link.getAttribute('data-save-id'));
        });
    });

    console.log(`=== Total edit buttons added: ${totalLinks} ===`);
}

function editLinkUrl(linkElement) {
    if (!linkElement) {
        console.error('No link element provided!');
        return;
    }

    const currentHref = linkElement.getAttribute('href') || '';
    const linkId = linkElement.getAttribute('data-save-id') || 'unknown';

    console.log('Editing link:', linkId, 'Current URL:', currentHref);

    const linkType = currentHref.includes('mailto:') ? 'Email' : 
                   currentHref.includes('tel:') ? 'Phone' : 'URL';

    const newHref = prompt('Edit ' + linkType + ' URL:', currentHref);

    if (newHref !== null && newHref.trim() !== '') {
        linkElement.setAttribute('href', newHref.trim());
        console.log('Updated link', linkId, 'to:', newHref.trim());
        showSaveNotification(linkType + ' URL Updated!');
    }
}

function removeLinkEditButtons() {
    const buttons = document.querySelectorAll('.link-edit-btn');
    console.log('Removing', buttons.length, 'edit buttons');
    buttons.forEach(btn => btn.remove());
}

// ============================================
// TOGGLE EDIT MODE (WITH SAVE)
// ============================================
function toggleEditMode() {
    if (!isAdmin) return;

    isEditMode = !isEditMode;
    const btn = document.getElementById('editToggle');
    const heroWrapper = document.querySelector('.hero-image-wrapper');

    if (isEditMode) {
        // ========== EDIT MODE ON ==========

        // CRITICAL: Enable file inputs first
        enableFileInputsForAdmin();

        // 1. Inject contenteditable="true" into ALL text elements AND links
        const editableSelectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'li', 'div.about-text',
            '.timeline-title', '.timeline-subtitle', '.timeline-date',
            '.stat-number', '.stat-label',
            '.highlight-content h4', '.highlight-content p',
            '.exp-content h3', '.exp-meta span span',
            '.skill-card h3', '.skill-tag',
            '.cert-content h4', '.cert-content p', '.cert-content .cert-date span',
            '.gallery-overlay h4', '.gallery-overlay p',
            '.footer h3', '.footer p', '.footer-contact span span',
            '.footer-bottom p',
            '.case-modal-desc',
            '.section-header h2 span', '.section-header p',
            '.contact-btn span'
        ];

        let idCounter = 0;
        editableSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.closest('button') || el.closest('a') || el.closest('.lightbox') || el.closest('.crop-modal')) {
                    return;
                }

                // Assign unique save ID if not already has one
                if (!el.getAttribute('data-save-id')) {
                    el.setAttribute('data-save-id', 'text_' + idCounter++);
                }

                el.setAttribute('contenteditable', 'true');
                el.classList.add('editable-active');
            });
        });

        // 2. Also handle specific text containers
        document.querySelectorAll('.about-text p, .timeline-desc li, .exp-desc li').forEach(el => {
            if (!el.getAttribute('data-save-id')) {
                el.setAttribute('data-save-id', 'text_' + idCounter++);
            }
            el.setAttribute('contenteditable', 'true');
            el.classList.add('editable-active');
        });

        // 3. Enable profile image upload
        if (heroWrapper) {
            heroWrapper.style.pointerEvents = 'auto';
            heroWrapper.style.cursor = 'pointer';
        }

        // 4. Update button
        btn.innerHTML = '<i class="fas fa-lock"></i> <span>Lock & Save</span>';
        btn.style.background = 'linear-gradient(135deg, #ef4444, #f87171)';

        // 5. Show remove buttons on dynamic sections
        document.querySelectorAll('.remove-section-btn').forEach(btn => {
            btn.style.display = 'flex';
        });

        // 6. Unlock images for admin editing
        unlockImages();

        // 7. Setup click-to-upload for cert and gallery images
        setupCertUploadClicks();
        setupGalleryUploadClicks();

        // Setup case image uploads if modal is open
        setupCaseImageUploads();
        setupLinkEditing();

        // 8. Show upload hints
        document.querySelectorAll('.admin-hint').forEach(el => {
            el.style.display = 'block';
        });

        console.log("Edit mode UNLOCKED - All text is now editable!");

    } else {
        // ========== VIEW MODE ON (LOCK & SAVE) ==========

        // 1. SAVE ALL CHANGES FIRST
        savePortfolioData();

        // 2. Remove contenteditable from ALL elements
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editable-active');
        });

        // 3. Lock profile image
        if (heroWrapper) {
            heroWrapper.style.pointerEvents = 'none';
            heroWrapper.style.cursor = 'default';
        }

        // 4. Update button
        btn.innerHTML = '<i class="fas fa-unlock"></i> <span>Unlock to Edit</span>';
        btn.style.background = 'linear-gradient(135deg, var(--accent), var(--accent-light))';

        // 5. Hide remove buttons
        document.querySelectorAll('.remove-section-btn').forEach(btn => {
            btn.style.display = 'none';
        });

        // 6. Lock images again
        lockImages();

        // 7. Hide upload hints
        document.querySelectorAll('.admin-hint').forEach(el => {
            el.style.display = 'none';
        });

        // CRITICAL: Disable ALL file inputs when locking
        disableAllFileInputs();

        console.log("Edit mode LOCKED - All changes saved!");
    }
}

// ============================================
// MOBILE NAVIGATION
// ============================================
function toggleMobileNav() {
    const nav = document.getElementById('mainNav');
    const overlay = document.getElementById('mobileNavOverlay');
    const toggle = document.getElementById('mobileNavToggle');

    nav.classList.toggle('active');
    overlay.classList.toggle('active');
    toggle.classList.toggle('active');

    const icon = toggle.querySelector('i');
    if (nav.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
        document.body.style.overflow = 'hidden';
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        document.body.style.overflow = '';
    }
}

document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleMobileNav();
        }
    });
});

// ============================================
// SCROLL PROGRESS BAR
// ============================================
let ticking = false;
function updateProgressBar() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    document.getElementById('progressBar').style.width = scrolled + '%';
    ticking = false;
}
window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateProgressBar); ticking = true; }
});

// ============================================
// SCROLL REVEAL - INTERSECTION OBSERVER
// ============================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
});

// ============================================
// ACTIVE NAVIGATION
// ============================================
const sections = document.querySelectorAll('section, footer');
const navLinks = document.querySelectorAll('.nav a');
const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + id) link.classList.add('active');
            });
        }
    });
}, { threshold: 0.3 });

sections.forEach(section => navObserver.observe(section));

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ============================================
// PARALLAX ORBS
// ============================================
let mouseX = 0, mouseY = 0, isMoving = false;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!isMoving) { requestAnimationFrame(updateOrbs); isMoving = true; }
});
function updateOrbs() {
    document.querySelectorAll('.orb').forEach((orb, index) => {
        const speed = (index + 1) * 20;
        orb.style.transform = `translate(${(window.innerWidth/2 - mouseX)/speed}px, ${(window.innerHeight/2 - mouseY)/speed}px)`;
    });
    isMoving = false;
}

// ============================================
// PROFILE PICTURE CROPPER
// ============================================
const fileInput = document.getElementById('profileUpload');
const imageToCrop = document.getElementById('imageToCrop');
const cropModal = document.getElementById('cropModal');
const profileImage = document.getElementById('profileImage');

if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                cropModal.style.display = 'flex';
                imageToCrop.src = event.target.result;

                if (cropper) { cropper.destroy(); }

                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.9,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    });
}

function closeCropModal() {
    cropModal.style.display = 'none';
    if (cropper) { cropper.destroy(); cropper = null; }
}

function saveCroppedImage() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 320, height: 320 });
    profileImage.src = canvas.toDataURL('image/jpeg');
    closeCropModal();
}

// ============================================
// LIGHTBOX / POPUP GALLERY
// ============================================
function openLightbox(images, index, caption) {
    currentLightboxImages = images;
    currentLightboxIndex = index;
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImage');
    const cap = document.getElementById('lightboxCaption');

    img.src = images[index].src;
    cap.textContent = caption || images[index].caption || '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
    if (e) e.stopPropagation();
    document.getElementById('lightboxModal').classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction, e) {
    if (e) e.stopPropagation();
    if (currentLightboxImages.length === 0) return;

    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = currentLightboxImages.length - 1;
    if (currentLightboxIndex >= currentLightboxImages.length) currentLightboxIndex = 0;

    const img = document.getElementById('lightboxImage');
    const cap = document.getElementById('lightboxCaption');
    const item = currentLightboxImages[currentLightboxIndex];

    img.src = item.src;
    cap.textContent = item.caption || '';
}

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightboxModal');
    if (!modal.classList.contains('active')) return;

    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
});

// ============================================
// CASE DETAIL MODAL (Multi-Image Support)
// ============================================
const caseData = {
    1: {
        title: '[Case Title 1]',
        description: '[Detailed case description goes here. Describe the patient condition, treatment plan, procedure performed, and outcome.]',
        images: [
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+1+-+Before', caption: 'Before Treatment' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+1+-+During', caption: 'During Procedure' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+1+-+After', caption: 'After Treatment' }
        ]
    },
    2: {
        title: '[Case Title 2]',
        description: '[Detailed case description goes here. Describe the patient condition, treatment plan, procedure performed, and outcome.]',
        images: [
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+2+-+Step+1', caption: 'Initial Examination' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+2+-+Step+2', caption: 'Preparation' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+2+-+Step+3', caption: 'Procedure' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+2+-+Step+4', caption: 'Final Result' }
        ]
    },
    3: {
        title: '[Case Title 3]',
        description: '[Detailed case description goes here. Describe the patient condition, treatment plan, procedure performed, and outcome.]',
        images: [
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+3+-+Image+1', caption: 'Pre-operative View' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+3+-+Image+2', caption: 'Post-operative View' }
        ]
    },
    4: {
        title: '[Case Title 4]',
        description: '[Detailed case description goes here. Describe the patient condition, treatment plan, procedure performed, and outcome.]',
        images: [
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+4+-+Image+1', caption: 'Initial State' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+4+-+Image+2', caption: 'Mid-treatment' },
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Case+4+-+Image+3', caption: 'Completed' }
        ]
    }
};

function openCaseModal(caseId) {
    const data = caseData[caseId];
    if (!data) return;

    const modal = document.getElementById('caseModal');
    document.getElementById('caseModalTitle').textContent = data.title;
    document.getElementById('caseModalDesc').textContent = data.description;

    const grid = document.getElementById('caseImagesGrid');
    grid.innerHTML = '';

    data.images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'case-image-item';
        item.setAttribute('data-case-id', caseId);
        item.setAttribute('data-img-index', index);

        // Create the image container with upload support
        const imgContainer = document.createElement('div');
        imgContainer.className = 'case-image-container';
        imgContainer.style.position = 'relative';

        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        imgEl.alt = img.caption;
        imgEl.id = `case-img-${caseId}-${index}`;
        imgEl.onclick = function() { openLightboxFromCase(caseId, index); };

        // Add file input for each image (hidden, used in edit mode)
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'case-file-input';
        fileInput.id = `case-upload-${caseId}-${index}`;
        fileInput.accept = 'image/*';
        fileInput.onchange = function(event) { handleCaseImageUpload(event, caseId, index); };

        imgContainer.appendChild(imgEl);
        imgContainer.appendChild(fileInput);

        const captionEl = document.createElement('div');
        captionEl.className = 'case-image-caption';
        captionEl.setAttribute('data-save-id', `case_caption_${caseId}_${index}`);
        captionEl.textContent = img.caption;

        item.appendChild(imgContainer);
        item.appendChild(captionEl);
        grid.appendChild(item);
    });

    // If in edit mode, show upload overlays
    if (isEditMode) {
        setupCaseImageUploads();
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Handle case image upload in modal
function handleCaseImageUpload(event, caseId, imgIndex) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Case image upload triggered for case:', caseId, 'image:', imgIndex);

    const reader = new FileReader();
    reader.onload = function(e) {
        // Update the image in modal
        const img = document.getElementById('case-img-' + caseId + '-' + imgIndex);
        if (img) {
            img.src = e.target.result;
        }

        // Update caseData
        if (caseData[caseId] && caseData[caseId].images[imgIndex]) {
            caseData[caseId].images[imgIndex].src = e.target.result;
        }

        // Update gallery thumbnail if this is the first image
        if (imgIndex === 0) {
            const galleryImg = document.getElementById('gallery-img-' + caseId);
            if (galleryImg) {
                galleryImg.src = e.target.result;
            }
            // Also save gallery image
            saveImageToStorage('gallery_image_' + caseId, e.target.result);
        }

        // Save case image
        saveImageToStorage('case_image_' + caseId + '_' + imgIndex, e.target.result);

        showSaveNotification('Case Image ' + (imgIndex + 1) + ' Updated!');
    };
    reader.readAsDataURL(file);

    event.target.value = '';
}

// Setup case image upload overlays in modal
function setupCaseImageUploads() {
    document.querySelectorAll('.case-file-input').forEach(input => {
        input.style.display = 'block';
        input.style.opacity = '0';
        input.style.position = 'absolute';
        input.style.top = '0';
        input.style.left = '0';
        input.style.width = '100%';
        input.style.height = '200px';
        input.style.cursor = 'pointer';
        input.style.zIndex = '10';
    });
}

function openLightboxFromCase(caseId, imageIndex) {
    const data = caseData[caseId];
    if (!data) return;
    openLightbox(data.images, imageIndex, null);
}

function closeCaseModal(e) {
    if (e) e.stopPropagation();
    document.getElementById('caseModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// CERTIFICATE DETAIL MODAL
// ============================================
const certData = {
    1: {
        title: 'Basic Life Support (BLS)',
        org: '[Issuing Organization]',
        date: '[Year]',
        image: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=BLS+Certificate+Full'
    },
    2: {
        title: 'Advanced Cardiac Life Support (ACLS)',
        org: '[Issuing Organization]',
        date: '[Year]',
        image: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=ACLS+Certificate+Full'
    },
    3: {
        title: '[Workshop Name]',
        org: '[Organizer]',
        date: '[Year]',
        image: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Workshop+Certificate+Full'
    },
    4: {
        title: '[Conference/CME]',
        org: '[Organization]',
        date: '[Year]',
        image: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=Conference+Certificate+Full'
    }
};

function openCertModal(certId) {
    const data = certData[certId];
    if (!data) return;

    const modal = document.getElementById('certModal');
    document.getElementById('certModalImage').src = data.image;
    document.getElementById('certModalTitle').textContent = data.title;
    document.getElementById('certModalOrg').textContent = data.org;
    document.getElementById('certModalDate').innerHTML = `<i class="fas fa-calendar"></i> ${data.date}`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCertModal(e) {
    if (e) e.stopPropagation();
    document.getElementById('certModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// ADD CERTIFICATE
// ============================================
let certCount = 4;
function addCertificate() {
    if (!isAdmin || !isEditMode) return;
    certCount++;
    const grid = document.getElementById('certGrid');
    const card = document.createElement('div');
    card.className = 'cert-card reveal delay-1';
    card.setAttribute('data-cert-id', certCount);
    card.innerHTML = `
        <div class="cert-image" onclick="openCertModal(${certCount})">
            <img src="https://via.placeholder.com/400x200/1e293b/06b6d4?text=New+Certificate" alt="Certificate" id="cert-img-${certCount}">
        </div>
        <input type="file" id="cert-upload-${certCount}" accept="image/*" style="display:none;" onchange="handleCertUpload(event, ${certCount})">
        <div class="cert-content">
            <div class="cert-badge"><i class="fas fa-check-circle"></i> Verified</div>
            <h4 data-save-id="cert_title_${certCount}">[Certificate Title]</h4>
            <p data-save-id="cert_org_${certCount}">[Organization]</p>
            <p class="cert-date"><i class="fas fa-calendar"></i> <span data-save-id="cert_date_${certCount}">[Year]</span></p>
        </div>
    `;
    grid.appendChild(card);
    revealObserver.observe(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (isEditMode) {
        card.querySelectorAll('h4, p, span').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('editable-active');
        });
    }
}

// ============================================
// ADD GALLERY ITEM (Multi-Image Case)
// ============================================
let galleryCount = 4;
function addGalleryItem() {
    if (!isAdmin || !isEditMode) return;
    galleryCount++;
    const grid = document.getElementById('galleryGrid');
    const item = document.createElement('div');
    item.className = 'gallery-item reveal-scale delay-1';
    item.setAttribute('data-case-id', galleryCount);
    item.setAttribute('onclick', `openCaseModal(${galleryCount})`);
    item.innerHTML = `
        <div class="gallery-case-preview">
            <img src="https://via.placeholder.com/400x300/1e293b/06b6d4?text=New+Case+${galleryCount}" alt="Case ${galleryCount}" id="gallery-img-${galleryCount}">
            <div class="case-image-count"><i class="fas fa-images"></i> 1</div>
            <input type="file" class="gallery-file-input" id="gallery-upload-${galleryCount}" accept="image/*" onchange="handleGalleryUpload(event, ${galleryCount})">
        </div>
        <div class="gallery-overlay">
            <h4 data-save-id="gallery_title_${galleryCount}">[Case Title]</h4>
            <p data-save-id="gallery_desc_${galleryCount}">[Brief description]</p>
        </div>
    `;

    caseData[galleryCount] = {
        title: '[New Case Title]',
        description: '[Case description goes here]',
        images: [
            { src: 'https://via.placeholder.com/600x400/1e293b/06b6d4?text=New+Case', caption: 'Image 1' }
        ]
    };

    grid.appendChild(item);
    revealObserver.observe(item);
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (isEditMode) {
        item.querySelectorAll('h4, p').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('editable-active');
        });
    }
}

// ============================================
// ADD NEW SECTION
// ============================================
let sectionCount = 0;
function addNewSection() {
    if (!isAdmin || !isEditMode) return;
    sectionCount++;
    const container = document.getElementById('dynamicSections');
    const section = document.createElement('div');
    section.className = 'dynamic-section section-wrapper';
    section.id = 'dynamic-section-' + sectionCount;
    section.innerHTML = `
        <button class="remove-section-btn" onclick="removeSection('dynamic-section-${sectionCount}')" style="display:flex;">
            <i class="fas fa-trash"></i> Remove Section
        </button>
        <div class="section-header reveal">
            <h2><i class="fas fa-folder-open"></i> <span data-save-id="section_title_${sectionCount}">New Section Title</span></h2>
            <p data-save-id="section_desc_${sectionCount}">Section description goes here</p>
        </div>
        <div class="glass-card reveal">
            <div class="about-text">
                <p data-save-id="section_text1_${sectionCount}">Click here to add your content.</p>
                <p data-save-id="section_text2_${sectionCount}">This is a fully customizable section. Add as much content as you need.</p>
            </div>
        </div>
    `;
    container.appendChild(section);
    revealObserver.observe(section.querySelector('.section-header'));
    revealObserver.observe(section.querySelector('.glass-card'));
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (isEditMode) {
        section.querySelectorAll('h2, p, span').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('editable-active');
        });
    }
}

function removeSection(id) {
    const section = document.getElementById(id);
    if (section) {
        section.style.opacity = '0';
        section.style.transform = 'translateY(-20px)';
        setTimeout(() => section.remove(), 300);
    }
}

// ============================================
// SAVE TO PDF
// ============================================
function saveToPDF() {
    if (!isAdmin) return;
    const element = document.querySelector('.main-container');
    const opt = {
        margin: 0.5,
        filename: 'Dr_Portfolio.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// ============================================
// IMAGE LOCKING (Robust Cross-Browser)
// ============================================
function lockImages() {
    // Lock all images
    document.querySelectorAll('img').forEach(img => {
        img.setAttribute('draggable', 'false');
        img.style.webkitUserDrag = 'none';
        img.style.userSelect = 'none';
        img.style.webkitUserSelect = 'none';
        img.style.mozUserSelect = 'none';
        img.style.msUserSelect = 'none';
        img.style.pointerEvents = 'none';
    });

    // Note: File inputs are handled by disableAllFileInputs() separately
}

function unlockImages() {
    // Unlock images
    document.querySelectorAll('img').forEach(img => {
        img.setAttribute('draggable', 'true');
        img.style.webkitUserDrag = 'auto';
        img.style.userSelect = 'auto';
        img.style.webkitUserSelect = 'auto';
        img.style.mozUserSelect = 'auto';
        img.style.msUserSelect = 'auto';
        img.style.pointerEvents = 'auto';
    });

    // Note: File inputs are handled by enableFileInputsForAdmin() separately
}

document.addEventListener('contextmenu', (e) => {
    if (!isAdmin && e.target.tagName === 'IMG') {
        e.preventDefault();
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
        closeCaseModal();
        closeCertModal();
        closeCropModal();
    }
});

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded - Starting initialization...');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);

    // STEP 0: CRITICAL - Disable ALL file inputs immediately before anything else
    // This prevents any accidental uploads in public view
    disableAllFileInputs();

    // STEP 1: Check admin FIRST
    initAdminAuth();

    // STEP 2: Load saved data (for everyone)
    try {
        loadPortfolioData();
    } catch (e) {
        console.error('Error loading portfolio data:', e);
    }

    // STEP 3: Load saved images
    try {
        loadSavedImages();
    } catch (e) {
        console.error('Error loading saved images:', e);
    }

    // STEP 4: Lock images for public
    lockImages();

    // STEP 5: Lock profile image for public (if not admin)
    const heroWrapper = document.querySelector('.hero-image-wrapper');
    if (heroWrapper && !isAdmin) {
        heroWrapper.style.pointerEvents = 'none';
        heroWrapper.style.cursor = 'default';
    }

    console.log('Initialization complete. isAdmin:', isAdmin);
});

// CRITICAL: Disable all file inputs - called immediately on load
function disableAllFileInputs() {
    console.log('CRITICAL: Disabling all file inputs...');
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.disabled = true;
        input.style.cssText = 'display: none !important; pointer-events: none !important; opacity: 0 !important; width: 0 !important; height: 0 !important; position: absolute !important; z-index: -9999 !important;';
        input.setAttribute('tabindex', '-1');
        input.setAttribute('aria-hidden', 'true');
    });
    console.log('All file inputs disabled.');
}

// Enable file inputs for admin edit mode
function enableFileInputsForAdmin() {
    console.log('Enabling file inputs for admin edit mode...');
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.disabled = false;
        input.removeAttribute('tabindex');
        input.removeAttribute('aria-hidden');

        // Reset styles based on input type
        if (input.id === 'profileUpload') {
            input.style.cssText = 'display: none;';
        } else if (input.classList.contains('gallery-file-input')) {
            input.style.cssText = 'display: block; opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; z-index: 10;';
        } else if (input.classList.contains('case-file-input')) {
            input.style.cssText = 'display: block; opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 200px; cursor: pointer; z-index: 10;';
        } else if (input.id && input.id.startsWith('cert-upload-')) {
            input.style.cssText = 'display: none;';
        } else {
            input.style.cssText = 'display: none;';
        }
    });
    console.log('File inputs enabled for admin.');
}