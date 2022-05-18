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

<style>
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