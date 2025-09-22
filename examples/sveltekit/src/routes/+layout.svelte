<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import favicon from '$lib/assets/favicon.svg'
	import { authStore } from '$lib/stores/auth.svelte'

	let { children } = $props()

	onMount(() => {
		authStore.checkAuth()
	})

	const isAuthPage = $derived($page.url.pathname === '/auth')
	const isDashboardPage = $derived($page.url.pathname === '/dashboard')
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	{#if !isAuthPage && !isDashboardPage}
		<nav class="navbar">
			<div class="nav-container">
				<a href="/" class="nav-brand">MockDash</a>
				
				<div class="nav-links">
					{#if authStore.isAuthenticated}
						<a href="/dashboard" class="nav-link">Dashboard</a>
						<button onclick={() => authStore.logout()} class="nav-link logout-btn">
							Sign Out
						</button>
					{:else}
						<a href="/auth" class="nav-link">Sign In</a>
					{/if}
				</div>
			</div>
		</nav>
	{/if}

	<main class="main-content" class:full-height={isAuthPage || isDashboardPage}>
		{@render children?.()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f8fafc;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.navbar {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		padding: 1rem 0;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-brand {
		font-size: 1.5rem;
		font-weight: bold;
		color: #3b82f6;
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.nav-link {
		color: #64748b;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.nav-link:hover {
		color: #3b82f6;
		background: #f1f5f9;
	}

	.logout-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: inherit;
	}

	.main-content {
		flex: 1;
	}

	.main-content.full-height {
		min-height: 100vh;
	}
</style>
