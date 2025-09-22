<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte'

  let isEditing = $state(false)
  let editName = $state('')
  let editAvatar = $state('')
  let error = $state('')
  let success = $state('')

  function startEdit() {
    isEditing = true
    editName = authStore.user?.name || ''
    editAvatar = authStore.user?.avatar || ''
    error = ''
    success = ''
  }

  function cancelEdit() {
    isEditing = false
    editName = ''
    editAvatar = ''
    error = ''
    success = ''
  }

  async function saveProfile() {
    error = ''
    success = ''
    
    const result = await authStore.updateProfile(editName, editAvatar)
    
    if (result.success) {
      success = 'Profile updated successfully!'
      isEditing = false
      setTimeout(() => success = '', 3000)
    } else {
      error = result.error || 'Update failed'
    }
  }

  async function handleLogout() {
    await authStore.logout()
  }

  const user = $derived(authStore.user)
</script>

{#if user}
  <div class="profile-card">
    <div class="profile-header">
      <div class="avatar">
        {#if user.avatar}
          <img src={user.avatar} alt={user.name} />
        {:else}
          <div class="avatar-placeholder">
            {user.name.charAt(0).toUpperCase()}
          </div>
        {/if}
      </div>
      
      <div class="user-info">
        <h2>{user.name}</h2>
        <p class="email">{user.email}</p>
        <p class="member-since">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>

    {#if success}
      <div class="success">{success}</div>
    {/if}

    {#if error}
      <div class="error">{error}</div>
    {/if}

    {#if isEditing}
      <form onsubmit={saveProfile} class="edit-form">
        <div class="field">
          <label for="editName">Name</label>
          <input
            id="editName"
            type="text"
            bind:value={editName}
            placeholder="Enter your name"
            required
          />
        </div>

        <div class="field">
          <label for="editAvatar">Avatar URL (optional)</label>
          <input
            id="editAvatar"
            type="url"
            bind:value={editAvatar}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div class="form-actions">
          <button type="button" onclick={cancelEdit} class="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={authStore.isLoading || !editName.trim()}
            class="btn-primary"
          >
            {authStore.isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    {:else}
      <div class="profile-actions">
        <button onclick={startEdit} class="btn-secondary">
          Edit Profile
        </button>
        <button onclick={handleLogout} class="btn-danger">
          Sign Out
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .profile-card {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    border: 1px solid #e1e5e9;
    border-radius: 12px;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
  }

  .user-info h2 {
    margin: 0 0 0.5rem 0;
    color: #1a202c;
  }

  .email {
    color: #6b7280;
    margin: 0 0 0.25rem 0;
  }

  .member-since {
    color: #9ca3af;
    font-size: 0.875rem;
    margin: 0;
  }

  .edit-form {
    border-top: 1px solid #e5e7eb;
    padding-top: 1.5rem;
  }

  .field {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-actions,
  .profile-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn-danger {
    padding: 0.75rem 1.5rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .success {
    background: #f0f9ff;
    color: #0369a1;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    border: 1px solid #bae6fd;
  }

  .error {
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    border: 1px solid #fecaca;
  }
</style>