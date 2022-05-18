<script>
    export let teilnehmer;
    console.log(teilnehmer)
</script>

<main>
    <!--<h1>This is the header2 {teilnehmer[0].first_name}</h1> -->
    <groupui-header class="hydrated">
        <!-- svelte-ignore a11y-missing-attribute -->
        <groupui-headline style="margin-right: 5%;"heading="h5" class="hydrated"><img src="Bilder/infoGrabber_Logo.svg" style="height: 80%;"></groupui-headline>

        <div class="tooltip_rahmen" style="flex: 1">
            <groupui-headline heading="h5" class="hydrated" onmouseout="objektverstecken('header_projekte')" onmouseover="objektanzeigen('header_projekte')">Projektetest</groupui-headline>
            <span onmouseover="objektanzeigen('header_projekte')" onmouseout="objektverstecken('header_projekte')" id="header_projekte" class="tooltip_popup box1">
                <groupui-headline>Projekte:</groupui-headline>
                <groupui-search-field placeholder="Projektname eingeben" disabled="false" severity="none">
                    <!-- <span slot="label">Label</span>
                    <span slot="description">Description</span> <-->
                    <groupui-search-suggestion>Suggestion 1</groupui-search-suggestion>
                    <groupui-search-suggestion>Suggestion 2</groupui-search-suggestion>
                    <groupui-search-suggestion>Suggestion 3</groupui-search-suggestion>
                </groupui-search-field>
            </span>
        </div>
        <groupui-headline heading="h5" class="hydrated">FAQ</groupui-headline>
        <groupui-headline heading="h5" class="hydrated">Sonstiges</groupui-headline>

        <div style="width: 20%;" class="tooltip_rahmen">
            <groupui-avatar class="tooltip_rahmen" theme="vwag" style="float: right; position:sticky;"onclick="objektanzeigen('header_profil');"></groupui-avatar>
            
            <span style="width: 76%; margin-top: 6%;"id="header_profil" class="tooltip_popup box1" onmouseout="objektverstecken('header_profil')" onmouseover="objektanzeigen('header_profil')">
                <groupui-headline heading="h3">username</groupui-headline>
                <!-- svelte-ignore a11y-missing-attribute -->
                <div><img src="Bilder/icons/adjust-filled-16-white.svg" class="icon_element"><div class="text_mittig"><groupui-headline heading="h5" class="hydrated">Einstellungen</groupui-headline></div></div><br>
                <!-- svelte-ignore a11y-missing-attribute -->
                <div><img src="./../Bilder/icons/logout-16-white.svg" class="icon_element"><div class="text_mittig"><groupui-headline heading="h5" class="hydrated">Logout</groupui-headline></div></div>
            </span>
        </div>
    </groupui-header>

</main>

<style>

</style>