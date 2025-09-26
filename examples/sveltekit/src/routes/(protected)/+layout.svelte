<script lang='ts'>
  import favicon from '$lib/assets/favicon.svg'

  const { children } = $props()
</script>

<header>
  <div class='container'>
    <nav>
      <a href='/'>
        <img class='logo' src={favicon} alt='svelte logo' />
      </a>
      <ul>
        <li><a class='contrast' href='/products'>Products</a></li>
      </ul>
    </nav>
  </div>
</header>
<main class='container'>
  {@render children?.()}
</main>

<style>
  .logo {
    height: 4rem;
  }

  header {
    border-bottom: 1px solid var(--pico-muted-border-color);
    margin-bottom: 2rem;
    padding: 0.25rem 0.5rem;
  }
</style>
