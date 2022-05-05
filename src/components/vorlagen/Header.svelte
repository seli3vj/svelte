<script>
	import Einstellungen from "./../modal/einstellungen.svelte";
    import Logo from "../Bilder/infoGrabber_Logo.svg";
    import icon_logout from "../Bilder/icons/logout-16-white.svg"
    import icon_einstellungen from "../Bilder/icons/adjust-filled-16-white.svg"
    let ProfilOffen = true
    let EinstellungenOffen = true
    function header_profil_anzeigen(){
        console.log("a")
        ProfilOffen = true
    }
    function header_profil_verstecken(){
        ProfilOffen = false
    }
    function logout(){
        alert()
    }
    function einstellungen_öffnen(){
        EinstellungenOffen = true
    }
    function einstellungen_schließen(){
        EinstellungenOffen = false
    }
</script>

<main>
<div style="height:64px"></div>
<groupui-header class="hydrated"> 

    <!-- svelte-ignore a11y-missing-attribute -->
    <groupui-headline style="margin-right: 5%;"heading="h5" class="hydrated"><a class="link" href="./"><img src = {Logo} style="width: 250px;"></a></groupui-headline>
    <div>
        <a class="link" href="./Faq"><div class="header_item">FAQ</div></a>
        <a class="link" href="./projekte"><div class="header_item">Projekte</div></a>
        <div class="header_item">Sonstiges</div>   
    </div>
    <div class="tooltip_rahmen" style="width: 350px; right: 15px; position: fixed;">
        <div on:click={()=>header_profil_anzeigen()} style="">
            <groupui-avatar class="tooltip_rahmen" theme="vwag" ></groupui-avatar>
        </div>
   
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        {#if ProfilOffen}
        <span style="width: 280px; margin-top: 3%; "id="header_profil" class="tooltip_popup box1" on:mouseout={header_profil_verstecken} on:mouseover={header_profil_anzeigen}>
            <groupui-headline heading="h3" class="schriftfarbe">username</groupui-headline>
           
            <div on:click={einstellungen_öffnen}><img alt="bild" src={icon_einstellungen} class="icon_element"><div class="text_mittig"><groupui-headline heading="h4" class="hydrated">Einstellungen</groupui-headline></div></div><br>
            <div on:click={logout}><img alt="bild" src= {icon_logout} class="icon_element"><div class="text_mittig"><groupui-headline heading="h4" class="hydrated">Logout</groupui-headline></div></div>
        </span>
        {/if}


       {#if EinstellungenOffen}
        <groupui-modal id="einstellungenfenster" theme="vwag">

            <div on:click={einstellungen_schließen} class="closedialog"><p style="display: table-cell; vertical-align: middle;">X</p></div>
            <Einstellungen/>
        </groupui-modal>
       {/if} 

    </div> 

</groupui-header>
</main>
