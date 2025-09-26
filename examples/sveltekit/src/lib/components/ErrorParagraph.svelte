<script lang='ts'>
  const { msg = 'Error msg' } = $props()
</script>

<p> {msg} </p>

<style>
    p {
        color: var(--pico-del-color);
    }
</style>
