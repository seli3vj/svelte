<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly, fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();
    var custom = false
    export let isvisble = false, opentext = "", type: PopupType = PopupType.Custom, headline = opentext, callback = ()=>(console.log("no callback"))
    let text = ""
    
    switch (type) {
    case PopupType.Custom:
        text = "Custom"
   
        custom = true
        break
    case PopupType.Welcome:
        text = "Welcome"
        break
    case PopupType.Imprint:
        text = "Imprint"
        break
    case PopupType.TermsOfUse:
        text = "Terms"
        break
    case PopupType.DataPrivacy:
        text = "Data Privacy"
        break
    }
    
    function close(callback = ()=>(console.log())){
        //dispatch('closeIt');
        isvisble = false
        callback()
    }
    function open(){
        isvisble = true
    }
</script>

<script context="module" lang="ts">
    export enum PopupType {
        Welcome = "Welcome",
        Imprint = "Imprint",
        DataPrivacy = "DataPrivacy",
        TermsOfUse = "TermsOfUse",
        Custom = "Custom"
    }
</script>
<div on:click={open}>{opentext}</div>
{#if isvisble==true}  
<div class="background" transition:fade on:click={()=>close(callback)}/>
<div class="middle-box" transition:fly={{y: -500}}>
    <div class="xbutton" on:click={()=>close(callback)}>x</div>
        <h2 style="text-align: center;">{ headline }</h2>
        <hr style="border-color: lightgray;">
        {#if custom == false}  
            { text }
        {/if}

        {#if custom == true}  
            <slot />
        {/if}
        <hr style="border-color: lightgray;">
        <button style="background-color:#00486c; color:white;margin-left: 83%; width: 100px; height: 45px; font-size: 16px" on:click|preventDefault={()=>close(callback)}>Schließen</button>
</div>
{/if}
<style>
.xbutton{
        text-align: center;
        font-size: 20px;
        float: right;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.301);
        width: 30px;
        height: 30px;
    }
    .background {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100vw;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10;
    }
    .middle-box {
        font-weight: normal;
        font-style: normal;
        font-size: 18px;
        text-decoration: none;
        overflow: scroll;
        padding: 15px;
        z-index: 11;
        background-color: white;
        min-height: 20vh;
        max-height: 70vh;
        width: 600px;
        color: black;
        position: fixed;
        top: 50vh;
        left: 50%;
        margin: -320px 0 0 -320px;
    }
</style>