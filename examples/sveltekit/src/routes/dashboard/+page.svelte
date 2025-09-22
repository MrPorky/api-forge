<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth.svelte'
  import UserProfile from '$lib/components/UserProfile.svelte'

  onMount(() => {
    if (!authStore.isAuthenticated) {
      goto('/auth')
    }
  })
</script>

<svelte:head>
  <title>Dashboard - MockDash</title>
</svelte:head>

{#if authStore.isAuthenticated}
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>Welcome back, {authStore.user?.name}!</h1>
      <p>Manage your profile and account settings below.</p>
    </header>

    <main class="dashboard-content">
      <UserProfile />
      
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>API Calls Today</h3>
          <p class="stat-number">127</p>
        </div>
        
        <div class="stat-card">
          <h3>Mock Endpoints</h3>
          <p class="stat-number">8</p>
        </div>
        
        <div class="stat-card">
          <h3>Active Projects</h3>
          <p class="stat-number">3</p>
        </div>
      </div>
    </main>
  </div>
{:else}
  <div class="loading">
    <p>Loading...</p>
  </div>
{/if}

<style>
  .dashboard {
    min-height: 100vh;
    background: #f8fafc;
  }

  .dashboard-header {
    background: white;
    padding: 2rem;
    border-bottom: 1px solid #e2e8f0;
    text-align: center;
  }

  .dashboard-header h1 {
    margin: 0 0 0.5rem 0;
    color: #1a202c;
    font-size: 2rem;
  }

  .dashboard-header p {
    margin: 0;
    color: #64748b;
    font-size: 1.1rem;
  }

  .dashboard-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    text-align: center;
  }

  .stat-card h3 {
    margin: 0 0 1rem 0;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-number {
    margin: 0;
    font-size: 2.5rem;
    font-weight: bold;
    color: #3b82f6;
  }

  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
  }

  .loading p {
    color: #64748b;
    font-size: 1.1rem;
  }
</style>