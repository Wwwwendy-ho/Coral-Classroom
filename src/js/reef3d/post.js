  /* ---------- The look: soft glow, a miniature-world blur at the edges, warm filmic colour ----------
     Every 3D scene (the board, the lobby, the aquarium) draws into an off-screen picture first, then one pass
     paints it to the screen with:
       · bloom: bright things (lanterns, glowing tiles, sun glints, Lumi's lure) spill a soft halo of light
       · tilt-shift: the top and bottom of the view melt into a gentle blur, so the reef reads as a little world
       · a colour grade (gentle contrast, richer colour, sunlight warmth by day, moonlit teal at night) and a vignette
       · a whisper of noise, so dark gradients never band
     Kept cheap for the iPhone XS: all the blurring happens at a quarter of the size (1/16 of the pixels), and the
     whole thing switches off on the two lowest quality levels (see reef3dQApply), so a struggling device simply
     draws the plain scene as before. */
  var REEF3D_POST_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var REEF3D_POST_DOWN = 'uniform sampler2D tSrc; uniform vec2 px; varying vec2 vUv;' +
    'void main(){ vec4 c = texture2D(tSrc, vUv + px * vec2(-1.0, -1.0)) + texture2D(tSrc, vUv + px * vec2(1.0, -1.0)) + texture2D(tSrc, vUv + px * vec2(-1.0, 1.0)) + texture2D(tSrc, vUv + px * vec2(1.0, 1.0)); gl_FragColor = c * 0.25; }';
  // (each light's share is capped, so a lantern near the camera glows softly instead of flaring)
  var REEF3D_POST_BRIGHT = 'uniform sampler2D tSrc; uniform float thr; uniform float knee; uniform float cap; varying vec2 vUv;' +
    'void main(){ vec4 c = texture2D(tSrc, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); float k = smoothstep(thr - knee, thr + knee, l); vec3 e = c.rgb * k * c.a; float m = max(e.r, max(e.g, e.b)); e *= min(1.0, cap / max(m, 0.0001)); gl_FragColor = vec4(e, 1.0); }';
  // 9 taps along one direction (linear sampling makes it a 17-wide gaussian)
  var REEF3D_POST_BLUR = 'uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;' +
    'void main(){ vec4 c = texture2D(tSrc, vUv) * 0.2270270;' +
    ' c += (texture2D(tSrc, vUv + dir * 1.3846154) + texture2D(tSrc, vUv - dir * 1.3846154)) * 0.3162162;' +
    ' c += (texture2D(tSrc, vUv + dir * 3.2307692) + texture2D(tSrc, vUv - dir * 3.2307692)) * 0.0702703; gl_FragColor = c; }';
  var REEF3D_POST_FINAL = 'uniform sampler2D tScene; uniform sampler2D tSoft; uniform sampler2D tBloom; uniform float bloomK; uniform float tiltK; uniform float focusY; uniform float band;' +
    'uniform vec3 tint; uniform float sat; uniform float contrast; uniform float vig; uniform float aspect; uniform float seed; varying vec2 vUv;' +
    'void main(){' +
    ' vec4 c = texture2D(tScene, vUv);' +
    ' float d = abs(vUv.y - focusY); float tk = smoothstep(band, band + 0.32, d) * tiltK;' +
    ' vec4 s = texture2D(tSoft, vUv); c = mix(c, s, tk);' +
    ' vec3 b = texture2D(tBloom, vUv).rgb; c.rgb += b * bloomK; c.a = max(c.a, min(1.0, dot(b, vec3(0.333)) * bloomK));' +
    ' float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); c.rgb = mix(vec3(l), c.rgb, sat);' +
    ' c.rgb = (c.rgb - 0.5) * contrast + 0.5; c.rgb *= tint;' +
    ' float hl = dot(c.rgb, vec3(0.299, 0.587, 0.114)); if(hl > 0.85){ c.rgb *= (0.85 + (hl - 0.85) / (1.0 + (hl - 0.85) * 3.0)) / hl; }' +   // highlights roll off softly (keeping their hue) instead of clipping
    ' vec2 q = (vUv - 0.5) * vec2(aspect, 1.0); c.rgb *= 1.0 - vig * smoothstep(0.35, 1.05, length(q));' +
    ' c.rgb += (fract(sin(dot(vUv * 717.0 + seed, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;' +
    ' gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a); }';

  function reef3dPost(renderer, night){
    var THREE = window.THREE; if(!THREE) return null;
    var gl2 = renderer.capabilities && renderer.capabilities.isWebGL2;
    var opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    // stencilBuffer asks three.js for a 24-bit depth buffer (without it a render target gets 16 bits, and far-off
    // surfaces close together, like the board's sand and the seabed beyond it, flicker through each other)
    var mopts = Object.assign({ stencilBuffer: true }, opts);
    var main = gl2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(1, 1, mopts) : new THREE.WebGLRenderTarget(1, 1, mopts);
    if(main.samples !== undefined) main.samples = innerWidth * innerHeight > 700000 ? 2 : 4;   // tablets: 2 samples is plenty at their size, and cheaper
    var small = function(){ var t = new THREE.WebGLRenderTarget(1, 1, opts); t.depthBuffer = false; t.texture.generateMipmaps = false; return t; };
    var soft = small(), softB = small(), glow = small(), glowB = small();
    var camO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sceneO = new THREE.Scene();
    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); quad.frustumCulled = false; sceneO.add(quad);
    var mat = function(fs, u){ return new THREE.ShaderMaterial({ vertexShader: REEF3D_POST_VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, transparent: false }); };
    var mDown = mat(REEF3D_POST_DOWN, { tSrc: { value: null }, px: { value: new THREE.Vector2() } });
    var mBright = mat(REEF3D_POST_BRIGHT, { tSrc: { value: null }, thr: { value: .8 }, knee: { value: .12 }, cap: { value: .45 } });
    var mBlur = mat(REEF3D_POST_BLUR, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
    var U = { tScene: { value: main.texture }, tSoft: { value: soft.texture }, tBloom: { value: glow.texture }, bloomK: { value: .5 }, tiltK: { value: .85 }, focusY: { value: .44 }, band: { value: .2 },
      tint: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1.1 }, contrast: { value: 1.05 }, vig: { value: .22 }, aspect: { value: 1 }, seed: { value: 0 } };
    var mFinal = mat(REEF3D_POST_FINAL, U); mFinal.transparent = true; mFinal.blending = THREE.NoBlending;
    var P = { on: true, w: 0, h: 0, U: U, extraTilt: 0, band: .2, tilt: .82 };
    function pass(m, target){ quad.material = m; renderer.setRenderTarget(target); renderer.render(sceneO, camO); }
    function blur(src, tmp, w, h, spread){ mBlur.uniforms.tSrc.value = src.texture; mBlur.uniforms.dir.value.set(spread / w, 0); pass(mBlur, tmp);
      mBlur.uniforms.tSrc.value = tmp.texture; mBlur.uniforms.dir.value.set(0, spread / h); pass(mBlur, src); }
    P.look = function(isNight){   // the grade for day or night
      if(isNight){ mBright.uniforms.thr.value = .74; mBright.uniforms.knee.value = .1; U.bloomK.value = 1; U.tint.value.set(.96, 1.02, 1.05); U.sat.value = 1.12; U.contrast.value = 1.07; U.vig.value = .34; }
      else { mBright.uniforms.thr.value = .93; mBright.uniforms.knee.value = .05; U.bloomK.value = .3; U.tint.value.set(1.035, 1.0, .955); U.sat.value = 1.1; U.contrast.value = 1.05; U.vig.value = .2; }
    };
    P.look(night);
    P.render = function(scene, cam){
      if(!P.on){ renderer.setRenderTarget(null); renderer.render(scene, cam); return; }
      var size = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(1, size.x | 0), h = Math.max(1, size.y | 0);
      if(w !== P.w || h !== P.h){
        P.w = w; P.h = h; main.setSize(w, h);
        var sw = Math.max(1, w >> 2), sh = Math.max(1, h >> 2);
        [soft, softB, glow, glowB].forEach(function(t){ t.setSize(sw, sh); });
        mDown.uniforms.px.value.set(1.5 / w, 1.5 / h); U.aspect.value = w / h;
      }
      var sw2 = Math.max(1, w >> 2), sh2 = Math.max(1, h >> 2);
      renderer.setRenderTarget(main); renderer.clear(); renderer.render(scene, cam);
      mDown.uniforms.tSrc.value = main.texture; pass(mDown, soft);                    // the scene at 1/4 size
      mBright.uniforms.tSrc.value = soft.texture; pass(mBright, glow);                 // just its brightest parts
      blur(soft, softB, sw2, sh2, 1); blur(glow, glowB, sw2, sh2, 1.2); blur(glow, glowB, sw2, sh2, 2.4);   // a wider halo than blur
      U.tiltK.value = Math.min(1, P.tilt + P.extraTilt); U.band.value = Math.max(.08, P.band - P.extraTilt * .14); U.seed.value = (U.seed.value + 1.7) % 97;
      quad.material = mFinal; renderer.setRenderTarget(null); renderer.render(sceneO, camO);
    };
    P.dispose = function(){ [main, soft, softB, glow, glowB].forEach(function(t){ t.dispose(); }); [mDown, mBright, mBlur, mFinal].forEach(function(m){ m.dispose(); }); quad.geometry.dispose(); };
    return P;
  }
  // Whether a device should draw the look at all (also used to decide the canvas's own edge smoothing)
  function reef3dPostWanted(q){ return q < 2; }
