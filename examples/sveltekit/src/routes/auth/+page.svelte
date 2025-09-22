<script lang="ts">
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth.svelte'
  import LoginForm from '$lib/components/LoginForm.svelte'
  import RegisterForm from '$lib/components/RegisterForm.svelte'

  let mode: 'login' | 'register' = $state('login')

  function handleAuthSuccess() {
    goto('/')
  }

  function toggleMode() {
    mode = mode === 'login' ? 'register' : 'login'
  }
</script>

<svelte:head>
  <title>{mode === 'login' ? 'Sign In' : 'Create Account'} - MockDash</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-container">
    {#if mode === 'login'}
      <LoginForm onSuccess={handleAuthSuccess} />
    {:else}
      <RegisterForm onSuccess={handleAuthSuccess} />
    {/if}

    <div class="auth-toggle">
      {#if mode === 'login'}
        <p>
          Don't have an account?
          <button onclick={toggleMode} class="link-btn">Create one</button>
        </p>
      {:else}
        <p>
          Already have an account?
          <button onclick={toggleMode} class="link-btn">Sign in</button>
        </p>
      {/if}
    </div>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
  }

  .auth-container {
    width: 100%;
    max-width: 450px;
  }

  .auth-toggle {
    text-align: center;
    margin-top: 1.5rem;
  }

  .auth-toggle p {
    color: white;
    margin: 0;
  }

  .link-btn {
    background: none;
    border: none;
    color: white;
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
    padding: 0;
    margin-left: 0.25rem;
  }

  .link-btn:hover {
    text-decoration: none;
  }
</style>