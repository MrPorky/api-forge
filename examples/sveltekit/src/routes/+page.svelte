<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte'
</script>

<svelte:head>
  <title>MockDash - Type-safe API Mocking</title>
</svelte:head>

<div class="hero">
  <div class="hero-content">
    <h1>MockDash</h1>
    <p class="hero-subtitle">
      Define API schemas once with Zod, generate type-safe clients and mock servers automatically
    </p>

    {#if authStore.isAuthenticated}
      <div class="hero-actions">
        <a href="/dashboard" class="btn-primary">Go to Dashboard</a>
        <p class="welcome-text">Welcome back, {authStore.user?.name}!</p>
      </div>
    {:else}
      <div class="hero-actions">
        <a href="/auth" class="btn-primary">Get Started</a>
        <a href="/auth" class="btn-secondary">Sign In</a>
      </div>
    {/if}
  </div>

  <div class="features">
    <div class="feature-card">
      <h3>🔒 Type Safety</h3>
      <p>Full TypeScript support with inferred types from Zod schemas</p>
    </div>
    
    <div class="feature-card">
      <h3>⚡ Zero Config</h3>
      <p>Works out of the box with sensible defaults and automatic fake data</p>
    </div>
    
    <div class="feature-card">
      <h3>🚀 Fast Development</h3>
      <p>Frontend teams can work independently with realistic mock data</p>
    </div>
  </div>
</div>

<style>
  .hero {
    min-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .hero-content {
    max-width: 800px;
    margin-bottom: 4rem;
  }

  h1 {
    font-size: 4rem;
    margin: 0 0 1rem 0;
    font-weight: bold;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    margin: 0 0 2rem 0;
    opacity: 0.9;
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn-primary {
    padding: 1rem 2rem;
    background: white;
    color: #3b82f6;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-secondary {
    padding: 1rem 2rem;
    background: transparent;
    color: white;
    text-decoration: none;
    border: 2px solid white;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: white;
    color: #3b82f6;
  }

  .welcome-text {
    margin: 0;
    opacity: 0.9;
    font-size: 1.1rem;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    max-width: 900px;
    width: 100%;
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.1);
    padding: 2rem;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .feature-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  .feature-card p {
    margin: 0;
    opacity: 0.9;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2.5rem;
    }
    
    .hero-actions {
      flex-direction: column;
    }
    
    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
