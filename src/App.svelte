<script>
	import {onMount} from "svelte";
	import Header from "./Header.svelte";
	let name = "";
	import Teilnehmer from "./Teilnehmer.svelte";
	let teilnehmer = [
		{"first_name":"Tom"}, {"first_name":"Max"}, {"first_name":"Eva"}
	]
	const neuerTeilnehmer = () => {
		if (name != ""){
			/*
			let temp = {"first_name": name}
			teilnehmer = [...teilnehmer, temp]

			let xhr = new XMLHttpRequest();
			xhr.open("POST", "http://localhost:3000/test");

			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("Content-Type", "application/json");

			xhr.onload = () => console.log(xhr.responseText);

			let data = JSON.stringify({Aname: name})
			
			
			xhr.send(data);
			
				
			fetch('http://localhost:3000/test/' + name, {
				method: 'PUT',
				body: JSON.stringify({Name: "name"}),
				headers: {"Content-type": "application/json; charset=UTF-8"}
			})
*/
			name ="";

		}else{
			alert("Name eingeben")
		}
	}

</script>

<main>
	<script type="module" src="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/group-ui.esm.js"></script>
	<script nomodule src="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/group-ui.js"></script>

	<link rel="stylesheet" href="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/man/man.css" />
	<link rel="stylesheet" href="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/vwag/vwag.css" />
	<link rel="stylesheet" href="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/audi/audi.css" />
	<link rel="stylesheet" href="https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/porschePlant/porschePlant.css" />
  
	<groupui-headline heading="h3">username</groupui-headline>
	

	<Header teilnehmer={teilnehmer} />

	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte aabtutorial</a> to learn how to build Svelte apps.</p>
	<input type="text" bind:value={name}>
	<groupui-headline heading="h3">username</groupui-headline>
	<button on:click={(neuerTeilnehmer)}>Neu</button>
	{#each teilnehmer as person}
		<Teilnehmer name={person.first_name} />
		{/each}
</main>

<style>image/pjpeg;base64,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
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>