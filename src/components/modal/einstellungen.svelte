
<script>
	function sidebarselect(){
	/*	var aktuellselect= document.getElementById("einstellungen_selected").innerHTML
		if(aktuellselect!=zahl){
			document.getElementById("einstellungen_select_"+aktuellselect).style.backgroundColor=""
			document.getElementById("einstellungen_selected_"+aktuellselect).style.display="none"
		}
		document.getElementById("einstellungen_select_"+zahl).style.backgroundColor="#00354d"
		document.getElementById("einstellungen_selected_"+zahl).style.display="block"
		document.getElementById("einstellungen_selected").innerHTML = zahl
	*/
	}

	function passwortändern(){
	/*	var passwort1 = document.getElementById("passwortwechseln1").value
		var passwort2 = document.getElementById("passwortwechseln2").value
		var passwortleer = document.getElementById("passwortwechseln2").value
		if(passwort1 == passwort2){
			notify("success", "Passwort passt")
		}
		else if(passwort1==passwortleer){
			notify("danger", "Passwort 1 bitte eingeben")
		}
		else if(passwort2==passwortleer){
			notify("danger", "Passwort 2 bitte eingeben")
		}
		else{
			notify("danger", "Passwort stimmt nicht überein")
		}
		*/
	}

	function nummerändern(){
		/*
		var nummer = document.getElementById("nummerwechseln").value
		var inputleer = document.getElementById("passwortwechseln2").value
		
		if(nummer==inputleer){
			notify("danger", "Nummer bitte eingeben")
		}
		else{
			notify("success", "Nummer geändert")
		}
		*/
	}

	function notify(){
		/*
		document.getElementById("einstellungen_notification").style.display ="block"
		setTimeout(function(){
			document.getElementById("einstellungen_notification").style.display ="none"
		},3000);
		notificationstyle=art
		notificationinhalt=inhalt
		*/
	}


	function sidebarselect1(){
		//sidebarselect(1)
	}
	function sidebarselect2(){
		//sidebarselect(2)
	}
	function sidebarselect3(){
		//sidebarselect(3)
	}
	function sidebarselect4(){
		//sidebarselect(4)
	}
	function sidebarselect5(){
		//sidebarselect(5)
	}



	var notificationstyle="success"
	var notificationinhalt="success"
</script>
<groupui-notification dismissible="false" style="display:none; position:fixed;" id="einstellungen_notification" severity="{notificationstyle}">
	{notificationinhalt}
</groupui-notification>


	<div on:load={sidebarselect1}>
		<div class="einstellungen-side-bar">
			<div style="display: none" id="einstellungen_selected">1</div>
			<div on:click={sidebarselect1} id="einstellungen_select_1" class="einstellungen-side-bar-elements">Einstellungen</div>
			<div on:click={sidebarselect2} id="einstellungen_select_2" class="einstellungen-side-bar-elements">Passwort zurücksetzen</div>
			<div on:click={sidebarselect3} id="einstellungen_select_3" class="einstellungen-side-bar-elements">Handynummer ändern</div>
			<div on:click={sidebarselect4} id="einstellungen_select_4" class="einstellungen-side-bar-elements">User Settings</div>
			<div on:click={sidebarselect5} id="einstellungen_select_5" class="einstellungen-side-bar-elements">User Settings</div>
		</div>	
		<div style="display:block" id="einstellungen_selected_1" class="einstellungen-selected">
			<p>default</p>


		</div>
		<div id="einstellungen_selected_2" class="einstellungen-selected">
			<p>Passwort zurücksetzen</p>
			<groupui-input on:change={passwortändern}  id="passwortwechseln1" placeholder="Passwort123" maxlength="16" pattern="[A-Za-z]{3}" inverted="false" type="password">
				<span slot="label">neues Passwort eingeben</span>
			</groupui-input>
			<groupui-input on:change={passwortändern} id="passwortwechseln2" placeholder="Passwort123" maxlength="16" pattern="[A-Za-z]{3}" inverted="false" type="password">
				<span slot="label">Passwort wiederholen</span>
			</groupui-input>
			<groupui-input id="passwortleer" style="display: none">
			</groupui-input>

		</div>
		<div id="einstellungen_selected_3" class="einstellungen-selected">
			<p>Handynummer ändern</p>
			<groupui-input on:change={nummerändern} id="nummerwechseln" placeholder="12345678" maxlength="16" inverted="false" type="number">
				<span slot="label">neue Nummer eingeben</span>
			</groupui-input>

		</div>
		<div id="einstellungen_selected_4" class="einstellungen-selected">
			<p>4</p>


		</div>
		<div id="einstellungen_selected_5" class="einstellungen-selected">
			<p>5</p>


		</div>
	</div>
<br>