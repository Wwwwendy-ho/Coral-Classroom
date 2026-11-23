/* Isolated demo-only launch path. This is injected into the game's shared IIFE. */
(function(){
  var query = new URLSearchParams(window.location.search);
  if(query.get('art') !== 'crafted' || query.get('shelly') !== 'storybook') return;
  // A small render of the same creature keeps the loading cover and guide
  // badges consistent without creating a second 3D scene.
  mascotTurtleSVG = function(cls){
    return '<img class="' + esc(cls) + ' crafted-guide-image" src="assets/models/crafted-shelly-loading.webp?v=organic-3" width="384" height="384" alt="Shelly, a mint sea turtle with a lavender shell">';
  };
  var previewId = 'crafted-preview-explorer';
  var launched = false;

  function enterWhenReady(){
    if(launched || !S.booted || !S.profiles || !S.profiles.length) return;
    var profile = S.profiles.find(function(p){ return p.id === previewId; });
    if(!profile) return;
    launched = true;
    profile.themeMode = 'light';
    profile.oceanTheme = true;
    S.splashDone = true;
    enterProfile(profile);
  }

  afterRender('crafted demo launch', function(){
    if(!launched){ enterWhenReady(); return; }
    if(!S.profile || S.profile.id !== previewId || S.profileLoading || S._craftedBoardStarted) return;
    S._craftedBoardStarted = true;
    S.profile.themeMode = 'light';
    S.profile.oceanTheme = true;
    S.profile.initialMode = 'child';
    var splash = document.querySelector('.cc-splash');
    if(splash) splash.remove();
    S.settings = Object.assign({}, S.settings, { sessionActive:true });
    S.sessionActive = true;
    S.managingDecks = false;
    S.splashDone = true;
    S.reef3dAt = 0;
    // Start this isolated art review at the same close composition on revisit.
    // The real game's arrival and inter-region transitions are unchanged.
    R3.flownFor = S.profile.id;
    S.view = 'home';
    render();
  });

  document.addEventListener('click', function(event){
    var button = event.target.closest('#craftedSaveWorldImage');
    if(!button) return;
    var view = window.__reef3dView && window.__reef3dView();
    if(!view || !view.renderer || !view.renderer.domElement){
      button.textContent = 'World still loading';
      setTimeout(function(){ button.textContent = 'Save world image'; }, 1800);
      return;
    }
    try {
      if(view.post && view.post.on) view.post.render(view.scene, view.cam);
      else view.renderer.render(view.scene, view.cam);
      var link = document.createElement('a');
      link.download = 'coral-classroom-world-image.png';
      link.href = view.renderer.domElement.toDataURL('image/png');
      link.click();
      button.textContent = 'World image saved';
      setTimeout(function(){ button.textContent = 'Save world image'; }, 1800);
    } catch(error){
      button.textContent = 'Image unavailable';
      setTimeout(function(){ button.textContent = 'Save world image'; }, 1800);
    }
  });
})();
