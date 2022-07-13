<script>
	import {onMount} from "svelte";
	import Header from "src/components/vorlagen/Header.svelte";
	import Footer from "src/components/vorlagen/Footer.svelte";
	import Groupui from "src/components/vorlagen/Groupui.svelte";
	
</script>

<main>
    <Groupui/>
	<Header/>

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
