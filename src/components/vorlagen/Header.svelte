<script>
	import Einstellungen from "./../modal/einstellungen.svelte";
    
    function header_projekte_anzeigen(){
        //objektanzeigen("header_projekte")
    }
    function header_projekte_verstecken(){
        //objektverstecken("header_projekte")
    }
    function header_profil_anzeigen(){
        //objektanzeigen("header_profil")
    }
    function header_profil_verstecken(){
        //objektverstecken("header_profil")
    }
    function logout(){
        alert()
    }
    function einstellungen_öffnen(){
        //document.querySelector('groupui-modal')['displayed'] = true
    }
    function einstellungen_schließen(){
        //document.querySelector('groupui-modal')['displayed'] = false
    }
   //function objektanzeigen(objektid){
        //document.getElementById(objektid).style.display = "block"
    //}
    //function objektverstecken(objektid){
        //document.getElementById(objektid).style.display = "none"
    //}
</script>
<div style="height:64px"></div>
<groupui-header class="hydrated"> 

    <!-- svelte-ignore a11y-missing-attribute -->
    <groupui-headline style="margin-right: 5%;"heading="h5" class="hydrated"><a class="link" href="./"><img src="Bilder/infoGrabber_Logo.svg" style="width: 250px;"></a></groupui-headline>
    <div>
        <a class="link" href="./faq"><div class="header_item">FAQ</div></a>
        <a class="link" href="./projekte"><div class="header_item">Projekte</div></a>
        <div class="header_item">Sonstiges</div>   
    </div>
    <div class="tooltip_rahmen" style="width: 350px; right: 15px; position: fixed;">
        <div on:click={header_profil_anzeigen} style="">
            <groupui-avatar class="tooltip_rahmen" theme="vwag" ></groupui-avatar>
        </div>
        
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <span style="width: 280px; margin-top: 3%; "id="header_profil" class="tooltip_popup box1" on:mouseout={header_profil_verstecken} on:mouseover={header_profil_anzeigen}>
            <groupui-headline heading="h3" class="schriftfarbe">username</groupui-headline>
            <!-- svelte-ignore a11y-missing-attribute -->
            <div on:click={einstellungen_öffnen}><img src="Bilder/icons/adjust-filled-16-white.svg" class="icon_element"><div class="text_mittig"><groupui-headline heading="h4" class="hydrated">Einstellungen</groupui-headline></div></div><br>
            <!-- svelte-ignore a11y-missing-attribute -->
            <div on:click={logout}><img src="./../Bilder/icons/logout-16-white.svg" class="icon_element"><div class="text_mittig"><groupui-headline heading="h4" class="hydrated">Logout</groupui-headline></div></div>
        </span>




        <groupui-modal id="einstellungenfenster" theme="vwag">

            <div on:click={einstellungen_schließen} class="closedialog"><p style="display: table-cell; vertical-align: middle;">X</p></div>
            <Einstellungen/>
        </groupui-modal>
    </div>  
</groupui-header>
