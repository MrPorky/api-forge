<script lang='ts'>
  import favicon from '$lib/assets/favicon.svg'

  const { children } = $props()
</script>

<svelte:head>
  <link rel='icon' href={favicon} />
</svelte:head>

{@render children?.()}

<style>
  :global(html, body, body > div) {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    min-height: 100lvh;
  }

  :global(body > div) {
    display: flex;
    flex-direction: column;
    background-color: var(--purpur-color-background-primary);
    color: var(--purpur-color-text-default);
  }

  :global(body > div > main) {
    flex: 1;
  }
</style>
