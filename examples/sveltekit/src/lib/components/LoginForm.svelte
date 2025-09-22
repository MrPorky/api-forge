<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte'

  let { onSuccess = () => {} }: { onSuccess?: () => void } = $props()

  let email = $state('')
  let password = $state('')
  let error = $state('')

  async function handleSubmit() {
    error = ''
    const result = await authStore.login(email, password)
    
    if (result.success) {
      onSuccess()
    } else {
      error = result.error || 'Login failed'
    }
  }

  const isValid = $derived(email.includes('@') && password.length >= 6)
</script>

<form onsubmit={handleSubmit} class="auth-form">
  <h2>Sign In</h2>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="field">
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      bind:value={email}
      placeholder="Enter your email"
      required
    />
  </div>

  <div class="field">
    <label for="password">Password</label>
    <input
      id="password"
      type="password"
      bind:value={password}
      placeholder="Enter your password"
      required
    />
  </div>

  <button 
    type="submit" 
    disabled={!isValid || authStore.isLoading}
    class="submit-btn"
  >
    {authStore.isLoading ? 'Signing in...' : 'Sign In'}
  </button>
</form>

<style>
  .auth-form {
    max-width: 400px;
    margin: 0 auto;
    padding: 2rem;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    background: white;
  }

  h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #1a202c;
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

  .submit-btn {
    width: 100%;
    padding: 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .submit-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
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