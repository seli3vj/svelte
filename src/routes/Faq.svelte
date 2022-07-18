<script lang="ts">

	import {onMount} from "svelte";

	import Header from "../components/vorlagen/Header.svelte";
	import Footer from "../components/vorlagen/Footer.svelte";
	import Groupui from "../components/vorlagen/Groupui.svelte";
	import "./app.css";

	function a(){
		console.log("a")
	}

</script>

<main>
    <Groupui/>
	<Header/>
	<button on:click={a}>button</button>

    <h3>FAQ</h3>
	
	<groupui-accordion first="true" icon-position="left">
		<span slot="headline"><groupui-headline heading="h6"><p class="schriftfarbe_dunkel">Frage 1</p></groupui-headline></span>
		<p class="schriftfarbe_dunkel">Antwort 1</p>
	  </groupui-accordion>
	  <groupui-accordion first="true" icon-position="left">
		<span slot="headline"><groupui-headline heading="h6"><p class="schriftfarbe_dunkel">Frage 2</p></groupui-headline></span>
		<p class="schriftfarbe_dunkel">Antwort 2</p>
	  </groupui-accordion>
	  <groupui-accordion first="true" icon-position="left">
		<span slot="headline"><groupui-headline heading="h6"><p class="schriftfarbe_dunkel">Frage 3</p></groupui-headline></span>
		<p class="schriftfarbe_dunkel">Antwort 3</p>
	  </groupui-accordion>
	  <groupui-accordion first="true" icon-position="left">
		<span slot="headline"><groupui-headline heading="h6"><p class="schriftfarbe_dunkel">Frage 4</p></groupui-headline></span>
		<p class="schriftfarbe_dunkel">Antwort 4</p>
	  </groupui-accordion>
	  <groupui-accordion first="true" icon-position="left">
		<span slot="headline"><groupui-headline heading="h6"><p class="schriftfarbe_dunkel">Frage 5</p></groupui-headline></span>
		<p class="schriftfarbe_dunkel">Antwort 5</p>
	  </groupui-accordion>

	<Footer/>  
</main>

