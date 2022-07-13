<script>
	import {onMount} from "svelte";
	import Header from "src/components/vorlagen/Header.svelte";
	import Footer from "src/components/vorlagen/Footer.svelte";
	import Groupui from "src/components/vorlagen/Groupui.svelte";
	
	window.onload = function exampleFunction() {
        /*inhalt=document.getElementById("projektefilter").innerHTML
		alert(inhalt)*/
	}
	let projekte = [
		{"projekt_name":"carPLAN", "detail":"Detailierter Text", "projektid":123}, {"projekt_name":"aMaxa", "detail":"detailmaxa"}, {"projekt_name":"aEva", "detail":"detaileva"}, {"projekt_name":"aMax", "detail":"detailamax"}
	]
	var projektegefiltert = projekte.slice()

	function projektsuchen(){
		//projektegefiltert=projektegefiltert.pop()
		projektegefiltert=[]
		//console.log(projektegefiltert)
		var i = 0
		while(i<projekte.length){
			//var gleich=projekte[i].projekt_name.toLowerCase().includes(document.getElementById("projektsuchen").value)
			//if(gleich === true){
				projektegefiltert.unshift(projekte[i])
			}
			i=i+1
		}
		//console.log(projektegefiltert)
	//}


	function sidebarprojekteselect(){
		//var aktuellselect= document.getElementById("projekt_selected").innerHTML
		//if(aktuellselect!=zahl){
			//document.getElementById("projekt_select_"+aktuellselect).style.backgroundColor=""
			//document.getElementById("projekt_selected_"+aktuellselect).style.display="none"
			
		//}
		//document.getElementById("projekt_select_"+zahl).style.backgroundColor="#00354d"
		//if(zahl != "auswählen"){
			//document.getElementById("projekt_selected_"+zahl).style.display="block"
		//}
		//document.getElementById("projekt_selected").innerHTML = zahl
	}
</script>

<main>
    <Groupui/>
	<Header/>
	<div style="height: 80vh; width; 100vw; ">
		<div style="display: none" id="projekt_selected">auswählen</div>
		<div class="projekte_menülinks ">
			<groupui-search-field on:input={projektsuchen} id="projektsuchen" placeholder="Projektname eingeben">
			</groupui-search-field>
			
			<div id="projektefilter">
				<div style="display:none" id="projekt_select_auswählen"></div>

				{#each projektegefiltert as projekt}

				<div id="projekt_select_{projekt.projekt_name}" on:click={() => sidebarprojekteselect ()} class="einstellungen-side-bar-elements"><p>{projekt.projekt_name}</p></div>

				
				{/each}
			</div>
		</div>
				<div id="projekt_selected_auswählen" class="projekt_selected"style="display:block">
					<p>auswählen</p>
				</div>
			{#each projektegefiltert as projekt}
				<div id="projekt_selected_{projekt.projekt_name}" class="projekt_selected">
					<groupui-headline style="color: #1b1e1f" weight="light">{projekt.projekt_name}</groupui-headline><br>
					<groupui-card>
						{projekt.detail}
					</groupui-card>
				</div>
			{/each}
	</div>
    <Footer/>  
</main>
