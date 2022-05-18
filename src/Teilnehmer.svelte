<script>
    import {scale} from 'svelte/transition';
    export let name;

</script>

<main>
    <div transition:scale class="karte">
        {name}
    </div>

</main>


<style>
.karte {
    background-color: lightgray;
    border-radius: 20px;
    margin: 1% 20%;
    padding: 20px;
    font-size: 2em
}

</style>