<script lang='ts'>
import type { PageProps } from './$types'

const { data }: PageProps = $props()
const { products } = data
</script>

<!-- Link to PicoCSS CDN for styling -->
<link
  rel='stylesheet'
  href='https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css'
/>

<h1>Our Products</h1>
<p>A demonstration of data fetching and display using Svelte 5 and PicoCSS.</p>

<div class='pruducts'>
  {#each products as product (product.id)}
    <article>
      <header>
        <h2>{product.name}</h2>
      </header>
      <p>{product.description}</p>
      <footer>
        <p><strong>${product.price.toFixed(2)}</strong></p>
        <button onclick={() => alert(`Added ${product.name} to cart!`)}
        >Add to cart</button
        >
      </footer>
    </article>
  {/each}
</div>

<style>
  /* Custom styles for demonstration */
  article {
    border-radius: var(--border-radius);
    box-shadow: var(--card-box-shadow);
    transition: transform 0.2s ease-in-out;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  article:hover {
    transform: translateY(-5px);
  }

  .pruducts {
    display: grid;
    grid-template-columns: repeat(auto-fill, 250px);
    gap: 1.5rem;
    place-content: center;
  }
</style>
