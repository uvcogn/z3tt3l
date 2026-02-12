// Clear all data on page refresh (F5 or refresh button)
window.addEventListener('beforeunload', () => {
    localStorage.clear();
});

// Animate h1 letters
const h1 = document.querySelector('h1');
const text = h1.innerText;
h1.innerHTML = text.split('').map((char, index) => {
    return `<span style="display: inline-block; animation: moveAround ${2 + index * 0.2}s ease-in-out infinite; animation-delay: ${index * 0.1}s;">${char}</span>`;
}).join('');

// Click h1 to refresh page
h1.style.cursor = 'pointer';
h1.addEventListener('click', () => {
    // Clear all data and reload
    localStorage.clear();
    location.reload();
});

// Sound effects on click
const sounds = [
    'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=', // beep
];

function playRandomSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Random sound generation
    const soundType = Math.floor(Math.random() * 3);
    const duration = 0.1 + Math.random() * 0.2;
    const frequency = 200 + Math.random() * 800;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = ['sine', 'square', 'triangle'][soundType];
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
}

// Shared audio context for sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Vowel replacement mapping
function transformVowels(str) {
    if (!str) return '';
    const map = {
        'a': '4', 'A': '4', 'ä': '4:', 'Ä': '4:',
        'e': '3', 'E': '3',
        'i': '1', 'I': '1',
        'o': '0', 'O': '0', 'ö': '0:', 'Ö': '0:',
        'u': '(_)', 'U': '(_)', 'ü': '(_):', 'Ü': '(_):'
    };
    return str.replace(/[aAeEiIoOuUäÄöÖüÜ]/g, ch => map[ch] || ch);
}

function playKeyClick() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // Sharp click (switch contact)
    const clickOsc = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(2800, now);
    clickGain.gain.setValueAtTime(0.09, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    clickOsc.connect(clickGain);
    clickGain.connect(audioCtx.destination);

    // Body thock (very short noise burst)
    const bufferSize = 256;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    noise.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    clickOsc.start(now);
    clickOsc.stop(now + 0.05);
    noise.start(now);
    noise.stop(now + 0.05);
}

// Play a short beep on interactive clicks
document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.classList.contains('uploaded-photo') || target.classList.contains('note-item')) {
        playRandomSound();
    }
});

// Core DOM references
const addPhotosBtn = document.getElementById('add-photos');
const photoFileInput = document.getElementById('photo-file-input');
const photosContainer = document.getElementById('photos-container');
const textInput = document.getElementById('text-input');
const saveTextBtn = document.getElementById('save-text-btn');

// State
let imageUrls = [];
let distThreshold = 100;
let cursorPhotoSize = 70; // width in pixels for the cursor-following photo trail
let images = [];
let queue = [];
let lastMousePos = { x: 0, y: 0 };
let imgIndex = 0;
let photoClickIndex = 0;

// Display all photos
function displayAllPhotos() {
    if (!photosContainer) return;

    // FIX
    // photosContainer.innerHTML = '';

    photosContainer.querySelectorAll('.uploaded-photo').forEach((p) => {
        p.remove()
    })

    imageUrls.forEach((photoData, index) => {
        displayPhoto(photoData, index);
    });
    updateContentState();
}

// Display one photo per click
function displayNextPhotoOnClick(e) {
    if (photoClickIndex < imageUrls.length) {

        // FIX
        let correctIndex = 0

        for (let i=0; i<images.length; i++) {
            if (queue[i].x == lastMousePos.x && queue[i].y == lastMousePos.y) {
                correctIndex = queue[i].index
            }
        }

        displayPhoto(e, imageUrls[correctIndex], correctIndex);
        imageUrls.splice(correctIndex, 1)
        images.splice(correctIndex, 1)

    }
}

// Create and render a photo element
function displayPhoto(e, photoData, index) {
    if (!photosContainer) return;
    const photoDiv = document.createElement('div');
    photoDiv.className = 'uploaded-photo';
    photoDiv.dataset.index = index;
    
    const photo = typeof photoData === 'string'
        ? { url: photoData, x: null, y: null, scale: 1, rotation: null }
        : photoData;

    const containerWidth = photosContainer.offsetWidth || window.innerWidth;
    const containerHeight = photosContainer.offsetHeight || window.innerHeight;
    
    // FIX
    if (photo.x === null || photo.x === undefined) {
        photo.x = e.clientX//Math.random() * Math.max(20, containerWidth - 80);
        photo.y = e.clientY//Math.random() * Math.max(20, containerHeight - 80);
        photo.rotation = (Math.random() - 0.5) * 15;

        if (typeof photoData === 'string') {
            imageUrls[index] = photo;
        }
    }
    
    photoDiv.style.left = photo.x + 'px';
    photoDiv.style.top = photo.y + 'px';
    
    const img = document.createElement('img');
    img.src = photo.url || photoData;
    img.style.transform = `scale(${photo.scale || 1})`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-photo-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deletePhoto(index);
    };
    
    const hint = document.createElement('div');
    hint.className = 'photo-hint';
    hint.textContent = 'Klicken dann Ziehen/Doppelklick/Scrollen';
    
    photoDiv.appendChild(img);
    photoDiv.appendChild(deleteBtn);
    photoDiv.appendChild(hint);
    photosContainer.appendChild(photoDiv);
    photoDiv.style.transform = `rotate(${photo.rotation || 0}deg)`;
    
    photoDiv.addEventListener('mousedown', (e) => {
        if (e.detail === 2) return;
        startPhotoDrag(e, index, photoDiv);
    });
    
    photoDiv.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openPhotoModal(photo.url || photoData, e.clientX, e.clientY);
    });
    
    photoDiv.addEventListener('wheel', (e) => handlePhotoScale(e, index, photoDiv, img));
}

// Open photo modal
function openPhotoModal(photoData, clickX = window.innerWidth / 2, clickY = window.innerHeight / 2) {
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('photo-modal-img');
    const modalContent = document.getElementById('photo-modal-content');
    if (!modal || !modalImg || !modalContent) return;

    modalImg.src = photoData;

    // Get body padding to account for offset
    const bodyStyle = window.getComputedStyle(document.body);
    const bodyPaddingTop = parseFloat(bodyStyle.paddingTop);
    const bodyPaddingLeft = parseFloat(bodyStyle.paddingLeft);

    let finalX = clickX + bodyPaddingLeft;
    let finalY = clickY + bodyPaddingTop;

    // Check if this position overlaps with existing photos
    const photosContainer = document.getElementById('photos-container');
    if (photosContainer) {
        const photos = photosContainer.querySelectorAll('.uploaded-photo');
        const overlapThreshold = 80; // pixels to avoid overlap
        
        for (const photo of photos) {
            const rect = photo.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(finalX - (rect.left + rect.width / 2), 2) +
                Math.pow(finalY - (rect.top + rect.height / 2), 2)
            );
            
            // If too close to an existing photo, move the modal away
            if (distance < overlapThreshold) {
                const angle = Math.atan2(
                    finalY - (rect.top + rect.height / 2),
                    finalX - (rect.left + rect.width / 2)
                );
                finalX = (rect.left + rect.width / 2) + Math.cos(angle) * overlapThreshold;
                finalY = (rect.top + rect.height / 2) + Math.sin(angle) * overlapThreshold;
                break;
            }
        }
    }

    // Position the modal
    modalContent.style.left = `${finalX}px`;
    modalContent.style.top = `${finalY}px`;
    modalContent.style.transform = 'translate(-50%, -50%)';

    modal.classList.add('show');
}

// Close photo modal
function closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    const modalContent = document.getElementById('photo-modal-content');
    if (!modal) return;

    modal.classList.remove('show');

    if (modalContent) {
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.transform = '';
    }
}

// Add photo to memory array
function savePhoto(photoDataUrl) {
    imageUrls.push(photoDataUrl);
    updateContentState();
}

let photoDragState = null;

// Start dragging a photo
function startPhotoDrag(e, index, photoEl) {
    if (e.target.closest('.delete-photo-btn')) return;
    
    photoDragState = {
        index,
        photoEl,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: photoEl.offsetLeft,
        startTop: photoEl.offsetTop
    };
    
    photoEl.classList.add('dragging');
    document.addEventListener('mousemove', onPhotoDragMove);
    document.addEventListener('mouseup', onPhotoDragEnd);
    e.preventDefault();
}

function onPhotoDragMove(e) {
    if (!photoDragState) return;
    const dx = e.clientX - photoDragState.startX;
    const dy = e.clientY - photoDragState.startY;
    const left = photoDragState.startLeft + dx;
    const top = photoDragState.startTop + dy;
    photoDragState.photoEl.style.left = `${left}px`;
    photoDragState.photoEl.style.top = `${top}px`;
}

function onPhotoDragEnd() {
    if (!photoDragState) return;
    photoDragState.photoEl.classList.remove('dragging');
    document.removeEventListener('mousemove', onPhotoDragMove);
    document.removeEventListener('mouseup', onPhotoDragEnd);
    
    const photo = imageUrls[photoDragState.index];
    if (typeof photo === 'object') {
        photo.x = parseFloat(photoDragState.photoEl.style.left) || 0;
        photo.y = parseFloat(photoDragState.photoEl.style.top) || 0;
    }
    
    photoDragState = null;
}

// Handle photo scaling with mouse wheel
function handlePhotoScale(e, index, photoEl, imgEl) {
    e.preventDefault();
    
    const photo = imageUrls[index];
    if (typeof photo === 'string') {
        imageUrls[index] = {
            url: photo,
            x: parseFloat(photoEl.style.left) || 0,
            y: parseFloat(photoEl.style.top) || 0,
            scale: 1,
            rotation: 0
        };
    }
    
    const photoObj = imageUrls[index];
    const delta = e.deltaY > 0 ? -0.1 : 0.1;

    // FIX
    let scale = parseFloat(imgEl.getAttribute('data-scale')) || 1
    scale = Math.max(0.3, Math.min(5, scale + delta));
    imgEl.style.transform = `scale(${scale})`;
    imgEl.setAttribute('data-scale', scale)

}

// Delete photo from memory array
function deletePhoto(index) {
    imageUrls.splice(index, 1);
    displayAllPhotos();

    // Reload images in p5.js sketch
    images = [];
    for (let i = 0; i < imageUrls.length; i++) {
        loadImage(imageUrls[i], img => {
            images[i] = img;
        });
    }
    queue = [];
    updateContentState();
}

// Handle button click to trigger file input
if (addPhotosBtn) {
    addPhotosBtn.addEventListener('click', function() {
        photoFileInput.click();
    });
}

// Handle file selection
if (photoFileInput) {
    photoFileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        savePhoto(event.target.result);
                        // Load images in p5.js sketch
                        const newIndex = imageUrls.length - 1;
                        loadImage(imageUrls[newIndex], img => {
                            images[newIndex] = img;
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Clear input for next selection
            photoFileInput.value = '';
            // Reset click counter when new photos are uploaded
            photoClickIndex = 0;
        }
    });
}

// P5.js sketch functions
function preload() {
    // Images will be loaded when uploaded, no persistence
}

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.parent("canvas-parent");
    cnv.style("display", "block");
    cnv.style("position", "absolute");
    cnv.style("inset", "0");
    cnv.style("z-index", "-1");
    lastMousePos = { x: mouseX, y: mouseY };
}

function draw() {
    clear();
    

    if (images.length === 0) return;

    let d = dist(mouseX, mouseY, lastMousePos.x, lastMousePos.y);

    if (d > distThreshold) {
        queue.unshift({ x: mouseX, y: mouseY, index: imgIndex });
        lastMousePos = { x: mouseX, y: mouseY };
        imgIndex = (imgIndex + 1) % images.length;
    }

    if (queue.length > images.length) {
        queue.pop();
    }

    for (let i = queue.length - 1; i >= 0; i--) {
        let img = images[queue[i].index];
        if (img) {

            // Keep aspect ratio while using a fixed target width
            const targetWidth = cursorPhotoSize;
            const targetHeight = img.height * (targetWidth / img.width);
            image(
                img,
                queue[i].x - targetWidth / 2,
                queue[i].y - targetHeight / 2,
                targetWidth,
                targetHeight
            );
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
// Modal event listeners
const photoModal = document.getElementById('photo-modal');
const closeBtn = document.getElementById('photo-modal-close');

if (closeBtn) {
    closeBtn.addEventListener('click', closePhotoModal);
}

if (photoModal) {
    photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) {
            closePhotoModal();
        }
    });
}

// Text save button event listener
if (saveTextBtn) {
    saveTextBtn.addEventListener('click', () => {
        if (textInput) {
            const text = textInput.value;
            localStorage.setItem('photoText', text);
            alert('Notiz gespeichert!');
        }
    });
}

// Also save text when user presses Ctrl+S or Cmd+S
if (textInput) {
    textInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (saveTextBtn) saveTextBtn.click();
        }
    });

    textInput.addEventListener('input', () => {
        playKeyClick();
    });
}

// Add click listener to display one photo per click
document.addEventListener('click', (e) => {
    // Only trigger on canvas or empty areas, not on buttons or text input
    if (!e.target.closest('button') && !e.target.closest('textarea') && !e.target.closest('input[type="file"]')) {
        displayNextPhotoOnClick(e);
    }
});

// Note handling (no modal)
const addNoteBtn = document.getElementById('add-note');
// const notesContainer = document.getElementById('notes-container');
// FIX
const notesContainer = document.getElementById('photos-container');

// Get all notes from localStorage
function getAllNotes() {
    const notes = localStorage.getItem('notes');
    return notes ? JSON.parse(notes) : [];
}

// Save notes to localStorage
function saveNotes(notes) {
    localStorage.setItem('notes', JSON.stringify(notes));
    updateContentState();
}

// Normalize legacy string notes into objects
function normalizeNote(note) {
    if (typeof note === 'string') {
        return { text: note };
    }
    if (!note || typeof note.text !== 'string') {
        return { text: '' };
    }
    return { ...note };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

let dragState = null;

function updateContentState() {
    const hasPhotos = Array.isArray(imageUrls) && imageUrls.length > 0;
    const storedNotes = getAllNotes();
    const hasNotes = Array.isArray(storedNotes) && storedNotes.length > 0;
    document.body.classList.toggle('has-content', hasPhotos || hasNotes);
}

// Display all saved notes on page
function displayAllNotes() {
    // FIX
    // notesContainer.innerHTML = '';

    notesContainer.querySelectorAll('.note-item-wrapper').forEach((n) => {
        n.remove()
    })

    const rawNotes = getAllNotes();

    if (rawNotes.length === 0) {
        return;
    }

    const notes = rawNotes.map(normalizeNote);
    let needsSave = false;

    notes.forEach((note, index) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.textContent = note.text;
        noteItem.contentEditable = 'false';
        noteItem.spellcheck = false;
        noteItem.dataset.editing = 'false';
        noteItem.dataset.noteIndex = index;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-item-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(index);
        });

        // Create a wrapper to hold both the note and delete button
        const wrapper = document.createElement('div');
        wrapper.classList.add('note-item-wrapper')
        wrapper.style.position = 'absolute';
        wrapper.style.zIndex = 60;
        wrapper.appendChild(noteItem);
        wrapper.appendChild(deleteBtn);
        wrapper.style.visibility = 'hidden';
        notesContainer.appendChild(wrapper);

        // FIX
        // const containerWidth = notesContainer.clientWidth;
        // const containerHeight = notesContainer.clientHeight;
        const containerWidth = 50 + (window.innerWidth - 200);
        const containerHeight = 100 + (window.innerHeight - 300);

        const noteWidth = noteItem.offsetWidth;
        const noteHeight = noteItem.offsetHeight;

        if (note.x === undefined || note.y === undefined) {
            note.x = Math.random() * Math.max(containerWidth - noteWidth, 0);
            note.y = Math.random() * Math.max(containerHeight - noteHeight, 0);
            needsSave = true;
        }

        if (note.rotation === undefined) {
            note.rotation = (Math.random() - 0.5) * 10; // -5 to 5 degrees
            needsSave = true;
        }

        noteItem.style.transform = `rotate(${note.rotation}deg)`;
        wrapper.style.left = `${note.x}px`;
        wrapper.style.top = `${note.y}px`;
        wrapper.style.visibility = 'visible';

        noteItem.addEventListener('keydown', (e) => {
            if (noteItem.dataset.editing === 'true') {
                // Limit to 120 characters (excluding newlines)
                const text = noteItem.textContent;
                const charCount = text.replace(/\n/g, '').length;
                // Allow Enter key, Delete, Backspace, etc.
                if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
                    if (charCount >= 120) {
                        e.preventDefault();
                    }
                }
            }
        });

        noteItem.addEventListener('input', () => {
            if (noteItem.dataset.editing === 'true') {
                playKeyClick();
            }
        });

        noteItem.addEventListener('blur', () => {
            if (noteItem.dataset.editing !== 'true') return;
            const noteIndex = parseInt(noteItem.dataset.noteIndex);
            const updatedNotes = getAllNotes().map(normalizeNote);
            if (updatedNotes[noteIndex]) {
                const transformedText = transformVowels(noteItem.textContent);
                updatedNotes[noteIndex].text = transformedText;
                noteItem.textContent = transformedText;
                saveNotes(updatedNotes);
            }
            noteItem.contentEditable = 'false';
            noteItem.dataset.editing = 'false';
        });

        noteItem.addEventListener('mousedown', (e) => {
            if (noteItem.dataset.editing === 'true') return;
            if (e.detail === 2) return; // let dblclick handle edit
            startDrag(e, index, wrapper);
        });

        noteItem.addEventListener('dblclick', () => {
            noteItem.dataset.editing = 'true';
            noteItem.contentEditable = 'true';
            noteItem.focus();
            const range = document.createRange();
            range.selectNodeContents(noteItem);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });
    });

    if (needsSave) {
        saveNotes(notes);
    }
    updateContentState();
}

function startDrag(e, index, noteEl) {
    if (e.target.closest('.note-item-delete')) return;
    const noteRect = noteEl.getBoundingClientRect();
    dragState = {
        index,
        noteEl,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: noteEl.offsetLeft,
        startTop: noteEl.offsetTop,
        containerWidth: notesContainer.clientWidth,
        containerHeight: notesContainer.clientHeight,
        noteWidth: noteRect.width,
        noteHeight: noteRect.height,
    };
    noteEl.classList.add('dragging');
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    e.preventDefault();
}

function onDragMove(e) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const left = dragState.startLeft + dx;
    const top = dragState.startTop + dy;
    dragState.noteEl.style.left = `${left}px`;
    dragState.noteEl.style.top = `${top}px`;
}

function onDragEnd() {
    if (!dragState) return;
    dragState.noteEl.classList.remove('dragging');
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);

    const notes = getAllNotes().map(normalizeNote);
    const target = notes[dragState.index];
    if (target) {
        target.x = parseFloat(dragState.noteEl.style.left) || 0;
        target.y = parseFloat(dragState.noteEl.style.top) || 0;
    }
    saveNotes(notes);
    dragState = null;
}

// Delete a note by index
function deleteNote(index) {
    const notes = getAllNotes();
    notes.splice(index, 1);
    saveNotes(notes);
    displayAllNotes();
    updateContentState();
}

function focusLastNote() {
    if (!notesContainer) return;
    const items = notesContainer.querySelectorAll('.note-item');
    if (!items.length) return;
    const last = items[items.length - 1];
    last.focus();
    const range = document.createRange();
    range.selectNodeContents(last);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

// Add note inline (no popup) and focus it
if (addNoteBtn) {
    addNoteBtn.addEventListener('click', () => {
        const notes = getAllNotes().map(normalizeNote);
        notes.push({ text: '' });
        saveNotes(notes);
        displayAllNotes();
        // Focus and enable editing on the newest note
        const items = notesContainer.querySelectorAll('.note-item');
        if (items.length) {
            const last = items[items.length - 1];
            last.dataset.editing = 'true';
            last.contentEditable = 'true';
            last.focus();
            const range = document.createRange();
            range.selectNodeContents(last);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });
}

// Load saved notes on page load
window.addEventListener('load', () => {
    displayAllNotes();
    updateContentState();
});

// Screenshot functionality
const screenshotBtn = document.getElementById('screenshot-btn');

if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
        // Temporarily hide buttons and impressum
        const screenshotBtnElem = document.getElementById('screenshot-btn');
        const addPhotosBtn = document.getElementById('add-photos');
        const addNoteBtn = document.getElementById('add-note');
        const impressum = document.querySelector('.impressum');
        const impressumText = document.querySelector('.impressum-text');
        const photoModalClose = document.getElementById('photo-modal-close');
        const noteModalClose = document.getElementById('note-modal-close');
        const canvasParent = document.getElementById('canvas-parent');
        
        const elementsToHide = [screenshotBtnElem, addPhotosBtn, addNoteBtn, impressum, impressumText, photoModalClose, noteModalClose, canvasParent];
        const originalInlineStyles = [];
        
        // Store original inline styles and hide elements
        elementsToHide.forEach(el => {
            if (el) {
                originalInlineStyles.push(el.getAttribute('style'));
                el.style.display = 'none';
            } else {
                originalInlineStyles.push(null);
            }
        });
        
        // Hide cursor globally
        const cursorStyle = document.createElement('style');
        cursorStyle.id = 'screenshot-cursor-hide';
        cursorStyle.textContent = '* { cursor: none !important; }';
        document.head.appendChild(cursorStyle);
        
        // Small delay to ensure DOM is updated
        setTimeout(() => {
            // Capture the entire body
            html2canvas(document.body, {
                allowTaint: true,
                useCORS: true,
                backgroundColor: '#f0f8ff',
                scale: 2
            }).then(canvas => {
                // Convert canvas to blob and download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `z3tt3l-${Date.now()}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                    
                    // Restore original inline styles
                    elementsToHide.forEach((el, index) => {
                        if (el) {
                            if (originalInlineStyles[index] === null) {
                                el.removeAttribute('style');
                            } else {
                                el.setAttribute('style', originalInlineStyles[index]);
                            }
                        }
                    });
                    
                    // Restore cursor
                    const styleToRemove = document.getElementById('screenshot-cursor-hide');
                    if (styleToRemove) {
                        styleToRemove.remove();
                    }
                });
            });
        }, 100);
    });
}

// Impressum hover functionality
const impressumBtn = document.querySelector('.impressum');
const impressumText = document.querySelector('.impressum-text');
const impressumClose = document.getElementById('impressum-close');

if (impressumBtn && impressumText) {
    impressumBtn.addEventListener('mouseenter', () => {
        impressumText.classList.add('show');
    });
    
    impressumText.addEventListener('mouseleave', () => {
        impressumText.classList.remove('show');
    });
    
    if (impressumClose) {
        impressumClose.addEventListener('click', () => {
            impressumText.classList.remove('show');
        });
    }
}

