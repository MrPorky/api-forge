<script lang='ts'>
  const { children } = $props()
</script>

<div class='center'>
  {@render children?.()}
</div>

<style>
  .center {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
