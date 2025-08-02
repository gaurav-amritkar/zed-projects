// Note Organizer App - JavaScript
class NoteOrganizer {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingNoteId = null;

        this.initializeEventListeners();
        this.renderNotes();
        this.updateStats();
    }

    initializeEventListeners() {
        // Modal controls
        document.getElementById('addNoteBtn').addEventListener('click', () => this.openNoteModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());

        // Delete modal controls
        document.getElementById('closeDeleteModal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderNotes();
        });

        // Category filtering
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.setActiveCategory(e.target);
                this.currentFilter = e.target.dataset.category;
                this.renderNotes();
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const noteModal = document.getElementById('noteModal');
            const deleteModal = document.getElementById('deleteModal');

            if (e.target === noteModal) {
                this.closeNoteModal();
            }
            if (e.target === deleteModal) {
                this.closeDeleteModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeNoteModal();
                this.closeDeleteModal();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openNoteModal();
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    openNoteModal(noteId = null) {
        const modal = document.getElementById('noteModal');
        const modalTitle = document.getElementById('modalTitle');
        const noteTitle = document.getElementById('noteTitle');
        const noteCategory = document.getElementById('noteCategory');
        const noteContent = document.getElementById('noteContent');
        const noteTagsInput = document.getElementById('noteTagsInput');

        if (noteId) {
            // Edit mode
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                this.editingNoteId = noteId;
                modalTitle.textContent = 'Edit Note';
                noteTitle.value = note.title;
                noteCategory.value = note.category;
                noteContent.value = note.content;
                noteTagsInput.value = note.tags.join(', ');
            }
        } else {
            // Create mode
            this.editingNoteId = null;
            modalTitle.textContent = 'New Note';
            noteTitle.value = '';
            noteCategory.value = 'personal';
            noteContent.value = '';
            noteTagsInput.value = '';
        }

        modal.classList.add('show');
        noteTitle.focus();
    }

    closeNoteModal() {
        const modal = document.getElementById('noteModal');
        modal.classList.remove('show');
        this.editingNoteId = null;
    }

    saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const category = document.getElementById('noteCategory').value;
        const content = document.getElementById('noteContent').value.trim();
        const tagsInput = document.getElementById('noteTagsInput').value.trim();

        if (!title || !content) {
            alert('Please fill in both title and content fields.');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const now = new Date();

        if (this.editingNoteId) {
            // Update existing note
            const noteIndex = this.notes.findIndex(n => n.id === this.editingNoteId);
            if (noteIndex !== -1) {
                this.notes[noteIndex] = {
                    ...this.notes[noteIndex],
                    title,
                    category,
                    content,
                    tags,
                    updatedAt: now.toISOString()
                };
            }
        } else {
            // Create new note
            const newNote = {
                id: this.generateId(),
                title,
                category,
                content,
                tags,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };
            this.notes.unshift(newNote);
        }

        this.saveToLocalStorage();
        this.renderNotes();
        this.updateStats();
        this.closeNoteModal();
    }

    deleteNote(noteId) {
        this.noteToDelete = noteId;
        const modal = document.getElementById('deleteModal');
        modal.classList.add('show');
    }

    confirmDelete() {
        if (this.noteToDelete) {
            this.notes = this.notes.filter(note => note.id !== this.noteToDelete);
            this.saveToLocalStorage();
            this.renderNotes();
            this.updateStats();
            this.noteToDelete = null;
        }
        this.closeDeleteModal();
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('show');
        this.noteToDelete = null;
    }

    setActiveCategory(activeElement) {
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        activeElement.classList.add('active');
    }

    filterNotes() {
        let filteredNotes = this.notes;

        // Filter by category
        if (this.currentFilter !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.category === this.currentFilter);
        }

        // Filter by search query
        if (this.searchQuery) {
            filteredNotes = filteredNotes.filter(note =>
                note.title.toLowerCase().includes(this.searchQuery) ||
                note.content.toLowerCase().includes(this.searchQuery) ||
                note.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }

        return filteredNotes;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    truncateContent(content, maxLength = 150) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    renderNotes() {
        const notesGrid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyState');
        const filteredNotes = this.filterNotes();

        if (filteredNotes.length === 0) {
            notesGrid.style.display = 'none';
            emptyState.style.display = 'block';

            if (this.notes.length === 0) {
                emptyState.innerHTML = `
                    <div class="empty-icon">📝</div>
                    <h3>No notes yet</h3>
                    <p>Create your first note to get started organizing your thoughts!</p>
                    <button class="empty-add-btn" onclick="noteOrganizer.openNoteModal()">Create Note</button>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <h3>No notes found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                `;
            }
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.style.display = 'grid';

        notesGrid.innerHTML = filteredNotes.map(note => `
            <div class="note-card" data-category="${note.category}" onclick="noteOrganizer.openNoteModal('${note.id}')">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                    <div class="note-actions">
                        <button class="note-action-btn edit-btn" onclick="event.stopPropagation(); noteOrganizer.openNoteModal('${note.id}')" title="Edit note">✏️</button>
                        <button class="note-action-btn delete-btn" onclick="event.stopPropagation(); noteOrganizer.deleteNote('${note.id}')" title="Delete note">🗑️</button>
                    </div>
                </div>
                <div class="note-content">${this.escapeHtml(this.truncateContent(note.content))}</div>
                <div class="note-meta">
                    <span class="note-category">${note.category}</span>
                    <span class="note-date">${this.formatDate(note.updatedAt)}</span>
                </div>
                ${note.tags.length > 0 ? `
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="note-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats() {
        const totalNotesElement = document.getElementById('totalNotes');
        totalNotesElement.textContent = this.notes.length;
    }

    saveToLocalStorage() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
    }

    // Export functionality
    exportNotes() {
        const dataStr = JSON.stringify(this.notes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Import functionality
    importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedNotes = JSON.parse(e.target.result);
                if (Array.isArray(importedNotes)) {
                    if (confirm('This will replace all your current notes. Are you sure?')) {
                        this.notes = importedNotes;
                        this.saveToLocalStorage();
                        this.renderNotes();
                        this.updateStats();
                        alert('Notes imported successfully!');
                    }
                } else {
                    alert('Invalid file format. Please select a valid notes backup file.');
                }
            } catch (error) {
                alert('Error reading file. Please make sure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}

// Global functions for HTML onclick handlers
function openNoteModal() {
    noteOrganizer.openNoteModal();
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noteOrganizer = new NoteOrganizer();
});

// Add some sample notes for demo purposes (only if no notes exist)
document.addEventListener('DOMContentLoaded', () => {
    const existingNotes = JSON.parse(localStorage.getItem('notes'));
    if (!existingNotes || existingNotes.length === 0) {
        const sampleNotes = [
            {
                id: 'sample1',
                title: 'Welcome to Note Organizer!',
                category: 'personal',
                content: 'This is your first note! You can create, edit, delete, and organize your notes by categories. Use the search function to quickly find what you\'re looking for.',
                tags: ['welcome', 'getting-started'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'sample2',
                title: 'Project Ideas',
                category: 'ideas',
                content: 'Some interesting project ideas:\n- Build a task management app\n- Create a personal blog\n- Develop a weather dashboard\n- Make a recipe organizer',
                tags: ['projects', 'coding', 'inspiration'],
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                updatedAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 'sample3',
                title: 'Meeting Notes - Q4 Planning',
                category: 'work',
                content: 'Key points from today\'s meeting:\n- Review quarterly goals\n- Plan resource allocation\n- Schedule follow-up meetings\n- Update project timelines',
                tags: ['meeting', 'planning', 'q4'],
                createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                updatedAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];

        localStorage.setItem('notes', JSON.stringify(sampleNotes));
    }
});
