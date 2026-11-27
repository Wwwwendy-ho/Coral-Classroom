  var REGION_INTERIOR_VENUES = {
    restaurant: {
      floor: 0xac7340, floorAlt: 0x945e30, floorStyle: 'plank',
      trim: 0x8b5632, wall: 0xf1d2ad, wallAlt: 0xe5be92, accent: 0xd9644f,
      counter: 0xa6693c, counterPanel: 0xc7a987, counterTop: 0xf6efe4,
      windowFrame: 0x6f4325, curtain: 0xd96b5a, rug: 0xc95e49, rugTrim: 0xf7e7cf
    },
    cafe: {
      floor: 0xccb898, floorAlt: 0xbaa380, floorStyle: 'tile',
      trim: 0x734a2e, wall: 0xe5f0e8, wallAlt: 0xd7e6dc, accent: 0x4b8f7a,
      counter: 0x845a3d, counterPanel: 0x69442a, counterTop: 0xfbf7f0,
      windowFrame: 0x563824, curtain: 0x579c87, rug: 0x69ab95, rugTrim: 0xf5ebd6
    },
    shop: {
      floor: 0xc0a37a, floorAlt: 0xac8e64, floorStyle: 'plank',
      trim: 0x5c9ca3, wall: 0xfcf4e4, wallAlt: 0xf2e7d4, accent: 0xe69f38,
      counter: 0x9c6d42, counterPanel: 0x7cbcc0, counterTop: 0xf8f1e2,
      windowFrame: 0x6c4928, curtain: 0xe2923b, rug: 0xe9a84e, rugTrim: 0xfff4dc
    },
    subway: {
      floor: 0x7a8796, floorAlt: 0x697685, floorStyle: 'tile',
      trim: 0x455666, wall: 0xe1e8ef, wallAlt: 0xd3dde6, accent: 0x26879c,
      counter: 0x516475, counterPanel: 0x3e4f5e, counterTop: 0xd2dce4,
      windowFrame: 0x354452, curtain: 0x3b8ea1, rug: 0x4b99ab, rugTrim: 0xe9f2f7
    },
    hotel: {
      floor: 0x558f92, floorAlt: 0x457c7f, floorStyle: 'tile',
      trim: 0x7a5133, wall: 0xf6efe2, wallAlt: 0xebe1cf, accent: 0xc9963b,
      counter: 0x825536, counterPanel: 0x6a4328, counterTop: 0xf7f1e5,
      windowFrame: 0x5e3c24, curtain: 0xc9963b, rug: 0xd6a64f, rugTrim: 0xf9f1df
    },
    pharmacy: {
      floor: 0xc7d5ce, floorAlt: 0xb4c5bc, floorStyle: 'tile',
      trim: 0x4d8c7a, wall: 0xf3f6fa, wallAlt: 0xe6ecf4, accent: 0x36a382,
      counter: 0xd5e3dd, counterPanel: 0xbed2c9, counterTop: 0xffffff,
      windowFrame: 0x427566, curtain: 0x4ca888, rug: 0x5eb898, rugTrim: 0xf5faf7
    },
    taxi: {
      floor: 0x707d88, floorAlt: 0x5f6c78, floorStyle: 'tile',
      trim: 0x364554, wall: 0xf7eed4, wallAlt: 0xefe2be, accent: 0xe8b42c,
      counter: 0xe6b432, counterPanel: 0x2a333d, counterTop: 0xf9f3e2,
      windowFrame: 0x2c3946, curtain: 0x2f6c8a, rug: 0xe6b432, rugTrim: 0x252d36
    },
    friend: {
      floor: 0xc3ad8b, floorAlt: 0xb29a76, floorStyle: 'tile',
      trim: 0x8d6340, wall: 0xfaf2e1, wallAlt: 0xf3e7ce, accent: 0xe38472,
      counter: 0x9c6e46, counterPanel: 0x845a36, counterTop: 0xfaf4e6,
      windowFrame: 0x7b5435, curtain: 0x5ca8a8, rug: 0x5ca8a8, rugTrim: 0xfcf2dc
    }
  };

  var REGION_INTERIOR_TEX = {};

  function regionInteriorHex(n){
    return '#' + ('000000' + n.toString(16)).slice(-6);
  }

  function regionInteriorTex(key, w, h, repeatX, repeatY, drawFn){
    if(REGION_INTERIOR_TEX[key]) return REGION_INTERIOR_TEX[key];
    var T = window.THREE;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    drawFn(g, w, h);
    var tex = new T.CanvasTexture(c);
    if(repeatX > 1 || repeatY > 1){
      tex.wrapS = T.RepeatWrapping;
      tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
    }
    tex.needsUpdate = true;
    REGION_INTERIOR_TEX[key] = tex;
    return tex;
  }

  function regionInteriorFloorTex(kind, theme){
    return regionInteriorTex('floor:v4:' + kind, 256, 256, 6, 5, function(g, w, h){
      var base = regionInteriorHex(theme.floor), alt = regionInteriorHex(theme.floorAlt);
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      if(theme.floorStyle === 'plank'){
        var plankH = 32;
        for(var y = 0; y < h; y += plankH){
          var row = y / plankH;
          var off = row % 2 ? 64 : 0;
          // Rich warm tonal variation per varnished wood plank
          g.fillStyle = row % 3 === 0 ? 'rgba(255,246,222,0.11)' : (row % 3 === 1 ? 'rgba(68,38,18,0.08)' : 'rgba(255,234,196,0.05)');
          g.fillRect(0, y + 2, w, plankH - 4);
          // Delicate satin wood grain streaks & glossy longitudinal varnish catch
          g.fillStyle = 'rgba(72,40,18,0.085)';
          g.fillRect(0, y + 8 + (row % 3) * 2, w, 2);
          g.fillRect(0, y + 20 - (row % 2) * 3, w, 1.5);
          g.fillStyle = 'rgba(255,250,236,0.14)';
          g.fillRect(0, y + 13 + (row % 2) * 2, w, 2.5);
          // Top bevel highlight & dark seam
          g.fillStyle = 'rgba(255,248,228,0.18)';
          g.fillRect(0, y + 2, w, 2.5);
          g.fillStyle = alt;
          g.fillRect(0, y, w, 2.5);
          // Staggered vertical plank joints & tiny pegged nail dots
          [off, (off + 128) % w].forEach(function(jx){
            g.fillStyle = alt;
            g.fillRect(jx, y, 2.5, plankH);
            g.fillStyle = 'rgba(76,42,20,0.42)';
            g.beginPath(); g.arc((jx + 8) % w, y + 9, 2, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc((jx + 8) % w, y + plankH - 9, 2, 0, Math.PI * 2); g.fill();
          });
        }
      } else {
        var s = 64;
        for(var ty = 0; ty < h; ty += s){
          for(var tx = 0; tx < w; tx += s){
            var isAlt = ((tx / s) + (ty / s)) % 2 === 0;
            g.fillStyle = isAlt ? alt : base;
            g.fillRect(tx, ty, s, s);
            // Subtle diagonal polished sheen gradient per ceramic/marble tile
            var tg = g.createLinearGradient(tx, ty, tx + s, ty + s);
            tg.addColorStop(0, 'rgba(255,255,255,0.12)');
            tg.addColorStop(0.5, 'rgba(255,255,255,0.02)');
            tg.addColorStop(1, 'rgba(18,28,32,0.06)');
            g.fillStyle = tg;
            g.fillRect(tx + 2, ty + 2, s - 4, s - 4);
            // Crisp glazed ceramic tile bevel highlight & lower shadow
            g.fillStyle = 'rgba(255,255,255,0.20)';
            g.fillRect(tx + 2, ty + 2, s - 4, 3);
            g.fillRect(tx + 2, ty + 2, 3, s - 4);
            g.fillStyle = 'rgba(18,28,32,0.10)';
            g.fillRect(tx + 2, ty + s - 4, s - 4, 2.5);
            g.fillRect(tx + s - 4, ty + 2, 2.5, s - 4);
            // Crisp grout border
            g.strokeStyle = 'rgba(26,42,46,0.18)';
            g.lineWidth = 2;
            g.strokeRect(tx + 1, ty + 1, s - 2, s - 2);
          }
        }
        // Subtle warm ivory-gold corner inlay diamonds for grand hotel lobby tiles
        if(kind === 'hotel'){
          g.fillStyle = 'rgba(246,232,196,0.48)';
          for(var iy = s; iy < h; iy += s){
            for(var ix = s; ix < w; ix += s){
              g.beginPath();
              g.moveTo(ix, iy - 5); g.lineTo(ix + 5, iy); g.lineTo(ix, iy + 5); g.lineTo(ix - 5, iy);
              g.closePath(); g.fill();
            }
          }
        }
      }
    });
  }

  function regionInteriorFloorBumpTex(kind, theme){
    var styleKey = theme.floorStyle === 'plank' ? 'plank' : 'tile';
    return regionInteriorTex('floorBump:v1:' + styleKey, 256, 256, 6, 5, function(g, w, h){
      g.fillStyle = '#dcdcdc';
      g.fillRect(0, 0, w, h);
      if(styleKey === 'plank'){
        var plankH = 32;
        for(var y = 0; y < h; y += plankH){
          var row = y / plankH, off = row % 2 ? 64 : 0;
          g.fillStyle = '#f2f2f2';
          g.fillRect(0, y + 3, w, plankH - 6);
          g.fillStyle = '#cfcfcf';
          g.fillRect(0, y + 10 + (row % 3) * 2, w, 2);
          g.fillRect(0, y + 21 - (row % 2) * 3, w, 1.5);
          g.fillStyle = '#484848';
          g.fillRect(0, y, w, 3);
          [off, (off + 128) % w].forEach(function(jx){
            g.fillRect(jx, y, 3, plankH);
          });
        }
      } else {
        var s = 64;
        for(var ty = 0; ty < h; ty += s){
          for(var tx = 0; tx < w; tx += s){
            g.fillStyle = '#f5f5f5';
            g.fillRect(tx + 3, ty + 3, s - 6, s - 6);
            g.strokeStyle = '#464646';
            g.lineWidth = 3;
            g.strokeRect(tx + 1.5, ty + 1.5, s - 3, s - 3);
          }
        }
      }
    });
  }

  function regionInteriorFloorMat(kit, kind, theme){
    return kit.M('#ffffff', { map: regionInteriorFloorTex(kind, theme) });
  }

  // MAJ-8 & FPS Fix #378: Fast, silky-smooth glossy MeshPhongMaterial floor (shininess 95..120,
  // warm specular '#fff6e0', tile/plank bump bevels, zero heavy PMREM envMap cost, sRGB output)!
  function regionInteriorGlossyFloorMat(view, kind, theme, night){
    var T = window.THREE;
    var tex = regionInteriorFloorTex(kind, theme);
    if(T && T.sRGBEncoding && tex) tex.encoding = T.sRGBEncoding;
    var bumpTex = regionInteriorFloorBumpTex(kind, theme);
    var shininessMap = {
      hotel: 120, pharmacy: 116, subway: 112, cafe: 108,
      taxi: 104, friend: 100, shop: 98, restaurant: 95
    };
    var specColor = night ? 0xaec8f0 : 0xfff6e0;
    var matOpts = {
      color: 0xffffff,
      map: tex,
      bumpMap: bumpTex,
      bumpScale: theme.floorStyle === 'plank' ? 0.012 : 0.016,
      specular: new T.Color(specColor),
      shininess: shininessMap[kind] != null ? shininessMap[kind] : 106
    };
    var mat = new T.MeshPhongMaterial(matOpts);
    mat.onBeforeCompile = function(shader){
      // Board WebGLRenderer uses linear output; encode glossy Phong floor to sRGB matching Shelly & cast GLBs.
      shader.fragmentShader = shader.fragmentShader.replace('#include <encodings_fragment>', 'gl_FragColor = LinearTosRGB( gl_FragColor );');
    };
    mat.customProgramCacheKey = function(){
      return 'interior-glossy-floor-phong-srgb-v2';
    };
    return mat;
  }

  function regionInteriorWallMat(kit, kind, theme){
    var repX = (kind === 'restaurant') ? 4 : 5;
    var tex = regionInteriorTex('wall:v4:' + kind, 128, 128, repX, 2, function(g, w, h){
      if(kind === 'subway'){
        // Glossy off-white ceramic metro brick tiles with crisp light-slate grout lines (bright high contrast behind Subway Ray!)
        g.fillStyle = '#eef4f8';
        g.fillRect(0, 0, w, h);
        var th = 32, tw = 64;
        for(var ry = 0; ry < h; ry += th){
          var row = ry / th;
          var xOff = (row % 2) ? 32 : 0;
          for(var rx = -tw; rx < w + tw; rx += tw){
            var tx = rx + xOff;
            g.fillStyle = ((row + Math.round(rx / tw)) % 3 === 0) ? '#f6fafc' : '#e8f0f5';
            g.fillRect(tx + 2, ry + 2, tw - 4, th - 4);
            g.fillStyle = 'rgba(255,255,255,0.65)';
            g.fillRect(tx + 3, ry + 3, tw - 6, 4);
            g.strokeStyle = 'rgba(130,158,176,0.34)';
            g.lineWidth = 2;
            g.strokeRect(tx + 1, ry + 1, tw - 2, th - 2);
          }
        }
        return;
      }
      if(kind === 'taxi'){
        // Sunlit warm cream harbor pier stucco with subtle horizontal clapboard seam
        g.fillStyle = '#f8f0d8';
        g.fillRect(0, 0, w, h);
        for(var ty = 0; ty < h; ty += 32){
          g.fillStyle = (ty % 64 === 0) ? 'rgba(255,252,240,0.45)' : 'rgba(204,184,142,0.12)';
          g.fillRect(0, ty, w, 30);
          g.fillStyle = 'rgba(130,110,80,0.12)';
          g.fillRect(0, ty + 30, w, 2);
        }
        return;
      }
      if(kind === 'restaurant'){
        // MIN-14: Warm Mediterranean sun-baked terracotta Venetian plaster (soft mottled trowel sweeps, zero stripes!)
        var pg = g.createLinearGradient(0, 0, w, h);
        pg.addColorStop(0, '#f4d9b5');
        pg.addColorStop(0.5, '#edc89d');
        pg.addColorStop(1, '#f2d4ad');
        g.fillStyle = pg;
        g.fillRect(0, 0, w, h);
        var mottles = [
          [24, 28, 34, 'rgba(222,148,96,0.16)'], [88, 22, 38, 'rgba(255,242,216,0.22)'],
          [56, 74, 42, 'rgba(214,132,84,0.14)'], [112, 92, 36, 'rgba(255,240,210,0.20)'],
          [18, 108, 32, 'rgba(206,120,76,0.13)'], [96, 56, 26, 'rgba(228,158,108,0.15)']
        ];
        mottles.forEach(function(mt){
          var rg = g.createRadialGradient(mt[0], mt[1], 2, mt[0], mt[1], mt[2]);
          rg.addColorStop(0, mt[3]); rg.addColorStop(1, 'rgba(240,206,164,0)');
          g.fillStyle = rg;
          g.fillRect(0, 0, w, h);
        });
        // Subtle hand-troweled plaster arcs & warm terracotta mineral flecks
        g.strokeStyle = 'rgba(255,248,232,0.22)'; g.lineWidth = 2;
        [[18, 36, 28], [76, 86, 30], [104, 24, 22]].forEach(function(tr){
          g.beginPath(); g.arc(tr[0], tr[1], tr[2], 0.2, 1.5); g.stroke();
        });
        g.fillStyle = 'rgba(176,104,68,0.12)';
        for(var di = 0; di < 24; di++){
          g.fillRect((di * 37 + 11) % w, (di * 53 + 7) % h, 2, 2);
        }
        return;
      }
      if(kind === 'shop'){
        // MIN-14: Luminous coastal mother-of-pearl fish-scale / scalloped pearl-mosaic wall tile (zero stripes!)
        g.fillStyle = '#f8f0df';
        g.fillRect(0, 0, w, h);
        var scR = 16, rowH = 16;
        var pearlPal = ['#fffaf0', '#f6efe0', '#ebf5f4', '#faeedc', '#eef6f5', '#fcf6ea'];
        for(var sy = -rowH; sy <= h + rowH; sy += rowH){
          var sr = Math.round(sy / rowH);
          var sxOff = (sr % 2) ? scR : 0;
          for(var sx = -scR * 2; sx <= w + scR * 2; sx += scR * 2){
            var cx = sx + sxOff, cy = sy;
            var pCol = pearlPal[Math.abs(sr * 5 + Math.round(sx / scR) * 3) % pearlPal.length];
            g.fillStyle = pCol;
            g.beginPath(); g.arc(cx, cy, scR, 0, Math.PI * 2); g.fill();
            // Iridescent mother-of-pearl inner crescent highlight
            g.fillStyle = 'rgba(255,255,255,0.42)';
            g.beginPath(); g.arc(cx - 3, cy - 3, scR * 0.54, 0, Math.PI * 2); g.fill();
            // Delicate warm-gold & aqua grout rim
            g.strokeStyle = 'rgba(196,170,124,0.45)';
            g.lineWidth = 1.6;
            g.beginPath(); g.arc(cx, cy, scR - 0.5, 0, Math.PI * 2); g.stroke();
          }
        }
        return;
      }
      if(kind === 'cafe'){
        // MIN-14: Crisp glazed sage-cream ceramic subway tile wall (running-bond 2:1 ceramic tiles, zero stripes!)
        g.fillStyle = '#dce8e0';
        g.fillRect(0, 0, w, h);
        var cth = 21.333, ctw = 42.666;
        for(var cry = 0; cry < 6; cry++){
          var cy2 = cry * cth;
          var cxOff = (cry % 2) ? ctw * 0.5 : 0;
          for(var crx = -1; crx <= 3; crx++){
            var cx2 = crx * ctw + cxOff;
            var tint = ((cry * 3 + crx + 9) % 4);
            g.fillStyle = tint === 0 ? '#eef5ef' : (tint === 1 ? '#e2eee6' : (tint === 2 ? '#e9f2eb' : '#d9e8de'));
            g.fillRect(cx2 + 1.5, cy2 + 1.5, ctw - 3, cth - 3);
            // Glossy ceramic top & left bevel specular highlight
            g.fillStyle = 'rgba(255,255,255,0.58)';
            g.fillRect(cx2 + 2.5, cy2 + 2.5, ctw - 5, 3);
            g.fillStyle = 'rgba(72,110,94,0.12)';
            g.fillRect(cx2 + 2.5, cy2 + cth - 4, ctw - 5, 2);
            g.strokeStyle = 'rgba(118,148,136,0.34)';
            g.lineWidth = 1.4;
            g.strokeRect(cx2 + 1, cy2 + 1, ctw - 2, cth - 2);
          }
        }
        return;
      }
      g.fillStyle = regionInteriorHex(theme.wall);
      g.fillRect(0, 0, w, h);
      g.fillStyle = regionInteriorHex(theme.wallAlt);
      for(var x = 0; x < w; x += 32){
        g.fillRect(x, 0, 14, h);
        // Subtle cozy pinstripe accent along stripe center
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(x + 6, 0, 2, h);
        g.fillStyle = regionInteriorHex(theme.wallAlt);
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  // MIN-14: Bespoke textured wainscot/dado materials so cafe, restaurant & shop each own an unmistakable lower wall!
  function regionInteriorWainscotMat(kit, kind, theme){
    var tex = regionInteriorTex('wainscot:v1:' + kind, 256, 128, 4, 1, function(g, w, h){
      if(kind === 'restaurant'){
        // Rustic Mediterranean limestone & warm clay-brick dado masonry
        g.fillStyle = '#b99b7c';
        g.fillRect(0, 0, w, h);
        var stoneCols = ['#d8c0a0', '#cfb492', '#c8a37e', '#dcc5a6', '#c99374'];
        var rowH = 32;
        for(var r = 0; r < 4; r++){
          var ry = r * rowH;
          var xOff = (r % 2) ? 32 : 0;
          for(var c = -1; c <= 4; c++){
            var bw = 64, bx = c * bw + xOff;
            g.fillStyle = stoneCols[Math.abs(r * 3 + c * 2 + 5) % stoneCols.length];
            g.fillRect(bx + 2, ry + 2, bw - 4, rowH - 4);
            g.fillStyle = 'rgba(255,248,232,0.22)';
            g.fillRect(bx + 3, ry + 3, bw - 6, 4);
            g.fillStyle = 'rgba(92,58,36,0.16)';
            g.fillRect(bx + 3, ry + rowH - 6, bw - 6, 3);
            g.strokeStyle = 'rgba(116,84,58,0.34)';
            g.lineWidth = 2.5;
            g.strokeRect(bx + 1, ry + 1, bw - 2, rowH - 2);
          }
        }
        return;
      }
      if(kind === 'shop'){
        // Scalloped coastal aqua-seafoam beadboard paneling with pearl wave frieze along top!
        g.fillStyle = '#84c2c6';
        g.fillRect(0, 0, w, h);
        var slatW = 16;
        for(var bx2 = 0; bx2 < w; bx2 += slatW){
          g.fillStyle = (bx2 / slatW) % 2 === 0 ? '#8ac8cc' : '#7cb9be';
          g.fillRect(bx2, 18, slatW - 2, h - 18);
          g.fillStyle = 'rgba(255,255,255,0.26)';
          g.fillRect(bx2 + 1, 18, 2.5, h - 18);
          g.fillStyle = 'rgba(46,96,104,0.26)';
          g.fillRect(bx2 + slatW - 2, 18, 2, h - 18);
        }
        // Pearl-cream scalloped coastal wave top band
        g.fillStyle = '#f8f1e0';
        g.fillRect(0, 0, w, 18);
        for(var sx2 = 8; sx2 < w; sx2 += 16){
          g.fillStyle = '#f8f1e0';
          g.beginPath(); g.arc(sx2, 18, 8, 0, Math.PI); g.fill();
          g.strokeStyle = '#d4a348'; g.lineWidth = 1.6;
          g.beginPath(); g.arc(sx2, 18, 8, 0, Math.PI); g.stroke();
        }
        return;
      }
      // Cafe: Warm recessed-frame walnut paneling with delicate brass accent rules
      g.fillStyle = '#6c452b';
      g.fillRect(0, 0, w, h);
      var panW = 64;
      for(var px = 0; px < w; px += panW){
        // Outer raised walnut stile
        g.fillStyle = '#7c5134';
        g.fillRect(px + 2, 4, panW - 4, h - 8);
        // Subtle vertical wood grain
        g.fillStyle = 'rgba(46,24,12,0.14)';
        g.fillRect(px + 12, 14, 3, h - 28);
        g.fillRect(px + 42, 14, 2, h - 28);
        // Recessed warm walnut inner panel
        g.fillStyle = '#5e3b23';
        g.fillRect(px + 10, 14, panW - 20, h - 28);
        g.strokeStyle = 'rgba(218,176,94,0.42)';
        g.lineWidth = 1.6;
        g.strokeRect(px + 11, 15, panW - 22, h - 30);
        g.strokeStyle = 'rgba(255,232,196,0.14)';
        g.lineWidth = 1.5;
        g.strokeRect(px + 3, 5, panW - 6, h - 10);
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  // MIN-10: Warm glazed Mediterranean terracotta-tile kitchen backsplash inside the restaurant pass-through arch!
  function regionInteriorKitchenBacksplashMat(kit, night){
    var tex = regionInteriorTex('kitchen:backsplash:v1:' + (night ? 'night' : 'day'), 256, 256, 1, 1, function(g, w, h){
      // Cozy amber-lit terracotta mortar base
      g.fillStyle = night ? '#6e3a28' : '#b25b3a';
      g.fillRect(0, 0, w, h);
      var tileCols = night
        ? ['#8c4b34', '#7d402b', '#98563a', '#85452e', '#9c5f40']
        : ['#cf724a', '#c4623e', '#d98156', '#c96b45', '#df8f5e'];
      var th = 24, tw = 48;
      for(var row = 0; row * th < h; row++){
        var ry = row * th;
        var xOff = (row % 2) ? 24 : 0;
        for(var col = -1; col * tw < w + tw; col++){
          var tx = col * tw + xOff;
          g.fillStyle = tileCols[Math.abs(row * 5 + col * 3 + 7) % tileCols.length];
          g.fillRect(tx + 2, ry + 2, tw - 4, th - 4);
          // Hand-glazed ceramic upper-left bevel sheen & warm lower lip shadow
          g.fillStyle = night ? 'rgba(255,220,175,0.14)' : 'rgba(255,240,210,0.26)';
          g.fillRect(tx + 3, ry + 3, tw - 6, 4);
          g.fillStyle = 'rgba(62,24,10,0.20)';
          g.fillRect(tx + 3, ry + th - 5, tw - 6, 3);
          g.strokeStyle = night ? 'rgba(64,34,20,0.55)' : 'rgba(242,216,184,0.44)';
          g.lineWidth = 2;
          g.strokeRect(tx + 1, ry + 1, tw - 2, th - 2);
        }
      }
      // Decorative Mediterranean cobalt-and-cream ceramic frieze border band across mid-kitchen wall
      var fzY = 120;
      g.fillStyle = night ? '#c8b694' : '#f7ebd2';
      g.fillRect(0, fzY, w, 24);
      g.fillStyle = night ? '#2e5170' : '#3b7496';
      g.fillRect(0, fzY, w, 3.5);
      g.fillRect(0, fzY + 20.5, w, 3.5);
      for(var dx = 12; dx < w; dx += 24){
        g.fillStyle = night ? '#366084' : '#427fa3';
        g.beginPath();
        g.moveTo(dx, fzY + 5); g.lineTo(dx + 7, fzY + 12); g.lineTo(dx, fzY + 19); g.lineTo(dx - 7, fzY + 12);
        g.closePath(); g.fill();
        g.fillStyle = '#e5a448';
        g.beginPath(); g.arc(dx, fzY + 12, 2.3, 0, Math.PI * 2); g.fill();
      }
      // Warm culinary range-hood downlight glow + cozy architectural arch-edge vignette depth
      var hoodGlow = g.createRadialGradient(w * 0.5, h * 0.42, 12, w * 0.5, h * 0.48, w * 0.62);
      hoodGlow.addColorStop(0.0, night ? 'rgba(255,212,138,0.34)' : 'rgba(255,232,172,0.40)');
      hoodGlow.addColorStop(0.55, night ? 'rgba(255,190,112,0.08)' : 'rgba(255,212,140,0.10)');
      hoodGlow.addColorStop(1.0, 'rgba(46,20,10,0.42)');
      g.fillStyle = hoodGlow;
      g.fillRect(0, 0, w, h);
    });
    return kit.M('#ffffff', { map: tex, emissive: night ? 0x1c1008 : 0x221408 });
  }

  function regionInteriorWindowMat(kit, night, kind){
    var vkind = (kind === 'restaurant' || kind === 'hotel' || kind === 'pharmacy' || kind === 'taxi' || kind === 'friend') ? kind : 'default';
    var cw = vkind === 'friend' ? 512 : 384, ch = vkind === 'friend' ? 352 : 264;
    var tex = regionInteriorTex('win:v6:' + vkind + ':' + (night ? 'night' : 'day'), cw, ch, 1, 1, function(g, w, h){
      if(vkind === 'restaurant'){
        // Sunny terracotta harbor fishing pier & sailboats
        var horizon = h * 0.57;
        var sky = g.createLinearGradient(0, 0, 0, horizon);
        if(night){
          sky.addColorStop(0, '#0e1d3a');
          sky.addColorStop(1, '#294c7a');
        } else {
          sky.addColorStop(0, '#4ebaf0');
          sky.addColorStop(0.68, '#b5ecff');
          sky.addColorStop(1, '#fff0cc');
        }
        g.fillStyle = sky;
        g.fillRect(0, 0, w, horizon);
        if(night){
          g.fillStyle = '#fff2b6';
          g.beginPath(); g.arc(306, 46, 20, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#183259';
          g.beginPath(); g.arc(314, 41, 17, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff';
          [[46,30],[102,24],[158,52],[226,28],[266,64],[352,72]].forEach(function(p){ g.fillRect(p[0], p[1], 3.5, 3.5); });
        } else {
          // Warm sunlit Mediterranean clouds framed cleanly inside top panes
          g.fillStyle = 'rgba(255,253,246,0.92)';
          [[72,48,20],[96,40,25],[122,48,19],[258,38,18],[280,32,22],[304,39,17]].forEach(function(c){
            g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
          });
        }
        // Sunlit warm ochre & sage terracotta coastal hills on the left
        g.fillStyle = night ? '#1b314e' : '#8ec4a6';
        g.beginPath();
        g.moveTo(0, horizon);
        g.quadraticCurveTo(64, horizon - 46, 148, horizon - 18);
        g.quadraticCurveTo(212, horizon - 30, 272, horizon - 8);
        g.quadraticCurveTo(334, horizon - 22, w, horizon - 10);
        g.lineTo(w, horizon); g.closePath(); g.fill();
        // Warm terracotta coastal bistro village & cypress trees (left pane)
        var villas = [
          { x: 16, w: 34, h: 30, wall: '#f8d7b0', roof: '#cc5b44' },
          { x: 54, w: 30, h: 38, wall: '#fce5be', roof: '#d96e52' },
          { x: 88, w: 36, h: 28, wall: '#f4c69c', roof: '#be503c' },
          { x: 128, w: 32, h: 34, wall: '#fae4c2', roof: '#d16247' }
        ];
        villas.forEach(function(v){
          g.fillStyle = night ? '#3a4961' : v.wall;
          g.fillRect(v.x, horizon - v.h, v.w, v.h);
          g.fillStyle = night ? '#273142' : v.roof;
          g.beginPath();
          g.moveTo(v.x - 4, horizon - v.h);
          g.lineTo(v.x + v.w * 0.5, horizon - v.h - 14);
          g.lineTo(v.x + v.w + 4, horizon - v.h);
          g.closePath(); g.fill();
          g.fillStyle = night ? '#ffd87a' : '#536f7d';
          g.fillRect(v.x + 6, horizon - v.h + 8, 7, 9);
          g.fillRect(v.x + v.w - 13, horizon - v.h + 8, 7, 9);
        });
        // Slender coastal cypress trees tucked beside villas
        [10, 50, 124, 165].forEach(function(cx){
          g.fillStyle = night ? '#1b3538' : '#3d7d57';
          g.beginPath(); g.ellipse(cx, horizon - 20, 5, 19, 0, 0, Math.PI * 2); g.fill();
        });
        // Sparkling harbor water
        var water = g.createLinearGradient(0, horizon, 0, h);
        water.addColorStop(0, night ? '#122b4c' : '#22a2c7');
        water.addColorStop(1, night ? '#0c1d36' : '#187fa8');
        g.fillStyle = water;
        g.fillRect(0, horizon, w, h - horizon);
        // Timber fishing pier jutting from right edge into harbor
        var pierY = horizon + 26;
        g.fillStyle = night ? '#3c2b22' : '#7d5235';
        [218, 254, 290, 326, 362].forEach(function(px){
          g.fillRect(px, pierY + 8, 9, 44);
          g.fillStyle = night ? 'rgba(130,190,235,0.22)' : 'rgba(255,255,255,0.34)';
          g.fillRect(px - 5, pierY + 49, 19, 3);
          g.fillStyle = night ? '#3c2b22' : '#7d5235';
        });
        // Horizontal wooden pier deck & plank seams
        g.fillStyle = night ? '#594234' : '#b88154';
        g.fillRect(208, pierY, w - 208, 13);
        g.fillStyle = night ? '#443226' : '#8f5d38';
        g.fillRect(208, pierY + 10, w - 208, 4);
        for(var pl = 220; pl < w; pl += 14) g.fillRect(pl, pierY, 2, 11);
        // Mooring bollard & stacked wicker fish baskets on pier
        g.fillStyle = night ? '#4d3a2f' : '#6f4325';
        g.fillRect(216, pierY - 12, 8, 12);
        g.fillStyle = night ? '#6e5236' : '#d99e56';
        g.fillRect(236, pierY - 11, 14, 11);
        g.fillRect(253, pierY - 9, 12, 9);
        // Terracotta-and-cream striped fisherman's pier awning shack (far right)
        g.fillStyle = night ? '#485468' : '#f7ead4';
        g.fillRect(306, pierY - 38, 74, 38);
        for(var st = 0; st < 6; st++){
          g.fillStyle = st % 2 ? (night ? '#c8c0b2' : '#fff7e8') : (night ? '#8c4438' : '#e06652');
          g.fillRect(300 + st * 14, pierY - 46, 14, 14);
          g.beginPath(); g.arc(307 + st * 14, pierY - 32, 7, 0, Math.PI); g.fill();
        }
        // Hanging warm pier string lanterns
        g.strokeStyle = night ? '#4a5a6e' : '#5e3d28'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(220, pierY - 24); g.quadraticCurveTo(260, pierY - 14, 302, pierY - 36); g.stroke();
        g.fillStyle = night ? '#443226' : '#734a2e';
        g.fillRect(219, pierY - 28, 3, 28);
        [[236, pierY - 19], [260, pierY - 18], [284, pierY - 26]].forEach(function(lt){
          g.fillStyle = night ? '#ffe484' : '#ffdb73';
          g.beginPath(); g.arc(lt[0], lt[1], night ? 5 : 4, 0, Math.PI * 2); g.fill();
        });
        // Two sailboats framed cleanly inside left-center and lower-right bay
        [
          { x: 132, y: horizon + 34, sc: 1.05, sail: '#fffaf0', stripe: '#e26d5c' },
          { x: 252, y: horizon + 74, sc: 1.18, sail: '#fff7e8', stripe: '#e88b4f' }
        ].forEach(function(sb){
          var sx = sb.x, sy = sb.y, sc = sb.sc;
          g.fillStyle = night ? '#573f34' : '#945737';
          g.beginPath();
          g.moveTo(sx - 20 * sc, sy); g.lineTo(sx + 20 * sc, sy);
          g.lineTo(sx + 13 * sc, sy + 9 * sc); g.lineTo(sx - 14 * sc, sy + 9 * sc);
          g.closePath(); g.fill();
          g.fillStyle = night ? '#3d2a22' : '#f7e6ce';
          g.fillRect(sx - 16 * sc, sy + 2 * sc, 31 * sc, 2.5 * sc);
          // Main sail with warm terracotta stripe
          g.fillStyle = night ? '#c6d1e0' : sb.sail;
          g.beginPath();
          g.moveTo(sx - 1 * sc, sy - 2 * sc);
          g.lineTo(sx - 1 * sc, sy - 38 * sc);
          g.lineTo(sx + 17 * sc, sy - 4 * sc);
          g.closePath(); g.fill();
          g.fillStyle = night ? '#8f4c42' : sb.stripe;
          g.beginPath();
          g.moveTo(sx - 1 * sc, sy - 20 * sc);
          g.lineTo(sx + 8 * sc, sy - 20 * sc);
          g.lineTo(sx + 11 * sc, sy - 14 * sc);
          g.lineTo(sx - 1 * sc, sy - 14 * sc);
          g.closePath(); g.fill();
          // Jib sail
          g.fillStyle = night ? '#b5c3d6' : '#fff3dc';
          g.beginPath();
          g.moveTo(sx - 4 * sc, sy - 2 * sc);
          g.lineTo(sx - 4 * sc, sy - 30 * sc);
          g.lineTo(sx - 17 * sc, sy - 4 * sc);
          g.closePath(); g.fill();
        });
        // Sunlit water shimmer ripples
        g.fillStyle = night ? 'rgba(155,205,245,0.26)' : 'rgba(255,248,225,0.45)';
        [[28, horizon + 18, 62],[118, horizon + 56, 72],[38, horizon + 82, 54],[198, horizon + 94, 78],[310, horizon + 88, 52]].forEach(function(rp){
          g.fillRect(rp[0], rp[1], rp[2], 3.5);
        });
      } else if(vkind === 'hotel'){
        // Sweeping lighthouse cliff, turquoise bay, and distant coastal ferry
        var hHoriz = h * 0.56;
        var hSky = g.createLinearGradient(0, 0, 0, hHoriz);
        if(night){
          hSky.addColorStop(0, '#0b1830');
          hSky.addColorStop(1, '#1f416e');
        } else {
          hSky.addColorStop(0, '#3da5e6');
          hSky.addColorStop(0.65, '#9be1fa');
          hSky.addColorStop(1, '#e6faff');
        }
        g.fillStyle = hSky;
        g.fillRect(0, 0, w, hHoriz);
        if(night){
          g.fillStyle = '#fff4c2';
          g.beginPath(); g.arc(298, 44, 19, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#132a4f';
          g.beginPath(); g.arc(305, 39, 16, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff';
          [[40,26],[152,22],[214,42],[252,20],[348,54],[182,66]].forEach(function(p){ g.fillRect(p[0], p[1], 3.5, 3.5); });
        } else {
          g.fillStyle = 'rgba(255,255,255,0.9)';
          [[136,34,15],[156,30,19],[176,36,14],[264,44,18],[288,38,23],[314,45,16]].forEach(function(c){
            g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
          });
          // Distant white coastal gulls in upper-right pane
          g.strokeStyle = '#ffffff'; g.lineWidth = 2.2;
          [[248, 68, 8], [278, 56, 6]].forEach(function(gl){
            g.beginPath();
            g.moveTo(gl[0] - gl[2], gl[1]);
            g.quadraticCurveTo(gl[0] - gl[2] * 0.4, gl[1] - 5, gl[0], gl[1] + 1);
            g.quadraticCurveTo(gl[0] + gl[2] * 0.4, gl[1] - 5, gl[0] + gl[2], gl[1]);
            g.stroke();
          });
        }
        // Distant misty mountain headland across right horizon
        g.fillStyle = night ? '#173152' : '#78bdd1';
        g.beginPath();
        g.moveTo(150, hHoriz);
        g.quadraticCurveTo(240, hHoriz - 26, 312, hHoriz - 14);
        g.quadraticCurveTo(352, hHoriz - 24, w, hHoriz - 10);
        g.lineTo(w, hHoriz); g.closePath(); g.fill();
        // Luminous turquoise-to-sapphire sweeping bay
        var bay = g.createLinearGradient(0, hHoriz, 0, h);
        if(night){
          bay.addColorStop(0, '#123354');
          bay.addColorStop(0.5, '#0e2846');
          bay.addColorStop(1, '#091a30');
        } else {
          bay.addColorStop(0, '#1dc4cc');
          bay.addColorStop(0.55, '#199ec0');
          bay.addColorStop(1, '#167ba8');
        }
        g.fillStyle = bay;
        g.fillRect(0, hHoriz, w, h - hHoriz);
        // Sweeping golden sandy cove curve along mid-left bay
        g.fillStyle = night ? '#3c4857' : '#f2deb4';
        g.beginPath();
        g.moveTo(118, hHoriz + 16);
        g.quadraticCurveTo(168, hHoriz + 12, 206, hHoriz + 2);
        g.lineTo(132, hHoriz + 2); g.closePath(); g.fill();
        // Sweeping layered limestone & emerald-capped lighthouse cliff (left side)
        g.fillStyle = night ? '#2e3847' : '#d2a878';
        g.beginPath();
        g.moveTo(0, hHoriz + 34);
        g.lineTo(0, hHoriz - 44);
        g.quadraticCurveTo(68, hHoriz - 50, 122, hHoriz - 28);
        g.quadraticCurveTo(158, hHoriz - 10, 174, hHoriz + 14);
        g.quadraticCurveTo(118, hHoriz + 30, 0, hHoriz + 34);
        g.closePath(); g.fill();
        // Sunlit warm rock strata facets on cliff face
        g.fillStyle = night ? '#232b38' : '#b88a5b';
        g.beginPath();
        g.moveTo(12, hHoriz + 28);
        g.lineTo(44, hHoriz - 16);
        g.lineTo(96, hHoriz - 12);
        g.lineTo(148, hHoriz + 14);
        g.lineTo(84, hHoriz + 28); g.closePath(); g.fill();
        // Lush emerald grass headland crown atop cliff
        g.fillStyle = night ? '#1b3d3c' : '#4fa874';
        g.beginPath();
        g.moveTo(0, hHoriz - 46);
        g.quadraticCurveTo(72, hHoriz - 56, 128, hHoriz - 30);
        g.quadraticCurveTo(146, hHoriz - 20, 152, hHoriz - 12);
        g.quadraticCurveTo(96, hHoriz - 16, 0, hHoriz - 22);
        g.closePath(); g.fill();
        // White surf foam wrapping around cliff base
        g.strokeStyle = night ? 'rgba(170,215,245,0.45)' : 'rgba(255,255,255,0.82)';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, hHoriz + 34);
        g.quadraticCurveTo(112, hHoriz + 31, 178, hHoriz + 14);
        g.stroke();
        // Tall iconic red-and-white striped lighthouse centered cleanly in top-left pane
        var lx = 84, ly = hHoriz - 34;
        if(night){
          var beam = g.createLinearGradient(lx, ly - 64, lx + 170, ly - 40);
          beam.addColorStop(0, 'rgba(255,236,155,0.42)');
          beam.addColorStop(1, 'rgba(255,236,155,0)');
          g.fillStyle = beam;
          g.beginPath();
          g.moveTo(lx + 4, ly - 66);
          g.lineTo(lx + 175, ly - 88);
          g.lineTo(lx + 175, ly - 32);
          g.closePath(); g.fill();
        }
        g.fillStyle = night ? '#ddd5c5' : '#fffaf0';
        g.beginPath();
        g.moveTo(lx - 15, ly); g.lineTo(lx - 9, ly - 58); g.lineTo(lx + 9, ly - 58); g.lineTo(lx + 15, ly);
        g.closePath(); g.fill();
        g.fillStyle = night ? '#a64336' : '#dc5444';
        g.fillRect(lx - 12, ly - 44, 24, 11);
        g.fillRect(lx - 14, ly - 22, 28, 11);
        // Brass gallery, glowing lantern room & red cupola
        g.fillStyle = '#334659';
        g.fillRect(lx - 12, ly - 61, 24, 4);
        g.fillStyle = '#ffe588';
        g.fillRect(lx - 7, ly - 71, 14, 10);
        g.fillStyle = night ? '#a64336' : '#c94336';
        g.beginPath();
        g.moveTo(lx - 10, ly - 71); g.lineTo(lx, ly - 82); g.lineTo(lx + 10, ly - 71);
        g.closePath(); g.fill();
        // Tiny keeper's cottage beside lighthouse
        g.fillStyle = night ? '#415169' : '#fbf1de';
        g.fillRect(lx + 17, ly - 15, 24, 16);
        g.fillStyle = night ? '#7d3b32' : '#c95342';
        g.beginPath(); g.moveTo(lx + 15, ly - 15); g.lineTo(lx + 29, ly - 25); g.lineTo(lx + 43, ly - 15); g.closePath(); g.fill();
        g.fillStyle = night ? '#ffd87a' : '#4a6b7c';
        g.fillRect(lx + 22, ly - 10, 5, 6); g.fillRect(lx + 31, ly - 10, 5, 6);
        // Distant coastal ferry cruising across lower-right turquoise bay
        var fx = 282, fy = hHoriz + 44;
        // Foamy wake ribbon behind ferry
        g.fillStyle = night ? 'rgba(170,218,248,0.28)' : 'rgba(255,255,255,0.58)';
        g.beginPath();
        g.moveTo(fx + 42, fy + 8);
        g.lineTo(w, fy + 4);
        g.lineTo(w, fy + 16);
        g.lineTo(fx + 40, fy + 13);
        g.closePath(); g.fill();
        // Navy lower hull
        g.fillStyle = night ? '#1c3452' : '#244d73';
        g.beginPath();
        g.moveTo(fx - 46, fy + 1); g.lineTo(fx + 46, fy + 1);
        g.lineTo(fx + 40, fy + 13); g.lineTo(fx - 38, fy + 13);
        g.closePath(); g.fill();
        // Gold waterline stripe
        g.fillStyle = '#e6b856';
        g.fillRect(fx - 42, fy + 4, 84, 2.5);
        // Double cream passenger decks
        g.fillStyle = night ? '#b8c5d6' : '#fffaf0';
        g.fillRect(fx - 34, fy - 11, 68, 12);
        g.fillRect(fx - 22, fy - 21, 46, 10);
        // Glowing ferry cabin windows
        g.fillStyle = night ? '#ffdf78' : '#3a718c';
        for(var fw = -28; fw <= 24; fw += 10) g.fillRect(fx + fw, fy - 8, 6, 5);
        for(var fw2 = -16; fw2 <= 14; fw2 += 10) g.fillRect(fx + fw2, fy - 18, 6, 4.5);
        // Navy-and-gold smokestack + whimsical steam puffs
        g.fillStyle = '#244d73';
        g.fillRect(fx + 6, fy - 32, 10, 11);
        g.fillStyle = '#e6b856';
        g.fillRect(fx + 6, fy - 28, 10, 3);
        g.fillStyle = night ? 'rgba(205,220,240,0.45)' : 'rgba(255,255,255,0.82)';
        [[fx + 16, fy - 37, 5], [fx + 25, fy - 42, 6.5], [fx + 36, fy - 45, 7]].forEach(function(st){
          g.beginPath(); g.arc(st[0], st[1], st[2], 0, Math.PI * 2); g.fill();
        });
        // Turquoise bay sparkles
        g.fillStyle = night ? 'rgba(255,235,160,0.28)' : 'rgba(255,255,255,0.42)';
        [[184, hHoriz + 22, 48],[28, hHoriz + 56, 66],[130, hHoriz + 74, 72],[252, hHoriz + 84, 68],[52, hHoriz + 96, 58]].forEach(function(rp){
          g.fillRect(rp[0], rp[1], rp[2], 3.5);
        });
      } else if(vkind === 'pharmacy'){
        // Lush sunlit coastal herb & coral flower terrace with a stone garden arch
        var seaTop = h * 0.48;
        var wallTop = h * 0.68;
        var pSky = g.createLinearGradient(0, 0, 0, seaTop);
        if(night){
          pSky.addColorStop(0, '#0f233c');
          pSky.addColorStop(1, '#234a6b');
        } else {
          pSky.addColorStop(0, '#6ad2ed');
          pSky.addColorStop(1, '#d9faf4');
        }
        g.fillStyle = pSky;
        g.fillRect(0, 0, w, seaTop);
        if(night){
          g.fillStyle = '#fff3b8';
          g.beginPath(); g.arc(276, 48, 15, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#183656';
          g.beginPath(); g.arc(282, 44, 12, 0, Math.PI * 2); g.fill();
        } else {
          g.fillStyle = 'rgba(255,255,255,0.88)';
          [[136,42,16],[158,36,20],[182,42,15],[238,38,14],[258,34,17]].forEach(function(c){
            g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
          });
        }
        // Bright sunlit turquoise coastal sea shimmering through the garden arch
        var pSea = g.createLinearGradient(0, seaTop, 0, wallTop);
        pSea.addColorStop(0, night ? '#173b59' : '#35c9cf');
        pSea.addColorStop(1, night ? '#112a42' : '#26a5b8');
        g.fillStyle = pSea;
        g.fillRect(0, seaTop, w, wallTop - seaTop);
        g.fillStyle = night ? 'rgba(170,225,245,0.28)' : 'rgba(255,255,255,0.48)';
        [[110, seaTop + 12, 56],[208, seaTop + 22, 64],[144, seaTop + 36, 46]].forEach(function(rp){
          g.fillRect(rp[0], rp[1], rp[2], 3);
        });
        // Sunlit warm cream-sandstone terrace balustrade wall
        g.fillStyle = night ? '#4c5966' : '#eee5d3';
        g.fillRect(0, wallTop, w, 24);
        g.fillStyle = night ? '#3c4854' : '#d6cab4';
        g.fillRect(0, wallTop, w, 5);
        for(var bl = 18; bl < w; bl += 26){
          g.fillStyle = night ? '#2c3742' : '#96adb0';
          g.fillRect(bl, wallTop + 8, 10, 14);
        }
        // Sun-dappled flagstone terrace floor
        g.fillStyle = night ? '#35424f' : '#e6dcc8';
        g.fillRect(0, wallTop + 24, w, h - (wallTop + 24));
        // Carved cream-sandstone garden arch framing left & right panes cleanly
        var archCx = w * 0.5, archCy = h * 0.45, archR = 122;
        g.strokeStyle = night ? '#697580' : '#f4ecd9';
        g.lineWidth = 28;
        g.beginPath();
        g.arc(archCx, archCy, archR, Math.PI, 0);
        g.stroke();
        // Stone arch outer outline & carved voussoir joints
        g.strokeStyle = night ? '#485460' : '#cbbca2';
        g.lineWidth = 2.5;
        g.beginPath(); g.arc(archCx, archCy, archR + 14, Math.PI, 0); g.stroke();
        g.beginPath(); g.arc(archCx, archCy, archR - 14, Math.PI, 0); g.stroke();
        for(var vi = 1; vi < 9; vi++){
          var va = Math.PI + (vi / 9) * Math.PI;
          g.beginPath();
          g.moveTo(archCx + Math.cos(va) * (archR - 14), archCy + Math.sin(va) * (archR - 14));
          g.lineTo(archCx + Math.cos(va) * (archR + 14), archCy + Math.sin(va) * (archR + 14));
          g.stroke();
        }
        // Left & right carved stone arch piers
        [archCx - archR - 14, archCx + archR - 14].forEach(function(px){
          g.fillStyle = night ? '#697580' : '#f4ecd9';
          g.fillRect(px, archCy, 28, h * 0.36);
          g.fillStyle = night ? '#55616d' : '#ded2bb';
          g.fillRect(px - 4, archCy - 4, 36, 9);
          for(var sy = archCy + 16; sy < archCy + 84; sy += 20){
            g.fillRect(px, sy, 28, 2);
          }
        });
        // Trailing lush emerald ivy garlands draping gracefully around the stone arch
        var ivyPts = [
          [56,120,16],[66,96,14],[82,74,15],[104,54,14],[130,40,13],
          [254,40,13],[280,54,14],[302,74,15],[318,96,14],[328,120,16],
          [58,144,12],[326,144,12]
        ];
        ivyPts.forEach(function(iv, idx){
          g.fillStyle = night ? (idx % 2 ? '#1f4f3c' : '#29634b') : (idx % 2 ? '#3f9c6b' : '#58b882');
          g.beginPath(); g.arc(iv[0], iv[1], iv[2], 0, Math.PI * 2); g.fill();
        });
        // Lush coastal herb planters & overflowing coral-flower beds across the lower terrace
        // Sage & terracotta herb troughs
        g.fillStyle = night ? '#3c524b' : '#6ea894';
        g.fillRect(10, wallTop + 28, 126, 36);
        g.fillStyle = night ? '#6e4535' : '#cf7b58';
        g.fillRect(246, wallTop + 26, 128, 38);
        // Lush layered coastal herb foliage (rosemary, mint, sage) across entire lower edge
        for(var hx = 8; hx <= w - 8; hx += 18){
          var hy = wallTop + 26 + ((hx * 7) % 14);
          g.fillStyle = night ? ((hx % 36 === 0) ? '#1e4d3a' : '#286048') : ((hx % 36 === 0) ? '#3c9668' : '#5bc08a');
          g.beginPath(); g.arc(hx, hy, 18 + (hx % 7), 0, Math.PI * 2); g.fill();
        }
        // Fragrant purple lavender spikes rising cleanly along both lower panes
        [34, 48, 114, 128, 258, 272, 342, 356].forEach(function(lx, li){
          g.strokeStyle = night ? '#2c5942' : '#438f66'; g.lineWidth = 2.5;
          g.beginPath(); g.moveTo(lx, wallTop + 28); g.lineTo(lx + (li % 2 ? 4 : -4), wallTop - 4); g.stroke();
          g.fillStyle = night ? '#6f5a9e' : '#9c7cd4';
          for(var b = 0; b < 4; b++){
            g.beginPath(); g.arc(lx + (li % 2 ? 3 : -3), wallTop - 2 + b * 6, 3.6, 0, Math.PI * 2); g.fill();
          }
        });
        // Vivid coral-pink, peach, and sunlit-gold coastal flowers blooming across the terrace!
        var blooms = [
          [24,206,'#f47a70',8],[70,214,'#ffb082',7.5],[98,200,'#f26f78',8.5],[146,216,'#ffd466',7.5],
          [176,208,'#f47a70',8],[214,212,'#ffb082',8],[242,202,'#f26f78',8.5],[290,210,'#ffd466',7.5],
          [318,200,'#f47a70',8.5],[360,214,'#ffb082',8],[124,230,'#ffd466',7],[270,228,'#f47a70',7.5],
          [60,236,'#f26f78',7],[334,232,'#ffd466',7]
        ];
        blooms.forEach(function(fl){
          g.fillStyle = fl[2];
          for(var p = 0; p < 5; p++){
            var pa = (p / 5) * Math.PI * 2;
            g.beginPath(); g.arc(fl[0] + Math.cos(pa) * (fl[3] * 0.55), fl[1] + Math.sin(pa) * (fl[3] * 0.55), fl[3] * 0.52, 0, Math.PI * 2); g.fill();
          }
          g.fillStyle = '#fff4c2';
          g.beginPath(); g.arc(fl[0], fl[1], fl[3] * 0.34, 0, Math.PI * 2); g.fill();
        });
        if(night){
          // Warm firefly lantern motes over the herb terrace at night
          g.fillStyle = '#ffea94';
          [[138, 168], [218, 152], [262, 176], [96, 174]].forEach(function(ff){
            g.beginPath(); g.arc(ff[0], ff[1], 3, 0, Math.PI * 2); g.fill();
          });
        }
      } else {
        // Default harbor vista (cafe, shop, subway)
        var dHoriz = h * 0.60;
        var dGrad = g.createLinearGradient(0, 0, 0, dHoriz);
        if(night){
          dGrad.addColorStop(0, '#0d1b36');
          dGrad.addColorStop(1, '#234674');
        } else {
          dGrad.addColorStop(0, '#66cdf9');
          dGrad.addColorStop(1, '#cef4ff');
        }
        g.fillStyle = dGrad;
        g.fillRect(0, 0, w, dHoriz);
        if(night){
          g.fillStyle = '#fff3b8';
          g.beginPath(); g.arc(302, 52, 20, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#152c52';
          g.beginPath(); g.arc(311, 47, 17, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff';
          [[54,36],[112,26],[178,60],[230,32],[348,74]].forEach(function(p){ g.fillRect(p[0], p[1], 3.5, 3.5); });
        } else {
          g.fillStyle = 'rgba(255,255,255,0.88)';
          [[76,52,20],[102,44,24],[130,52,19],[264,40,17],[288,34,21],[312,42,16]].forEach(function(c){
            g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
          });
        }
        g.fillStyle = night ? '#183254' : '#7ec2cc';
        g.beginPath();
        g.moveTo(0, dHoriz);
        g.quadraticCurveTo(88, dHoriz - 34, 190, dHoriz - 14);
        g.quadraticCurveTo(288, dHoriz - 36, w, dHoriz - 8);
        g.lineTo(w, dHoriz); g.closePath(); g.fill();
        g.fillStyle = night ? '#112a4a' : '#249ec0';
        g.fillRect(0, dHoriz, w, h - dHoriz);
        var cottages = [
          { x: 56, w: 32, h: 26, wall: '#f6d8b8', roof: '#c85e4d' },
          { x: 96, w: 28, h: 32, wall: '#d9ece2', roof: '#467d8c' },
          { x: 132, w: 34, h: 24, wall: '#fae5a5', roof: '#b96945' }
        ];
        cottages.forEach(function(ct){
          g.fillStyle = night ? '#3c4c63' : ct.wall;
          g.fillRect(ct.x, dHoriz - ct.h, ct.w, ct.h);
          g.fillStyle = night ? '#273345' : ct.roof;
          g.beginPath();
          g.moveTo(ct.x - 3, dHoriz - ct.h);
          g.lineTo(ct.x + ct.w * 0.5, dHoriz - ct.h - 13);
          g.lineTo(ct.x + ct.w + 3, dHoriz - ct.h);
          g.closePath(); g.fill();
          g.fillStyle = night ? '#ffd87a' : '#4f6d7a';
          g.fillRect(ct.x + 7, dHoriz - ct.h + 7, 7, 8);
          g.fillRect(ct.x + ct.w - 14, dHoriz - ct.h + 7, 7, 8);
        });
        [[254, dHoriz + 26, 1.3], [326, dHoriz + 18, 1.0]].forEach(function(sb){
          var sx = sb[0], sy = sb[1], sc = sb[2];
          g.fillStyle = night ? '#594238' : '#8c583a';
          g.beginPath();
          g.moveTo(sx - 14 * sc, sy); g.lineTo(sx + 14 * sc, sy);
          g.lineTo(sx + 9 * sc, sy + 6 * sc); g.lineTo(sx - 10 * sc, sy + 6 * sc);
          g.closePath(); g.fill();
          g.fillStyle = night ? '#c9d4e3' : '#fffaf0';
          g.beginPath();
          g.moveTo(sx - 1 * sc, sy - 2 * sc); g.lineTo(sx - 1 * sc, sy - 28 * sc); g.lineTo(sx + 11 * sc, sy - 3 * sc);
          g.closePath(); g.fill();
          g.beginPath();
          g.moveTo(sx - 3 * sc, sy - 2 * sc); g.lineTo(sx - 3 * sc, sy - 22 * sc); g.lineTo(sx - 12 * sc, sy - 3 * sc);
          g.closePath(); g.fill();
        });
        g.fillStyle = night ? 'rgba(140,195,240,0.26)' : 'rgba(255,255,255,0.38)';
        g.fillRect(36, dHoriz + 20, 68, 4);
        g.fillRect(152, dHoriz + 42, 82, 4);
        g.fillRect(266, dHoriz + 60, 64, 4);
      }
      if(vkind === 'taxi'){
        // Sunlit Harbor Cab-Stand Pier & Coastal Boulevard Vista
        var tHoriz = h * 0.56;
        var tSky = g.createLinearGradient(0, 0, 0, tHoriz);
        if(night){ tSky.addColorStop(0, '#0e1d36'); tSky.addColorStop(1, '#26466d'); }
        else { tSky.addColorStop(0, '#4cb8ec'); tSky.addColorStop(0.7, '#b8eeff'); tSky.addColorStop(1, '#fff1c9'); }
        g.fillStyle = tSky; g.fillRect(0, 0, w, tHoriz);
        if(!night){
          g.fillStyle = 'rgba(255,254,248,0.92)';
          [[76,42,19],[98,35,23],[122,42,18],[272,38,17],[294,32,21],[316,40,16]].forEach(function(cl){
            g.beginPath(); g.arc(cl[0], cl[1], cl[2], 0, Math.PI * 2); g.fill();
          });
        } else {
          g.fillStyle = '#fff3b8'; g.beginPath(); g.arc(312, 42, 16, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff'; [[48,30],[124,26],[218,38],[266,58]].forEach(function(st){ g.fillRect(st[0], st[1], 3, 3); });
        }
        // Coastal headland & striped harbor lighthouse
        g.fillStyle = night ? '#1b314b' : '#7ec2b4';
        g.beginPath(); g.moveTo(0, tHoriz); g.quadraticCurveTo(84, tHoriz - 36, 174, tHoriz - 12);
        g.quadraticCurveTo(286, tHoriz - 28, w, tHoriz - 6); g.lineTo(w, tHoriz); g.closePath(); g.fill();
        g.fillStyle = night ? '#d0d8e4' : '#fffaf0'; g.fillRect(284, tHoriz - 44, 14, 38);
        g.fillStyle = '#d95448'; g.fillRect(284, tHoriz - 34, 14, 8); g.fillRect(284, tHoriz - 18, 14, 8);
        g.fillStyle = '#ffe588'; g.fillRect(286, tHoriz - 52, 10, 8);
        // Sparkling turquoise harbor water
        g.fillStyle = night ? '#122c4a' : '#22a2c7'; g.fillRect(0, tHoriz, w, h - tHoriz);
        // Coastal stone pier cab stand apron in lower foreground
        var rdY = tHoriz + 38;
        g.fillStyle = night ? '#485462' : '#d7cbb4'; g.fillRect(0, rdY, w, h - rdY);
        g.fillStyle = '#e8b42c'; g.fillRect(0, rdY, w, 6);
        for(var cx2 = 0; cx2 < w; cx2 += 24){
          g.fillStyle = '#252d36'; g.fillRect(cx2, rdY, 12, 6);
        }
        // Cheerful parked yellow Harbor Cab silhouette on the pier!
        var cabX = 110, cabY = rdY + 8;
        g.fillStyle = '#f0be38'; g.fillRect(cabX, cabY, 96, 26);
        g.fillStyle = '#f6cc4e'; g.fillRect(cabX + 18, cabY - 18, 56, 20);
        g.fillStyle = night ? '#ffe48a' : '#bfeef8'; g.fillRect(cabX + 24, cabY - 14, 20, 13); g.fillRect(cabX + 48, cabY - 14, 20, 13);
        g.fillStyle = '#ffe878'; g.fillRect(cabX + 36, cabY - 25, 22, 8);
        g.fillStyle = '#242c34';
        for(var ck = 0; ck < 6; ck++) if(ck % 2 === 0) g.fillRect(cabX + 6 + ck * 14, cabY + 10, 10, 6);
        g.beginPath(); g.arc(cabX + 22, cabY + 28, 10, 0, Math.PI * 2); g.arc(cabX + 74, cabY + 28, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#d4dde6';
        g.beginPath(); g.arc(cabX + 22, cabY + 28, 4.5, 0, Math.PI * 2); g.arc(cabX + 74, cabY + 28, 4.5, 0, Math.PI * 2); g.fill();
      } else if(vkind === 'friend'){
        // Directive #364: Painterly Switch-era Sunset Harbor Promenade Ocean & Shimmering Water Reflection!
        var fHoriz = h * 0.54;
        var fSky = g.createLinearGradient(0, 0, 0, fHoriz);
        if(night){
          fSky.addColorStop(0, '#0d1e3d');
          fSky.addColorStop(0.58, '#1e426e');
          fSky.addColorStop(1, '#3d6992');
        } else {
          fSky.addColorStop(0.0, '#46b4ee');
          fSky.addColorStop(0.45, '#8ee0fa');
          fSky.addColorStop(0.76, '#ffe8b8');
          fSky.addColorStop(1.0, '#ffd49b');
        }
        g.fillStyle = fSky; g.fillRect(0, 0, w, fHoriz);
        var sunCx = w * 0.50, sunCy = fHoriz - h * 0.075;
        if(night){
          // Soft moonlight halo & crescent moon
          var mGlow = g.createRadialGradient(w * 0.72, h * 0.18, 6, w * 0.72, h * 0.18, 86);
          mGlow.addColorStop(0, 'rgba(255,246,204,0.55)');
          mGlow.addColorStop(0.45, 'rgba(182,216,255,0.22)');
          mGlow.addColorStop(1, 'rgba(182,216,255,0)');
          g.fillStyle = mGlow; g.fillRect(0, 0, w, fHoriz);
          g.fillStyle = '#fff5c8'; g.beginPath(); g.arc(w * 0.72, h * 0.18, 22, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff';
          [[48,32],[114,22],[188,52],[264,28],[392,42],[448,68],[82,78],[318,74]].forEach(function(st){ g.fillRect(st[0], st[1], 3, 3); });
          sunCx = w * 0.72;
        } else {
          // Warm layered golden-apricot coastal sunset bloom behind horizon
          var sBloom = g.createRadialGradient(sunCx, sunCy, 8, sunCx, sunCy, w * 0.34);
          sBloom.addColorStop(0.0, 'rgba(255,250,214,0.92)');
          sBloom.addColorStop(0.24, 'rgba(255,232,162,0.58)');
          sBloom.addColorStop(0.58, 'rgba(255,204,142,0.24)');
          sBloom.addColorStop(1.0, 'rgba(255,204,142,0)');
          g.fillStyle = sBloom; g.fillRect(0, 0, w, fHoriz);
          // Soft painterly sunlit clouds with warm apricot undersides
          [[88,56,28],[122,46,35],[158,56,26],[344,50,28],[380,40,34],[418,52,25]].forEach(function(cl){
            g.fillStyle = 'rgba(255,214,174,0.48)';
            g.beginPath(); g.arc(cl[0], cl[1] + 5, cl[2], 0, Math.PI * 2); g.fill();
            g.fillStyle = 'rgba(255,252,242,0.90)';
            g.beginPath(); g.arc(cl[0], cl[1], cl[2] * 0.94, 0, Math.PI * 2); g.fill();
          });
          // Luminous golden sunset disc + warm inner solar corona resting softly above horizon
          var sCore = g.createRadialGradient(sunCx, sunCy, 8, sunCx, sunCy, 44);
          sCore.addColorStop(0.0, 'rgba(255,253,234,0.98)');
          sCore.addColorStop(0.55, 'rgba(255,232,148,0.68)');
          sCore.addColorStop(1.0, 'rgba(255,214,120,0.0)');
          g.fillStyle = sCore; g.fillRect(sunCx - 46, sunCy - 46, 92, 92);
          g.fillStyle = '#fffbe0';
          g.beginPath(); g.arc(sunCx, sunCy, 22, 0, Math.PI * 2); g.fill();
        }
        // Soft atmospheric horizon haze band melting distant headlands into sky
        var hHaze = g.createLinearGradient(0, fHoriz - 44, 0, fHoriz);
        hHaze.addColorStop(0, 'rgba(255,238,200,0)');
        hHaze.addColorStop(1, night ? 'rgba(68,108,146,0.45)' : 'rgba(255,232,188,0.62)');
        g.fillStyle = hHaze; g.fillRect(0, fHoriz - 44, w, 44);
        // Distant misty turquoise-sage coral islands & headlands on both flanks
        g.fillStyle = night ? '#1b3857' : '#7ac2b2';
        g.beginPath(); g.moveTo(0, fHoriz); g.quadraticCurveTo(74, fHoriz - 56, 178, fHoriz - 12);
        g.quadraticCurveTo(256, fHoriz - 20, 344, fHoriz - 10);
        g.quadraticCurveTo(432, fHoriz - 54, w, fHoriz - 18); g.lineTo(w, fHoriz); g.closePath(); g.fill();
        // Distant sunlit coastal village cottages on far right cape
        g.fillStyle = night ? '#3c4d66' : '#fae4c2'; g.fillRect(408, fHoriz - 34, 28, 28); g.fillRect(442, fHoriz - 42, 30, 34);
        g.fillStyle = '#d96452';
        g.beginPath(); g.moveTo(404, fHoriz - 34); g.lineTo(422, fHoriz - 47); g.lineTo(440, fHoriz - 34); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(438, fHoriz - 42); g.lineTo(457, fHoriz - 56); g.lineTo(476, fHoriz - 42); g.closePath(); g.fill();
        // Painterly Switch-era sunset ocean water gradient (golden-peach horizon -> turquoise bay -> deep cerulean!)
        var fSea = g.createLinearGradient(0, fHoriz, 0, h);
        if(night){
          fSea.addColorStop(0.0, '#1e4268');
          fSea.addColorStop(0.32, '#163458');
          fSea.addColorStop(0.70, '#102646');
          fSea.addColorStop(1.0, '#0b1c36');
        } else {
          fSea.addColorStop(0.0, '#5ec4d4');
          fSea.addColorStop(0.22, '#2eb2cf');
          fSea.addColorStop(0.58, '#1a92bc');
          fSea.addColorStop(1.0, '#14749e');
        }
        g.fillStyle = fSea; g.fillRect(0, fHoriz, w, h - fHoriz);
        // MIN-5: Soft, horizontally-feathered multi-band golden sun-glitter reflection wash below the sun behind Sua
        var pathH = h - fHoriz;
        var bands = 24;
        for(var bi = 0; bi < bands; bi++){
          var t0 = bi / bands;
          var t1 = (bi + 1.35) / bands;
          var by0 = fHoriz + t0 * pathH;
          var by1 = Math.min(h, fHoriz + t1 * pathH);
          var bh = Math.max(1.5, by1 - by0);
          var waveJit = Math.sin(bi * 1.37) * 9 + Math.cos(bi * 2.13) * 5;
          var halfW = (92 - 60 * Math.pow(t0, 0.72)) + waveJit;
          var peakOp = night
            ? (0.48 * Math.pow(1 - t0, 1.35) + 0.04)
            : (0.82 * Math.pow(1 - t0, 1.15) + 0.08);
          var bCol = night
            ? (t0 < 0.35 ? '255,248,208' : (t0 < 0.72 ? '218,236,255' : '170,214,252'))
            : (t0 < 0.28 ? '255,250,206' : (t0 < 0.64 ? '255,224,132' : '255,190,94'));
          var hGrad = g.createLinearGradient(sunCx - halfW, by0, sunCx + halfW, by0);
          hGrad.addColorStop(0.0, 'rgba(' + bCol + ',0)');
          hGrad.addColorStop(0.24, 'rgba(' + bCol + ',' + (peakOp * 0.55).toFixed(3) + ')');
          hGrad.addColorStop(0.50, 'rgba(' + bCol + ',' + peakOp.toFixed(3) + ')');
          hGrad.addColorStop(0.76, 'rgba(' + bCol + ',' + (peakOp * 0.55).toFixed(3) + ')');
          hGrad.addColorStop(1.0, 'rgba(' + bCol + ',0)');
          g.fillStyle = hGrad;
          g.fillRect(sunCx - halfW, by0, halfW * 2, bh);
        }
        // Warm horizon reflection bloom melting the sun-glitter crest into the bay
        var wBloom = g.createRadialGradient(sunCx, fHoriz + 6, 8, sunCx, fHoriz + 28, w * 0.34);
        if(night){
          wBloom.addColorStop(0.0, 'rgba(255,248,210,0.42)');
          wBloom.addColorStop(0.45, 'rgba(154,204,248,0.18)');
          wBloom.addColorStop(1.0, 'rgba(154,204,248,0)');
        } else {
          wBloom.addColorStop(0.0, 'rgba(255,250,206,0.88)');
          wBloom.addColorStop(0.32, 'rgba(255,218,128,0.48)');
          wBloom.addColorStop(0.68, 'rgba(255,186,118,0.18)');
          wBloom.addColorStop(1.0, 'rgba(255,186,118,0)');
        }
        g.fillStyle = wBloom; g.fillRect(0, fHoriz, w, pathH);
        // Subtle reflected headland tint & gentle watercolor wave swells across bay
        g.fillStyle = night ? 'rgba(20,52,84,0.28)' : 'rgba(255,232,184,0.13)';
        for(var sw = 0; sw < 14; sw++){
          var swY = fHoriz + 8 + sw * 11;
          var swAmp = 1.6 + sw * 0.14;
          g.beginPath();
          g.moveTo(0, swY);
          for(var sxw = 0; sxw <= w; sxw += 32){
            g.lineTo(sxw, swY + Math.sin(sxw * 0.032 + sw * 1.4) * swAmp);
          }
          g.lineTo(w, swY + 3.5); g.lineTo(0, swY + 3.5); g.closePath();
          g.fill();
        }
        // Bright tapering golden sun-glitter wave-crest strokes & sparkling specular glints down the reflection path!
        for(var ri = 0; ri < 42; ri++){
          var t = ri / 41;
          var ry = fHoriz + 3 + Math.pow(t, 1.12) * (pathH - 10);
          // Crisp tapering width from wide horizon crest (~64px) down to slender sparkling tail (~10px)
          var taper = 1 - t * 0.80;
          var halfSpan = (64 * taper + 5) * (0.72 + 0.38 * Math.sin(ri * 2.3 + 0.5));
          var xOff = Math.sin(ri * 1.91) * (5 + (1 - t) * 10);
          var rx0 = sunCx + xOff - halfSpan, rx1 = sunCx + xOff + halfSpan;
          var rGrad = g.createLinearGradient(rx0, ry, rx1, ry);
          var alpha = (night ? 0.52 : 0.94) * (1 - t * 0.42) * (0.76 + 0.24 * ((ri % 3) / 2));
          var colRgb = night ? '255,248,214' : (ri % 3 === 0 ? '255,253,228' : (ri % 3 === 1 ? '255,236,148' : '255,214,104'));
          rGrad.addColorStop(0.0, 'rgba(' + colRgb + ',0)');
          rGrad.addColorStop(0.20, 'rgba(' + colRgb + ',' + (alpha * 0.78).toFixed(3) + ')');
          rGrad.addColorStop(0.50, 'rgba(' + colRgb + ',' + alpha.toFixed(3) + ')');
          rGrad.addColorStop(0.80, 'rgba(' + colRgb + ',' + (alpha * 0.78).toFixed(3) + ')');
          rGrad.addColorStop(1.0, 'rgba(' + colRgb + ',0)');
          g.strokeStyle = rGrad;
          g.lineWidth = 2.2 + (1 - t) * 2.4;
          g.lineCap = 'round';
          g.beginPath();
          var stepsR = 8;
          for(var sr = 0; sr <= stepsR; sr++){
            var px = rx0 + (rx1 - rx0) * (sr / stepsR);
            var py = ry + Math.sin(sr * 1.2 + ri * 0.95) * (0.9 + t * 0.8);
            if(sr === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.stroke();
        }
        // Crisp sparkling sunlit diamond glitter flecks dancing down the tapering golden reflection axis!
        for(var gi = 0; gi < 34; gi++){
          var gt = gi / 33;
          var gy = fHoriz + 5 + Math.pow(gt, 1.08) * (pathH - 14);
          var gSpread = (54 * (1 - gt * 0.80) + 6);
          var gx = sunCx + Math.sin(gi * 4.7 + 0.8) * gSpread;
          var gr = (gi % 4 === 0) ? (3.0 - gt * 1.1) : (2.0 - gt * 0.7);
          g.fillStyle = night ? 'rgba(255,252,232,0.78)' : 'rgba(255,254,236,0.96)';
          g.beginPath();
          g.ellipse(gx, gy, gr * 2.2, Math.max(0.8, gr * 0.65), 0, 0, Math.PI * 2);
          g.fill();
        }
        // Soft sunlit aqua wave sparkles across left & right bay flanks
        [[72, fHoriz + 26, 48], [148, fHoriz + 64, 54], [362, fHoriz + 34, 52], [428, fHoriz + 82, 46], [96, fHoriz + 110, 62]].forEach(function(sp){
          var spg = g.createLinearGradient(sp[0] - sp[2], sp[1], sp[0] + sp[2], sp[1]);
          spg.addColorStop(0, 'rgba(255,252,235,0)');
          spg.addColorStop(0.5, night ? 'rgba(180,220,255,0.22)' : 'rgba(255,250,228,0.34)');
          spg.addColorStop(1, 'rgba(255,252,235,0)');
          g.strokeStyle = spg; g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(sp[0] - sp[2], sp[1]); g.quadraticCurveTo(sp[0], sp[1] - 2.2, sp[0] + sp[2], sp[1]); g.stroke();
        });
        // Two charming sailboats + soft watercolor reflections on the sunlit bay
        [[118, fHoriz + 44, 1.32, '#e87664'], [372, fHoriz + 58, 1.45, '#54b8c4']].forEach(function(sb){
          var sx = sb[0], sy = sb[1], sc = sb[2];
          // Soft wavy sail reflection in water beneath hull
          g.fillStyle = night ? 'rgba(190,210,235,0.16)' : 'rgba(255,248,225,0.26)';
          for(var rf = 0; rf < 4; rf++){
            g.fillRect(sx - (12 - rf * 2) * sc, sy + (10 + rf * 5) * sc, (24 - rf * 4) * sc, 2.4 * sc);
          }
          g.fillStyle = night ? '#594238' : '#8c583a';
          g.beginPath(); g.moveTo(sx - 14 * sc, sy); g.lineTo(sx + 14 * sc, sy); g.lineTo(sx + 9 * sc, sy + 6 * sc); g.lineTo(sx - 10 * sc, sy + 6 * sc); g.closePath(); g.fill();
          g.fillStyle = '#fffaf0';
          g.beginPath(); g.moveTo(sx, sy - 2 * sc); g.lineTo(sx, sy - 28 * sc); g.lineTo(sx + 13 * sc, sy - 3 * sc); g.closePath(); g.fill();
          g.fillStyle = sb[3];
          g.beginPath(); g.moveTo(sx - 2 * sc, sy - 2 * sc); g.lineTo(sx - 2 * sc, sy - 22 * sc); g.lineTo(sx - 12 * sc, sy - 3 * sc); g.closePath(); g.fill();
        });
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorHotelArchSkyMat(kit, night){
    var tex = regionInteriorTex('win:hotelArchSky:v1:' + (night ? 'night' : 'day'), 384, 264, 1, 1, function(g, w, h){
      // CircleGeometry(0.88, 22, 0, Math.PI) maps v in [0.5, 1.0] (canvas y in [0, h * 0.5]) across the upper semicircle.
      var archBottom = h * 0.54;
      var sky = g.createLinearGradient(0, 0, 0, archBottom);
      if(night){
        sky.addColorStop(0, '#0b1830');
        sky.addColorStop(1, '#1f416e');
      } else {
        sky.addColorStop(0, '#3da5e6');
        sky.addColorStop(0.68, '#9be1fa');
        sky.addColorStop(1, '#e6faff');
      }
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      if(night){
        g.fillStyle = '#fff4c2';
        g.beginPath(); g.arc(258, 64, 18, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#132a4f';
        g.beginPath(); g.arc(265, 59, 15, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff';
        [[96, 58], [148, 36], [192, 74], [218, 32], [294, 88], [126, 98]].forEach(function(p){
          g.fillRect(p[0], p[1], 3.5, 3.5);
        });
      } else {
        g.fillStyle = 'rgba(255,255,255,0.9)';
        [[118, 84, 16], [140, 78, 21], [164, 85, 15], [234, 62, 17], [258, 56, 22], [282, 64, 15]].forEach(function(c){
          g.beginPath(); g.arc(c[0], c[1], c[2], 0, Math.PI * 2); g.fill();
        });
        g.strokeStyle = '#ffffff'; g.lineWidth = 2.0;
        [[212, 92, 7], [242, 82, 5.5]].forEach(function(gl){
          g.beginPath();
          g.moveTo(gl[0] - gl[2], gl[1]);
          g.quadraticCurveTo(gl[0] - gl[2] * 0.4, gl[1] - 4.5, gl[0], gl[1] + 1);
          g.quadraticCurveTo(gl[0] + gl[2] * 0.4, gl[1] - 4.5, gl[0] + gl[2], gl[1]);
          g.stroke();
        });
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorHotelRugMat(kit){
    var tex = regionInteriorTex('rug:hotel:v1', 512, 364, 1, 1, function(g, w, h){
      // Deep regal navy outer edge
      g.fillStyle = '#17344f';
      g.fillRect(0, 0, w, h);
      // Subtle woven wool warp/weft texture
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for(var wy = 0; wy < h; wy += 4) g.fillRect(0, wy, w, 1.5);
      // Outer metallic warm-gold brocade frame
      g.strokeStyle = '#e0b14b'; g.lineWidth = 12;
      g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = '#f8e29b'; g.lineWidth = 2.5;
      g.strokeRect(24, 24, w - 48, h - 48);
      // Repeating gold-and-teal Persian diamond border band
      g.fillStyle = '#1c4c63';
      g.fillRect(28, 28, w - 56, h - 56);
      g.fillStyle = '#e8bd5d';
      for(var dx = 42; dx <= w - 42; dx += 24){
        [38, h - 38].forEach(function(dy){
          g.beginPath();
          g.moveTo(dx, dy - 6); g.lineTo(dx + 7, dy); g.lineTo(dx, dy + 6); g.lineTo(dx - 7, dy);
          g.closePath(); g.fill();
        });
      }
      for(var dy2 = 56; dy2 <= h - 56; dy2 += 24){
        [38, w - 38].forEach(function(dx2){
          g.beginPath();
          g.moveTo(dx2, dy2 - 6); g.lineTo(dx2 + 7, dy2); g.lineTo(dx2, dy2 + 6); g.lineTo(dx2 - 7, dy2);
          g.closePath(); g.fill();
        });
      }
      // Inner gold double border framing rich navy-teal Persian field
      g.strokeStyle = '#e0b14b'; g.lineWidth = 6;
      g.strokeRect(52, 52, w - 104, h - 104);
      g.fillStyle = '#1d4d63';
      g.fillRect(56, 56, w - 112, h - 112);
      g.fillStyle = '#215f70';
      g.fillRect(68, 68, w - 136, h - 136);
      g.strokeStyle = 'rgba(248,226,155,0.55)'; g.lineWidth = 2;
      g.strokeRect(68, 68, w - 136, h - 136);
      // Four ornate gold-and-coral Persian corner medallions
      [[56, 56, 0], [w - 56, 56, Math.PI * 0.5], [w - 56, h - 56, Math.PI], [56, h - 56, Math.PI * 1.5]].forEach(function(cm){
        g.save();
        g.translate(cm[0], cm[1]);
        g.rotate(cm[2]);
        g.fillStyle = '#e5b855';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 56, 0, Math.PI * 0.5); g.closePath(); g.fill();
        g.fillStyle = '#193b56';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 44, 0, Math.PI * 0.5); g.closePath(); g.fill();
        g.fillStyle = '#c8604d';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, 0, Math.PI * 0.5); g.closePath(); g.fill();
        g.fillStyle = '#fae49e';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 15, 0, Math.PI * 0.5); g.closePath(); g.fill();
        g.strokeStyle = '#f8e29b'; g.lineWidth = 2.5;
        for(var r = 1; r <= 3; r++){
          var a = (r / 4) * Math.PI * 0.5;
          g.beginPath(); g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); g.stroke();
        }
        g.restore();
      });
      // Ornate central scalloped Persian medallion radiating around Shelly
      var cx = w * 0.5, cy = h * 0.5;
      g.fillStyle = '#e5b855';
      g.beginPath();
      for(var i = 0; i < 16; i++){
        var ang = (i / 16) * Math.PI * 2;
        var rad = i % 2 === 0 ? 96 : 74;
        var px = cx + Math.cos(ang) * rad * 1.24;
        var py = cy + Math.sin(ang) * rad * 0.86;
        if(i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#183954';
      g.beginPath(); g.ellipse(cx, cy, 86, 58, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f8e29b'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, cy, 72, 46, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#c8604d';
      g.beginPath(); g.ellipse(cx, cy, 42, 28, 0, 0, Math.PI * 2); g.fill();
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorPharmacyRugMat(kit){
    var tex = regionInteriorTex('rug:pharmacy:v1', 384, 384, 1, 1, function(g, w, h){
      var cx = w * 0.5, cy = h * 0.5, R = w * 0.5;
      function octPath(rad){
        g.beginPath();
        for(var i = 0; i < 8; i++){
          var a = (i / 8) * Math.PI * 2;
          var px = cx + Math.cos(a) * rad;
          var py = cy + Math.sin(a) * rad;
          if(i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
      }
      // Fill deep mint outer piping matching exact CircleGeometry(r, 8) vertices
      g.fillStyle = '#388e72';
      g.fillRect(0, 0, w, h);
      // Warm bright cream botanical border ring
      octPath(R * 0.91);
      g.fillStyle = '#fbf9f1';
      g.fill();
      // Subtle cream octagonal accent rule
      octPath(R * 0.86);
      g.strokeStyle = '#d9ebe2'; g.lineWidth = 2;
      g.stroke();
      // Pale mint woven octagonal center field
      octPath(R * 0.67);
      g.fillStyle = '#d6efe4';
      g.fill();
      octPath(R * 0.67);
      g.strokeStyle = '#3e9679'; g.lineWidth = 5;
      g.stroke();
      octPath(R * 0.61);
      g.strokeStyle = 'rgba(62,150,121,0.4)'; g.lineWidth = 2;
      g.stroke();
      // Botanical eucalyptus & mint leaf wreath border along all 8 octagonal sides
      for(var s = 0; s < 8; s++){
        var a0 = (s / 8) * Math.PI * 2;
        var a1 = ((s + 1) / 8) * Math.PI * 2;
        var p0x = cx + Math.cos(a0) * R * 0.785, p0y = cy + Math.sin(a0) * R * 0.785;
        var p1x = cx + Math.cos(a1) * R * 0.785, p1y = cy + Math.sin(a1) * R * 0.785;
        var edgeAng = Math.atan2(p1y - p0y, p1x - p0x);
        // Delicate stem line along side
        g.strokeStyle = '#4ba685'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(p0x, p0y); g.lineTo(p1x, p1y); g.stroke();
        // Alternating pairs of botanical leaves along each side
        for(var lf = 1; lf <= 3; lf++){
          var t = lf / 4;
          var lx = p0x + (p1x - p0x) * t;
          var ly = p0y + (p1y - p0y) * t;
          [-1, 1].forEach(function(dir){
            g.save();
            g.translate(lx, ly);
            g.rotate(edgeAng + dir * 0.58);
            g.fillStyle = lf % 2 ? '#3e9c78' : '#6cc29f';
            g.beginPath();
            g.ellipse(10, 0, 11, 5.2, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
          });
        }
        // Tiny coral-rose & sunlit chamomile flower bud at each octagon corner vertex
        g.fillStyle = s % 2 ? '#ef847c' : '#f2c85b';
        g.beginPath(); g.arc(p0x, p0y, 6.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff9e6';
        g.beginPath(); g.arc(p0x, p0y, 2.5, 0, Math.PI * 2); g.fill();
      }
      // Subtle 8-petal apothecary herb medallion in center
      for(var k = 0; k < 8; k++){
        var ka = (k / 8) * Math.PI * 2;
        g.save();
        g.translate(cx, cy);
        g.rotate(ka);
        g.fillStyle = 'rgba(62,150,121,0.22)';
        g.beginPath(); g.ellipse(38, 0, 26, 9, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorVelvetMat(kit){
    var tex = regionInteriorTex('velvet:hotel:v1', 128, 128, 2, 1, function(g, w, h){
      g.fillStyle = '#8e2d42';
      g.fillRect(0, 0, w, h);
      // Soft diamond-tufted velvet sheen & shadow creases
      g.strokeStyle = 'rgba(54,14,24,0.38)'; g.lineWidth = 3;
      for(var i = -h; i < w + h; i += 32){
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
        g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke();
      }
      g.fillStyle = 'rgba(220,112,132,0.18)';
      for(var y = 16; y < h; y += 32){
        for(var x = 16; x < w; x += 32){
          g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
        }
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorRestaurantRugMat(kit){
    var tex = regionInteriorTex('rug:restaurant:v1', 384, 384, 1, 1, function(g, w, h){
      var cx = w * 0.5, cy = h * 0.5, R = w * 0.5;
      // Rich braided terracotta-cream-sage oval bistro rug (mapped onto scaled CircleGeometry)
      g.fillStyle = '#c45b47';
      g.fillRect(0, 0, w, h);
      var rings = [
        [0.98, '#c9624c', 10],
        [0.89, '#f6e7cc', 9],
        [0.80, '#d9765f', 11],
        [0.69, '#5e8f72', 8],
        [0.60, '#f7ead2', 9],
        [0.50, '#df826a', 12],
        [0.37, '#e89b7e', 11],
        [0.24, '#f6e7cc', 10],
        [0.14, '#d96c56', 12]
      ];
      rings.forEach(function(rg){
        g.fillStyle = rg[1];
        g.beginPath(); g.arc(cx, cy, R * rg[0], 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(72,34,20,0.22)';
        g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, R * rg[0], 0, Math.PI * 2); g.stroke();
        // Diagonal woven braided plait stitches along each ring
        var rad = R * (rg[0] - 0.045);
        if(rad > 16){
          var count = Math.max(18, Math.round(rad * 0.42));
          g.strokeStyle = 'rgba(255,248,232,0.26)';
          g.lineWidth = 2.2;
          for(var i = 0; i < count; i++){
            var a = (i / count) * Math.PI * 2;
            var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
            var tx = -Math.sin(a) * 5, ty = Math.cos(a) * 5;
            g.beginPath();
            g.moveTo(px - tx, py - ty);
            g.lineTo(px + tx, py + ty);
            g.stroke();
          }
        }
      });
      // Center warm cream rosette stitch
      g.fillStyle = '#fae8c8';
      g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.fill();
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorTaxiRugMat(kit){
    var tex = regionInteriorTex('rug:taxi:v1', 384, 256, 1, 1, function(g, w, h){
      // Bold checkered Harbor Taxi cab-bay welcome mat
      g.fillStyle = '#252e38'; g.fillRect(0, 0, w, h);
      var sq = 24;
      for(var x = 0; x < w; x += sq){
        g.fillStyle = ((x / sq) % 2 === 0) ? '#f0be38' : '#252e38';
        g.fillRect(x, 0, sq, sq);
        g.fillRect(x, h - sq, sq, sq);
      }
      for(var y = sq; y < h - sq; y += sq){
        g.fillStyle = ((y / sq) % 2 === 0) ? '#f0be38' : '#252e38';
        g.fillRect(0, y, sq, sq);
        g.fillRect(w - sq, y, sq, sq);
      }
      g.fillStyle = '#344250'; g.fillRect(sq + 6, sq + 6, w - (sq + 6) * 2, h - (sq + 6) * 2);
      g.strokeStyle = '#f0be38'; g.lineWidth = 4;
      g.strokeRect(sq + 14, sq + 14, w - (sq + 14) * 2, h - (sq + 14) * 2);
      g.fillStyle = '#f6cc4e'; g.font = 'bold 34px sans-serif'; g.fillText('HARBOR TAXI', 74, h * 0.56);
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorFriendRugMat(kit){
    var tex = regionInteriorTex('rug:friend:v1', 384, 384, 1, 1, function(g, w, h){
      var cx = w * 0.5, cy = h * 0.5, R = w * 0.5;
      // Sunlit seaside woven turquoise, cream & coral-blush courtyard rug
      g.fillStyle = '#4f9c9c'; g.fillRect(0, 0, w, h);
      [
        [0.98, '#4f9c9c'], [0.88, '#fcf2dc'], [0.78, '#e38472'],
        [0.68, '#66b5b2'], [0.56, '#faf0d6'], [0.42, '#f2b866'],
        [0.26, '#5ca8a8'], [0.14, '#fcf2dc']
      ].forEach(function(rg){
        g.fillStyle = rg[1];
        g.beginPath(); g.arc(cx, cy, R * rg[0], 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(42,68,72,0.16)'; g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, R * rg[0], 0, Math.PI * 2); g.stroke();
      });
      // Sunburst weave dashes
      g.strokeStyle = 'rgba(255,250,235,0.45)'; g.lineWidth = 3;
      for(var i = 0; i < 16; i++){
        var a = (i / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R * 0.30, cy + Math.sin(a) * R * 0.30);
        g.lineTo(cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52);
        g.stroke();
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorFramedArtMat(kit, kind){
    var tex = regionInteriorTex('framed:v1:' + kind, 192, 224, 1, 1, function(g, w, h){
      if(kind === 'restaurant'){
        // Warm vintage coastal bistro harbor print with cream mat
        g.fillStyle = '#faf2e1'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d4a348'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
        var px = 20, py = 20, pw = w - 40, ph = h - 52;
        var sky = g.createLinearGradient(0, py, 0, py + ph * 0.6);
        sky.addColorStop(0, '#6bc6e8'); sky.addColorStop(1, '#fff0c9');
        g.fillStyle = sky; g.fillRect(px, py, pw, ph * 0.62);
        // Golden coastal sun
        g.fillStyle = '#ffd978';
        g.beginPath(); g.arc(px + pw * 0.72, py + 34, 16, 0, Math.PI * 2); g.fill();
        // Terracotta coastal cliffs & sailboat
        g.fillStyle = '#c8724c';
        g.beginPath(); g.moveTo(px, py + ph * 0.62); g.quadraticCurveTo(px + 42, py + ph * 0.36, px + 92, py + ph * 0.62); g.closePath(); g.fill();
        g.fillStyle = '#2498b8'; g.fillRect(px, py + ph * 0.62, pw, ph * 0.38);
        // Little red-striped bistro fishing boat
        var bx = px + pw * 0.56, by = py + ph * 0.72;
        g.fillStyle = '#8b4e30';
        g.beginPath(); g.moveTo(bx - 22, by); g.lineTo(bx + 22, by); g.lineTo(bx + 15, by + 10); g.lineTo(bx - 16, by + 10); g.closePath(); g.fill();
        g.fillStyle = '#fff9ee';
        g.beginPath(); g.moveTo(bx, by - 2); g.lineTo(bx, by - 40); g.lineTo(bx + 22, by - 5); g.closePath(); g.fill();
        g.fillStyle = '#e26d5c';
        g.beginPath(); g.moveTo(bx - 3, by - 2); g.lineTo(bx - 3, by - 32); g.lineTo(bx - 19, by - 5); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,250,230,0.5)';
        g.fillRect(px + 18, py + ph * 0.84, 52, 3);
        g.fillRect(px + 84, py + ph * 0.90, 44, 3);
        // Cream mat caption bar
        g.fillStyle = '#6f4325'; g.font = 'bold 13px sans-serif'; g.fillText('HARBOR CATCH', 42, h - 14);
      } else if(kind === 'hotel'){
        // Regal navy-and-gold oval-matted lighthouse oil painting
        g.fillStyle = '#1b3b57'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e2b754'; g.lineWidth = 5; g.strokeRect(9, 9, w - 18, h - 18);
        g.strokeStyle = '#f8e29b'; g.lineWidth = 1.5; g.strokeRect(16, 16, w - 32, h - 32);
        // Golden sunset cove inside ornate oval
        g.save();
        g.beginPath(); g.ellipse(w * 0.5, h * 0.5, w * 0.36, h * 0.38, 0, 0, Math.PI * 2); g.clip();
        var hsky = g.createLinearGradient(0, 22, 0, h * 0.62);
        hsky.addColorStop(0, '#4f8dc4'); hsky.addColorStop(0.55, '#f4b57a'); hsky.addColorStop(1, '#ffe59c');
        g.fillStyle = hsky; g.fillRect(0, 0, w, h * 0.62);
        g.fillStyle = '#1f7a96'; g.fillRect(0, h * 0.62, w, h * 0.38);
        g.fillStyle = '#ffd978';
        g.beginPath(); g.arc(w * 0.62, h * 0.56, 18, 0, Math.PI * 2); g.fill();
        // Cliff & red-white lighthouse
        g.fillStyle = '#8b5e3c';
        g.beginPath(); g.moveTo(16, h * 0.72); g.quadraticCurveTo(64, h * 0.50, 96, h * 0.68); g.lineTo(16, h * 0.76); g.closePath(); g.fill();
        g.fillStyle = '#fff9ee'; g.fillRect(58, h * 0.34, 14, 42);
        g.fillStyle = '#d95343'; g.fillRect(58, h * 0.42, 14, 9); g.fillRect(58, h * 0.56, 14, 9);
        g.fillStyle = '#ffe588'; g.fillRect(60, h * 0.27, 10, 8);
        g.fillStyle = '#c94336';
        g.beginPath(); g.moveTo(56, h * 0.27); g.lineTo(65, h * 0.19); g.lineTo(74, h * 0.27); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,230,150,0.55)';
        g.fillRect(86, h * 0.68, 46, 3.5); g.fillRect(72, h * 0.76, 54, 3);
        g.restore();
        g.strokeStyle = '#e5b855'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(w * 0.5, h * 0.5, w * 0.36, h * 0.38, 0, 0, Math.PI * 2); g.stroke();
      } else if(kind === 'taxi'){
        // Retro vintage COASTAL CAB CO. poster print
        g.fillStyle = '#faf1d8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#252e38'; g.fillRect(10, 10, w - 20, 38);
        g.fillStyle = '#f2c13e'; g.font = 'bold 14px sans-serif'; g.fillText('HARBOR CAB CO.', 30, 34);
        for(var tc = 0; tc < 8; tc++){
          g.fillStyle = tc % 2 ? '#252e38' : '#f2c13e';
          g.fillRect(10 + tc * 21.5, 48, 21.5, 10);
        }
        g.fillStyle = '#3a9eb8'; g.fillRect(18, 66, w - 36, 94);
        g.fillStyle = '#ffd978'; g.beginPath(); g.arc(w * 0.72, 92, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#f2c13e'; g.fillRect(46, 118, 100, 28); g.fillRect(68, 102, 54, 18);
        g.fillStyle = '#c2f0fa'; g.fillRect(74, 106, 20, 11); g.fillRect(98, 106, 20, 11);
        g.fillStyle = '#222a32';
        g.beginPath(); g.arc(68, 148, 10, 0, Math.PI * 2); g.arc(124, 148, 10, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a3644'; g.font = 'bold 13px sans-serif'; g.fillText('FAST PIER RIDES', 34, 192);
      } else if(kind === 'cafe'){
        // Vintage coastal coffee-roast print
        g.fillStyle = '#faf3e4'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#4b8f7a'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = '#2e4a40'; g.fillRect(20, 20, w - 40, 32);
        g.fillStyle = '#ffe6a8'; g.font = 'bold 13px sans-serif'; g.fillText('HARBOR ROAST', 40, 41);
        g.fillStyle = '#c98850'; g.beginPath(); g.ellipse(w * 0.5, 118, 34, 42, 0.25, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6e4022'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(w * 0.5 - 8, 80); g.quadraticCurveTo(w * 0.5 + 10, 118, w * 0.5 - 4, 156); g.stroke();
        g.fillStyle = '#4b8f7a'; g.font = 'bold 12px sans-serif'; g.fillText('FRESH ESPRESSO', 38, 192);
      } else if(kind === 'shop'){
        // Coastal boutique shell & pearl watercolor print
        g.fillStyle = '#fff6e4'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e69f38'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
        var sSky = g.createLinearGradient(0, 22, 0, 146);
        sSky.addColorStop(0, '#72c8df'); sSky.addColorStop(1, '#ffecc2');
        g.fillStyle = sSky; g.fillRect(22, 22, w - 44, 126);
        g.fillStyle = '#f28b74'; g.beginPath(); g.arc(w * 0.5, 124, 34, Math.PI, 0); g.fill();
        g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(w * 0.5, 118, 13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7b5230'; g.font = 'bold 13px sans-serif'; g.fillText('SEA TREASURES', 38, 188);
      } else {
        // Pharmacy framed botanical pressed herbarium specimen sheet
        g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#4ca888'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
        g.strokeStyle = '#d4a348'; g.lineWidth = 1.5; g.strokeRect(17, 17, w - 34, h - 34);
        // Pressed eucalyptus sprig
        g.strokeStyle = '#3b8562'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(64, 170); g.quadraticCurveTo(60, 108, 72, 42); g.stroke();
        for(var ei = 0; ei < 6; ei++){
          var ey = 152 - ei * 18;
          [-1, 1].forEach(function(dir){
            g.save(); g.translate(64 + ei * 1.2, ey); g.rotate(dir * 0.62);
            g.fillStyle = ei % 2 ? '#4ca888' : '#6bc49f';
            g.beginPath(); g.ellipse(dir * 13, 0, 12, 6, 0, 0, Math.PI * 2); g.fill();
            g.restore();
          });
        }
        // Pressed lavender & chamomile sprig on right
        g.strokeStyle = '#4c8e6a'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(132, 168); g.quadraticCurveTo(136, 114, 126, 48); g.stroke();
        for(var li = 0; li < 6; li++){
          g.fillStyle = li % 2 ? '#8c6cc4' : '#a889de';
          g.beginPath(); g.arc(127 + (li % 2 ? 4 : -4), 52 + li * 11, 5.5, 0, Math.PI * 2); g.fill();
        }
        // Chamomile flower accent
        g.fillStyle = '#f2c85b'; g.beginPath(); g.arc(128, 134, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff';
        for(var cp = 0; cp < 6; cp++){
          var ca = (cp / 6) * Math.PI * 2;
          g.beginPath(); g.arc(128 + Math.cos(ca) * 9, 134 + Math.sin(ca) * 9, 4, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#f2c85b'; g.beginPath(); g.arc(128, 134, 5, 0, Math.PI * 2); g.fill();
        // Specimen caption block
        g.fillStyle = '#3c6e5c'; g.fillRect(36, 184, 120, 4);
        g.fillStyle = '#7ea898'; g.fillRect(54, 194, 84, 3);
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorEaselMenuMat(kit){
    var tex = regionInteriorTex('easel:restaurant:v1', 160, 200, 1, 1, function(g, w, h){
      g.fillStyle = '#24382f'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e5be6a'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#ffe399'; g.font = 'bold 16px sans-serif'; g.fillText('SPECIALS', 38, 38);
      g.strokeStyle = '#e26d5c'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(26, 48); g.lineTo(w - 26, 48); g.stroke();
      // Cute chalk clam dish sketch
      g.fillStyle = '#f4a27e';
      g.beginPath(); g.arc(80, 92, 24, Math.PI, 0); g.fill();
      g.fillStyle = '#fff3d4';
      g.beginPath(); g.ellipse(80, 96, 30, 8, 0, 0, Math.PI * 2); g.fill();
      // Chalk menu lines
      g.fillStyle = '#f7efe0';
      g.fillRect(28, 124, 104, 6);
      g.fillRect(36, 144, 88, 6);
      g.fillStyle = '#ffd978';
      g.fillRect(46, 164, 68, 6);
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorArtMat(kit, kind, theme){
    var isHero = kind === 'restaurant' || kind === 'hotel' || kind === 'pharmacy' || kind === 'taxi';
    var cw = isHero ? 384 : 256, ch = isHero ? 240 : 160;
    var tex = regionInteriorTex((isHero ? 'art:v4:' : 'art:v2:') + kind, cw, ch, 1, 1, function(g, w, h){
      if(kind === 'cafe'){
        g.fillStyle = '#283631';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#d9c298'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
        g.strokeStyle = 'rgba(217,194,152,0.45)'; g.lineWidth = 1.5; g.strokeRect(16, 16, w - 32, h - 32);
        // Steaming coffee cup
        g.fillStyle = '#f8efe0';
        g.beginPath(); g.arc(54, 78, 22, 0, Math.PI); g.fill();
        g.fillRect(32, 66, 44, 14);
        g.strokeStyle = '#f8efe0'; g.lineWidth = 4;
        g.beginPath(); g.arc(78, 76, 8, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
        g.fillStyle = '#b98153'; g.fillRect(35, 68, 38, 5);
        g.strokeStyle = '#ffe5a3'; g.lineWidth = 2.5;
        [44, 54, 64].forEach(function(sx){
          g.beginPath(); g.moveTo(sx, 58); g.quadraticCurveTo(sx - 5, 48, sx + 2, 38); g.stroke();
        });
        // Chalkboard menu header & rows
        g.fillStyle = '#ffe29a'; g.font = 'bold 18px sans-serif'; g.fillText('CAFE', 108, 44);
        g.fillStyle = '#f5efe2';
        for(var r = 0; r < 3; r++){
          g.fillRect(108, 60 + r * 24, 104 - r * 14, 7);
          g.fillStyle = '#9fd8c2';
          g.beginPath(); g.arc(224, 63 + r * 24, 4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f5efe2';
        }
      } else if(kind === 'restaurant'){
        // Cozy MP8 slate-forest coastal bistro chalkboard with gilded border & clam crest
        g.fillStyle = '#23372e';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e5be6a'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
        g.strokeStyle = 'rgba(229,190,106,0.42)'; g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
        // Corner gold diamond ornaments
        [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]].forEach(function(c){
          g.fillStyle = '#f0cc78';
          g.beginPath(); g.arc(c[0], c[1], 5, 0, Math.PI * 2); g.fill();
        });
        // Sculpted chalk scallop-shell & warm soup crest on left
        g.fillStyle = '#f49d7a';
        g.beginPath(); g.arc(84, 128, 36, Math.PI, 0); g.fill();
        g.strokeStyle = '#23372e'; g.lineWidth = 2.5;
        for(var sr = -2; sr <= 2; sr++){
          g.beginPath(); g.moveTo(84, 128); g.lineTo(84 + sr * 14, 96); g.stroke();
        }
        g.fillStyle = '#ffe6a6';
        g.beginPath(); g.arc(84, 128, 17, Math.PI, 0); g.fill();
        g.fillRect(68, 130, 32, 9);
        // Delicate steam curls above clam emblem
        g.strokeStyle = 'rgba(255,238,192,0.8)'; g.lineWidth = 2.5;
        [72, 84, 96].forEach(function(sx){
          g.beginPath(); g.moveTo(sx, 84); g.quadraticCurveTo(sx - 5, 72, sx + 3, 60); g.stroke();
        });
        // Header + ornamental rule
        g.fillStyle = '#ffe59c'; g.font = 'bold 26px sans-serif'; g.fillText('CORAL BISTRO', 146, 62);
        g.strokeStyle = '#e26d5c'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(146, 74); g.lineTo(342, 74); g.stroke();
        // 4 crisp daily specials rows with coral/gold bullets and price dots
        var rowW = [142, 118, 134, 108];
        for(var br = 0; br < 4; br++){
          var ry = 98 + br * 28;
          g.fillStyle = br % 2 ? '#f0c45e' : '#e26d5c';
          g.beginPath(); g.arc(154, ry + 4, 5.5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#faf2e1';
          g.fillRect(170, ry, rowW[br], 9);
          g.fillStyle = '#9fd8b8';
          g.fillRect(326, ry, 18, 9);
        }
        g.fillStyle = '#f0cc78'; g.font = 'bold 13px sans-serif'; g.fillText('FRESH HARBOR CATCH', 166, 212);
      } else if(kind === 'subway'){
        g.fillStyle = '#f4f8fc';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#1f4f6b'; g.fillRect(0, 0, w, 30);
        g.fillStyle = '#ffffff'; g.font = 'bold 14px sans-serif'; g.fillText('HARBOR TRANSIT', 18, 20);
        g.strokeStyle = '#26879c'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(24, 62); g.lineTo(232, 62); g.stroke();
        g.strokeStyle = '#e58e49'; g.lineWidth = 7;
        g.beginPath(); g.moveTo(32, 114); g.lineTo(132, 114); g.lineTo(182, 62); g.stroke();
        g.strokeStyle = '#48a878'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(76, 40); g.lineTo(76, 136); g.stroke();
        g.fillStyle = '#ffffff'; g.strokeStyle = '#223344'; g.lineWidth = 3;
        [[40,62],[76,62],[128,62],[182,62],[220,62],[52,114],[132,114],[76,114]].forEach(function(pt){
          g.beginPath(); g.arc(pt[0], pt[1], 7, 0, Math.PI * 2); g.fill(); g.stroke();
        });
      } else if(kind === 'hotel'){
        // Grand mahogany & brass concierge room-key cubby board with numbered diamond tags
        g.fillStyle = '#4c2c18'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e2b552'; g.lineWidth = 7; g.strokeRect(10, 10, w - 20, h - 20);
        g.strokeStyle = 'rgba(248,226,155,0.45)'; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40);
        g.fillStyle = '#f2cc6e'; g.font = 'bold 23px sans-serif'; g.fillText('HARBOR HOTEL', 100, 48);
        g.strokeStyle = '#d4a348'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(42, 58); g.lineTo(w - 42, 58); g.stroke();
        for(var row = 0; row < 2; row++){
          for(var col = 0; col < 4; col++){
            var kx = 64 + col * 85, ky = 88 + row * 72;
            // Recessed mahogany key cubby niche
            g.fillStyle = '#381e0f';
            g.fillRect(kx - 28, ky - 16, 56, 58);
            g.strokeStyle = 'rgba(212,163,72,0.55)'; g.lineWidth = 1.5;
            g.strokeRect(kx - 28, ky - 16, 56, 58);
            // Brass room plate & hook
            g.fillStyle = '#e8c166';
            g.fillRect(kx - 14, ky - 12, 28, 10);
            g.fillStyle = '#422312'; g.font = 'bold 9px sans-serif';
            g.fillText(String((row + 1) * 100 + col + 1), kx - 8, ky - 4);
            g.fillStyle = '#f4d47c';
            g.beginPath(); g.arc(kx, ky + 6, 4.5, 0, Math.PI * 2); g.fill();
            // Hanging coral/gold diamond key fob with brass tassel tip
            g.fillStyle = (row + col) % 2 ? '#d4a348' : '#c65c48';
            g.beginPath();
            g.moveTo(kx, ky + 10); g.lineTo(kx + 11, ky + 23); g.lineTo(kx, ky + 38); g.lineTo(kx - 11, ky + 23);
            g.closePath(); g.fill();
            g.fillStyle = '#fff5dc';
            g.beginPath(); g.arc(kx, ky + 23, 3.5, 0, Math.PI * 2); g.fill();
          }
        }
      } else if(kind === 'pharmacy'){
        // Crisp vintage cream-parchment apothecary chart with emerald cross & botanical wreath
        g.fillStyle = '#f8fcf9'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2f9676'; g.fillRect(0, 0, w, 46);
        g.fillStyle = '#d4a348'; g.fillRect(0, 46, w, 4);
        g.strokeStyle = '#4ca888'; g.lineWidth = 4; g.strokeRect(10, 58, w - 20, h - 68);
        g.fillStyle = '#ffffff'; g.font = 'bold 21px sans-serif'; g.fillText('CORAL APOTHECARY', 82, 31);
        // Emerald cross centered inside botanical sage laurel wreath
        var wcx = 86, wcy = 144;
        for(var wi = 0; wi < 12; wi++){
          var wa = (wi / 12) * Math.PI * 2;
          g.save();
          g.translate(wcx + Math.cos(wa) * 44, wcy + Math.sin(wa) * 44);
          g.rotate(wa + Math.PI * 0.5);
          g.fillStyle = wi % 2 ? '#59b592' : '#7ecba9';
          g.beginPath(); g.ellipse(0, 0, 10, 4.5, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
        g.fillStyle = '#2f9676';
        g.fillRect(wcx - 10, wcy - 30, 20, 60);
        g.fillRect(wcx - 30, wcy - 10, 60, 20);
        g.fillStyle = '#f8fcf9';
        g.beginPath(); g.arc(wcx, wcy, 6, 0, Math.PI * 2); g.fill();
        // Herbal remedy list with pastel dot emblems & gold divider
        var pColors = ['#e88258', '#4ca888', '#8c6cc4', '#e6b84c'];
        for(var pr = 0; pr < 4; pr++){
          var py = 88 + pr * 32;
          g.fillStyle = pColors[pr];
          g.beginPath(); g.arc(166, py + 6, 7, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#3f6e5f';
          g.fillRect(184, py, 166 - (pr % 2) * 26, 10);
          g.fillStyle = '#9ec4b6';
          g.fillRect(184, py + 13, 118 - pr * 8, 5);
        }
      } else if(kind === 'taxi'){
        // Crisp HARBOR TAXI Coastal Route Map & Dispatch Fare Schedule Board
        g.fillStyle = '#f8f3e2'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#252e38'; g.fillRect(0, 0, w, 46);
        g.fillStyle = '#f0be38'; g.font = 'bold 21px sans-serif'; g.fillText('HARBOR TAXI MAP', 24, 31);
        for(var tk = 0; tk < 16; tk++){
          g.fillStyle = tk % 2 ? '#252e38' : '#f0be38';
          g.fillRect(tk * 24, 46, 24, 10);
        }
        // Left: Illustrated coastal harbor island route map
        g.fillStyle = '#c8eef6'; g.fillRect(14, 66, 206, 158);
        g.fillStyle = '#edd8a4';
        g.beginPath(); g.ellipse(116, 148, 86, 54, -0.1, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#e89d2c'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(46, 158); g.quadraticCurveTo(96, 110, 158, 128); g.lineTo(186, 164); g.stroke();
        g.strokeStyle = '#28869c'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(82, 184); g.lineTo(118, 134); g.lineTo(168, 104); g.stroke();
        [[46,158],[118,134],[158,128],[186,164],[82,184],[168,104]].forEach(function(pt){
          g.fillStyle = '#ffffff'; g.strokeStyle = '#252e38'; g.lineWidth = 3;
          g.beginPath(); g.arc(pt[0], pt[1], 6, 0, Math.PI * 2); g.fill(); g.stroke();
        });
        // Right: Clear Dispatch Fare Schedule card
        g.fillStyle = '#252e38'; g.fillRect(232, 66, 138, 158);
        g.fillStyle = '#f6cc4e'; g.font = 'bold 14px sans-serif'; g.fillText('ZONE FARES', 256, 88);
        g.fillStyle = '#f0be38'; g.fillRect(244, 96, 114, 2);
        var fareCols = ['#f6cc4e', '#6cd4d8', '#f28b74', '#8cd48c'];
        for(var fr = 0; fr < 4; fr++){
          var fy = 112 + fr * 26;
          g.fillStyle = fareCols[fr]; g.beginPath(); g.arc(254, fy + 5, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f6f1e2'; g.fillRect(268, fy, 52, 8);
          g.fillStyle = '#f6cc4e'; g.fillRect(330, fy, 26, 8);
        }
      } else {
        // Shop illustrated shell & pearl boutique sign
        g.fillStyle = '#fcf4e3'; g.fillRect(0, 0, w, h);
        g.fillStyle = regionInteriorHex(theme.accent); g.fillRect(0, 0, w, 32);
        g.fillStyle = '#ffffff'; g.font = 'bold 15px sans-serif'; g.fillText('SHELL BOUTIQUE', 56, 22);
        g.fillStyle = '#f28c74';
        g.beginPath(); g.arc(58, 96, 26, Math.PI, 0); g.fill();
        g.fillStyle = '#fff9ee';
        g.beginPath(); g.arc(58, 94, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#735840';
        g.fillRect(104, 64, 118, 9);
        g.fillRect(104, 88, 96, 8);
        g.fillRect(104, 112, 110, 8);
      }
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorClockMat(kit){
    var tex = regionInteriorTex('clock:subway', 128, 128, 1, 1, function(g, w, h){
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2e4152'; g.lineWidth = 6;
      g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
      for(var i = 0; i < 12; i++){
        var a = (i / 12) * Math.PI * 2;
        g.strokeStyle = '#2e4152'; g.lineWidth = i % 3 === 0 ? 4 : 2;
        g.beginPath();
        g.moveTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42);
        g.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
        g.stroke();
      }
      g.strokeStyle = '#1f2d3a'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.stroke();
      g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 74); g.stroke();
      g.fillStyle = '#d96b5a';
      g.beginPath(); g.arc(64, 64, 5, 0, Math.PI * 2); g.fill();
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorAddPlant(kit, group, x, y, z, scale){
    var T = window.THREE;
    var s = scale || 1;
    // Sculpted Mediterranean terracotta pot with banded lip & rich dark soil
    regionInteriorAddCyl(kit, group, 0.24 * s, 0.17 * s, 0.34 * s, 14, 0xc76d47, x, y + 0.17 * s, z);
    regionInteriorAddCyl(kit, group, 0.27 * s, 0.25 * s, 0.07 * s, 14, 0xd87f57, x, y + 0.34 * s, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.22 * s, 0.014 * s, 6, 16), kit.M(0xb35d3b), x, y + 0.27 * s, z, Math.PI / 2);
    regionInteriorAddCyl(kit, group, 0.21 * s, 0.21 * s, 0.03 * s, 12, 0x4c3628, x, y + 0.36 * s, z);
    // Graceful radiating arched coastal leaves (eliminates stacked-sphere snowman shrub silhouette!)
    var outerLeaf = regionInteriorCoastalLeafGeo(0.32 * s, 0.072 * s, 0.19 * s, 0.08 * s);
    var innerLeaf = regionInteriorCoastalLeafGeo(0.24 * s, 0.056 * s, 0.22 * s, 0.06 * s);
    for(var i = 0; i < 8; i++){
      var ang = (i / 8) * Math.PI * 2 + 0.18;
      regionInteriorAdd(group, outerLeaf, kit.M(i % 2 ? 0x2f7d4d : 0x3f965d), x + Math.sin(ang) * 0.04 * s, y + 0.37 * s, z + Math.cos(ang) * 0.04 * s, 0.12 + (i % 2) * 0.08, ang, 0);
    }
    for(var j = 0; j < 6; j++){
      var ang2 = (j / 6) * Math.PI * 2 + 0.52;
      regionInteriorAdd(group, innerLeaf, kit.M(j % 2 ? 0x52b26e : 0x67c67f), x + Math.sin(ang2) * 0.025 * s, y + 0.43 * s, z + Math.cos(ang2) * 0.025 * s, -0.06, ang2, 0);
    }
    // Soft organic inner foliage crown + delicate coastal blossoms
    var crownCols = [0x3b8e58, 0x52b06c, 0x6ec982];
    for(var k = 0; k < 5; k++){
      var ang3 = (k / 5) * Math.PI * 2 + 0.3;
      var puff = regionInteriorAdd(group, new T.SphereGeometry((0.105 + (k % 2) * 0.018) * s, 10, 8), kit.M(crownCols[k % 3]), x + Math.cos(ang3) * 0.095 * s, y + (0.50 + (k % 2) * 0.045) * s, z + Math.sin(ang3) * 0.095 * s);
      puff.scale.set(1.18, 0.72, 1.04);
    }
    var blossomCols = [0xff8aa8, 0xffe074, 0xfff7e4, 0xffa488];
    for(var b = 0; b < 5; b++){
      var bang = (b / 5) * Math.PI * 2 + 0.85;
      var br = (0.14 + (b % 2) * 0.05) * s;
      regionInteriorAdd(group, new T.SphereGeometry(0.036 * s, 8, 6), kit.M(blossomCols[b % blossomCols.length]), x + Math.cos(bang) * br, y + (0.55 + (b % 2) * 0.06) * s, z + Math.sin(bang) * br);
    }
  }

  var REGION_INTERIOR_ALIASES = {
    'practice:order-repair': 'cafe',
    'order-repair': 'cafe',
    'practice:register-repair': 'restaurant',
    'register-repair': 'restaurant'
  };

  function regionEncounterInteriorKind(view, encounter){
    if(!encounter || encounter.region !== 'town') return null;
    var raw = encounter.activityid ? String(encounter.activityid) : '';
    var id = REGION_INTERIOR_VENUES[raw] ? raw : (REGION_INTERIOR_ALIASES[raw] || '');
    if(!id && raw.indexOf('practice:') === 0 && typeof REGION_PRACTICE === 'object' && REGION_PRACTICE && Array.isArray(REGION_PRACTICE.town)){
      var pid = raw.slice(9);
      for(var i = 0; i < REGION_PRACTICE.town.length; i++){
        if(REGION_PRACTICE.town[i] && REGION_PRACTICE.town[i].id === pid && REGION_INTERIOR_VENUES[REGION_PRACTICE.town[i].talk]){
          id = REGION_INTERIOR_VENUES[REGION_PRACTICE.town[i].talk] ? REGION_PRACTICE.town[i].talk : '';
          break;
        }
      }
    }
    return REGION_INTERIOR_VENUES[id] ? id : null;
  }

  function regionInteriorAdd(group, geo, mat, x, y, z, rx, ry, rz){
    var T = window.THREE;
    var m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    if(rx) m.rotation.x = rx;
    if(ry) m.rotation.y = ry;
    if(rz) m.rotation.z = rz;
    group.add(m);
    return m;
  }

  function regionInteriorAddBox(kit, group, w, h, d, color, x, y, z, ry){
    var T = window.THREE;
    var mat = typeof color === 'number' ? kit.M(color) : color;
    return regionInteriorAdd(group, new T.BoxGeometry(w, h, d), mat, x, y, z, 0, ry || 0, 0);
  }

  function regionInteriorAddCyl(kit, group, rt, rb, h, seg, color, x, y, z, rx, rz){
    var T = window.THREE;
    var mat = typeof color === 'number' ? kit.M(color) : color;
    return regionInteriorAdd(group, new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx || 0, 0, rz || 0);
  }

  function regionInteriorAddShelf(kit, group, x, y, w, theme){
    regionInteriorAddBox(kit, group, w, 0.06, 0.26, theme.trim, x, y, -2.82);
    regionInteriorAddBox(kit, group, w, 0.025, 0.03, theme.windowFrame, x, y - 0.015, -2.69);
    var off = w * 0.36;
    [-off, off].forEach(function(bx){
      regionInteriorAddBox(kit, group, 0.06, 0.14, 0.20, theme.windowFrame, x + bx, y - 0.09, -2.85);
    });
  }

  function regionInteriorAddQuad(root, pts, mat){
    var T = window.THREE;
    var geo = new T.BufferGeometry();
    var verts = new Float32Array([
      pts[0][0], pts[0][1], pts[0][2],
      pts[1][0], pts[1][1], pts[1][2],
      pts[2][0], pts[2][1], pts[2][2],
      pts[3][0], pts[3][1], pts[3][2]
    ]);
    var uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
    geo.setAttribute('position', new T.BufferAttribute(verts, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    var m = new T.Mesh(geo, mat);
    root.add(m);
    return m;
  }

  function regionInteriorRadialShadowMat(opacity){
    var T = window.THREE;
    var tex = regionInteriorTex('shadow:radial', 128, 128, 1, 1, function(g, w, h){
      var grad = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.06, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0.0, 'rgba(18, 13, 10, 0.95)');
      grad.addColorStop(0.45, 'rgba(18, 13, 10, 0.42)');
      grad.addColorStop(1.0, 'rgba(18, 13, 10, 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: opacity, depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }

  function regionInteriorContactCoreMat(opacity){
    var T = window.THREE;
    var tex = regionInteriorTex('shadow:contactcore', 128, 128, 1, 1, function(g, w, h){
      var grad = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.05, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0.0, 'rgba(16, 10, 7, 0.96)');
      grad.addColorStop(0.42, 'rgba(16, 10, 7, 0.78)');
      grad.addColorStop(0.72, 'rgba(16, 10, 7, 0.30)');
      grad.addColorStop(1.0, 'rgba(16, 10, 7, 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }

  function regionInteriorAoMat(opacity){
    var T = window.THREE;
    var tex = regionInteriorTex('ao:wallfloor:v2', 64, 64, 1, 1, function(g, w, h){
      var grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, 'rgba(18, 13, 9, 0.92)');
      grad.addColorStop(0.28, 'rgba(18, 13, 9, 0.46)');
      grad.addColorStop(0.65, 'rgba(18, 13, 9, 0.14)');
      grad.addColorStop(1.0, 'rgba(18, 13, 9, 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  }

  function regionInteriorAddAoStrip(root, mat, x, z, len, depth, rotY, y){
    var T = window.THREE;
    var m = new T.Mesh(new T.PlaneGeometry(len, depth), mat);
    m.rotation.order = 'YXZ';
    m.rotation.x = -Math.PI / 2;
    if(rotY) m.rotation.z = rotY;
    m.position.set(x, y != null ? y : 0.0025, z);
    m.renderOrder = 1;
    root.add(m);
    return m;
  }

  // MAJ-8: Unmistakable Jamboree diagonal volumetric window sunbeam shafts (opacity 0.14..0.18 day)
  // slanting clearly from windows, skylights & arches onto the exact sunlit floor patches!
  function regionInteriorSunbeamMat(night, opacityOverride){
    var T = window.THREE;
    var tex = regionInteriorTex('sunbeam:v3:' + (night ? 'night' : 'day'), 128, 128, 1, 1, function(g, w, h){
      var img = g.createImageData(w, h);
      var d = img.data;
      var cr = night ? 172 : 255, cg = night ? 210 : 244, cb = night ? 255 : 204;
      for(var y = 0; y < h; y++){
        var v = 1 - y / (h - 1); // 1 at top (window), 0 at bottom (floor)
        var vFade = Math.pow(v, 0.72) * Math.min(1, (1 - v) * 6.5 + 0.18);
        for(var x = 0; x < w; x++){
          var u = x / (w - 1);
          var env = Math.pow(Math.sin(Math.PI * u), 1.18);
          // Crisp internal volumetric mullion ray striations matching window panes
          var rays = 0.62 + 0.38 * Math.pow(Math.abs(Math.sin(Math.PI * (u * 2.0))), 0.55);
          var a = Math.round(255 * env * rays * vFade);
          var idx = (y * w + x) * 4;
          d[idx] = cr; d[idx + 1] = cg; d[idx + 2] = cb; d[idx + 3] = a;
        }
      }
      g.putImageData(img, 0, 0);
    });
    var op = opacityOverride != null ? opacityOverride : (night ? 0.105 : 0.16);
    return new T.MeshBasicMaterial({
      map: tex, transparent: true, opacity: op,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
    });
  }

  // MAJ-8: Crisp dark diagonal mullion-bar & window-frame floor shadow stripes (normal alpha blend!)
  // contrasting directly against the bright sunlit #fff4cc panes like Jamboree's Rainbow Galleria!
  function regionInteriorSunMullionMat(night, style, opacityOverride){
    var T = window.THREE;
    var key = 'sunmullion:v4:' + (night ? 'night' : 'day') + ':' + (style || 'grid2x2');
    var tex = regionInteriorTex(key, 256, 256, 1, 1, function(g, w, h){
      g.clearRect(0, 0, w, h);
      var barCol = night ? 'rgba(12, 22, 42, 0.78)' : 'rgba(36, 26, 18, 0.78)';
      var pad = 16;
      // Soft ambient window-frame shadow surround
      g.fillStyle = night ? 'rgba(12, 22, 42, 0.20)' : 'rgba(36, 26, 18, 0.20)';
      g.fillRect(4, 4, w - 8, h - 8);
      // Punch out the bright open pane windows so ONLY the outer frame & crisp dark mullion bars cast shadow!
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,1.0)';
      if(style === 'arch2x2'){
        var cx = w * 0.5, archY = 98, archR = w * 0.42;
        g.beginPath();
        g.arc(cx, archY, archR, Math.PI, 0);
        g.lineTo(cx + archR, h - pad);
        g.lineTo(cx - archR, h - pad);
        g.closePath();
        g.fill();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = barCol;
        g.fillRect(cx - 10, 12, 20, h - 24);
        g.fillRect(cx - archR, archY - 10, archR * 2, 20);
        g.fillRect(cx - archR, archY + 64, archR * 2, 20);
      } else if(style === 'grid3x2'){
        var cols = 3, rows = 2, gapX = 20, gapY = 20;
        var pw3 = (w - pad * 2 - gapX * (cols - 1)) / cols;
        var ph3 = (h - pad * 2 - gapY * (rows - 1)) / rows;
        for(var r3 = 0; r3 < rows; r3++){
          for(var c3 = 0; c3 < cols; c3++){
            g.fillRect(pad + c3 * (pw3 + gapX), pad + r3 * (ph3 + gapY), pw3, ph3);
          }
        }
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = barCol;
        for(var vc = 1; vc < cols; vc++) g.fillRect(pad + vc * pw3 + (vc - 1) * gapX, pad, gapX, h - pad * 2);
        g.fillRect(pad, pad + ph3, w - pad * 2, gapY);
      } else if(style === 'pergola'){
        var slats = 5, gapS = 20;
        var sw = (w - pad * 2 - gapS * (slats - 1)) / slats;
        for(var si = 0; si < slats; si++){
          g.fillRect(pad + si * (sw + gapS), pad, sw, h - pad * 2);
        }
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = barCol;
        for(var vs = 1; vs < slats; vs++) g.fillRect(pad + vs * sw + (vs - 1) * gapS, pad, gapS, h - pad * 2);
      } else {
        var pw2 = (w - pad * 2 - 20) / 2, ph2 = (h - pad * 2 - 20) / 2;
        for(var r2 = 0; r2 < 2; r2++){
          for(var c2 = 0; c2 < 2; c2++){
            g.fillRect(pad + c2 * (pw2 + 20), pad + r2 * (ph2 + 20), pw2, ph2);
          }
        }
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = barCol;
        g.fillRect(pad + pw2, pad, 20, h - pad * 2);
        g.fillRect(pad, pad + ph2, w - pad * 2, 20);
      }
      // Feather top & bottom ends cleanly onto the floor
      g.globalCompositeOperation = 'destination-in';
      var fm = g.createLinearGradient(0, 0, 0, h);
      fm.addColorStop(0.0, 'rgba(0,0,0,0.0)');
      fm.addColorStop(0.10, 'rgba(0,0,0,0.92)');
      fm.addColorStop(0.80, 'rgba(0,0,0,0.78)');
      fm.addColorStop(1.0, 'rgba(0,0,0,0.0)');
      g.fillStyle = fm;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({
      map: tex, transparent: true, side: T.DoubleSide,
      opacity: opacityOverride != null ? opacityOverride : (night ? 0.16 : 0.28),
      depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });
  }

  // MAJ-D: Bright sunlit #fff6d4 diagonal window floor patch (NormalBlending, opacity 0.28..0.34 day) with clean mullion cutouts!
  function regionInteriorSunPatchMat(night, style, opacityOverride){
    var T = window.THREE;
    var key = 'sunpatch:v5:' + (night ? 'night' : 'day') + ':' + (style || 'grid2x2');
    var tex = regionInteriorTex(key, 256, 256, 1, 1, function(g, w, h){
      g.clearRect(0, 0, w, h);
      var cCore = night ? 'rgba(182, 218, 255, 0.96)' : 'rgba(255, 246, 212, 1.00)';
      var cMid  = night ? 'rgba(154, 198, 252, 0.78)' : 'rgba(255, 242, 198, 0.88)';
      var pad = 16;

      function drawPane(x, y, pw, ph, alphaScale){
        var gr = g.createLinearGradient(x, y, x, y + ph);
        gr.addColorStop(0.0, cCore);
        gr.addColorStop(0.68, cMid);
        gr.addColorStop(1.0, night ? 'rgba(154, 198, 252, 0.36)' : 'rgba(255, 242, 198, 0.44)');
        g.save();
        g.globalAlpha = alphaScale != null ? alphaScale : 1.0;
        g.fillStyle = gr;
        var r = 6;
        g.beginPath();
        g.moveTo(x + r, y); g.lineTo(x + pw - r, y); g.quadraticCurveTo(x + pw, y, x + pw, y + r);
        g.lineTo(x + pw, y + ph - r); g.quadraticCurveTo(x + pw, y + ph, x + pw - r, y + ph);
        g.lineTo(x + r, y + ph); g.quadraticCurveTo(x, y + ph, x, y + ph - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
        g.closePath();
        g.fill();
        g.restore();
      }

      if(style === 'arch2x2'){
        var cx = w * 0.5, archY = 98, archR = w * 0.42;
        g.save();
        g.beginPath();
        g.arc(cx, archY, archR, Math.PI, 0);
        g.lineTo(cx + archR, h - pad);
        g.lineTo(cx - archR, h - pad);
        g.closePath();
        g.clip();
        var paneGrad = g.createLinearGradient(0, 12, 0, h - pad);
        paneGrad.addColorStop(0.0, cCore);
        paneGrad.addColorStop(0.70, cMid);
        paneGrad.addColorStop(1.0, night ? 'rgba(154,198,252,0.34)' : 'rgba(255,236,172,0.42)');
        g.fillStyle = paneGrad;
        g.fillRect(0, 0, w, h);
        // Clean 20px mullion cutouts matching regionInteriorSunMullionMat
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = 'rgba(0,0,0,1.0)';
        g.fillRect(cx - 10, 0, 20, h);
        g.fillRect(0, archY - 10, w, 20);
        g.fillRect(0, archY + 64, w, 20);
        g.restore();
      } else if(style === 'grid3x2'){
        var cols = 3, rows = 2, gapX = 20, gapY = 20;
        var pw3 = (w - pad * 2 - gapX * (cols - 1)) / cols;
        var ph3 = (h - pad * 2 - gapY * (rows - 1)) / rows;
        for(var r3 = 0; r3 < rows; r3++){
          for(var c3 = 0; c3 < cols; c3++){
            drawPane(pad + c3 * (pw3 + gapX), pad + r3 * (ph3 + gapY), pw3, ph3, r3 === 0 ? 1.0 : 0.90);
          }
        }
      } else if(style === 'pergola'){
        var slats = 5, gapS = 20;
        var sw = (w - pad * 2 - gapS * (slats - 1)) / slats;
        for(var si = 0; si < slats; si++){
          drawPane(pad + si * (sw + gapS), pad, sw, h - pad * 2, 0.96 - Math.abs(si - 2) * 0.05);
        }
      } else {
        var pw2 = (w - pad * 2 - 20) / 2, ph2 = (h - pad * 2 - 20) / 2;
        for(var r2 = 0; r2 < 2; r2++){
          for(var c2 = 0; c2 < 2; c2++){
            drawPane(pad + c2 * (pw2 + 20), pad + r2 * (ph2 + 20), pw2, ph2, r2 === 0 ? 1.0 : 0.90);
          }
        }
      }
      g.globalCompositeOperation = 'destination-in';
      var fm = g.createLinearGradient(0, 0, 0, h);
      fm.addColorStop(0.0, 'rgba(0,0,0,0.0)');
      fm.addColorStop(0.08, 'rgba(0,0,0,0.96)');
      fm.addColorStop(0.82, 'rgba(0,0,0,0.84)');
      fm.addColorStop(1.0, 'rgba(0,0,0,0.0)');
      g.fillStyle = fm;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({
      map: tex, transparent: true, side: T.DoubleSide,
      opacity: opacityOverride != null ? opacityOverride : (night ? 0.18 : 0.32),
      blending: T.NormalBlending, depthWrite: false, depthTest: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });
  }

  function regionInteriorAddDiagSunPatch(root, mat, x0, x1, zBack, zFront, slantX, y){
    var py = y != null ? y : 0.016;
    var m = regionInteriorAddQuad(root, [
      [x0, py, zBack],
      [x0 + slantX, py, zFront],
      [x1 + slantX, py, zFront],
      [x1, py, zBack]
    ], mat);
    m.renderOrder = 4;
    return m;
  }

  // MAJ-8: Glossy specular window-reflection floor sheen panels gleaming smoothly across polished tiles & wood!
  function regionInteriorFloorSheenMat(night, opacityOverride){
    var T = window.THREE;
    var tex = regionInteriorTex('floorsheen:v2:' + (night ? 'night' : 'day'), 128, 128, 1, 1, function(g, w, h){
      g.clearRect(0, 0, w, h);
      var rgb = night ? '176, 218, 255' : '255, 250, 232';
      var grad = g.createRadialGradient(w * 0.5, h * 0.44, w * 0.04, w * 0.5, h * 0.5, w * 0.5);
      grad.addColorStop(0.0, 'rgba(' + rgb + ', 0.94)');
      grad.addColorStop(0.36, 'rgba(' + rgb + ', 0.52)');
      grad.addColorStop(0.74, 'rgba(' + rgb + ', 0.16)');
      grad.addColorStop(1.0, 'rgba(' + rgb + ', 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      // Soft twin glossy window-pane specular streaks echoing bright sky reflections across the floor
      var sGrad = g.createLinearGradient(0, 12, 0, h - 12);
      sGrad.addColorStop(0.0, 'rgba(255,255,248,0.0)');
      sGrad.addColorStop(0.28, night ? 'rgba(204,232,255,0.42)' : 'rgba(255,254,244,0.52)');
      sGrad.addColorStop(0.70, night ? 'rgba(180,220,255,0.18)' : 'rgba(255,250,232,0.22)');
      sGrad.addColorStop(1.0, 'rgba(255,255,248,0.0)');
      g.fillStyle = sGrad;
      g.fillRect(w * 0.22, 12, w * 0.24, h - 24);
      g.fillRect(w * 0.54, 12, w * 0.24, h - 24);
    });
    return new T.MeshBasicMaterial({
      map: tex, transparent: true,
      opacity: opacityOverride != null ? opacityOverride : (night ? 0.12 : 0.20),
      blending: T.AdditiveBlending, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });
  }

  function regionInteriorSunpoolMat(night){
    return regionInteriorFloorSheenMat(night);
  }

  function regionInteriorGlowConeMat(){
    var T = window.THREE;
    var tex = regionInteriorTex('glowcone:v1', 64, 128, 1, 1, function(g, w, h){
      var grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, 'rgba(255, 228, 163, 0.90)');
      grad.addColorStop(0.45, 'rgba(255, 228, 163, 0.35)');
      grad.addColorStop(1.0, 'rgba(255, 228, 163, 0.0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    return new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.14, depthWrite: false, side: T.DoubleSide });
  }

  function regionInteriorAddWindowTreatment(kit, group, kind, theme){
    if(kind === 'pharmacy'){
      // Raised honey-timber Venetian blinds in Pharmacy (exposing the sunlit stone garden arch & flower terrace)
      regionInteriorAddBox(kit, group, 2.02, 0.10, 0.11, theme.windowFrame, -1.95, 2.86, -2.84);
      for(var si = 0; si < 5; si++){
        var sy = 2.77 - si * 0.082;
        var slat = regionInteriorAddBox(kit, group, 1.86, 0.024, 0.06, 0xd4b68c, -1.95, sy, -2.84);
        slat.rotation.x = 0.36;
      }
      [-2.52, -1.38].forEach(function(cx){
        regionInteriorAddCyl(kit, group, 0.008, 0.008, 0.54, 6, 0xe8e2d5, cx, 2.54, -2.80);
        regionInteriorAddCyl(kit, group, 0.018, 0.014, 0.045, 8, theme.windowFrame, cx, 2.26, -2.80);
      });
      return;
    }
    // Curtain rod with brass/wood finials
    regionInteriorAddCyl(kit, group, 0.028, 0.028, 2.58, 8, theme.trim, -1.95, 3.02, -2.82, 0, Math.PI / 2);
    [-3.26, -0.64].forEach(function(fx){
      regionInteriorAdd(group, new window.THREE.SphereGeometry(0.045, 8, 6), kit.M(kind === 'hotel' ? 0xd4a348 : theme.trim), fx, 3.02, -2.82);
    });
    // Pleated 3-fold draped panels + tie-backs (tasseled velvet drapes in Hotel)
    var isHotel = kind === 'hotel';
    [-1, 1].forEach(function(side){
      var baseX = side < 0 ? -2.90 : -1.00;
      for(var f = -1; f <= 1; f++){
        var fx = baseX + f * 0.095;
        var fz = -2.82 + (f === 0 ? 0.028 : 0.0);
        // Upper pleated panel from rod to tie-back
        regionInteriorAddCyl(kit, group, 0.068, 0.056, 0.94, 8, theme.curtain, fx, 2.52, fz);
        // Lower flared drape skirt from tie-back to sill
        regionInteriorAddCyl(kit, group, 0.056, 0.088, 0.56, 8, theme.curtain, fx + side * 0.02, 1.78, fz);
      }
      // Tie-back band
      var tieColor = isHotel ? 0xd4a348 : theme.rugTrim;
      regionInteriorAddBox(kit, group, 0.28, 0.055, 0.14, tieColor, baseX, 2.05, -2.81);
      if(isHotel){
        // Hanging golden tassel
        var tx = baseX - side * 0.14;
        regionInteriorAddCyl(kit, group, 0.008, 0.008, 0.10, 6, 0xd4a348, tx, 1.98, -2.76);
        regionInteriorAddCyl(kit, group, 0.014, 0.036, 0.09, 8, 0xe8c166, tx, 1.90, -2.76);
      }
    });
  }

  function regionInteriorAddLuggageRack(kit, group, x, y, z){
    var T = window.THREE;
    var brass = 0xd4a348;
    var brightBrass = 0xe8be58;
    var leather = 0x7d4628;
    var darkLeather = 0x4f2b18;
    // Folding brass X-leg luggage rack strictly grounded at y = 0
    [-0.29, 0.29].forEach(function(lx){
      var legA = regionInteriorAddBox(kit, group, 0.035, 0.62, 0.035, brass, x + lx, y + 0.278, z);
      legA.rotation.x = 0.52;
      var legB = regionInteriorAddBox(kit, group, 0.035, 0.62, 0.035, brass, x + lx, y + 0.278, z);
      legB.rotation.x = -0.52;
    });
    regionInteriorAddBox(kit, group, 0.66, 0.035, 0.04, brass, x, y + 0.488, z - 0.16);
    regionInteriorAddBox(kit, group, 0.66, 0.035, 0.04, brass, x, y + 0.488, z + 0.16);
    [-0.20, 0, 0.20].forEach(function(sx){
      regionInteriorAddBox(kit, group, 0.09, 0.02, 0.34, leather, x + sx, y + 0.508, z);
    });
    // Flat vintage chestnut leather suitcase resting solidly on the rack straps (y = 0.518 .. 0.728)
    regionInteriorAddBox(kit, group, 0.54, 0.21, 0.30, leather, x, y + 0.623, z);
    regionInteriorAddBox(kit, group, 0.546, 0.014, 0.306, darkLeather, x, y + 0.648, z);
    [-0.155, 0.155].forEach(function(bx){
      regionInteriorAddBox(kit, group, 0.042, 0.216, 0.314, brass, x + bx, y + 0.623, z);
      regionInteriorAddBox(kit, group, 0.050, 0.032, 0.022, brightBrass, x + bx, y + 0.648, z + 0.156);
    });
    // Front leather carrying handle (keeps flat top surface completely level for the hatbox)
    regionInteriorAddBox(kit, group, 0.14, 0.036, 0.036, darkLeather, x, y + 0.623, z + 0.162);
    [-0.062, 0.062].forEach(function(hx){
      regionInteriorAddBox(kit, group, 0.024, 0.042, 0.024, brass, x + hx, y + 0.623, z + 0.154);
    });
    // Round cream-and-burgundy leather hatbox seated solidly & flush atop the suitcase (y = 0.728 .. 0.96, zero overhang, zero stub)
    var hatX = x + 0.03;
    regionInteriorAddCyl(kit, group, 0.132, 0.132, 0.185, 16, 0xf5ebd6, hatX, y + 0.8205, z);
    regionInteriorAddCyl(kit, group, 0.137, 0.137, 0.014, 16, brass, hatX, y + 0.892, z);
    regionInteriorAddCyl(kit, group, 0.140, 0.140, 0.044, 16, 0x8e2d42, hatX, y + 0.922, z);
    regionInteriorAdd(group, new T.SphereGeometry(0.018, 8, 6), kit.M(brightBrass), hatX, y + 0.956, z);
  }

  function regionInteriorAddApothecaryHerbJar(kit, group, x, y, z, glazeColor){
    var T = window.THREE;
    regionInteriorAddCyl(kit, group, 0.062, 0.056, 0.135, 12, glazeColor || 0xf4efe2, x, y + 0.068, z);
    regionInteriorAddCyl(kit, group, 0.066, 0.066, 0.024, 12, 0xb88b5a, x, y + 0.145, z);
    regionInteriorAddBox(kit, group, 0.058, 0.042, 0.012, 0xfaf6ec, x, y + 0.072, z + 0.058);
  }

  function regionInteriorAddApothecaryCabinet(kit, group, x, y, z){
    var wood = 0x6f4325;
    var drawerWood = 0x9c6d42;
    regionInteriorAddBox(kit, group, 0.94, 1.48, 0.44, wood, x, y + 0.74, z);
    regionInteriorAddBox(kit, group, 1.02, 0.08, 0.50, wood, x, y + 1.50, z);
    regionInteriorAddBox(kit, group, 0.98, 0.08, 0.46, 0x56341c, x, y + 0.04, z);
    for(var row = 0; row < 4; row++){
      for(var col = 0; col < 3; col++){
        var dx = x + (col - 1) * 0.28;
        var dy = y + 0.26 + row * 0.31;
        regionInteriorAddBox(kit, group, 0.24, 0.25, 0.04, drawerWood, dx, dy, z + 0.21);
        regionInteriorAddBox(kit, group, 0.12, 0.055, 0.02, 0xfaf6ec, dx, dy + 0.045, z + 0.235);
        regionInteriorAdd(group, new window.THREE.SphereGeometry(0.018, 6, 6), kit.M(0xd4a348), dx, dy - 0.045, z + 0.245);
      }
    }
    // Upper 3-shelf apothecary display hutch stocked with jewel-toned bottles & ceramic herb jars
    regionInteriorAddBox(kit, group, 0.92, 1.18, 0.08, 0x5c361d, x, y + 2.13, z - 0.16);
    regionInteriorAddBox(kit, group, 1.00, 0.08, 0.38, 0x56341c, x, y + 2.74, z - 0.02);
    [1.92, 2.32].forEach(function(sy){
      regionInteriorAddBox(kit, group, 0.88, 0.045, 0.30, 0x56341c, x, y + sy, z - 0.02);
    });
    [
      [-0.30, 1.54, 0x3ec99b, 0.20], [-0.08, 1.54, 'jar', 0xf2ebd9], [0.14, 1.54, 0xe86c8a, 0.18], [0.32, 1.54, 0x46b2e8, 0.21],
      [-0.28, 1.94, 0x9c7ae0, 0.19], [-0.06, 1.94, 0xe8ae3c, 0.21], [0.16, 1.94, 'jar', 0xd6eadf], [0.34, 1.94, 0x58b896, 0.18],
      [-0.28, 2.34, 'jar', 0xf4e4c8], [-0.06, 2.34, 0xde6d7d, 0.20], [0.16, 2.34, 0x5893c4, 0.18], [0.34, 2.34, 0xe2ad44, 0.20]
    ].forEach(function(item){
      if(item[2] === 'jar'){
        regionInteriorAddApothecaryHerbJar(kit, group, x + item[0], y + item[1], z + 0.04, item[3]);
      } else {
        regionInteriorAddApothecaryBottle(kit, group, x + item[0], y + item[1], z + 0.04, item[3], item[2]);
      }
    });
  }

  function regionInteriorAddApothecaryBottle(kit, group, x, y, z, h, color, emissive){
    var T = window.THREE;
    var s = (h || 0.22) / 0.22;
    var pts = [
      new T.Vector2(0.001, 0),
      new T.Vector2(0.068 * s, 0),
      new T.Vector2(0.072 * s, 0.11 * s),
      new T.Vector2(0.032 * s, 0.15 * s),
      new T.Vector2(0.028 * s, 0.20 * s),
      new T.Vector2(0.036 * s, 0.215 * s),
      new T.Vector2(0.022 * s, 0.215 * s)
    ];
    var mat = emissive ? kit.M(color, { emissive: emissive }) : kit.M(color);
    regionInteriorAdd(group, new T.LatheGeometry(pts, 12), mat, x, y, z);
    // Cork stopper
    regionInteriorAddCyl(kit, group, 0.022 * s, 0.018 * s, 0.04 * s, 8, 0xb88b5a, x, y + 0.225 * s, z);
    // Paper label
    regionInteriorAddBox(kit, group, 0.08 * s, 0.065 * s, 0.015, 0xfaf6ec, x, y + 0.065 * s, z + 0.068 * s);
  }

  function regionInteriorCafeRunnerMat(kit){
    var tex = regionInteriorTex('rug:cafe:runner:v1', 384, 256, 1, 1, function(g, w, h){
      // Woven espresso-burlap & sage-stripe rectangular café runner mat
      g.fillStyle = '#d4bd98'; g.fillRect(0, 0, w, h);
      // Warm woven burlap crosshatch texture
      g.fillStyle = 'rgba(116,84,48,0.12)';
      for(var y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
      for(var x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
      // Deep sage-emerald outer frame + cream inner pinstripe + coffee-bean border ticks
      g.strokeStyle = '#3f7d68'; g.lineWidth = 18; g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = '#fbf4e2'; g.lineWidth = 4; g.strokeRect(28, 28, w - 56, h - 56);
      g.fillStyle = '#4b8f7a'; g.fillRect(40, 40, w - 80, 14); g.fillRect(40, h - 54, w - 80, 14);
      g.fillStyle = '#6e452b';
      for(var cx = 56; cx <= w - 56; cx += 28){
        g.beginPath(); g.ellipse(cx, 47, 5, 3, 0.3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(cx, h - 47, 5, 3, -0.3, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(92,58,34,0.34)'; g.lineWidth = 2.5;
      g.strokeRect(48, 66, w - 96, h - 132);
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorRestaurantKilimMat(kit){
    var tex = regionInteriorTex('rug:restaurant:kilim:v1', 384, 256, 1, 1, function(g, w, h){
      // Mediterranean terracotta, olive & cream woven diamond kilim mat (rectangular!)
      g.fillStyle = '#b9553e'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f5e4c6'; g.fillRect(16, 16, w - 32, h - 32);
      g.fillStyle = '#4e7c5e'; g.fillRect(26, 26, w - 52, h - 52);
      g.fillStyle = '#cf6b52'; g.fillRect(42, 42, w - 84, h - 84);
      // Geometric Mediterranean kilim zig-zag border & stepped diamond medallions
      g.fillStyle = '#f7ebd4';
      for(var dx = 48; dx <= w - 48; dx += 32){
        [34, h - 34].forEach(function(dy){
          g.beginPath(); g.moveTo(dx, dy - 7); g.lineTo(dx + 8, dy); g.lineTo(dx, dy + 7); g.lineTo(dx - 8, dy); g.closePath(); g.fill();
        });
      }
      var cx = w * 0.5, cy = h * 0.5;
      [[0, 0, 52, 34, '#f7ebd4'], [0, 0, 36, 23, '#4e7c5e'], [0, 0, 18, 12, '#e8b654'],
       [-92, 0, 30, 20, '#f7ebd4'], [-92, 0, 16, 10, '#4e7c5e'],
       [92, 0, 30, 20, '#f7ebd4'], [92, 0, 16, 10, '#4e7c5e']].forEach(function(dm){
        g.fillStyle = dm[4];
        g.beginPath();
        g.moveTo(cx + dm[0], cy + dm[1] - dm[3]);
        g.lineTo(cx + dm[0] + dm[2], cy + dm[1]);
        g.lineTo(cx + dm[0], cy + dm[1] + dm[3]);
        g.lineTo(cx + dm[0] - dm[2], cy + dm[1]);
        g.closePath(); g.fill();
      });
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorShopShellMat(kit){
    var tex = regionInteriorTex('rug:shop:shell:v1', 384, 384, 1, 1, function(g, w, h){
      // Scalloped coastal pearl, seafoam & gold shell-fan boutique floor medallion!
      var cx = w * 0.5, cy = h * 0.5, R = w * 0.48;
      g.fillStyle = '#5da4ab'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fbf4e4';
      g.beginPath(); g.arc(cx, cy, R * 0.92, 0, Math.PI * 2); g.fill();
      // 12 radiating coastal shell ribs in alternating pearl-ivory & soft seafoam
      for(var i = 0; i < 12; i++){
        var a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
        g.fillStyle = i % 2 === 0 ? '#eef7f6' : '#faeed8';
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R * 0.86, a0, a1); g.closePath(); g.fill();
        g.strokeStyle = '#d4a348'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R * 0.86, cy + Math.sin(a0) * R * 0.86); g.stroke();
      }
      g.strokeStyle = '#e69f38'; g.lineWidth = 6;
      g.beginPath(); g.arc(cx, cy, R * 0.86, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#79bcc2';
      g.beginPath(); g.arc(cx, cy, R * 0.34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff9ee';
      g.beginPath(); g.arc(cx, cy, R * 0.22, 0, Math.PI * 2); g.fill();
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorSubwayMedallionMat(kit){
    var tex = regionInteriorTex('rug:subway:hex:v1', 384, 384, 1, 1, function(g, w, h){
      // Flush inlaid Harbor Metro hexagonal compass-rose tile mosaic (clean transit floor inlay!)
      var cx = w * 0.5, cy = h * 0.5, R = w * 0.5;
      function hexPath(rad){
        g.beginPath();
        for(var i = 0; i < 6; i++){
          var a = (i / 6) * Math.PI * 2;
          var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
          if(i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
      }
      g.fillStyle = '#26879c'; g.fillRect(0, 0, w, h);
      hexPath(R * 0.90); g.fillStyle = '#e8f1f6'; g.fill();
      hexPath(R * 0.78); g.fillStyle = '#335368'; g.fill();
      hexPath(R * 0.64); g.fillStyle = '#dfeaf0'; g.fill();
      // Compass-rose transit line arrows in teal & saffron
      for(var k = 0; k < 6; k++){
        var ka = (k / 6) * Math.PI * 2;
        g.strokeStyle = k % 2 ? '#e58e49' : '#26879c'; g.lineWidth = 8;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ka) * R * 0.58, cy + Math.sin(ka) * R * 0.58); g.stroke();
      }
      g.fillStyle = '#26879c'; g.beginPath(); g.arc(cx, cy, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2be3c'; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
    });
    return kit.M('#ffffff', { map: tex });
  }

  function regionInteriorAddRug(kit, group, kind, theme, cx, cz){
    var T = window.THREE;
    if(kind === 'hotel'){
      // Grand rectangular gold-bordered navy/teal Persian lobby runner with corner medallions under Shelly
      var rx = typeof cx === 'number' ? cx : -1.58, rz = typeof cz === 'number' ? cz : -0.12, rw = 2.02, rd = 1.30;
      regionInteriorAddBox(kit, group, rw + 0.02, 0.014, rd + 0.02, 0x16314a, rx, 0.007, rz);
      regionInteriorAddBox(kit, group, rw, 0.005, rd, regionInteriorHotelRugMat(kit), rx, 0.0165, rz);
      [-1, 1].forEach(function(side){
        for(var ti = -4; ti <= 4; ti++){
          var tz = rz + ti * 0.145;
          var tx = rx + side * (rw * 0.5 + 0.055);
          regionInteriorAddBox(kit, group, 0.11, 0.011, 0.042, 0xf6ebd4, tx, 0.0055, tz);
        }
      });
      return;
    }
    if(kind === 'pharmacy'){
      // Crisp octagonal mint-and-cream botanical floor mat with leaf border under Shelly
      var px = typeof cx === 'number' ? cx : -1.54, pz = typeof cz === 'number' ? cz : -0.08;
      var base = regionInteriorAddCyl(kit, group, 1.14, 1.14, 0.014, 8, 0x388e72, px, 0.007, pz);
      base.rotation.y = Math.PI / 8;
      base.scale.set(1.04, 1, 0.85);
      var octGeo = new T.CircleGeometry(1.11, 8);
      octGeo.rotateX(-Math.PI / 2);
      octGeo.rotateY(Math.PI / 8);
      var octTop = regionInteriorAdd(group, octGeo, regionInteriorPharmacyRugMat(kit), px, 0.018, pz);
      octTop.scale.set(1.04, 1, 0.85);
      return;
    }
    if(kind === 'restaurant'){
      // MIN-14: Rectangular fringed Mediterranean terracotta-and-olive woven kilim mat (distinct from round rugs!)
      var brx = typeof cx === 'number' ? cx : -1.72, brz = typeof cz === 'number' ? cz : 0.08;
      var brw = 2.04, brd = 1.38;
      regionInteriorAddBox(kit, group, brw + 0.03, 0.013, brd + 0.03, 0x9b4534, brx, 0.0065, brz);
      regionInteriorAddBox(kit, group, brw, 0.005, brd, regionInteriorRestaurantKilimMat(kit), brx, 0.016, brz);
      [-1, 1].forEach(function(side){
        for(var ti = -4; ti <= 4; ti++){
          regionInteriorAddBox(kit, group, 0.12, 0.010, 0.036, 0xf7e7cf, brx + side * (brw * 0.5 + 0.06), 0.005, brz + ti * 0.15);
        }
      });
      return;
    }
    if(kind === 'cafe'){
      // MIN-14: Rectangular woven espresso-burlap & sage-stripe café runner mat (NOT a round rug!)
      var crx = typeof cx === 'number' ? cx : 1.50, crz = typeof cz === 'number' ? cz : -0.06;
      var crw = 2.12, crd = 1.36;
      regionInteriorAddBox(kit, group, crw + 0.02, 0.013, crd + 0.02, 0x3b7662, crx, 0.0065, crz);
      regionInteriorAddBox(kit, group, crw, 0.005, crd, regionInteriorCafeRunnerMat(kit), crx, 0.016, crz);
      return;
    }
    if(kind === 'shop'){
      // MIN-14: Scalloped coastal pearl-and-seafoam shell boutique medallion mat (12-scallop shell silhouette!)
      var srx = typeof cx === 'number' ? cx : -1.82, srz = typeof cz === 'number' ? cz : -0.02;
      var sGeo = new T.CircleGeometry(1.06, 24); sGeo.rotateX(-Math.PI / 2);
      var sBase = regionInteriorAddCyl(kit, group, 1.09, 1.09, 0.014, 24, 0x5da4ab, srx, 0.007, srz);
      sBase.scale.set(1.08, 1, 0.84);
      var sTop = regionInteriorAdd(group, sGeo, regionInteriorShopShellMat(kit), srx, 0.017, srz);
      sTop.scale.set(1.08, 1, 0.84);
      // 12 sculpted pearl-shell scallop lobes around rim
      for(var si = 0; si < 12; si++){
        var sa = (si / 12) * Math.PI * 2;
        regionInteriorAddCyl(kit, group, 0.14, 0.14, 0.013, 10, si % 2 ? 0xf8f0dc : 0x7cbcc0, srx + Math.cos(sa) * 1.12, 0.0065, srz + Math.sin(sa) * 0.87);
      }
      return;
    }
    if(kind === 'subway'){
      // Directive #364: Compact flush inlaid Harbor Metro hexagonal tile medallion strictly on passenger platform (x >= -0.90, >= 0.50u clear of yellow strip!)
      var mrx = typeof cx === 'number' ? cx : -0.88, mrz = typeof cz === 'number' ? cz : -0.34;
      var hBase = regionInteriorAddCyl(kit, group, 0.62, 0.62, 0.009, 6, 0x26879c, mrx, 0.0045, mrz);
      hBase.scale.set(1.0, 1, 0.88);
      var hGeo = new T.CircleGeometry(0.60, 6); hGeo.rotateX(-Math.PI / 2);
      var hTop = regionInteriorAdd(group, hGeo, regionInteriorSubwayMedallionMat(kit), mrx, 0.011, mrz);
      hTop.scale.set(1.0, 1, 0.88);
      return;
    }
    if(kind === 'taxi'){
      // Checkered yellow-and-charcoal Harbor Taxi cab-bay welcome mat under Shelly
      var trx = typeof cx === 'number' ? cx : -1.56, trz = typeof cz === 'number' ? cz : -0.06;
      regionInteriorAddBox(kit, group, 1.98, 0.014, 1.32, 0x252e38, trx, 0.007, trz);
      regionInteriorAddBox(kit, group, 1.94, 0.006, 1.28, regionInteriorTaxiRugMat(kit), trx, 0.016, trz);
      return;
    }
    if(kind === 'friend'){
      // Sunlit seaside woven turquoise-and-coral courtyard gazebo rug bridging Shelly & Friend Seal
      var frx = typeof cx === 'number' ? cx : -0.18, frz = typeof cz === 'number' ? cz : -0.35;
      var fBase = regionInteriorAddCyl(kit, group, 1.68, 1.68, 0.014, 28, 0x4f9c9c, frx, 0.007, frz);
      fBase.scale.set(1.24, 1, 0.82);
      var fGeo = new T.CircleGeometry(1.65, 28);
      fGeo.rotateX(-Math.PI / 2);
      var fTop = regionInteriorAdd(group, fGeo, regionInteriorFriendRugMat(kit), frx, 0.017, frz);
      fTop.scale.set(1.24, 1, 0.82);
      return;
    }
  }

  // MIN-14: Venue-specific foreground props breaking the repeated right potted plant across Harbor Town rooms!
  function regionInteriorAddCoffeeBarrel(kit, group, x, y, z){
    var T = window.THREE;
    // Grounded oak roasted-coffee-bean barrel with brass hoops & overflowing espresso beans
    regionInteriorAddCyl(kit, group, 0.185, 0.165, 0.34, 14, 0x7c4e2d, x, y + 0.17, z);
    [0.06, 0.18, 0.30].forEach(function(hy){
      regionInteriorAdd(group, new T.TorusGeometry(0.184 - Math.abs(hy - 0.18) * 0.08, 0.011, 6, 16), kit.M(0xd4a348), x, y + hy, z, Math.PI / 2);
    });
    regionInteriorAddCyl(kit, group, 0.165, 0.165, 0.03, 12, 0x472816, x, y + 0.335, z);
    [[-0.06, 0.04], [0.05, 0.05], [-0.02, -0.05], [0.07, -0.03], [0.0, 0.01]].forEach(function(bn, bi){
      var b = regionInteriorAdd(group, new T.SphereGeometry(0.036, 8, 6), kit.M(bi % 2 ? 0x5c341d : 0x452412), x + bn[0], y + 0.365 + (bi === 4 ? 0.02 : 0), z + bn[1]);
      b.scale.set(1.15, 0.72, 0.85);
    });
    // Plump, 100% opaque sculpted woven burlap coffee sack beside barrel
    var sackMat = new T.MeshToonMaterial({ color: 0xb98b56, gradientMap: kit.grad, transparent: false, depthWrite: true });
    var sk = regionInteriorAdd(group, new T.SphereGeometry(0.145, 14, 10), sackMat, x + 0.36, y + 0.12, z + 0.02);
    sk.scale.set(1.05, 0.92, 0.92);
    regionInteriorAdd(group, new T.CylinderGeometry(0.052, 0.076, 0.065, 12), sackMat, x + 0.36, y + 0.235, z + 0.02);
    var ribbonMat = new T.MeshToonMaterial({ color: 0x4b8f7a, gradientMap: kit.grad, transparent: false, depthWrite: true });
    regionInteriorAdd(group, new T.TorusGeometry(0.056, 0.013, 6, 12), ribbonMat, x + 0.36, y + 0.24, z + 0.02, Math.PI / 2);
  }

  function regionInteriorAddBistroWineCask(kit, group, x, y, z){
    var T = window.THREE;
    // Rustic Mediterranean oak olive-oil cask & terracotta amphora + citrus crate (replaces repeated right plant!)
    regionInteriorAddCyl(kit, group, 0.19, 0.17, 0.34, 14, 0x875330, x, y + 0.17, z);
    [0.05, 0.29].forEach(function(hy){
      regionInteriorAdd(group, new T.TorusGeometry(0.188, 0.011, 6, 16), kit.M(0x523420), x, y + hy, z, Math.PI / 2);
    });
    regionInteriorAddCyl(kit, group, 0.175, 0.175, 0.02, 14, 0x9c663d, x, y + 0.34, z);
    // Warm glazed terracotta olive-oil pitcher & bright Meyer lemons on top of cask
    regionInteriorAddCyl(kit, group, 0.048, 0.072, 0.16, 12, 0xc96c46, x - 0.04, y + 0.43, z - 0.02);
    regionInteriorAddCyl(kit, group, 0.024, 0.042, 0.07, 10, 0xd87f57, x - 0.04, y + 0.54, z - 0.02);
    regionInteriorAdd(group, new T.TorusGeometry(0.042, 0.010, 6, 10, Math.PI), kit.M(0xc96c46), x - 0.095, y + 0.45, z - 0.02, 0, 0, Math.PI / 2);
    [[0.07, 0.375, 0.04], [0.02, 0.375, 0.08], [0.06, 0.405, 0.07]].forEach(function(lm){
      var f = regionInteriorAdd(group, new T.SphereGeometry(0.032, 8, 6), kit.M(0xf7cf3c), x + lm[0], y + lm[1], z + lm[2]);
      f.scale.set(1.22, 0.84, 0.88);
    });
  }

  function regionInteriorAddShopShellHamper(kit, group, x, y, z){
    var T = window.THREE;
    // Woven honey-wicker coastal gift hamper brimming with rolled silk scarves & luminous shells
    regionInteriorAddCyl(kit, group, 0.22, 0.165, 0.28, 16, 0xc9914e, x, y + 0.14, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.222, 0.018, 6, 16), kit.M(0xa66e32), x, y + 0.28, z, Math.PI / 2);
    [-0.22, 0.22].forEach(function(hx){
      regionInteriorAdd(group, new T.TorusGeometry(0.048, 0.011, 6, 10, Math.PI), kit.M(0xa66e32), x + hx, y + 0.29, z, 0, Math.PI / 2);
    });
    // Rolled boutique silk bolts + pink scallop shell & glowing pearl nestled inside hamper
    [[-0.08, 0.32, 0.03, 0x52b6c8, 0.24], [0.07, 0.33, -0.02, 0xe87b88, -0.22], [0.0, 0.35, -0.05, 0xf2c24b, 0.06]].forEach(function(rl){
      regionInteriorAddCyl(kit, group, 0.052, 0.052, 0.22, 10, rl[3], x + rl[0], y + rl[1], z + rl[2], 0.18, rl[4]);
      regionInteriorAddCyl(kit, group, 0.055, 0.055, 0.022, 10, 0xfff6e5, x + rl[0], y + rl[1], z + rl[2], 0.18, rl[4]);
    });
    regionInteriorAdd(group, new T.SphereGeometry(0.064, 10, 8), kit.M(0xfff9ee), x + 0.02, y + 0.33, z + 0.08);
  }

  function regionInteriorAddTaxiCones(kit, group, x, y, z){
    var T = window.THREE;
    // Authentic harbor taxi pier traffic cone + coiled yellow tow-rope & brass pier cleat
    regionInteriorAddBox(kit, group, 0.32, 0.036, 0.32, 0x252e38, x, y + 0.018, z);
    regionInteriorAddCyl(kit, group, 0.034, 0.135, 0.38, 14, 0xf08c2c, x, y + 0.22, z);
    regionInteriorAddCyl(kit, group, 0.062, 0.088, 0.085, 14, 0xfff7e2, x, y + 0.27, z);
    regionInteriorAddCyl(kit, group, 0.098, 0.118, 0.065, 14, 0xfff7e2, x, y + 0.14, z);
    // Coiled marine yellow pier rope beside cone
    for(var r = 0; r < 3; r++){
      regionInteriorAdd(group, new T.TorusGeometry(0.115 - r * 0.008, 0.024, 6, 16), kit.M(r % 2 ? 0xe6bc48 : 0xd9a838), x - 0.26, y + 0.024 + r * 0.036, z + 0.08, Math.PI / 2);
    }
  }

  function regionInteriorAddSubwayKiosk(kit, group, x, y, z){
    var T = window.THREE;
    // Sleek teal-and-brushed-steel Harbor Metro route-pamphlet stand (replaces repeated plant!)
    regionInteriorAddBox(kit, group, 0.36, 0.04, 0.28, 0x354452, x, y + 0.02, z);
    regionInteriorAddBox(kit, group, 0.30, 0.44, 0.22, 0x4b5e70, x, y + 0.26, z);
    regionInteriorAddBox(kit, group, 0.31, 0.10, 0.23, 0x26879c, x, y + 0.38, z);
    regionInteriorAddBox(kit, group, 0.26, 0.04, 0.16, 0xf2be3c, x, y + 0.50, z);
    // Crisp folded transit route maps fanned neatly inside pocket
    [[-0.07, 0xfffaf0], [0.0, 0x74d4dc], [0.07, 0xffdc78]].forEach(function(pm, pi){
      var card = regionInteriorAddBox(kit, group, 0.075, 0.16, 0.016, pm[1], x + pm[0], y + 0.56, z + (pi - 1) * 0.02);
      card.rotation.x = -0.18;
    });
  }

  function regionInteriorAddHotelUmbrellaStand(kit, group, x, y, z){
    var T = window.THREE;
    // Gleaming mahogany-and-brass grand hotel umbrella stand with rolled coastal parasols
    regionInteriorAddCyl(kit, group, 0.165, 0.18, 0.035, 16, 0x58311a, x, y + 0.0175, z);
    regionInteriorAddCyl(kit, group, 0.145, 0.135, 0.38, 16, 0x1b3d5a, x, y + 0.22, z);
    [0.05, 0.22, 0.40].forEach(function(ry){
      regionInteriorAdd(group, new T.TorusGeometry(0.148, 0.011, 6, 18), kit.M(0xe6bc58), x, y + ry, z, Math.PI / 2);
    });
    // Two neatly furled striped hotel parasols with curved brass handles
    [[-0.04, 0.02, 0x8e2d42, 0.10], [0.05, -0.02, 0xf5ebd6, -0.12]].forEach(function(um){
      regionInteriorAddCyl(kit, group, 0.028, 0.018, 0.48, 10, um[2], x + um[0], y + 0.34, z + um[1], 0.06, um[3]);
      regionInteriorAddCyl(kit, group, 0.010, 0.010, 0.12, 6, 0xd4a348, x + um[0] - um[3] * 0.24, y + 0.58, z + um[1], 0.06, um[3]);
      regionInteriorAdd(group, new T.TorusGeometry(0.032, 0.009, 6, 10, Math.PI), kit.M(0xe8be58), x + um[0] - um[3] * 0.26, y + 0.64, z + um[1]);
    });
  }

  function regionInteriorAddFriendPicnicBasket(kit, group, x, y, z){
    var T = window.THREE;
    // Cozy woven seaside picnic hamper & rolled coral-striped beach blanket on the sunset terrace
    regionInteriorAddBox(kit, group, 0.42, 0.24, 0.28, 0xc78f4e, x, y + 0.12, z, -0.24);
    regionInteriorAddBox(kit, group, 0.44, 0.045, 0.30, 0xa87136, x, y + 0.255, z, -0.24);
    // Warm red-and-cream checkered picnic cloth peeking out + curved wicker carry handle
    regionInteriorAddBox(kit, group, 0.38, 0.024, 0.24, 0xfff6e5, x, y + 0.235, z, -0.24);
    regionInteriorAddBox(kit, group, 0.14, 0.028, 0.25, 0xe38472, x, y + 0.236, z, -0.24);
    regionInteriorAdd(group, new T.TorusGeometry(0.16, 0.014, 6, 14, Math.PI), kit.M(0x8c5a2b), x, y + 0.27, z, 0, -0.24);
    // Rolled turquoise-and-cream beach mat tucked beside hamper
    regionInteriorAddCyl(kit, group, 0.072, 0.072, 0.34, 12, 0x5ca8a8, x - 0.18, y + 0.072, z + 0.22, 0.18, Math.PI / 2 - 0.24);
    regionInteriorAddCyl(kit, group, 0.075, 0.075, 0.035, 12, 0xfcf2dc, x - 0.18, y + 0.072, z + 0.22, 0.18, Math.PI / 2 - 0.24);
  }

  function regionInteriorAddFramedArt(kit, group, kind, x, y, w, h, frameColor){
    var T = window.THREE;
    var brass = 0xd4a348;
    // Outer wood/gilt frame with stepped inner brass bead & crisp bespoke painting
    regionInteriorAddBox(kit, group, w, h, 0.045, frameColor, x, y, -2.93);
    regionInteriorAddBox(kit, group, w - 0.07, h - 0.07, 0.052, brass, x, y, -2.926);
    regionInteriorAddBox(kit, group, w - 0.12, h - 0.12, 0.056, regionInteriorFramedArtMat(kit, kind), x, y, -2.922);
    // Tiny hanging brass pin & cord above frame
    regionInteriorAdd(group, new T.SphereGeometry(0.018, 8, 6), kit.M(brass), x, y + h * 0.5 + 0.045, -2.92);
    [-1, 1].forEach(function(side){
      var cord = regionInteriorAddCyl(kit, group, 0.005, 0.005, 0.11, 6, 0x8b6e42, x + side * 0.045, y + h * 0.5 + 0.02, -2.93);
      cord.rotation.z = side * 0.82;
    });
  }

  function regionInteriorAddBistroTable(kit, group, x, y, z){
    var T = window.THREE;
    var walnut = 0x5c361d;
    var walnutMid = 0x7c4c2b;
    var brass = 0xd4a348;
    // Grounded stepped dark-walnut pedestal base strictly at y = 0
    regionInteriorAddCyl(kit, group, 0.21, 0.25, 0.045, 16, walnut, x, y + 0.0225, z);
    regionInteriorAddCyl(kit, group, 0.15, 0.18, 0.028, 16, brass, x, y + 0.056, z);
    regionInteriorAddCyl(kit, group, 0.052, 0.072, 0.52, 12, walnutMid, x, y + 0.32, z);
    regionInteriorAdd(group, new T.SphereGeometry(0.076, 12, 8), kit.M(walnut), x, y + 0.27, z);
    regionInteriorAddCyl(kit, group, 0.078, 0.078, 0.018, 12, brass, x, y + 0.27, z);
    regionInteriorAddCyl(kit, group, 0.19, 0.14, 0.045, 14, walnut, x, y + 0.57, z);
    // Beveled warm cream-oak round bistro tabletop (top at y = 0.635) + brass gallery rim
    regionInteriorAddCyl(kit, group, 0.39, 0.38, 0.045, 22, 0xf6efe4, x, y + 0.612, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.39, 0.011, 6, 22), kit.M(brass), x, y + 0.612, z, Math.PI / 2);
    // Warm coral-terracotta woven table runner with draped front/back ends
    regionInteriorAddBox(kit, group, 0.22, 0.010, 0.78, 0xd96b5a, x, y + 0.638, z);
    regionInteriorAddBox(kit, group, 0.18, 0.012, 0.78, 0xf7e7cf, x, y + 0.639, z);
    regionInteriorAddBox(kit, group, 0.14, 0.014, 0.78, 0xd96b5a, x, y + 0.640, z);
    [-0.392, 0.392].forEach(function(ez){
      regionInteriorAddBox(kit, group, 0.22, 0.11, 0.014, 0xd96b5a, x, y + 0.585, z + ez);
      regionInteriorAddBox(kit, group, 0.22, 0.02, 0.016, 0xf7e7cf, x, y + 0.535, z + ez);
    });
    // Sculpted brass-and-glass hurricane candle lantern resting solidly on tabletop
    var lx = x - 0.05, lz = z - 0.02;
    regionInteriorAddCyl(kit, group, 0.075, 0.088, 0.022, 14, brass, lx, y + 0.654, lz);
    regionInteriorAddCyl(kit, group, 0.036, 0.038, 0.105, 10, 0xfff8e6, lx, y + 0.715, lz);
    var flame = regionInteriorAdd(group, new T.SphereGeometry(0.019, 8, 6), kit.M(0xffde74, { emissive: 0x7c5210 }), lx, y + 0.782, lz);
    flame.scale.set(0.75, 1.45, 0.75);
    regionInteriorAddCyl(kit, group, 0.066, 0.066, 0.165, 12, kit.M(0xfff6e0, { transparent: true, opacity: 0.24 }), lx, y + 0.745, lz);
    regionInteriorAddCyl(kit, group, 0.044, 0.074, 0.030, 12, brass, lx, y + 0.840, lz);
    regionInteriorAdd(group, new T.TorusGeometry(0.020, 0.005, 6, 12), kit.M(0xe6bc58), lx, y + 0.872, lz);
    // Tiny terracotta bud vase with coastal coral flower beside lantern
    var vx = x + 0.14, vz = z + 0.10;
    regionInteriorAddCyl(kit, group, 0.024, 0.040, 0.095, 10, 0xc76d47, vx, y + 0.684, vz);
    regionInteriorAddCyl(kit, group, 0.006, 0.006, 0.08, 6, 0x458f5e, vx, y + 0.755, vz);
    regionInteriorAdd(group, new T.SphereGeometry(0.024, 8, 6), kit.M(0xffb48a), vx, y + 0.80, vz);
    regionInteriorAdd(group, new T.SphereGeometry(0.011, 6, 6), kit.M(0xffe178), vx, y + 0.812, vz + 0.016);
  }

  function regionInteriorAddStool(kit, group, x, y, z, seatH, woodColor, cushionColor, hasBack, yaw){
    var T = window.THREE;
    var sg = new T.Group();
    sg.position.set(x, y, z);
    if(yaw) sg.rotation.y = yaw;
    var brass = 0xd4a348;
    var sh = seatH || 0.44;
    var legH = sh - 0.08;
    // Four gently splayed turned wood legs with polished brass foot ferrules strictly at y = 0
    [[-0.125, -0.125], [0.125, -0.125], [-0.125, 0.125], [0.125, 0.125]].forEach(function(lg){
      var sx = lg[0] > 0 ? 1 : -1, sz = lg[1] > 0 ? 1 : -1;
      regionInteriorAddCyl(kit, sg, 0.018, 0.015, 0.042, 8, brass, lg[0] * 1.12, 0.021, lg[1] * 1.12);
      var leg = regionInteriorAddCyl(kit, sg, 0.022, 0.017, legH, 8, woodColor, lg[0] * 1.04, 0.04 + legH * 0.5, lg[1] * 1.04);
      leg.rotation.z = sx * 0.06;
      leg.rotation.x = -sz * 0.06;
    });
    // Brass circular footrest stretcher ring
    regionInteriorAdd(sg, new T.TorusGeometry(0.145, 0.010, 6, 16), kit.M(brass), 0, sh * 0.34, 0, Math.PI / 2);
    // Turned wooden seat pan & plush cushioned upholstered top with brass piping
    regionInteriorAddCyl(kit, sg, 0.175, 0.165, 0.034, 16, woodColor, 0, sh - 0.04, 0);
    regionInteriorAddCyl(kit, sg, 0.165, 0.172, 0.046, 16, cushionColor, 0, sh - 0.002, 0);
    var dome = regionInteriorAdd(sg, new T.SphereGeometry(0.162, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), kit.M(cushionColor), 0, sh + 0.014, 0);
    dome.scale.set(1, 0.24, 1);
    regionInteriorAdd(sg, new T.TorusGeometry(0.168, 0.008, 6, 16), kit.M(brass), 0, sh - 0.020, 0, Math.PI / 2);
    if(hasBack){
      // Cozy curved-look bentwood bistro backrest
      [-0.12, 0.12].forEach(function(bx){
        var stile = regionInteriorAddCyl(kit, sg, 0.015, 0.018, 0.34, 8, woodColor, bx, sh + 0.16, -0.155);
        stile.rotation.x = -0.10;
        regionInteriorAdd(sg, new T.SphereGeometry(0.020, 8, 6), kit.M(brass), bx, sh + 0.335, -0.172);
      });
      regionInteriorAddBox(kit, sg, 0.28, 0.055, 0.026, woodColor, 0, sh + 0.305, -0.168);
      regionInteriorAddBox(kit, sg, 0.24, 0.032, 0.022, woodColor, 0, sh + 0.175, -0.156);
      regionInteriorAdd(sg, new T.SphereGeometry(0.018, 8, 6), kit.M(brass), 0, sh + 0.305, -0.150);
    }
    group.add(sg);
  }

  function regionInteriorAddBistroSideboard(kit, group, x, y, z){
    var T = window.THREE;
    var walnutDark = 0x5c361d;
    var walnut = 0x875330;
    var walnutPanel = 0x6f4325;
    var brass = 0xd4a348;
    // Grounded stepped plinth + brass toe-kick strictly at y = 0
    regionInteriorAddBox(kit, group, 1.12, 0.07, 0.44, walnutDark, x, y + 0.035, z);
    regionInteriorAddBox(kit, group, 1.06, 0.022, 0.02, brass, x, y + 0.026, z + 0.222);
    // Main cabinet body
    regionInteriorAddBox(kit, group, 1.08, 0.78, 0.42, walnut, x, y + 0.46, z);
    // Twin paneled doors with inlaid brass borders & knobs
    [-0.25, 0.25].forEach(function(dx){
      regionInteriorAddBox(kit, group, 0.42, 0.62, 0.03, walnutPanel, x + dx, y + 0.46, z + 0.205);
      regionInteriorAddBox(kit, group, 0.44, 0.016, 0.036, brass, x + dx, y + 0.77, z + 0.208);
      regionInteriorAddBox(kit, group, 0.44, 0.016, 0.036, brass, x + dx, y + 0.15, z + 0.208);
    });
    [-0.07, 0.07].forEach(function(kx){
      regionInteriorAdd(group, new T.SphereGeometry(0.022, 8, 6), kit.M(brass), x + kx, y + 0.50, z + 0.235);
    });
    // Beveled overhanging walnut top (top at y = 0.90) + woven coral-cream runner
    regionInteriorAddBox(kit, group, 1.16, 0.055, 0.48, walnutDark, x, y + 0.875, z);
    regionInteriorAddBox(kit, group, 0.56, 0.012, 0.46, 0xd96b5a, x, y + 0.908, z);
    regionInteriorAddBox(kit, group, 0.46, 0.014, 0.46, 0xf7e7cf, x, y + 0.909, z);
    // Stacked cream-and-coral bistro soup bowls on left
    for(var bi = 0; bi < 3; bi++){
      regionInteriorAddCyl(kit, group, 0.105, 0.075, 0.048, 12, 0xfbf7f0, x - 0.34, y + 0.928 + bi * 0.046, z + 0.02);
      regionInteriorAddCyl(kit, group, 0.108, 0.108, 0.012, 12, 0xe26d5c, x - 0.34, y + 0.946 + bi * 0.046, z + 0.02);
    }
    // Warm glazed terracotta soup tureen with brass lid finial in center
    var tureen = regionInteriorAdd(group, new T.SphereGeometry(0.115, 12, 8), kit.M(0xe26d5c), x + 0.02, y + 0.99, z + 0.02);
    tureen.scale.set(1.08, 0.78, 1.08);
    regionInteriorAddCyl(kit, group, 0.085, 0.11, 0.025, 12, 0xfbf7f0, x + 0.02, y + 1.06, z + 0.02);
    regionInteriorAdd(group, new T.SphereGeometry(0.026, 8, 6), kit.M(brass), x + 0.02, y + 1.09, z + 0.02);
    // Cream ceramic crock holding two golden crusty baguettes on right
    regionInteriorAddCyl(kit, group, 0.095, 0.082, 0.18, 12, 0xf5ebd6, x + 0.35, y + 0.992, z);
    regionInteriorAddCyl(kit, group, 0.100, 0.100, 0.022, 12, 0x5c8f70, x + 0.35, y + 1.075, z);
    [[-0.028, 0.18], [0.028, -0.22]].forEach(function(bg){
      var loaf = regionInteriorAddCyl(kit, group, 0.028, 0.026, 0.24, 8, 0xe0a24c, x + 0.35 + bg[0], y + 1.12, z);
      loaf.rotation.z = bg[1];
      regionInteriorAdd(group, new T.SphereGeometry(0.028, 8, 6), kit.M(0xebba68), x + 0.35 + bg[0] * 1.4, y + 1.23, z);
    });
  }

  function regionInteriorAddEaselMenu(kit, group, x, y, z, yaw){
    var T = window.THREE;
    var eg = new T.Group();
    eg.position.set(x, y, z);
    if(yaw) eg.rotation.y = yaw;
    var oak = 0x7b4c2a;
    var darkOak = 0x5c361d;
    var brass = 0xd4a348;
    // Four grounded oak A-frame legs strictly touching y = 0
    [-0.16, 0.16].forEach(function(lx){
      var fLeg = regionInteriorAddBox(kit, eg, 0.032, 0.64, 0.032, oak, lx, 0.319, 0.055);
      fLeg.rotation.x = -0.15;
      var bLeg = regionInteriorAddBox(kit, eg, 0.032, 0.64, 0.032, darkOak, lx, 0.319, -0.055);
      bLeg.rotation.x = 0.15;
      regionInteriorAdd(eg, new T.SphereGeometry(0.020, 6, 6), kit.M(brass), lx, 0.634, 0);
    });
    // Top hinge header & brass stay bar
    regionInteriorAddBox(kit, eg, 0.38, 0.036, 0.055, darkOak, 0, 0.615, 0);
    regionInteriorAddBox(kit, eg, 0.34, 0.012, 0.012, brass, 0, 0.20, 0);
    // Angled dark-green specials chalkboard panel
    var frame = regionInteriorAddBox(kit, eg, 0.34, 0.42, 0.026, darkOak, 0, 0.37, 0.052);
    frame.rotation.x = -0.15;
    var face = regionInteriorAddBox(kit, eg, 0.30, 0.38, 0.030, regionInteriorEaselMenuMat(kit), 0, 0.37, 0.056);
    face.rotation.x = -0.15;
    group.add(eg);
  }

  function regionInteriorAddHotelOttoman(kit, group, x, y, z){
    var T = window.THREE;
    var mahog = 0x58311a;
    var brass = 0xd4a348;
    var brightBrass = 0xe8be58;
    // Four turned mahogany & brass feet strictly grounded at y = 0
    for(var i = 0; i < 4; i++){
      var a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      var fx = x + Math.cos(a) * 0.15, fz = z + Math.sin(a) * 0.15;
      regionInteriorAddCyl(kit, group, 0.022, 0.018, 0.04, 8, brass, fx, y + 0.02, fz);
      regionInteriorAddCyl(kit, group, 0.032, 0.024, 0.075, 10, mahog, fx, y + 0.075, fz);
    }
    // Carved circular mahogany & brass apron
    regionInteriorAddCyl(kit, group, 0.215, 0.21, 0.055, 18, mahog, x, y + 0.135, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.214, 0.010, 6, 18), kit.M(brass), x, y + 0.115, z, Math.PI / 2);
    // Plush diamond-tufted burgundy velvet pouf cushion with gold piping & center button
    regionInteriorAddCyl(kit, group, 0.21, 0.21, 0.21, 18, regionInteriorVelvetMat(kit), x, y + 0.265, z);
    var topCap = regionInteriorAdd(group, new T.SphereGeometry(0.208, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), kit.M(0x8e2d42), x, y + 0.355, z);
    topCap.scale.set(1, 0.26, 1);
    regionInteriorAdd(group, new T.TorusGeometry(0.210, 0.010, 6, 18), kit.M(brightBrass), x, y + 0.365, z, Math.PI / 2);
    regionInteriorAdd(group, new T.SphereGeometry(0.024, 8, 6), kit.M(brightBrass), x, y + 0.410, z);
  }

  function regionInteriorCoastalLeafGeo(len, maxW, lift, droop){
    var T = window.THREE;
    var segs = 6;
    var verts = [], uvs = [], idx = [];
    for(var i = 0; i <= segs; i++){
      var t = i / segs;
      var z = t * len;
      var y = lift * Math.sin(t * Math.PI * 0.72) - droop * t * t;
      var w = maxW * Math.sin(Math.pow(t, 0.72) * Math.PI);
      var fold = w * 0.16;
      var th = 0.0045 * (1 - 0.65 * t) + 0.0012;
      verts.push(
        -w, y - fold, z,
         0, y + th,   z,
         w, y - fold, z,
         0, y - th - fold * 0.35, z
      );
      uvs.push(0, t, 0.5, t, 1, t, 0.5, t);
      if(i > 0){
        var b = (i - 1) * 4, c = i * 4;
        idx.push(b + 0, c + 0, b + 1, b + 1, c + 0, c + 1);
        idx.push(b + 1, c + 1, b + 2, b + 2, c + 1, c + 2);
        idx.push(b + 2, c + 2, b + 3, b + 3, c + 2, c + 3);
        idx.push(b + 3, c + 3, b + 0, b + 0, c + 3, c + 0);
      }
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function regionInteriorAddCoastalPlant(kit, group, x, y, z, style){
    var T = window.THREE;
    var pg = new T.Group();
    pg.position.set(x, y, z);
    var isHotel = style === 'hotel';
    var isPharmacy = style === 'pharmacy';
    var brass = 0xd4a348;
    var brightBrass = 0xe6bc58;

    if(isHotel){
      // Grounded turned mahogany & brass plinth strictly at y = 0 + fluted navy-and-brass coastal hotel urn
      regionInteriorAddCyl(kit, pg, 0.140, 0.160, 0.030, 16, 0x58311a, 0, 0.015, 0);
      regionInteriorAdd(pg, new T.TorusGeometry(0.150, 0.009, 6, 18), kit.M(brass), 0, 0.030, 0, Math.PI / 2);
      var urnPts = [
        new T.Vector2(0.001, 0.028),
        new T.Vector2(0.114, 0.030),
        new T.Vector2(0.145, 0.090),
        new T.Vector2(0.170, 0.165),
        new T.Vector2(0.162, 0.228),
        new T.Vector2(0.148, 0.258),
        new T.Vector2(0.172, 0.278),
        new T.Vector2(0.164, 0.290),
        new T.Vector2(0.138, 0.284)
      ];
      regionInteriorAdd(pg, new T.LatheGeometry(urnPts, 18), kit.M(0x1b3d5a), 0, 0, 0);
      regionInteriorAdd(pg, new T.TorusGeometry(0.170, 0.009, 6, 18), kit.M(brightBrass), 0, 0.172, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.150, 0.008, 6, 18), kit.M(brass), 0, 0.254, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.170, 0.010, 6, 18), kit.M(brightBrass), 0, 0.284, 0, Math.PI / 2);
    } else if(isPharmacy){
      // Grounded brushed-brass saucer strictly at y = 0 + glazed seafoam-and-brass apothecary planter
      regionInteriorAddCyl(kit, pg, 0.156, 0.142, 0.022, 18, 0xb88935, 0, 0.011, 0);
      regionInteriorAdd(pg, new T.TorusGeometry(0.154, 0.008, 6, 18), kit.M(brightBrass), 0, 0.022, 0, Math.PI / 2);
      var pharmPotPts = [
        new T.Vector2(0.001, 0.020),
        new T.Vector2(0.108, 0.022),
        new T.Vector2(0.142, 0.082),
        new T.Vector2(0.162, 0.156),
        new T.Vector2(0.152, 0.214),
        new T.Vector2(0.140, 0.238),
        new T.Vector2(0.166, 0.256),
        new T.Vector2(0.158, 0.268),
        new T.Vector2(0.134, 0.262)
      ];
      regionInteriorAdd(pg, new T.LatheGeometry(pharmPotPts, 18), kit.M(0x5eb898), 0, 0, 0);
      regionInteriorAddCyl(kit, pg, 0.155, 0.160, 0.042, 18, 0xf5faf7, 0, 0.184, 0);
      regionInteriorAdd(pg, new T.TorusGeometry(0.162, 0.008, 6, 18), kit.M(brightBrass), 0, 0.162, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.154, 0.008, 6, 18), kit.M(brass), 0, 0.205, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.164, 0.009, 6, 18), kit.M(brightBrass), 0, 0.262, 0, Math.PI / 2);
      // Small brass apothecary side ring-handles & subtle front emerald seal medallion
      [-0.164, 0.164].forEach(function(hx){
        regionInteriorAdd(pg, new T.TorusGeometry(0.024, 0.006, 6, 12), kit.M(brightBrass), hx, 0.162, 0, 0, Math.PI / 2);
      });
      regionInteriorAddCyl(kit, pg, 0.028, 0.028, 0.012, 12, brass, 0, 0.184, 0.156, Math.PI / 2);
      regionInteriorAddCyl(kit, pg, 0.019, 0.019, 0.014, 12, 0x2f9676, 0, 0.184, 0.157, Math.PI / 2);
    } else {
      // Grounded Mediterranean terracotta saucer strictly at y = 0 + cream-and-coral glazed terracotta planter
      regionInteriorAddCyl(kit, pg, 0.168, 0.148, 0.026, 16, 0x9c4c2f, 0, 0.013, 0);
      var potPts = [
        new T.Vector2(0.001, 0.022),
        new T.Vector2(0.116, 0.024),
        new T.Vector2(0.148, 0.118),
        new T.Vector2(0.168, 0.232),
        new T.Vector2(0.180, 0.258),
        new T.Vector2(0.182, 0.288),
        new T.Vector2(0.154, 0.288)
      ];
      regionInteriorAdd(pg, new T.LatheGeometry(potPts, 18), kit.M(0xc96c46), 0, 0, 0);
      regionInteriorAddCyl(kit, pg, 0.169, 0.161, 0.046, 18, 0xf7ebd6, 0, 0.194, 0);
      regionInteriorAdd(pg, new T.TorusGeometry(0.170, 0.008, 6, 18), kit.M(0xd96b5a), 0, 0.217, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.162, 0.008, 6, 18), kit.M(0xd96b5a), 0, 0.171, 0, Math.PI / 2);
      regionInteriorAdd(pg, new T.TorusGeometry(0.178, 0.012, 6, 18), kit.M(0xda7e56), 0, 0.278, 0, Math.PI / 2);
    }

    // Dark potting soil & smooth cream coastal pebbles
    var soilY = isPharmacy ? 0.252 : 0.274;
    regionInteriorAddCyl(kit, pg, isPharmacy ? 0.136 : 0.146, isPharmacy ? 0.132 : 0.142, 0.024, 14, 0x4c3628, 0, soilY, 0);
    [[-0.072, 0.062, 0.020], [0.078, 0.052, 0.019], [0.018, 0.092, 0.018], [-0.052, -0.068, 0.020]].forEach(function(pb){
      var stone = regionInteriorAdd(pg, new T.SphereGeometry(pb[2], 8, 6), kit.M(0xded5c3), pb[0] * (isPharmacy ? 0.92 : 1), soilY + 0.016, pb[1] * (isPharmacy ? 0.92 : 1));
      stone.scale.set(1.25, 0.55, 1.0);
    });

    if(isPharmacy){
      // Three lush tiers of arched coastal-botanical & sage-rosemary foliage + upright flowering rosemary sprigs
      var pOuter = regionInteriorCoastalLeafGeo(0.245, 0.044, 0.165, 0.075);
      var pMid = regionInteriorCoastalLeafGeo(0.210, 0.040, 0.195, 0.055);
      var pInner = regionInteriorCoastalLeafGeo(0.155, 0.034, 0.215, 0.032);
      for(var pi = 0; pi < 8; pi++){
        var pa = (pi / 8) * Math.PI * 2 + 0.18;
        regionInteriorAdd(pg, pOuter, kit.M(pi % 2 ? 0x2f7d5d : 0x3b9470), Math.sin(pa) * 0.022, 0.258, Math.cos(pa) * 0.022, 0.12, pa, 0);
      }
      for(var pj = 0; pj < 6; pj++){
        var pa2 = (pj / 6) * Math.PI * 2 + 0.55;
        regionInteriorAdd(pg, pMid, kit.M(pj % 2 ? 0x47a67e : 0x57b88f), Math.sin(pa2) * 0.016, 0.266, Math.cos(pa2) * 0.016, -0.04, pa2, 0);
      }
      for(var pk = 0; pk < 4; pk++){
        var pa3 = (pk / 4) * Math.PI * 2 + 0.35;
        regionInteriorAdd(pg, pInner, kit.M(pk % 2 ? 0x62c498 : 0x70cfa4), Math.sin(pa3) * 0.010, 0.274, Math.cos(pa3) * 0.010, -0.16, pa3, 0);
      }
      // Sculpted upright coastal rosemary stems ringed with sage needle-leaf whorls & lavender-blue flower tips
      [
        [-0.058, 0.044, 0.175, 0.16, 0.14],
        [ 0.062, 0.038, 0.170, 0.14, -0.18],
        [-0.022, -0.052, 0.195, -0.14, 0.10],
        [ 0.042, -0.044, 0.185, -0.12, -0.14],
        [ 0.004, 0.008, 0.215, 0.04, -0.04]
      ].forEach(function(rm, ri){
        var rx = rm[0], rz = rm[1], rh = rm[2];
        var stem = regionInteriorAddCyl(kit, pg, 0.0055, 0.008, rh, 6, 0x6a4e36, rx, 0.262 + rh * 0.5, rz, rm[3], rm[4]);
        void stem;
        for(var wt = 0; wt < 3; wt++){
          var wy = 0.310 + wt * 0.046;
          var wr = 0.026 - wt * 0.003;
          var whorl = regionInteriorAdd(pg, new T.SphereGeometry(wr, 8, 6), kit.M(wt % 2 ? 0x3b8c68 : 0x52aa82), rx * (1 + wt * 0.16), wy, rz * (1 + wt * 0.16));
          whorl.scale.set(1.22, 0.72, 1.22);
        }
        // Dainty periwinkle-lavender rosemary blossom cluster at sprig tip
        var tipY = 0.262 + rh + 0.014;
        regionInteriorAdd(pg, new T.SphereGeometry(0.019, 8, 6), kit.M(ri % 2 ? 0x9b7ed6 : 0xab90e3), rx * 1.38, tipY, rz * 1.38);
        regionInteriorAdd(pg, new T.SphereGeometry(0.013, 6, 6), kit.M(0xc4b0f0), rx * 1.42, tipY + 0.018, rz * 1.42);
      });
      // Sunlit cream-and-gold chamomile blooms nestled into the front crown
      [[-0.072, 0.376, 0.068], [0.078, 0.368, 0.062], [0.008, 0.398, 0.074]].forEach(function(cb){
        var pet = regionInteriorAdd(pg, new T.SphereGeometry(0.022, 8, 6), kit.M(0xfffcf2), cb[0], cb[1], cb[2]);
        pet.scale.set(1.18, 0.72, 1.18);
        regionInteriorAdd(pg, new T.SphereGeometry(0.011, 6, 6), kit.M(0xf2c85b), cb[0], cb[1] + 0.010, cb[2] + 0.010);
      });
      group.add(pg);
      return;
    }

    // Three lush tiers of sculpted multi-segment arched coastal palm fronds
    var outerLeaf = regionInteriorCoastalLeafGeo(0.285, 0.052, 0.190, 0.085);
    var midLeaf = regionInteriorCoastalLeafGeo(0.245, 0.048, 0.235, 0.065);
    var innerLeaf = regionInteriorCoastalLeafGeo(0.185, 0.040, 0.260, 0.040);
    for(var i = 0; i < 7; i++){
      var a = (i / 7) * Math.PI * 2 + 0.22;
      regionInteriorAdd(pg, outerLeaf, kit.M(i % 2 ? 0x2f7e4d : 0x3b945c), Math.sin(a) * 0.024, 0.280, Math.cos(a) * 0.024, 0.10, a, 0);
    }
    for(var j = 0; j < 6; j++){
      var a2 = (j / 6) * Math.PI * 2 + 0.65;
      regionInteriorAdd(pg, midLeaf, kit.M(j % 2 ? 0x47a668 : 0x56b676), Math.sin(a2) * 0.018, 0.290, Math.cos(a2) * 0.018, -0.04, a2, 0);
    }
    for(var k = 0; k < 4; k++){
      var a3 = (k / 4) * Math.PI * 2 + 0.42;
      regionInteriorAdd(pg, innerLeaf, kit.M(k % 2 ? 0x62c480 : 0x6fcf8b), Math.sin(a3) * 0.010, 0.300, Math.cos(a3) * 0.010, -0.18, a3, 0);
    }

    // Venue-tailored coastal floral buds nestled inside the palm crown
    var buds = isHotel
      ? [[-0.062, 0.435, 0.052, 0xfff5dc, 0xe8be58], [0.064, 0.425, 0.044, 0xfff5dc, 0xe8be58], [0.006, 0.475, -0.036, 0xfaf0d2, 0xe8be58]]
      : [[-0.066, 0.430, 0.054, 0xf27d6b, 0xffe27a], [0.068, 0.420, 0.042, 0xffad82, 0xffe27a], [0.008, 0.470, -0.032, 0xf27d6b, 0xffe27a]];
    buds.forEach(function(bd){
      regionInteriorAddCyl(kit, pg, 0.004, 0.005, 0.14, 6, 0x2f7548, bd[0] * 0.70, 0.355, bd[2] * 0.70);
      var fl = regionInteriorAdd(pg, new T.SphereGeometry(0.026, 8, 6), kit.M(bd[3]), bd[0], bd[1], bd[2]);
      fl.scale.set(1.18, 0.78, 1.18);
      regionInteriorAdd(pg, new T.SphereGeometry(0.011, 6, 6), kit.M(bd[4]), bd[0], bd[1] + 0.012, bd[2] + 0.014);
    });

    group.add(pg);
  }

  function regionInteriorAddHerbPlanter(kit, group, x, y, z){
    var T = window.THREE;
    var oak = 0x8e603a;
    var sagePot = 0x5ca88e;
    var brass = 0xd4a348;
    // Grounded 4-leg oak plant stand strictly at y = 0
    for(var i = 0; i < 4; i++){
      var a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      regionInteriorAddCyl(kit, group, 0.018, 0.015, 0.24, 8, oak, x + Math.cos(a) * 0.155, y + 0.12, z + Math.sin(a) * 0.155);
    }
    regionInteriorAdd(group, new T.TorusGeometry(0.155, 0.012, 6, 16), kit.M(oak), x, y + 0.11, z, Math.PI / 2);
    regionInteriorAdd(group, new T.TorusGeometry(0.165, 0.010, 6, 16), kit.M(brass), x, y + 0.22, z, Math.PI / 2);
    // Glazed sage-ceramic herb planter pot + cream glazed rim & dark soil
    regionInteriorAddCyl(kit, group, 0.175, 0.125, 0.25, 14, sagePot, x, y + 0.225, z);
    regionInteriorAddCyl(kit, group, 0.19, 0.18, 0.045, 14, 0xf5f9f6, x, y + 0.35, z);
    regionInteriorAddCyl(kit, group, 0.155, 0.155, 0.02, 12, 0x4c3628, x, y + 0.365, z);
    // Lush multi-cluster rosemary & mint foliage billows (shaded base -> vibrant mid -> sunlit crown + arched sprigs)
    var herbLeaf = regionInteriorCoastalLeafGeo(0.165, 0.032, 0.115, 0.048);
    for(var hli = 0; hli < 6; hli++){
      var hla = (hli / 6) * Math.PI * 2 + 0.12;
      regionInteriorAdd(group, herbLeaf, kit.M(hli % 2 ? 0x2f7d56 : 0x3f966a), x + Math.sin(hla) * 0.04, y + 0.37, z + Math.cos(hla) * 0.04, 0.12, hla, 0);
    }
    for(var j = 0; j < 7; j++){
      var ang = (j / 7) * Math.PI * 2 + 0.3;
      var lf = regionInteriorAdd(group, new T.SphereGeometry(0.072 + (j % 2) * 0.012, 10, 8), kit.M(j % 2 ? 0x35885e : 0x4eab78), x + Math.cos(ang) * 0.105, y + 0.42 + (j % 2) * 0.018, z + Math.sin(ang) * 0.105);
      lf.scale.set(1.12, 0.80, 1.02);
    }
    for(var j2 = 0; j2 < 4; j2++){
      var ang2 = (j2 / 4) * Math.PI * 2 + 0.65;
      var lf2 = regionInteriorAdd(group, new T.SphereGeometry(0.068, 10, 8), kit.M(j2 % 2 ? 0x62c48a : 0x7ad496), x + Math.cos(ang2) * 0.056, y + 0.485 + (j2 % 2) * 0.015, z + Math.sin(ang2) * 0.056);
      lf2.scale.set(1.08, 0.78, 1.04);
    }
    var hTop = regionInteriorAdd(group, new T.SphereGeometry(0.064, 10, 8), kit.M(0x94e29a), x, y + 0.525, z);
    hTop.scale.set(1.12, 0.76, 1.08);
    // Fragrant purple lavender spikes + golden chamomile buds
    [[-0.06, -0.04], [0.07, -0.03], [-0.02, 0.06], [0.05, 0.05]].forEach(function(lv, li){
      regionInteriorAddCyl(kit, group, 0.007, 0.008, 0.18, 6, 0x3a8255, x + lv[0], y + 0.51, z + lv[1]);
      for(var b = 0; b < 3; b++){
        regionInteriorAdd(group, new T.SphereGeometry(0.022, 6, 6), kit.M(li % 2 ? 0x9b7ad4 : 0x8a67c4), x + lv[0], y + 0.54 + b * 0.032, z + lv[1]);
      }
    });
    [[-0.09, 0.06], [0.09, 0.06], [0.0, -0.09]].forEach(function(ch){
      regionInteriorAdd(group, new T.SphereGeometry(0.024, 8, 6), kit.M(0xfffcf2), x + ch[0], y + 0.49, z + ch[1]);
      regionInteriorAdd(group, new T.SphereGeometry(0.012, 6, 6), kit.M(0xf2c85b), x + ch[0], y + 0.502, z + ch[1] + 0.012);
    });
  }

  function regionInteriorAddHerbBasket(kit, group, x, y, z){
    var T = window.THREE;
    // Grounded woven honey-wicker round basket strictly at y = 0
    regionInteriorAddCyl(kit, group, 0.165, 0.125, 0.17, 14, 0xc9924e, x, y + 0.085, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.165, 0.016, 6, 14), kit.M(0xa67032), x, y + 0.172, z, Math.PI / 2);
    // Braided side handles
    [-0.165, 0.165].forEach(function(hx){
      regionInteriorAdd(group, new T.TorusGeometry(0.042, 0.010, 6, 10, Math.PI), kit.M(0xa67032), x + hx, y + 0.18, z, 0, Math.PI / 2);
    });
    // Tied apothecary linen cloth rolls & lavender-mint herbal sprigs tucked inside
    regionInteriorAddCyl(kit, group, 0.044, 0.044, 0.19, 10, 0xf7f2e4, x - 0.055, y + 0.175, z, 0.25, 0.35);
    regionInteriorAddCyl(kit, group, 0.047, 0.047, 0.018, 10, 0x4ca888, x - 0.055, y + 0.175, z, 0.25, 0.35);
    regionInteriorAddCyl(kit, group, 0.040, 0.040, 0.17, 10, 0xebf5ef, x + 0.055, y + 0.170, z + 0.02, -0.18, -0.32);
    regionInteriorAddCyl(kit, group, 0.043, 0.043, 0.018, 10, 0xd4a348, x + 0.055, y + 0.170, z + 0.02, -0.18, -0.32);
    [[-0.01, 0.22, 0x4ea56a], [0.03, 0.24, 0x9b7ad4], [-0.04, 0.24, 0x69c796], [0.01, 0.26, 0xf2c85b]].forEach(function(sp){
      regionInteriorAdd(group, new T.SphereGeometry(0.032, 8, 6), kit.M(sp[2]), x + sp[0], y + sp[1], z - 0.03);
    });
  }

  function regionInteriorAddHerbalistFootstool(kit, group, x, y, z, yaw){
    var T = window.THREE;
    var fg = new T.Group();
    fg.position.set(x, y, z);
    if(yaw) fg.rotation.y = yaw;
    var oak = 0x8e603a;
    var darkOak = 0x684324;
    var sage = 0x5eb898;
    var sageDeep = 0x489c7f;
    var cream = 0xf5faf7;
    var brass = 0xd4a348;
    // Four gently splayed turned oak legs with brass foot ferrules strictly grounded at y = 0
    [[-0.104, -0.072], [0.104, -0.072], [-0.104, 0.072], [0.104, 0.072]].forEach(function(lg){
      var sx = lg[0] > 0 ? 1 : -1, sz = lg[1] > 0 ? 1 : -1;
      regionInteriorAddCyl(kit, fg, 0.013, 0.011, 0.028, 8, brass, lg[0] * 1.07, 0.014, lg[1] * 1.07);
      var leg = regionInteriorAddCyl(kit, fg, 0.017, 0.013, 0.145, 8, oak, lg[0] * 1.02, 0.098, lg[1] * 1.02);
      leg.rotation.z = sx * 0.07;
      leg.rotation.x = -sz * 0.07;
    });
    // Mortised oak stretcher rails connecting the legs
    [-0.074, 0.074].forEach(function(rz){
      regionInteriorAddBox(kit, fg, 0.210, 0.018, 0.018, darkOak, 0, 0.072, rz);
    });
    [-0.104, 0.104].forEach(function(rx){
      regionInteriorAddBox(kit, fg, 0.018, 0.018, 0.146, darkOak, rx, 0.072, 0);
    });
    // Stepped beveled oak seat apron & overhanging rail (y = 0.155..0.194)
    regionInteriorAddBox(kit, fg, 0.246, 0.032, 0.184, darkOak, 0, 0.168, 0);
    regionInteriorAddBox(kit, fg, 0.270, 0.024, 0.204, oak, 0, 0.186, 0);
    // Plush sage-mint linen herbalist cushion with cream piping & brass corner upholstery tacks
    regionInteriorAddBox(kit, fg, 0.238, 0.032, 0.172, sage, 0, 0.208, 0);
    var pad = regionInteriorAdd(fg, new T.SphereGeometry(0.120, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), kit.M(sage), 0, 0.214, 0);
    pad.scale.set(1.0, 0.16, 0.70);
    regionInteriorAddBox(kit, fg, 0.246, 0.010, 0.180, cream, 0, 0.196, 0);
    regionInteriorAddBox(kit, fg, 0.212, 0.008, 0.142, sageDeep, 0, 0.223, 0);
    [[-0.104, -0.068], [0.104, -0.068], [-0.104, 0.068], [0.104, 0.068]].forEach(function(tk){
      regionInteriorAdd(fg, new T.SphereGeometry(0.008, 6, 6), kit.M(brass), tk[0], 0.199, tk[1]);
    });
    group.add(fg);
  }

  function regionInteriorAddWillowHerbBasket(kit, group, x, y, z, yaw){
    var T = window.THREE;
    var bg = new T.Group();
    bg.position.set(x, y, z);
    if(yaw) bg.rotation.y = yaw;
    var willow = 0xb88146;
    var darkWillow = 0x8c5a2b;
    var twine = 0xe8dcc0;
    // Grounded woven coastal-willow basket strictly at y = 0 with horizontal woven ribs & braided rim
    regionInteriorAddCyl(kit, bg, 0.122, 0.095, 0.146, 16, willow, 0, 0.073, 0);
    [0.032, 0.073, 0.112].forEach(function(ry, ri){
      var rad = 0.100 + ri * 0.008;
      regionInteriorAdd(bg, new T.TorusGeometry(rad, 0.0075, 6, 16), kit.M(darkWillow), 0, ry, 0, Math.PI / 2);
    });
    regionInteriorAdd(bg, new T.TorusGeometry(0.124, 0.013, 6, 16), kit.M(darkWillow), 0, 0.148, 0, Math.PI / 2);
    // Arched braided willow side handles
    [-0.124, 0.124].forEach(function(hx){
      regionInteriorAdd(bg, new T.TorusGeometry(0.032, 0.008, 6, 10, Math.PI), kit.M(darkWillow), hx, 0.154, 0, 0, Math.PI / 2);
    });
    // Folded cream linen apothecary cloth liner draped gently over front rim
    regionInteriorAddCyl(kit, bg, 0.114, 0.114, 0.022, 14, 0xf7f2e4, 0, 0.144, 0);
    regionInteriorAddBox(kit, bg, 0.100, 0.054, 0.014, 0xf7f2e4, 0, 0.122, 0.122);
    regionInteriorAddBox(kit, bg, 0.102, 0.012, 0.016, 0x5eb898, 0, 0.100, 0.122);
    // Lush mounded sage & mint base greenery brimming inside the basket
    [[-0.052, 0.172, 0.028, 0x3e9669], [0.054, 0.170, 0.022, 0x4ea87a], [0.0, 0.176, -0.044, 0x35825a], [-0.018, 0.180, 0.014, 0x58ba87]].forEach(function(gn){
      var lf = regionInteriorAdd(bg, new T.SphereGeometry(0.046, 8, 6), kit.M(gn[3]), gn[0], gn[1], gn[2]);
      lf.scale.set(1.15, 0.78, 1.05);
    });
    // Two twine-tied bundled lavender herb bouquets fanning gracefully out of the basket
    [[-0.042, -0.012, 0.24, -0.14], [0.046, -0.018, -0.22, -0.10]].forEach(function(bn, bi){
      var bdg = new T.Group();
      bdg.position.set(bn[0], 0.165, bn[1]);
      bdg.rotation.z = bn[2];
      bdg.rotation.x = bn[3];
      regionInteriorAddCyl(kit, bdg, 0.022, 0.022, 0.018, 8, twine, 0, 0.016, 0);
      [[-0.014, 0.008, 0.105], [0.0, -0.006, 0.122], [0.014, 0.006, 0.100]].forEach(function(st, si){
        regionInteriorAddCyl(kit, bdg, 0.0045, 0.0055, st[2], 6, 0x4c8258, st[0], st[2] * 0.5, st[1]);
        for(var f = 0; f < 3; f++){
          var flCol = (bi + si + f) % 2 ? 0x8c6cc4 : 0xa889de;
          regionInteriorAdd(bdg, new T.SphereGeometry(0.016 - f * 0.002, 7, 6), kit.M(flCol), st[0], st[2] * 0.62 + f * 0.020, st[1]);
        }
      });
      bg.add(bdg);
    });
    // Bright white-and-gold chamomile daisy sprigs nestled across the front & center
    [[-0.032, 0.224, 0.056], [0.026, 0.236, 0.052], [0.064, 0.214, 0.038], [-0.006, 0.250, 0.010]].forEach(function(ch){
      regionInteriorAddCyl(kit, bg, 0.004, 0.005, 0.068, 6, 0x438f62, ch[0] * 0.82, ch[1] - 0.034, ch[2] * 0.82);
      var bloom = regionInteriorAdd(bg, new T.SphereGeometry(0.020, 8, 6), kit.M(0xfffcf2), ch[0], ch[1], ch[2]);
      bloom.scale.set(1.18, 0.68, 1.18);
      regionInteriorAdd(bg, new T.SphereGeometry(0.010, 6, 6), kit.M(0xf2c85b), ch[0], ch[1] + 0.008, ch[2] + 0.008);
    });
    group.add(bg);
  }

  function regionInteriorAddTerracottaHerbPot(kit, group, x, y, z){
    var T = window.THREE;
    var tg = new T.Group();
    tg.position.set(x, y, z);
    // Grounded terracotta saucer strictly at y = 0 + coastal glazed-stripe terracotta herb pot
    regionInteriorAddCyl(kit, tg, 0.088, 0.076, 0.018, 14, 0x9c4c2f, 0, 0.009, 0);
    var tPotPts = [
      new T.Vector2(0.001, 0.016),
      new T.Vector2(0.058, 0.018),
      new T.Vector2(0.074, 0.072),
      new T.Vector2(0.084, 0.124),
      new T.Vector2(0.092, 0.138),
      new T.Vector2(0.090, 0.148),
      new T.Vector2(0.074, 0.146)
    ];
    regionInteriorAdd(tg, new T.LatheGeometry(tPotPts, 14), kit.M(0xc96c46), 0, 0, 0);
    regionInteriorAddCyl(kit, tg, 0.082, 0.078, 0.024, 14, 0xf5efe2, 0, 0.098, 0);
    regionInteriorAdd(tg, new T.TorusGeometry(0.082, 0.0045, 6, 14), kit.M(0x5eb898), 0, 0.110, 0, Math.PI / 2);
    regionInteriorAdd(tg, new T.TorusGeometry(0.089, 0.007, 6, 14), kit.M(0xd87f57), 0, 0.142, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, tg, 0.072, 0.070, 0.014, 12, 0x4c3628, 0, 0.140, 0);
    // Lush compact coastal herb leaves (arched botanical sprigs + lavender/chamomile accent)
    var smallLeaf = regionInteriorCoastalLeafGeo(0.095, 0.022, 0.076, 0.022);
    for(var i = 0; i < 6; i++){
      var a = (i / 6) * Math.PI * 2 + 0.30;
      regionInteriorAdd(tg, smallLeaf, kit.M(i % 2 ? 0x3b8f64 : 0x54b584), Math.sin(a) * 0.012, 0.144, Math.cos(a) * 0.012, 0.08, a, 0);
    }
    regionInteriorAdd(tg, new T.SphereGeometry(0.034, 8, 6), kit.M(0x63c492), 0, 0.184, 0);
    [[-0.022, 0.214, -0.010, 0x9b7ad4], [0.022, 0.222, -0.008, 0xa889de]].forEach(function(lv){
      regionInteriorAddCyl(kit, tg, 0.0035, 0.004, 0.055, 6, 0x3b8259, lv[0] * 0.8, 0.185, lv[2]);
      regionInteriorAdd(tg, new T.SphereGeometry(0.013, 6, 6), kit.M(lv[3]), lv[0], lv[1], lv[2]);
      regionInteriorAdd(tg, new T.SphereGeometry(0.010, 6, 6), kit.M(0xb89ee8), lv[0], lv[1] + 0.015, lv[2]);
    });
    regionInteriorAdd(tg, new T.SphereGeometry(0.015, 8, 6), kit.M(0xfffcf2), 0.006, 0.216, 0.024);
    regionInteriorAdd(tg, new T.SphereGeometry(0.008, 6, 6), kit.M(0xf2c85b), 0.006, 0.222, 0.032);
    group.add(tg);
  }

  function regionInteriorAddBistroHerbPot(kit, group, x, y, z){
    var T = window.THREE;
    var pg = new T.Group();
    pg.position.set(x, y, z);
    // Grounded Mediterranean terracotta saucer strictly at y = 0 + cream-and-coral glazed herb pot
    regionInteriorAddCyl(kit, pg, 0.094, 0.080, 0.018, 16, 0x9c4c2f, 0, 0.009, 0);
    var potPts = [
      new T.Vector2(0.001, 0.016),
      new T.Vector2(0.060, 0.018),
      new T.Vector2(0.076, 0.070),
      new T.Vector2(0.088, 0.122),
      new T.Vector2(0.095, 0.136),
      new T.Vector2(0.094, 0.146),
      new T.Vector2(0.076, 0.144)
    ];
    regionInteriorAdd(pg, new T.LatheGeometry(potPts, 16), kit.M(0xc96c46), 0, 0, 0);
    regionInteriorAddCyl(kit, pg, 0.086, 0.080, 0.026, 16, 0xf7ebd6, 0, 0.096, 0);
    regionInteriorAdd(pg, new T.TorusGeometry(0.086, 0.0045, 6, 16), kit.M(0xd96b5a), 0, 0.109, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.080, 0.0045, 6, 16), kit.M(0xd96b5a), 0, 0.083, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.092, 0.007, 6, 16), kit.M(0xda7e56), 0, 0.140, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, pg, 0.074, 0.072, 0.014, 12, 0x4c3628, 0, 0.138, 0);
    [[-0.036, 0.030], [0.040, 0.024], [0.004, -0.038]].forEach(function(pb){
      var stone = regionInteriorAdd(pg, new T.SphereGeometry(0.012, 6, 5), kit.M(0xded5c3), pb[0], 0.147, pb[1]);
      stone.scale.set(1.25, 0.55, 1.0);
    });
    // Lush sweet basil & rosemary herb foliage + warm coastal coral blossoms
    var outerLeaf = regionInteriorCoastalLeafGeo(0.102, 0.025, 0.082, 0.024);
    var innerLeaf = regionInteriorCoastalLeafGeo(0.076, 0.020, 0.090, 0.014);
    for(var i = 0; i < 6; i++){
      var a = (i / 6) * Math.PI * 2 + 0.25;
      regionInteriorAdd(pg, outerLeaf, kit.M(i % 2 ? 0x3b8f59 : 0x4ea56a), Math.sin(a) * 0.012, 0.142, Math.cos(a) * 0.012, 0.08, a, 0);
    }
    for(var j = 0; j < 4; j++){
      var a2 = (j / 4) * Math.PI * 2 + 0.60;
      regionInteriorAdd(pg, innerLeaf, kit.M(j % 2 ? 0x5eb87a : 0x6fcf8b), Math.sin(a2) * 0.008, 0.148, Math.cos(a2) * 0.008, -0.10, a2, 0);
    }
    regionInteriorAdd(pg, new T.SphereGeometry(0.032, 8, 6), kit.M(0x5eb87a), 0, 0.184, 0);
    [[-0.024, 0.214, 0.014, 0xf27d6b], [0.026, 0.220, -0.008, 0xffad82]].forEach(function(bd){
      regionInteriorAddCyl(kit, pg, 0.0035, 0.004, 0.052, 6, 0x387e52, bd[0] * 0.78, 0.186, bd[2] * 0.78);
      var fl = regionInteriorAdd(pg, new T.SphereGeometry(0.015, 7, 6), kit.M(bd[3]), bd[0], bd[1], bd[2]);
      fl.scale.set(1.16, 0.76, 1.16);
      regionInteriorAdd(pg, new T.SphereGeometry(0.007, 6, 5), kit.M(0xffe27a), bd[0], bd[1] + 0.008, bd[2] + 0.008);
    });
    group.add(pg);
  }

  function regionInteriorAddBistroOliveLemonTree(kit, group, x, y, z){
    var T = window.THREE;
    var pg = new T.Group();
    pg.position.set(x, y, z);
    var saucerClay = 0x9c4c2f;
    var terra = 0xc96c46;
    var terraShade = 0xb45b39;
    var terraHi = 0xdc825a;
    var cream = 0xf7ebd6;
    var coral = 0xd96b5a;
    var bark = 0x7c5333;
    var barkDark = 0x654125;
    var barkHi = 0x8f623d;
    // Grounded Mediterranean terracotta saucer strictly at y = 0 + turned rim bead
    regionInteriorAddCyl(kit, pg, 0.112, 0.098, 0.020, 20, saucerClay, 0, 0.010, 0);
    regionInteriorAdd(pg, new T.TorusGeometry(0.111, 0.0055, 6, 20), kit.M(0xb05939), 0, 0.020, 0, Math.PI / 2);
    // Graceful tapered ribbed glazed terracotta planter (harmonizes with BistroHerbPot & CoastalPlant)
    var potPts = [
      new T.Vector2(0.001, 0.018),
      new T.Vector2(0.078, 0.020),
      new T.Vector2(0.091, 0.052),
      new T.Vector2(0.102, 0.086),
      new T.Vector2(0.105, 0.114),
      new T.Vector2(0.105, 0.152),
      new T.Vector2(0.108, 0.170),
      new T.Vector2(0.118, 0.180),
      new T.Vector2(0.116, 0.190),
      new T.Vector2(0.094, 0.186)
    ];
    regionInteriorAdd(pg, new T.LatheGeometry(potPts, 20), kit.M(terra), 0, 0, 0);
    // Crisp sculpted vertical terracotta ribs proudly seated outside lower belly (zero z-fighting, minY >= 0.024)
    for(var rb = 0; rb < 12; rb++){
      var ra = (rb / 12) * Math.PI * 2;
      var rib = regionInteriorAddCyl(kit, pg, 0.006, 0.0045, 0.084, 6, rb % 2 ? terraHi : terraShade, Math.cos(ra) * 0.095, 0.068, Math.sin(ra) * 0.095);
      rib.rotation.z = -Math.cos(ra) * 0.26;
      rib.rotation.x = Math.sin(ra) * 0.26;
    }
    // Turned horizontal terracotta belly ribs + clean non-coplanar glazed cream-and-coral collar band
    regionInteriorAdd(pg, new T.TorusGeometry(0.095, 0.005, 6, 20), kit.M(terraShade), 0, 0.055, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.105, 0.005, 6, 20), kit.M(terraShade), 0, 0.088, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, pg, 0.1135, 0.1125, 0.036, 20, cream, 0, 0.133, 0);
    regionInteriorAdd(pg, new T.TorusGeometry(0.1135, 0.005, 6, 20), kit.M(coral), 0, 0.115, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.1145, 0.005, 6, 20), kit.M(coral), 0, 0.151, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.116, 0.0085, 7, 20), kit.M(terraHi), 0, 0.184, 0, Math.PI / 2);
    // Petite curved terracotta jar lug handles
    [-0.112, 0.112].forEach(function(hx){
      regionInteriorAdd(pg, new T.TorusGeometry(0.017, 0.005, 6, 12, Math.PI), kit.M(terraShade), hx, 0.134, 0, 0, 0, hx > 0 ? -Math.PI / 2 : Math.PI / 2);
    });
    // Dark potting soil & smooth cream coastal pebbles
    regionInteriorAddCyl(kit, pg, 0.093, 0.090, 0.014, 16, 0x4c3628, 0, 0.181, 0);
    [[-0.048, 0.036, 0.014], [0.052, 0.030, 0.013], [0.010, 0.056, 0.012], [-0.038, -0.044, 0.014]].forEach(function(pb){
      var stone = regionInteriorAdd(pg, new T.SphereGeometry(pb[2], 7, 5), kit.M(0xded5c3), pb[0], 0.190, pb[1]);
      stone.scale.set(1.25, 0.55, 1.0);
    });
    // Sculpted woody branching Mediterranean olive/lemon stem (open Y-fork cleanly readable below canopy)
    regionInteriorAddCyl(kit, pg, 0.020, 0.030, 0.024, 10, barkDark, 0, 0.189, 0);
    regionInteriorAddCyl(kit, pg, 0.016, 0.020, 0.056, 10, bark, -0.003, 0.221, 0.001, -0.04, 0.09);
    regionInteriorAdd(pg, new T.SphereGeometry(0.0165, 8, 6), kit.M(bark), -0.006, 0.246, 0.000);
    regionInteriorAddCyl(kit, pg, 0.0135, 0.016, 0.044, 10, barkHi, -0.007, 0.266, -0.001, 0.03, -0.05);
    regionInteriorAdd(pg, new T.SphereGeometry(0.015, 8, 6), kit.M(bark), -0.007, 0.282, -0.001);
    // Clearly visible sculpted woody Y-boughs fanning up into the foliage crown
    regionInteriorAddCyl(kit, pg, 0.0085, 0.0125, 0.078, 8, bark, -0.034, 0.304, 0.012, 0.20, 0.66);
    regionInteriorAddCyl(kit, pg, 0.0085, 0.0125, 0.076, 8, barkDark, 0.022, 0.304, 0.004, 0.08, -0.66);
    regionInteriorAddCyl(kit, pg, 0.008, 0.0115, 0.072, 8, barkHi, -0.006, 0.318, -0.014, -0.22, 0.06);
    regionInteriorAddCyl(kit, pg, 0.0055, 0.008, 0.046, 6, barkDark, -0.030, 0.280, 0.022, 0.26, 0.84);
    // Layered rounded coastal olive & lemon foliage canopy (3 lush tiers + arched botanical leaves)
    var lowCanopy = [
      [-0.084, 0.332,  0.030, 0.048, 0x3b7d49],
      [-0.034, 0.326,  0.068, 0.046, 0x4e9354],
      [ 0.034, 0.328,  0.060, 0.045, 0x3f844c],
      [ 0.074, 0.334,  0.006, 0.047, 0x357344],
      [ 0.030, 0.334, -0.062, 0.048, 0x397847],
      [-0.054, 0.334, -0.058, 0.050, 0x45884e]
    ];
    lowCanopy.forEach(function(lf){
      var puff = regionInteriorAdd(pg, new T.SphereGeometry(lf[3], 10, 8), kit.M(lf[4]), lf[0], lf[1], lf[2]);
      puff.scale.set(1.14, 0.80, 1.06);
    });
    var midCanopy = [
      [-0.078, 0.368, -0.006, 0.050, 0x569958],
      [-0.026, 0.370,  0.054, 0.049, 0x6ba163],
      [ 0.044, 0.368,  0.038, 0.047, 0x519455],
      [ 0.060, 0.374, -0.030, 0.046, 0x4a8c52],
      [-0.008, 0.374, -0.060, 0.048, 0x5b9b5c],
      [-0.008, 0.364,  0.000, 0.058, 0x4e9154]
    ];
    midCanopy.forEach(function(lf){
      var puff = regionInteriorAdd(pg, new T.SphereGeometry(lf[3], 10, 8), kit.M(lf[4]), lf[0], lf[1], lf[2]);
      puff.scale.set(1.12, 0.86, 1.04);
    });
    var crownCanopy = [
      [-0.044, 0.404,  0.016, 0.044, 0x6ea866],
      [ 0.024, 0.402,  0.020, 0.042, 0x7cb372],
      [-0.006, 0.406, -0.030, 0.044, 0x609f5e],
      [-0.012, 0.422, -0.002, 0.042, 0x82bd76]
    ];
    crownCanopy.forEach(function(lf){
      var puff = regionInteriorAdd(pg, new T.SphereGeometry(lf[3], 10, 8), kit.M(lf[4]), lf[0], lf[1], lf[2]);
      puff.scale.set(1.14, 0.78, 1.04);
    });
    // Delicate arched botanical olive/citrus leaves peeking cleanly from canopy perimeter
    var treeLeaf = regionInteriorCoastalLeafGeo(0.072, 0.017, 0.034, 0.015);
    for(var li = 0; li < 9; li++){
      var la = (li / 9) * Math.PI * 2 + 0.24;
      var ly = 0.334 + (li % 3) * 0.028;
      var lr = 0.058 - (li % 3) * 0.007;
      regionInteriorAdd(pg, treeLeaf, kit.M(li % 2 ? 0x539858 : 0x76ab6b), -0.008 + Math.sin(la) * lr, ly, Math.cos(la) * lr, 0.10, la, 0);
    }
    // Plump golden Meyer lemons cleanly seated proud of foliage crown (crisp smooth lemon silhouette)
    [
      [-0.098, 0.340,  0.076,  0.26,  0.16, 0xf7cf3c],
      [-0.028, 0.334,  0.112, -0.18,  0.18, 0xffdc52],
      [ 0.056, 0.342,  0.098, -0.26, -0.12, 0xf5ca38],
      [-0.068, 0.390,  0.076,  0.22,  0.14, 0xffdc52],
      [ 0.022, 0.388,  0.084, -0.20,  0.14, 0xf7cf3c],
      [-0.012, 0.428,  0.054,  0.14,  0.12, 0xffe060],
      [ 0.088, 0.368,  0.036, -0.30, -0.10, 0xf5ca38]
    ].forEach(function(lm){
      var lg = new T.Group();
      lg.position.set(lm[0], lm[1], lm[2]);
      lg.rotation.z = lm[3];
      lg.rotation.x = lm[4];
      var fruit = regionInteriorAdd(lg, new T.SphereGeometry(0.0195, 10, 8), kit.M(lm[5]), 0, 0, 0);
      fruit.scale.set(0.82, 1.18, 0.82);
      regionInteriorAdd(lg, new T.SphereGeometry(0.006, 6, 5), kit.M(0xedc02b), 0, -0.022, 0);
      regionInteriorAdd(lg, new T.SphereGeometry(0.0055, 6, 5), kit.M(0x2f683a), 0, 0.020, 0);
      pg.add(lg);
    });
    // Glossy Mediterranean olive pairs (sunlit olive-jade & ripe dark Kalamata plum-olive)
    [
      [-0.068, 0.360,  0.098,  0.28, 0x8ea33b],
      [-0.054, 0.350,  0.106, -0.22, 0x4b384c],
      [ 0.018, 0.360,  0.108,  0.24, 0x8ea33b],
      [ 0.034, 0.350,  0.104, -0.26, 0x4b384c],
      [-0.102, 0.378,  0.040,  0.28, 0x7e9634],
      [ 0.066, 0.392,  0.058, -0.24, 0x4b384c]
    ].forEach(function(ol){
      var olive = regionInteriorAdd(pg, new T.SphereGeometry(0.012, 8, 6), kit.M(ol[4]), ol[0], ol[1], ol[2], 0.14, 0, ol[3]);
      olive.scale.set(0.78, 1.20, 0.78);
    });
    // Dainty creamy-white Mediterranean citrus blossoms with golden centers
    [
      [-0.006, 0.368, 0.110],
      [-0.080, 0.404, 0.056],
      [ 0.050, 0.410, 0.058],
      [-0.044, 0.432, 0.040]
    ].forEach(function(bl){
      var pet = regionInteriorAdd(pg, new T.SphereGeometry(0.012, 7, 5), kit.M(0xfffbf0), bl[0], bl[1], bl[2]);
      pet.scale.set(1.18, 0.72, 1.18);
      regionInteriorAdd(pg, new T.SphereGeometry(0.0058, 6, 5), kit.M(0xf5c842), bl[0], bl[1] + 0.005, bl[2] + 0.006);
    });
    group.add(pg);
  }

  function regionInteriorAddHotelSteamerTrunk(kit, group, x, y, z, yaw){
    var T = window.THREE;
    var tg = new T.Group();
    tg.position.set(x, y, z);
    if(yaw) tg.rotation.y = yaw;
    var leather = 0x7d4628;
    var leatherHi = 0x8d5230;
    var darkLeather = 0x4f2b18;
    var mahog = 0x58311a;
    var brass = 0xd4a348;
    var brightBrass = 0xe8be58;
    // Four low mahogany & brass corner glide feet strictly grounded at y = 0
    [[-0.144, -0.088], [0.144, -0.088], [-0.144, 0.088], [0.144, 0.088]].forEach(function(ft){
      regionInteriorAddBox(kit, tg, 0.040, 0.018, 0.040, mahog, ft[0], 0.009, ft[1]);
      regionInteriorAddBox(kit, tg, 0.042, 0.006, 0.042, brass, ft[0], 0.017, ft[1]);
    });
    // Vintage chestnut-leather steamer trunk body & flat-topped stepped lid (top flush at y = 0.178)
    regionInteriorAddBox(kit, tg, 0.340, 0.136, 0.220, leather, 0, 0.086, 0);
    regionInteriorAddBox(kit, tg, 0.346, 0.012, 0.226, darkLeather, 0, 0.128, 0);
    regionInteriorAddBox(kit, tg, 0.336, 0.024, 0.216, leatherHi, 0, 0.166, 0);
    // Horizontal mahogany wood steamer battens across front & back faces
    [0.058, 0.154].forEach(function(by){
      regionInteriorAddBox(kit, tg, 0.344, 0.014, 0.226, mahog, 0, by, 0);
    });
    // Twin vertical saddle-leather cinch straps wrapping over trunk + gleaming brass front belt buckles
    [-0.096, 0.096].forEach(function(sx){
      regionInteriorAddBox(kit, tg, 0.028, 0.162, 0.232, darkLeather, sx, 0.099, 0);
      regionInteriorAddBox(kit, tg, 0.032, 0.008, 0.234, brass, sx, 0.180, 0);
      regionInteriorAddBox(kit, tg, 0.036, 0.028, 0.014, brightBrass, sx, 0.128, 0.118);
      regionInteriorAddBox(kit, tg, 0.016, 0.014, 0.018, darkLeather, sx, 0.128, 0.119);
    });
    // Central brass trunk clasp & lock escutcheon plate
    regionInteriorAddBox(kit, tg, 0.044, 0.042, 0.014, brass, 0, 0.126, 0.114);
    regionInteriorAddBox(kit, tg, 0.028, 0.024, 0.016, brightBrass, 0, 0.132, 0.116);
    regionInteriorAddBox(kit, tg, 0.008, 0.014, 0.018, 0x2b170c, 0, 0.120, 0.117);
    // Eight brass-studded steamer corner protectors (4 bottom + 4 top corners)
    [-0.160, 0.160].forEach(function(cx){
      [-0.100, 0.100].forEach(function(cz){
        regionInteriorAddBox(kit, tg, 0.034, 0.030, 0.034, brass, cx, 0.033, cz);
        regionInteriorAddBox(kit, tg, 0.034, 0.028, 0.034, brightBrass, cx, 0.164, cz);
      });
    });
    // Side brass bail carry handles
    [-0.175, 0.175].forEach(function(hx){
      regionInteriorAdd(tg, new T.TorusGeometry(0.026, 0.0055, 6, 10, Math.PI), kit.M(brightBrass), hx, 0.096, 0, Math.PI, Math.PI / 2);
    });
    // Charming tilted coastal vintage harbor travel sticker on front panel
    var stk = regionInteriorAddBox(kit, tg, 0.056, 0.040, 0.008, 0xf7ebd6, -0.036, 0.076, 0.114);
    stk.rotation.z = 0.14;
    var stkSea = regionInteriorAddBox(kit, tg, 0.046, 0.014, 0.010, 0x1b3d5a, -0.036, 0.069, 0.115);
    stkSea.rotation.z = 0.14;
    var stkSun = regionInteriorAdd(tg, new T.SphereGeometry(0.008, 6, 5), kit.M(0xe26d5c), -0.032, 0.084, 0.118);
    void stkSun;
    // Brass-trimmed ivory-and-burgundy leather hatbox seated solidly & flush atop the steamer trunk (y = 0.178)
    var hx = -0.024, hz = -0.004;
    regionInteriorAddCyl(kit, tg, 0.082, 0.082, 0.092, 18, 0xf5ebd6, hx, 0.224, hz);
    regionInteriorAdd(tg, new T.TorusGeometry(0.083, 0.0055, 6, 18), kit.M(brass), hx, 0.183, hz, Math.PI / 2);
    regionInteriorAddCyl(kit, tg, 0.088, 0.088, 0.026, 18, 0x8e2d42, hx, 0.278, hz);
    regionInteriorAdd(tg, new T.TorusGeometry(0.089, 0.0055, 6, 18), kit.M(brightBrass), hx, 0.266, hz, Math.PI / 2);
    regionInteriorAdd(tg, new T.TorusGeometry(0.088, 0.0055, 6, 18), kit.M(brightBrass), hx, 0.291, hz, Math.PI / 2);
    // Hatbox leather buckle strap, front brass clasp & top brass handle loop
    regionInteriorAddBox(kit, tg, 0.018, 0.114, 0.174, darkLeather, hx, 0.236, hz);
    regionInteriorAddBox(kit, tg, 0.024, 0.016, 0.012, brightBrass, hx, 0.266, hz + 0.088);
    regionInteriorAdd(tg, new T.TorusGeometry(0.020, 0.0045, 6, 10, Math.PI), kit.M(brightBrass), hx, 0.293, hz);
    group.add(tg);
  }

  function regionInteriorAddHotelParlorPalm(kit, group, x, y, z){
    var T = window.THREE;
    var pg = new T.Group();
    pg.position.set(x, y, z);
    var brass = 0xd4a348;
    var brightBrass = 0xe6bc58;
    // Grounded turned mahogany & brass foot plinth strictly at y = 0 + fluted navy-and-brass ceramic pot
    regionInteriorAddCyl(kit, pg, 0.070, 0.080, 0.018, 16, 0x58311a, 0, 0.009, 0);
    regionInteriorAdd(pg, new T.TorusGeometry(0.075, 0.005, 6, 16), kit.M(brass), 0, 0.018, 0, Math.PI / 2);
    var potPts = [
      new T.Vector2(0.001, 0.016),
      new T.Vector2(0.056, 0.018),
      new T.Vector2(0.074, 0.056),
      new T.Vector2(0.086, 0.096),
      new T.Vector2(0.082, 0.126),
      new T.Vector2(0.076, 0.138),
      new T.Vector2(0.088, 0.148),
      new T.Vector2(0.084, 0.154),
      new T.Vector2(0.070, 0.150)
    ];
    regionInteriorAdd(pg, new T.LatheGeometry(potPts, 18), kit.M(0x1b3d5a), 0, 0, 0);
    regionInteriorAdd(pg, new T.TorusGeometry(0.086, 0.005, 6, 18), kit.M(brightBrass), 0, 0.096, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.078, 0.0045, 6, 18), kit.M(brass), 0, 0.136, 0, Math.PI / 2);
    regionInteriorAdd(pg, new T.TorusGeometry(0.087, 0.0055, 6, 18), kit.M(brightBrass), 0, 0.150, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, pg, 0.068, 0.066, 0.014, 14, 0x4c3628, 0, 0.144, 0);
    [[-0.032, 0.028], [0.036, 0.022], [0.004, -0.034]].forEach(function(pb){
      var stone = regionInteriorAdd(pg, new T.SphereGeometry(0.011, 6, 5), kit.M(0xded5c3), pb[0], 0.153, pb[1]);
      stone.scale.set(1.25, 0.55, 1.0);
    });
    // Graceful arched multi-tier coastal parlor palm fronds
    var outerFrond = regionInteriorCoastalLeafGeo(0.126, 0.024, 0.092, 0.038);
    var innerFrond = regionInteriorCoastalLeafGeo(0.100, 0.020, 0.108, 0.022);
    var shootFrond = regionInteriorCoastalLeafGeo(0.072, 0.015, 0.110, 0.010);
    for(var i = 0; i < 7; i++){
      var a = (i / 7) * Math.PI * 2 + 0.20;
      regionInteriorAdd(pg, outerFrond, kit.M(i % 2 ? 0x2f7e4d : 0x3b945c), Math.sin(a) * 0.012, 0.148, Math.cos(a) * 0.012, 0.08, a, 0);
    }
    for(var j = 0; j < 5; j++){
      var a2 = (j / 5) * Math.PI * 2 + 0.55;
      regionInteriorAdd(pg, innerFrond, kit.M(j % 2 ? 0x47a668 : 0x56b676), Math.sin(a2) * 0.008, 0.154, Math.cos(a2) * 0.008, -0.06, a2, 0);
    }
    for(var k = 0; k < 3; k++){
      var a3 = (k / 3) * Math.PI * 2 + 0.35;
      regionInteriorAdd(pg, shootFrond, kit.M(0x6fcf8b), Math.sin(a3) * 0.005, 0.158, Math.cos(a3) * 0.005, -0.18, a3, 0);
    }
    [[-0.026, 0.220, 0.024], [0.028, 0.214, 0.020]].forEach(function(bd){
      var fl = regionInteriorAdd(pg, new T.SphereGeometry(0.013, 7, 5), kit.M(0xfff5dc), bd[0], bd[1], bd[2]);
      fl.scale.set(1.18, 0.78, 1.18);
      regionInteriorAdd(pg, new T.SphereGeometry(0.006, 6, 5), kit.M(brightBrass), bd[0], bd[1] + 0.006, bd[2] + 0.007);
    });
    group.add(pg);
  }

  function regionInteriorAddApothecaryHerbCrate(kit, group, x, y, z, yaw){
    var T = window.THREE;
    var cg = new T.Group();
    cg.position.set(x, y, z);
    if(yaw) cg.rotation.y = yaw;
    var oak = 0x8e603a;
    var honeyOak = 0xa6774d;
    var darkOak = 0x684324;
    var brass = 0xd4a348;
    // Woven coastal seagrass & mint-trimmed corner mat strictly grounded at y = 0
    var matBase = regionInteriorAddCyl(kit, cg, 0.154, 0.158, 0.010, 20, 0xd6b67c, 0, 0.005, 0);
    matBase.scale.set(1.14, 1, 0.88);
    var matRing = regionInteriorAddCyl(kit, cg, 0.134, 0.134, 0.011, 20, 0x5eb898, 0, 0.006, 0);
    matRing.scale.set(1.14, 1, 0.88);
    var matInner = regionInteriorAddCyl(kit, cg, 0.112, 0.112, 0.012, 20, 0xf5faf7, 0, 0.0065, 0);
    matInner.scale.set(1.14, 1, 0.88);
    var matPiping = regionInteriorAdd(cg, new T.TorusGeometry(0.155, 0.0065, 6, 20), kit.M(0xb38c4c), 0, 0.0065, 0, Math.PI / 2);
    matPiping.scale.set(1.14, 0.88, 1);
    // Small slatted honey-oak apothecary herb-jar crate seated solidly & flush atop the woven mat (y = 0.012)
    regionInteriorAddBox(kit, cg, 0.244, 0.014, 0.188, oak, 0, 0.019, 0);
    [[-0.114, -0.085], [0.114, -0.085], [-0.114, 0.085], [0.114, 0.085]].forEach(function(cp){
      regionInteriorAddBox(kit, cg, 0.022, 0.118, 0.022, darkOak, cp[0], 0.071, cp[1]);
    });
    // Horizontal side & front oak crate slats with miniature brass corner nail studs
    [0.046, 0.100].forEach(function(sy, si){
      var sCol = si === 0 ? oak : honeyOak;
      [-0.089, 0.089].forEach(function(sz){
        regionInteriorAddBox(kit, cg, 0.246, 0.036, 0.014, sCol, 0, sy, sz);
        [-0.108, 0.108].forEach(function(nx){
          regionInteriorAdd(cg, new T.SphereGeometry(0.0055, 6, 5), kit.M(brass), nx, sy, sz + (sz > 0 ? 0.008 : -0.008));
        });
      });
      [-0.118, 0.118].forEach(function(sx){
        regionInteriorAddBox(kit, cg, 0.014, 0.036, 0.190, sCol, sx, sy, 0);
      });
    });
    // Internal oak bottle divider cross slats
    regionInteriorAddBox(kit, cg, 0.222, 0.056, 0.008, darkOak, 0, 0.058, 0);
    regionInteriorAddBox(kit, cg, 0.008, 0.056, 0.168, darkOak, 0, 0.058, 0);
    // Crisp front cream-and-emerald apothecary crate badge plaque
    regionInteriorAddBox(kit, cg, 0.094, 0.042, 0.010, 0xf8fcf9, 0, 0.076, 0.099);
    regionInteriorAddBox(kit, cg, 0.010, 0.026, 0.012, 0x2f9676, 0, 0.076, 0.100);
    regionInteriorAddBox(kit, cg, 0.026, 0.010, 0.012, 0x2f9676, 0, 0.076, 0.100);
    // Four sculpted glazed apothecary herb jars seated cleanly inside each oak divider bay (y = 0.026)
    var jars = [
      { jx: -0.056, jz: -0.043, h: 0.184, col: 0x4ca888, band: 0xf5faf7, lid: 'cork' },
      { jx:  0.056, jz: -0.043, h: 0.194, col: 0x9274cc, band: 0xfaf6ec, lid: 'cork' },
      { jx: -0.056, jz:  0.043, h: 0.156, col: 0xd98c46, band: 0xfaf6ec, lid: 'cork' },
      { jx:  0.056, jz:  0.043, h: 0.166, col: 0xf4f0e4, band: 0x36a382, lid: 'brass' }
    ];
    jars.forEach(function(jr){
      var s = jr.h / 0.180;
      var jPts = [
        new T.Vector2(0.001, 0),
        new T.Vector2(0.030, 0),
        new T.Vector2(0.034, 0.092 * s),
        new T.Vector2(0.022, 0.130 * s),
        new T.Vector2(0.019, 0.162 * s),
        new T.Vector2(0.024, 0.172 * s),
        new T.Vector2(0.014, 0.172 * s)
      ];
      regionInteriorAdd(cg, new T.LatheGeometry(jPts, 12), kit.M(jr.col), jr.jx, 0.026, jr.jz);
      regionInteriorAddCyl(kit, cg, 0.0345, 0.0345, 0.026 * s, 12, jr.band, jr.jx, 0.026 + 0.068 * s, jr.jz);
      if(jr.lid === 'brass'){
        regionInteriorAddCyl(kit, cg, 0.022, 0.022, 0.016, 10, brass, jr.jx, 0.026 + 0.178 * s, jr.jz);
        regionInteriorAdd(cg, new T.SphereGeometry(0.009, 7, 6), kit.M(0xe8be58), jr.jx, 0.026 + 0.194 * s, jr.jz);
      } else {
        regionInteriorAddCyl(kit, cg, 0.015, 0.012, 0.024, 8, 0xb88b5a, jr.jx, 0.026 + 0.180 * s, jr.jz);
      }
      regionInteriorAddBox(kit, cg, 0.030, 0.024, 0.007, 0xfaf6ec, jr.jx, 0.026 + 0.104 * s, jr.jz + 0.030);
    });
    // Dainty fresh mint & sunlit chamomile sprig tucked neatly inside the crate center
    regionInteriorAddCyl(kit, cg, 0.0035, 0.004, 0.092, 6, 0x3b8f64, 0.004, 0.146, 0.002, 0.14, -0.10);
    [[-0.010, 0.168, 0.012], [0.016, 0.174, -0.004], [0.004, 0.194, 0.010]].forEach(function(lf, li){
      var sp = regionInteriorAdd(cg, new T.SphereGeometry(0.015, 7, 5), kit.M(li % 2 ? 0x4ea87a : 0x63c492), lf[0], lf[1], lf[2]);
      sp.scale.set(1.20, 0.72, 1.0);
    });
    regionInteriorAdd(cg, new T.SphereGeometry(0.014, 7, 5), kit.M(0xfffcf2), 0.004, 0.206, 0.014);
    regionInteriorAdd(cg, new T.SphereGeometry(0.007, 6, 5), kit.M(0xf2c85b), 0.004, 0.212, 0.021);
    group.add(cg);
  }

  function regionInteriorAddHotelFloorLamp(kit, group, x, y, z){
    var T = window.THREE;
    var brass = 0xd4a348;
    var brightBrass = 0xe6bc5c;
    // Weighted mahogany & stepped brass plinth strictly grounded at y = 0
    regionInteriorAddCyl(kit, group, 0.21, 0.23, 0.032, 16, 0x58311a, x, y + 0.016, z);
    regionInteriorAddCyl(kit, group, 0.16, 0.19, 0.036, 16, brass, x, y + 0.048, z);
    regionInteriorAddCyl(kit, group, 0.075, 0.125, 0.042, 14, brightBrass, x, y + 0.084, z);
    // Slender turned brass column with decorative spherical knops
    regionInteriorAddCyl(kit, group, 0.024, 0.028, 1.44, 10, brass, x, y + 0.81, z);
    [0.46, 1.02, 1.42].forEach(function(ky){
      regionInteriorAdd(group, new T.SphereGeometry(0.046, 10, 8), kit.M(brightBrass), x, y + ky, z);
    });
    // Empire pleated warm-ivory silk lampshade with brass rims & acorn finial
    regionInteriorAddCyl(kit, group, 0.16, 0.28, 0.36, 18, kit.M(0xfff3d4, { emissive: 0x382b14 }), x, y + 1.68, z);
    regionInteriorAddCyl(kit, group, 0.168, 0.168, 0.024, 18, brass, x, y + 1.86, z);
    regionInteriorAddCyl(kit, group, 0.286, 0.286, 0.026, 18, brass, x, y + 1.50, z);
    regionInteriorAdd(group, new T.SphereGeometry(0.068, 10, 8), kit.M(0xfff6c4, { emissive: 0x5a481e }), x, y + 1.53, z);
    regionInteriorAddCyl(kit, group, 0.022, 0.045, 0.055, 10, brass, x, y + 1.895, z);
    regionInteriorAdd(group, new T.SphereGeometry(0.032, 8, 6), kit.M(brightBrass), x, y + 1.945, z);
  }

  function regionInteriorAddHotelBench(kit, group, x, y, z){
    var T = window.THREE;
    var mahog = 0x58311a;
    var brass = 0xd4a348;
    var brightBrass = 0xe6bc58;
    var velvet = 0x8e2d42;
    var velvetHi = 0x9e364c;
    var velvetMat = regionInteriorVelvetMat(kit);
    // Four tapered mahogany legs with polished brass foot ferrules strictly grounded at y = 0
    [[-0.54, -0.19], [0.54, -0.19], [-0.54, 0.19], [0.54, 0.19]].forEach(function(lg){
      regionInteriorAddCyl(kit, group, 0.026, 0.022, 0.06, 10, brass, x + lg[0], y + 0.03, z + lg[1]);
      regionInteriorAddCyl(kit, group, 0.038, 0.026, 0.32, 10, mahog, x + lg[0], y + 0.22, z + lg[1]);
      regionInteriorAddCyl(kit, group, 0.043, 0.043, 0.022, 10, brass, x + lg[0], y + 0.355, z + lg[1]);
    });
    // Carved mahogany apron rail with lower brass bead trim
    regionInteriorAddBox(kit, group, 1.22, 0.09, 0.48, mahog, x, y + 0.405, z);
    regionInteriorAddBox(kit, group, 1.24, 0.022, 0.50, brass, x, y + 0.365, z);
    // Plush diamond-tufted burgundy velvet seat cushion with rounded upholstered edges
    regionInteriorAddBox(kit, group, 1.16, 0.14, 0.44, velvetMat, x, y + 0.52, z);
    regionInteriorAddCyl(kit, group, 0.07, 0.07, 1.16, 12, velvet, x, y + 0.52, z + 0.22, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, group, 0.07, 0.07, 1.16, 12, velvet, x, y + 0.52, z - 0.22, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, group, 0.07, 0.07, 0.44, 12, velvet, x - 0.58, y + 0.52, z, Math.PI / 2, 0);
    regionInteriorAddCyl(kit, group, 0.07, 0.07, 0.44, 12, velvet, x + 0.58, y + 0.52, z, Math.PI / 2, 0);
    // Eight gleaming gold brass tuft buttons on seat cushion
    [-0.39, -0.13, 0.13, 0.39].forEach(function(bx){
      [-0.10, 0.10].forEach(function(bz){
        regionInteriorAdd(group, new T.SphereGeometry(0.021, 8, 6), kit.M(brightBrass), x + bx, y + 0.594, z + bz);
      });
    });
    // Two rolled velvet bolster armrests with gold piped rings & end buttons
    [-0.54, 0.54].forEach(function(ax){
      regionInteriorAddCyl(kit, group, 0.095, 0.095, 0.46, 14, velvetHi, x + ax, y + 0.67, z, Math.PI / 2, 0);
      [-0.23, 0.23].forEach(function(ez){
        regionInteriorAdd(group, new T.TorusGeometry(0.09, 0.012, 6, 14), kit.M(brass), x + ax, y + 0.67, z + ez);
        regionInteriorAdd(group, new T.SphereGeometry(0.024, 8, 6), kit.M(brightBrass), x + ax, y + 0.67, z + ez + (ez > 0 ? 0.008 : -0.008));
      });
    });
    // Sculpted arched mahogany & tufted velvet backrest
    [-0.58, 0.58].forEach(function(sx){
      regionInteriorAddBox(kit, group, 0.07, 0.44, 0.065, mahog, x + sx, y + 0.67, z - 0.235);
      regionInteriorAdd(group, new T.SphereGeometry(0.038, 8, 6), kit.M(brass), x + sx, y + 0.905, z - 0.235);
    });
    regionInteriorAddBox(kit, group, 1.22, 0.07, 0.07, mahog, x, y + 0.89, z - 0.235);
    regionInteriorAddBox(kit, group, 0.64, 0.075, 0.075, mahog, x, y + 0.945, z - 0.235);
    regionInteriorAddBox(kit, group, 0.56, 0.022, 0.084, brass, x, y + 0.952, z - 0.232);
    regionInteriorAddBox(kit, group, 1.10, 0.29, 0.09, velvetMat, x, y + 0.735, z - 0.21);
    [-0.34, 0, 0.34].forEach(function(tx){
      regionInteriorAdd(group, new T.SphereGeometry(0.024, 8, 6), kit.M(brightBrass), x + tx, y + 0.74, z - 0.16);
    });
  }

  function regionInteriorAddHerbDryingRack(kit, group, x, y, z){
    var T = window.THREE;
    var oak = 0x8e603a;
    var darkOak = 0x684324;
    var dowel = 0xb88b5a;
    var twine = 0xe8dcc0;
    // Two sturdy grounded oak foot runners strictly at y = 0
    [-0.38, 0.38].forEach(function(fx){
      regionInteriorAddBox(kit, group, 0.08, 0.05, 0.40, darkOak, x + fx, y + 0.025, z);
      regionInteriorAddBox(kit, group, 0.065, 1.56, 0.065, oak, x + fx, y + 0.80, z);
      regionInteriorAdd(group, new T.SphereGeometry(0.044, 8, 6), kit.M(darkOak), x + fx, y + 1.61, z);
    });
    // Slatted lower storage shelf holding woven herb basket & tied linen bundle
    regionInteriorAddBox(kit, group, 0.78, 0.04, 0.34, oak, x, y + 0.15, z);
    regionInteriorAddCyl(kit, group, 0.15, 0.11, 0.14, 12, 0xc99658, x - 0.15, y + 0.24, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.145, 0.016, 6, 12), kit.M(0xa6743c), x - 0.15, y + 0.31, z, Math.PI / 2);
    [[-0.04, 0x4ca375], [0.05, 0x6ac294], [0.0, 0x9b78cc]].forEach(function(sp, si){
      regionInteriorAdd(group, new T.SphereGeometry(0.055, 8, 6), kit.M(sp[1]), x - 0.15 + sp[0], y + 0.33, z + (si - 1) * 0.03);
    });
    regionInteriorAddCyl(kit, group, 0.065, 0.065, 0.24, 10, 0xf2ead6, x + 0.18, y + 0.23, z, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, group, 0.072, 0.072, 0.025, 10, 0x4ca888, x + 0.18, y + 0.23, z, 0, Math.PI / 2);
    // Scalloped wooden header rail with sage botanical plaque
    regionInteriorAddBox(kit, group, 0.84, 0.085, 0.06, darkOak, x, y + 1.56, z);
    regionInteriorAddBox(kit, group, 0.34, 0.09, 0.07, 0x4ca888, x, y + 1.62, z + 0.005);
    regionInteriorAdd(group, new T.SphereGeometry(0.026, 8, 6), kit.M(0xfaf8f2), x, y + 1.62, z + 0.04);
    // Three horizontal dowel drying bars with 11 hanging bundled dried-herb & blossom clusters
    var tiers = [
      { ty: 1.40, bunches: [[-0.27, 0x55a07a], [-0.09, 0x9b78cc], [0.09, 0x428761], [0.27, 0xebbf54]] },
      { ty: 1.00, bunches: [[-0.26, 0xe87b86], [-0.08, 0x55a07a], [0.10, 0x9b78cc], [0.27, 0x4b9972]] },
      { ty: 0.60, bunches: [[-0.22, 0xebbf54], [0.00, 0x428761], [0.22, 0xe87b86]] }
    ];
    tiers.forEach(function(tr){
      regionInteriorAddCyl(kit, group, 0.016, 0.016, 0.78, 8, dowel, x, y + tr.ty, z + 0.02, 0, Math.PI / 2);
      tr.bunches.forEach(function(bn, bi){
        var bx = x + bn[0], bz = z + 0.025 + (bi % 2 ? 0.015 : -0.005);
        // Twine hanger & gathered stem
        regionInteriorAddCyl(kit, group, 0.006, 0.006, 0.065, 6, twine, bx, y + tr.ty - 0.035, bz);
        regionInteriorAddCyl(kit, group, 0.016, 0.012, 0.06, 6, 0x6e5338, bx, y + tr.ty - 0.075, bz);
        // Cream twine bow collar
        regionInteriorAddCyl(kit, group, 0.024, 0.024, 0.018, 8, twine, bx, y + tr.ty - 0.105, bz);
        // Inverted hanging tapered herb/flower cluster
        regionInteriorAddCyl(kit, group, 0.022, 0.058, 0.15, 8, bn[1], bx, y + tr.ty - 0.185, bz);
        regionInteriorAdd(group, new T.SphereGeometry(0.052, 8, 6), kit.M(bn[1]), bx - 0.024, y + tr.ty - 0.245, bz + 0.012);
        regionInteriorAdd(group, new T.SphereGeometry(0.050, 8, 6), kit.M(bn[1]), bx + 0.024, y + tr.ty - 0.255, bz - 0.008);
        regionInteriorAdd(group, new T.SphereGeometry(0.044, 8, 6), kit.M(bn[1]), bx, y + tr.ty - 0.285, bz + 0.018);
      });
    });
  }

  function regionInteriorAddTerrarium(kit, group, x, y, z){
    var T = window.THREE;
    var oak = 0x8e603a;
    var mint = 0x4ca888;
    var brass = 0xd4a348;
    // Grounded mint-and-oak apothecary pedestal stand strictly at y = 0
    [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]].forEach(function(lg){
      regionInteriorAddBox(kit, group, 0.045, 0.54, 0.045, oak, x + lg[0], y + 0.27, z + lg[1]);
    });
    regionInteriorAddBox(kit, group, 0.46, 0.032, 0.46, 0xa6774d, x, y + 0.16, z);
    // Tiny ceramic herb pots on lower shelf
    regionInteriorAddCyl(kit, group, 0.055, 0.042, 0.085, 10, 0xc76d47, x - 0.10, y + 0.22, z + 0.04);
    regionInteriorAdd(group, new T.SphereGeometry(0.048, 8, 6), kit.M(0x4ea56a), x - 0.10, y + 0.28, z + 0.04);
    regionInteriorAddCyl(kit, group, 0.048, 0.038, 0.075, 10, 0xf2f7f4, x + 0.10, y + 0.215, z - 0.04);
    regionInteriorAdd(group, new T.SphereGeometry(0.042, 8, 6), kit.M(0x6bc494), x + 0.10, y + 0.27, z - 0.04);
    // Mint upper apron & beveled oak tabletop (top at y = 0.58)
    regionInteriorAddBox(kit, group, 0.44, 0.065, 0.44, mint, x, y + 0.505, z);
    regionInteriorAddBox(kit, group, 0.56, 0.04, 0.56, oak, x, y + 0.56, z);
    regionInteriorAddBox(kit, group, 0.57, 0.015, 0.57, 0x6ec2a2, x, y + 0.542, z);
    // Brass-framed octagonal Wardian glass botanical terrarium resting solidly at y = 0.58
    regionInteriorAddCyl(kit, group, 0.22, 0.23, 0.06, 8, 0x427566, x, y + 0.61, z);
    regionInteriorAddCyl(kit, group, 0.225, 0.225, 0.018, 8, brass, x, y + 0.646, z);
    // Layered potting soil, lush moss mound & smooth coastal pebbles inside
    regionInteriorAddCyl(kit, group, 0.19, 0.19, 0.03, 10, 0x4c3628, x, y + 0.655, z);
    var moss = regionInteriorAdd(group, new T.SphereGeometry(0.165, 12, 8), kit.M(0x57a862), x, y + 0.67, z);
    moss.scale.set(1.0, 0.42, 1.0);
    [[-0.08, 0.07, 0.025], [0.09, 0.06, 0.022], [0.02, -0.09, 0.024]].forEach(function(pb){
      var stone = regionInteriorAdd(group, new T.SphereGeometry(pb[2], 8, 6), kit.M(0xc9d4d0), x + pb[0], y + 0.695, z + pb[1]);
      stone.scale.set(1.2, 0.6, 1.0);
    });
    // Miniature lush indoor ferns, mint succulents & coral blossom sprig
    for(var fi = 0; fi < 5; fi++){
      var fa = (fi / 5) * Math.PI * 2 + 0.3;
      var frond = regionInteriorAdd(group, new T.SphereGeometry(0.065, 8, 6), kit.M(fi % 2 ? 0x3b915e : 0x52b078), x + Math.cos(fa) * 0.085, y + 0.79, z + Math.sin(fa) * 0.085, Math.sin(fa) * 0.4, -fa, -Math.cos(fa) * 0.4);
      frond.scale.set(1.25, 0.45, 0.72);
    }
    [[-0.07, -0.04], [0.08, 0.03]].forEach(function(sc){
      regionInteriorAdd(group, new T.SphereGeometry(0.042, 8, 6), kit.M(0x76d1a6), x + sc[0], y + 0.735, z + sc[1]);
    });
    regionInteriorAddCyl(kit, group, 0.012, 0.015, 0.22, 6, 0x3a8255, x, y + 0.81, z);
    [[0, 0.94, 0, 0xf2877e], [-0.045, 0.90, 0.03, 0xffad88], [0.045, 0.89, -0.02, 0xf2877e]].forEach(function(bl){
      regionInteriorAdd(group, new T.SphereGeometry(0.036, 8, 6), kit.M(bl[3]), x + bl[0], y + bl[1], z + bl[2]);
    });
    regionInteriorAdd(group, new T.SphereGeometry(0.016, 6, 6), kit.M(0xffdc6b), x, y + 0.96, z + 0.025);
    // 8 slender vertical brass mullions + pitched lantern roof ribs & brass finial
    for(var mi = 0; mi < 8; mi++){
      var ma = (mi / 8) * Math.PI * 2;
      var mx = x + Math.cos(ma) * 0.204, mz = z + Math.sin(ma) * 0.204;
      regionInteriorAddCyl(kit, group, 0.007, 0.007, 0.38, 6, brass, mx, y + 0.83, mz);
      var rmx = x + Math.cos(ma) * 0.118, rmz = z + Math.sin(ma) * 0.118;
      var rib = regionInteriorAddCyl(kit, group, 0.007, 0.007, 0.245, 6, brass, rmx, y + 1.11, rmz);
      rib.rotation.order = 'YXZ';
      rib.rotation.y = -ma + Math.PI * 0.5;
      rib.rotation.x = -0.74;
    }
    regionInteriorAdd(group, new T.TorusGeometry(0.204, 0.009, 6, 8), kit.M(brass), x, y + 1.02, z, Math.PI / 2);
    regionInteriorAddCyl(kit, group, 0.038, 0.048, 0.024, 8, brass, x, y + 1.205, z);
    regionInteriorAdd(group, new T.TorusGeometry(0.028, 0.007, 6, 12), kit.M(0xe6bc58), x, y + 1.24, z);
    // Translucent pale-aqua faceted glass dome walls & roof (sorted to renderOrder = 1 by reef3dMerge)
    var glassMat = kit.M(0xe4fbff, { transparent: true, opacity: 0.24 });
    regionInteriorAddCyl(kit, group, 0.20, 0.20, 0.37, 8, glassMat, x, y + 0.83, z);
    regionInteriorAddCyl(kit, group, 0.036, 0.20, 0.18, 8, glassMat, x, y + 1.11, z);
  }

  function regionInteriorAddCounterOverhead(kit, group, kind, theme){
    var T = window.THREE;
    if(kind === 'hotel'){
      // Carved mahogany concierge cornice with ornate brass crest & warm frosted globe sconces
      var mahogDark = 0x4d2a16;
      var mahogMid = 0x683a1f;
      var brass = 0xd4a348;
      var brightBrass = 0xe8be58;
      // Stepped carved mahogany cornice beam spanning above concierge counter (x = -0.12..2.52, y = 2.66..3.04)
      regionInteriorAddBox(kit, group, 2.74, 0.08, 0.54, mahogDark, 1.20, 3.00, -0.95);
      regionInteriorAddBox(kit, group, 2.66, 0.026, 0.48, brass, 1.20, 2.945, -0.95);
      regionInteriorAddBox(kit, group, 2.62, 0.22, 0.44, mahogMid, 1.20, 2.83, -0.95);
      // Recessed carved walnut panels flanking the central brass crest
      [0.56, 1.84].forEach(function(px){
        regionInteriorAddBox(kit, group, 0.64, 0.13, 0.03, 0x522d17, px, 2.83, -0.725);
        regionInteriorAddBox(kit, group, 0.66, 0.018, 0.036, brass, px, 2.895, -0.722);
        regionInteriorAddBox(kit, group, 0.66, 0.018, 0.036, brass, px, 2.765, -0.722);
      });
      // Repeating carved mahogany dentil blocks & lower inlaid brass trim + soffit lip
      for(var di = -8; di <= 8; di++){
        regionInteriorAddBox(kit, group, 0.065, 0.042, 0.045, mahogDark, 1.20 + di * 0.145, 2.725, -0.72);
      }
      regionInteriorAddBox(kit, group, 2.66, 0.025, 0.48, brass, 1.20, 2.71, -0.95);
      regionInteriorAddBox(kit, group, 2.68, 0.055, 0.49, mahogDark, 1.20, 2.68, -0.95);
      // Carved mahogany end corbel brackets
      [-0.06, 2.46].forEach(function(cx){
        regionInteriorAddBox(kit, group, 0.11, 0.34, 0.46, mahogDark, cx, 2.81, -0.95);
        regionInteriorAddBox(kit, group, 0.13, 0.04, 0.50, brass, cx, 2.65, -0.95);
      });
      // Ornate central brass hotel crest medallion with coastal shell crown & scroll volutes (kept >= 2.62 for clean key-board clearance)
      regionInteriorAddCyl(kit, group, 0.145, 0.145, 0.042, 16, brightBrass, 1.20, 2.79, -0.72, Math.PI / 2);
      regionInteriorAddCyl(kit, group, 0.110, 0.110, 0.048, 16, 0x1b3d5a, 1.20, 2.79, -0.715, Math.PI / 2);
      // 5 radiating golden scallop-shell crown rays inside & atop crest
      for(var ri = -2; ri <= 2; ri++){
        var ray = regionInteriorAddBox(kit, group, 0.022, 0.105, 0.032, brightBrass, 1.20 + ri * 0.027, 2.868 - Math.abs(ri) * 0.011, -0.70);
        ray.rotation.z = -ri * 0.28;
      }
      regionInteriorAdd(group, new T.SphereGeometry(0.034, 10, 8), kit.M(0xfff1b8), 1.20, 2.78, -0.69);
      // Symmetrical flanking brass scroll volutes & compact lower drop finial
      [-1, 1].forEach(function(sd){
        regionInteriorAdd(group, new T.TorusGeometry(0.064, 0.015, 6, 12, Math.PI * 1.35), kit.M(brass), 1.20 + sd * 0.20, 2.79, -0.71, 0, 0, sd > 0 ? -0.40 : -0.70);
      });
      regionInteriorAddCyl(kit, group, 0.014, 0.028, 0.048, 8, brightBrass, 1.20, 2.642, -0.715);
      // Two warm frosted opal-glass globe sconces flanking the concierge key board (x = 0.22, 2.18)
      var globeMat = kit.M(0xfff6dc, { emissive: 0x52401e });
      [0.22, 2.18].forEach(function(sx){
        regionInteriorAddCyl(kit, group, 0.075, 0.075, 0.03, 12, brass, sx, 2.77, -0.725, Math.PI / 2);
        regionInteriorAddBox(kit, group, 0.036, 0.036, 0.09, brass, sx, 2.77, -0.695);
        regionInteriorAddCyl(kit, group, 0.018, 0.018, 0.15, 8, brass, sx, 2.695, -0.68);
        regionInteriorAddCyl(kit, group, 0.055, 0.088, 0.048, 12, brightBrass, sx, 2.605, -0.68);
        regionInteriorAdd(group, new T.SphereGeometry(0.115, 16, 12), globeMat, sx, 2.49, -0.68);
        regionInteriorAdd(group, new T.SphereGeometry(0.022, 8, 6), kit.M(brightBrass), sx, 2.365, -0.68);
      });
      return;
    }
    if(kind === 'pharmacy'){
      // Mint-and-white glass-paned apothecary transom shelf lined with vivid pastel elixir bottles
      var mintTrim = 0x3b9b7b;
      var mintSoft = 0x5eb898;
      var whiteWood = 0xffffff;
      var creamWhite = 0xf5faf7;
      var brass = 0xd4a348;
      // Crisp white stepped lower shelf + mint bottom fillet & 3 scrolled mint brackets (raised to y = 2.64 for generous back-shelf headroom)
      regionInteriorAddBox(kit, group, 2.66, 0.055, 0.36, whiteWood, 1.20, 2.64, -0.92);
      regionInteriorAddBox(kit, group, 2.62, 0.022, 0.34, mintSoft, 1.20, 2.608, -0.92);
      [-0.02, 1.20, 2.42].forEach(function(bx){
        regionInteriorAddBox(kit, group, 0.06, 0.08, 0.24, mintTrim, bx, 2.56, -0.90);
      });
      // Fresh mint-emerald stepped top crown cornice + white inner bead
      regionInteriorAddBox(kit, group, 2.70, 0.075, 0.42, mintTrim, 1.20, 3.01, -0.92);
      regionInteriorAddBox(kit, group, 2.62, 0.028, 0.38, creamWhite, 1.20, 2.96, -0.92);
      // Soft sage-cream (#d6ebe4) interior cabinet backing & crisp white side end-boards for high bottle contrast
      regionInteriorAddBox(kit, group, 2.54, 0.31, 0.03, kit.M(0xd6ebe4, { emissive: 0x091410 }), 1.20, 2.815, -1.06);
      [-0.08, 2.48].forEach(function(ex){
        regionInteriorAddBox(kit, group, 0.06, 0.33, 0.32, whiteWood, ex, 2.815, -0.91);
      });
      // Eight deepened pastel elixir bottles lined neatly inside the 4 glass transom panes (2 per pane)
      [
        [0.14, 0.22, 0x3ec99b, 0x0f3629],
        [0.38, 0.18, 0xe86c8a, 0x36121c],
        [0.76, 0.23, 0xe8ae3c, 0x362408],
        [1.02, 0.19, 0x9c7ae0, 0x22163b],
        [1.38, 0.23, 0x46b2e8, 0x0e2a3b],
        [1.64, 0.19, 0xe88258, 0x36190d],
        [2.02, 0.22, 0x3cb87a, 0x0e301e],
        [2.28, 0.18, 0xe6c242, 0x342a0a]
      ].forEach(function(el){
        regionInteriorAddApothecaryBottle(kit, group, el[0], 2.668, -0.90, el[1], el[2], el[3]);
      });
      // Mint-and-white glass-paned front transom mullion frame (4 crisp panes clear of every bottle)
      regionInteriorAddBox(kit, group, 2.62, 0.040, 0.045, whiteWood, 1.20, 2.95, -0.76);
      regionInteriorAddBox(kit, group, 2.62, 0.040, 0.045, whiteWood, 1.20, 2.67, -0.76);
      [-0.08, 2.48].forEach(function(sx){
        regionInteriorAddBox(kit, group, 0.055, 0.33, 0.05, mintTrim, sx, 2.81, -0.76);
      });
      [0.56, 1.20, 1.84].forEach(function(mx){
        regionInteriorAddBox(kit, group, 0.036, 0.29, 0.042, whiteWood, mx, 2.81, -0.76);
      });
      // Tiny brass transom latch pins along bottom rail
      [0.24, 0.88, 1.52, 2.16].forEach(function(kx){
        regionInteriorAdd(group, new T.SphereGeometry(0.015, 6, 6), kit.M(brass), kx, 2.67, -0.732);
      });
      // Subtle translucent pale-aqua apothecary glass panes (low opacity keeps bottle silhouettes crisp)
      regionInteriorAddBox(kit, group, 2.50, 0.25, 0.016, kit.M(0xd8f4f0, { transparent: true, opacity: 0.11 }), 1.20, 2.81, -0.765);
      // Two brass-and-opal side-mounted transom drop bulbs cleanly clear & above the back-wall shelf bottles
      var bulbMat = kit.M(0xfff6dc, { emissive: 0x4c3c1c });
      [[-0.22, -0.08, -1], [2.62, 2.48, 1]].forEach(function(sc){
        var lx = sc[0], postX = sc[1], dir = sc[2];
        regionInteriorAddCyl(kit, group, 0.032, 0.032, 0.022, 10, brass, postX + dir * 0.032, 2.745, -0.78, 0, Math.PI / 2);
        regionInteriorAddBox(kit, group, 0.14, 0.024, 0.024, brass, (lx + postX) * 0.5, 2.745, -0.78);
        regionInteriorAddCyl(kit, group, 0.034, 0.044, 0.036, 10, brass, lx, 2.725, -0.78);
        regionInteriorAdd(group, new T.SphereGeometry(0.068, 12, 8), bulbMat, lx, 2.655, -0.78);
        regionInteriorAdd(group, new T.SphereGeometry(0.016, 8, 6), kit.M(brass), lx, 2.58, -0.78);
      });
      return;
    }
    if(kind === 'restaurant'){
      // Warm walnut-and-brass coastal bistro awning header + scalloped striped valance + flanking terracotta-brass pendants
      var walnut = 0x5c361d;
      var brass = 0xd4a348;
      regionInteriorAddBox(kit, group, 2.58, 0.085, 0.44, walnut, 1.20, 3.01, -0.95);
      regionInteriorAddBox(kit, group, 2.52, 0.024, 0.42, brass, 1.20, 2.955, -0.95);
      [-0.04, 2.44].forEach(function(cx){
        regionInteriorAddBox(kit, group, 0.09, 0.22, 0.40, walnut, cx, 2.88, -0.95);
        regionInteriorAdd(group, new T.SphereGeometry(0.034, 8, 6), kit.M(brass), cx, 2.76, -0.77);
      });
      for(var rav = 0; rav < 6; rav++){
        var ravColor = rav % 2 ? 0xfff6e5 : theme.accent;
        var ravX = 0.20 + rav * 0.40;
        regionInteriorAddBox(kit, group, 0.40, 0.14, 0.36, ravColor, ravX, 2.88, -0.95);
        regionInteriorAdd(group, new T.CylinderGeometry(0.16, 0.16, 0.36, 12, 1, false, -Math.PI / 2, Math.PI), kit.M(ravColor), ravX, 2.81, -0.95, Math.PI / 2);
      }
      // Symmetrical flanking brass-and-terracotta bistro lantern pendants (clear of BISTRO board, otter & copper pans)
      var bulbGlow = kit.M(0xfff4c2, { emissive: 0x5c461a });
      [0.04, 1.92].forEach(function(lx){
        regionInteriorAddCyl(kit, group, 0.06, 0.075, 0.035, 10, brass, lx, 3.88, -0.74);
        regionInteriorAddCyl(kit, group, 0.012, 0.012, 1.22, 6, 0x3b302a, lx, 3.26, -0.74);
        regionInteriorAddCyl(kit, group, 0.035, 0.055, 0.05, 10, brass, lx, 2.625, -0.74);
        regionInteriorAddCyl(kit, group, 0.065, 0.145, 0.145, 16, theme.accent, lx, 2.53, -0.74);
        regionInteriorAddCyl(kit, group, 0.148, 0.152, 0.024, 16, brass, lx, 2.452, -0.74);
        regionInteriorAdd(group, new T.SphereGeometry(0.060, 12, 8), bulbGlow, lx, 2.415, -0.74);
      });
      return;
    }
    if(kind === 'taxi'){
      // Illuminated HARBOR TAXI checkered dispatch gantry & twin brass-caged pier lanterns
      var slate = 0x26313d;
      var brass = 0xd4a348;
      var cabYellow = 0xf2c13e;
      regionInteriorAddBox(kit, group, 2.62, 0.09, 0.42, slate, 1.20, 3.02, -0.92);
      // Glowing backlit yellow TAXI header sign box suspended cleanly above dispatch counter
      regionInteriorAddBox(kit, group, 1.46, 0.30, 0.24, slate, 1.20, 2.82, -0.90);
      regionInteriorAddBox(kit, group, 1.36, 0.22, 0.26, kit.M(0xffe178, { emissive: 0x5c4610 }), 1.20, 2.82, -0.90);
      // Bold checkered trim bar beneath the taxi sign
      for(var ck = 0; ck < 12; ck++){
        regionInteriorAddBox(kit, group, 0.21, 0.075, 0.30, ck % 2 ? slate : cabYellow, 0.04 + ck * 0.21, 2.65, -0.90);
      }
      // Flanking warm brass-caged maritime cab-stand dispatch lanterns
      var tBulb = kit.M(0xfff4c2, { emissive: 0x624c1a });
      [0.06, 2.34].forEach(function(lx){
        regionInteriorAddCyl(kit, group, 0.05, 0.06, 0.04, 10, brass, lx, 3.88, -0.74);
        regionInteriorAddCyl(kit, group, 0.012, 0.012, 1.18, 6, slate, lx, 3.28, -0.74);
        regionInteriorAddCyl(kit, group, 0.04, 0.13, 0.10, 12, slate, lx, 2.66, -0.74);
        regionInteriorAddCyl(kit, group, 0.09, 0.08, 0.18, 10, tBulb, lx, 2.52, -0.74);
        regionInteriorAdd(group, new T.TorusGeometry(0.105, 0.010, 6, 12), kit.M(brass), lx, 2.58, -0.74, Math.PI / 2);
        regionInteriorAdd(group, new T.TorusGeometry(0.095, 0.010, 6, 12), kit.M(brass), lx, 2.46, -0.74, Math.PI / 2);
      });
      return;
    }
    if(kind === 'subway'){
      // Brushed-steel & turquoise HARBOR METRO overhead arrival gantry + industrial station pendant domes
      var steel = 0x58697a;
      var darkSteel = 0x354452;
      var teal = 0x26879c;
      regionInteriorAddBox(kit, group, 2.74, 0.10, 0.42, darkSteel, 1.20, 3.00, -0.92);
      regionInteriorAddBox(kit, group, 2.68, 0.24, 0.36, steel, 1.20, 2.83, -0.92);
      regionInteriorAddBox(kit, group, 2.66, 0.06, 0.38, teal, 1.20, 2.70, -0.92);
      // Glowing LED arrival status board inlaid into the front gantry face
      regionInteriorAddBox(kit, group, 1.48, 0.14, 0.04, 0x16222c, 1.20, 2.83, -0.73);
      regionInteriorAddBox(kit, group, 0.56, 0.04, 0.046, kit.M(0x6ef2c4, { emissive: 0x1a6e4e }), 0.86, 2.84, -0.72);
      regionInteriorAddBox(kit, group, 0.44, 0.04, 0.046, kit.M(0xffd86b, { emissive: 0x6b4c0c }), 1.54, 2.84, -0.72);
      // Two cool-warm enameled station pendant lamps
      [0.10, 2.30].forEach(function(lx){
        regionInteriorAddCyl(kit, group, 0.055, 0.07, 0.04, 10, steel, lx, 3.88, -0.70);
        regionInteriorAddCyl(kit, group, 0.013, 0.013, 1.20, 6, darkSteel, lx, 3.28, -0.70);
        regionInteriorAddCyl(kit, group, 0.055, 0.18, 0.13, 14, teal, lx, 2.61, -0.70);
        regionInteriorAddCyl(kit, group, 0.182, 0.186, 0.02, 14, 0xe9f2f7, lx, 2.54, -0.70);
        regionInteriorAdd(group, new T.SphereGeometry(0.064, 10, 8), kit.M(0xfff6d4, { emissive: 0x5c5024 }), lx, 2.52, -0.70);
      });
      return;
    }
    if(kind === 'friend'){
      // Warm sunlit Harbor Promenade Gazebo cedar pergola rafters & draped glowing festoon string lights!
      var cedar = 0x8d6340;
      var creamBeam = 0xf7efe0;
      regionInteriorAddBox(kit, group, 9.0, 0.18, 0.24, creamBeam, 0, 3.66, -2.72);
      regionInteriorAddBox(kit, group, 9.0, 0.14, 0.20, cedar, 0, 3.54, -1.35);
      // Cross pergola rafters spanning overhead from back balustrade to courtyard front
      [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].forEach(function(rx){
        regionInteriorAddBox(kit, group, 0.12, 0.14, 3.0, cedar, rx, 3.74, -1.45);
      });
      // Twin draped festoon string-light garlands with 14 warm glowing Edison bulbs
      var bulbGlow = kit.M(0xfff0b2, { emissive: 0x7c5412 });
      [
        { z: -2.25, yEnd: 3.36, sag: 0.34, n: 7 },
        { z: -1.10, yEnd: 3.30, sag: 0.28, n: 7 }
      ].forEach(function(st){
        for(var bi = 0; bi < st.n; bi++){
          var t = (bi + 0.5) / st.n;
          var bx = -3.4 + t * 6.8;
          var by = st.yEnd - Math.sin(t * Math.PI) * st.sag;
          regionInteriorAddCyl(kit, group, 0.008, 0.008, 0.09, 6, 0x3b332c, bx, by + 0.05, st.z);
          regionInteriorAdd(group, new T.SphereGeometry(0.048, 8, 6), bulbGlow, bx, by - 0.01, st.z);
          if(bi < st.n - 1){
            var nt = (bi + 1.5) / st.n, nbx = -3.4 + nt * 6.8, nby = st.yEnd - Math.sin(nt * Math.PI) * st.sag;
            var dx = nbx - bx, dy = nby - by, len = Math.hypot(dx, dy);
            var wire = regionInteriorAddCyl(kit, group, 0.007, 0.007, len, 5, 0x3b332c, (bx + nbx) * 0.5, (by + nby) * 0.5 + 0.08, st.z);
            wire.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
          }
        }
      });
      return;
    }
    // Two cozy hanging pendant lamps lowered to y = 2.55 so shades & cones frame cleanly (default: cafe, shop)
    [-0.28, 1.20].forEach(function(lx){
      regionInteriorAddCyl(kit, group, 0.10, 0.12, 0.04, 10, 0xd4a348, lx, 3.92, -0.45);
      regionInteriorAddCyl(kit, group, 0.015, 0.015, 1.27, 6, 0x3b3532, lx, 3.285, -0.45);
      regionInteriorAddCyl(kit, group, 0.11, 0.28, 0.20, 14, theme.accent, lx, 2.55, -0.45);
      regionInteriorAddCyl(kit, group, 0.28, 0.29, 0.03, 14, 0xf6d488, lx, 2.45, -0.45);
      regionInteriorAdd(group, new T.SphereGeometry(0.085, 8, 6), kit.M(0xfff4c2), lx, 2.44, -0.45);
    });
    // Striped scalloped awning valance above counter (y = 2.86 with rounded scalloped bottom half-cylinders)
    for(var av = 0; av < 6; av++){
      var avColor = av % 2 ? 0xfff6e5 : theme.accent;
      var avX = 0.15 + av * 0.42;
      regionInteriorAddBox(kit, group, 0.42, 0.28, 0.44, avColor, avX, 2.86, -0.95);
      regionInteriorAdd(group, new T.CylinderGeometry(0.21, 0.21, 0.44, 12, 1, false, -Math.PI / 2, Math.PI), kit.M(avColor), avX, 2.72, -0.95, Math.PI / 2);
    }
  }

  function regionInteriorIsAncestor(node, target){
    var p = target ? target.parent : null;
    while(p){
      if(p === node) return true;
      p = p.parent;
    }
    return false;
  }

  function regionInteriorToWorld(basePos, yaw, lx, ly, lz){
    var T = window.THREE;
    var cos = Math.cos(yaw), sin = Math.sin(yaw);
    return new T.Vector3(
      basePos.x + lx * cos + lz * sin,
      basePos.y + ly,
      basePos.z - lx * sin + lz * cos
    );
  }

  // Per-venue bespoke floor plan coordinates (zero repeated left-window + right-counter + left-rug template!)
  // MIN-14: Shelly nudged -0.22u deeper into each room so the bottom dialogue card leaves her front flippers cleanly visible!
  var REGION_INTERIOR_LAYOUTS = {
    cafe: {
      actorX: -1.24, actorZ: -1.68, actorYawFrac: 0.84, hoverY: null,
      maxY: 1.78, targetY: 1.70, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: 1.50, shellyZ: -0.28,
      rugX: 1.50, rugZ: -0.28
    },
    restaurant: {
      actorX: 0.52, actorZ: -1.58, actorYawFrac: 0.94, hoverY: null, floorLift: -0.085,
      maxY: 1.78, targetY: 1.70, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: -1.72, shellyZ: -0.18,
      rugX: -1.72, rugZ: -0.18
    },
    shop: {
      actorX: 0.25, actorZ: -1.78, actorYawFrac: 1.05, hoverY: null,
      maxY: 1.76, targetY: 1.68, maxXZ: 2.80, targetXZ: 2.65,
      shellyX: -1.20, shellyZ: -0.24,
      rugX: -1.20, rugZ: -0.24
    },
    taxi: {
      actorX: 1.72, actorZ: -1.62, actorYawFrac: 0.92, hoverY: 0.22,
      maxY: 1.62, targetY: 1.56, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: -1.62, shellyZ: -0.26,
      rugX: -1.62, rugZ: -0.26
    },
    subway: {
      actorX: 0.78, actorZ: -1.75, actorYawFrac: 0.70, hoverY: 0.90,
      maxY: 1.32, targetY: 1.24, maxXZ: 2.05, targetXZ: 1.98,
      shellyX: -0.88, shellyZ: -0.56,
      rugX: -0.88, rugZ: -0.56
    },
    hotel: {
      actorX: 0.54, actorZ: -1.62, actorYawFrac: 0.72, hoverY: 0.78,
      maxY: 1.24, targetY: 1.24, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: -1.48, shellyZ: -0.20,
      rugX: -1.48, rugZ: -0.14
    },
    pharmacy: {
      actorX: 1.24, actorZ: -1.92, actorYawFrac: 0.70, hoverY: 0.38,
      maxY: 1.34, targetY: 1.34, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: -1.58, shellyZ: -0.28,
      rugX: -1.58, rugZ: -0.28
    },
    friend: {
      actorX: 1.12, actorZ: -1.35, actorYawFrac: 0.72, hoverY: null, floorLift: -0.025,
      maxY: 1.62, targetY: 1.54, maxXZ: 2.85, targetXZ: 2.70,
      shellyX: -1.52, shellyZ: -0.36,
      rugX: -0.18, rugZ: -0.46
    }
  };

  function regionInteriorAddHangingHerbBundle(kit, group, x, y, z, color, scale){
    var T = window.THREE;
    var s = scale || 1;
    var twine = 0xe8dcc0;
    regionInteriorAddCyl(kit, group, 0.006 * s, 0.006 * s, 0.14 * s, 6, twine, x, y - 0.07 * s, z);
    regionInteriorAddCyl(kit, group, 0.018 * s, 0.014 * s, 0.08 * s, 6, 0x6e5338, x, y - 0.16 * s, z);
    regionInteriorAddCyl(kit, group, 0.028 * s, 0.028 * s, 0.022 * s, 8, twine, x, y - 0.20 * s, z);
    regionInteriorAddCyl(kit, group, 0.026 * s, 0.068 * s, 0.19 * s, 8, color, x, y - 0.30 * s, z);
    regionInteriorAdd(group, new T.SphereGeometry(0.062 * s, 8, 6), kit.M(color), x - 0.028 * s, y - 0.38 * s, z + 0.012 * s);
    regionInteriorAdd(group, new T.SphereGeometry(0.058 * s, 8, 6), kit.M(color), x + 0.028 * s, y - 0.39 * s, z - 0.010 * s);
    regionInteriorAdd(group, new T.SphereGeometry(0.050 * s, 8, 6), kit.M(color), x, y - 0.43 * s, z + 0.018 * s);
  }

  function regionInteriorAddParkedYellowCab(kit, group, x, y, z, ry){
    var T = window.THREE;
    var cab = new T.Group();
    cab.position.set(x, y, z);
    if(ry) cab.rotation.y = ry;
    var cabYellow = 0xf4c438;
    var cabBright = 0xfad456;
    var cabWarm = 0xe8b228;
    var slate = 0x242d36;
    var chrome = 0xdbe3ea;
    var glassMat = kit.M(0xa8e6f5, { emissive: 0x163846 });
    function addRoundedCapBar(len, r, col, px, py, pz, rx, ry2, rz){
      regionInteriorAddCyl(kit, cab, r, r, len, 12, col, px, py, pz, rx || 0, rz || 0, ry2 || 0);
    }
    // Sculpted rounded Mario Party cab lower chassis (curved side flanks, rounded hood & trunk domes)
    regionInteriorAddBox(kit, cab, 1.56, 0.30, 0.88, cabYellow, 0, 0.33, 0);
    // Rounded front & rear horizontal body cylinders + domed hood & trunk
    regionInteriorAddCyl(kit, cab, 0.16, 0.16, 0.88, 12, cabYellow, 0.78, 0.33, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, cab, 0.16, 0.16, 0.88, 12, cabYellow, -0.78, 0.33, 0, Math.PI / 2);
    var hoodDome = regionInteriorAdd(cab, new T.SphereGeometry(0.42, 14, 10), kit.M(cabBright), 0.88, 0.31, 0);
    hoodDome.scale.set(1.05, 0.56, 1.06);
    var trunkDome = regionInteriorAdd(cab, new T.SphereGeometry(0.38, 14, 10), kit.M(cabYellow), -0.88, 0.31, 0);
    trunkDome.scale.set(0.95, 0.54, 1.06);
    // Softly rounded side door panels & lower rocker trim
    [-0.45, 0.45].forEach(function(sz){
      var flank = regionInteriorAdd(cab, new T.SphereGeometry(0.46, 12, 8), kit.M(cabYellow), 0.0, 0.33, sz * 0.78);
      flank.scale.set(1.95, 0.42, 0.38);
      regionInteriorAddBox(kit, cab, 1.50, 0.05, 0.04, cabWarm, 0.0, 0.19, sz * 1.04);
    });
    // Rounded wheel-well fender arches framing all 4 tires
    [[-0.68, -0.45], [0.70, -0.45], [-0.68, 0.45], [0.70, 0.45]].forEach(function(wf){
      var arch = regionInteriorAdd(cab, new T.TorusGeometry(0.24, 0.045, 8, 14, Math.PI), kit.M(cabBright), wf[0], 0.22, wf[1]);
      arch.rotation.y = 0;
    });
    // Iconic black-and-yellow checkered cab stripe along both side doors
    [-0.485, 0.485].forEach(function(sz){
      for(var ci = -4; ci <= 4; ci++){
        regionInteriorAddBox(kit, cab, 0.15, 0.075, 0.025, (ci % 2 === 0) ? slate : cabBright, ci * 0.155, 0.35, sz);
      }
    });
    // Rounded Mario Party passenger cabin: domed roof + sloped front/rear windshield pillars + glossy windows
    var cabinCore = regionInteriorAddBox(kit, cab, 0.94, 0.34, 0.80, cabBright, -0.06, 0.65, 0);
    cabinCore.scale.set(1, 1, 1);
    var roofDome = regionInteriorAdd(cab, new T.SphereGeometry(0.48, 16, 12), kit.M(cabBright), -0.06, 0.80, 0);
    roofDome.scale.set(1.22, 0.34, 0.92);
    // Rounded roof drip-rail rim
    regionInteriorAddCyl(kit, cab, 0.04, 0.04, 0.94, 8, cabYellow, -0.06, 0.84, -0.40, 0, Math.PI / 2);
    regionInteriorAddCyl(kit, cab, 0.04, 0.04, 0.94, 8, cabYellow, -0.06, 0.84, 0.40, 0, Math.PI / 2);
    // Sloped front & rear windshields + matching sloped A/C pillars
    var frontGlass = regionInteriorAddBox(kit, cab, 0.05, 0.33, 0.72, glassMat, 0.45, 0.66, 0);
    frontGlass.rotation.z = 0.36;
    var rearGlass = regionInteriorAddBox(kit, cab, 0.05, 0.31, 0.70, glassMat, -0.57, 0.66, 0);
    rearGlass.rotation.z = -0.32;
    [-0.38, 0.38].forEach(function(pz){
      var aPillar = regionInteriorAddCyl(kit, cab, 0.032, 0.036, 0.38, 8, cabYellow, 0.45, 0.67, pz);
      aPillar.rotation.z = 0.36;
      var cPillar = regionInteriorAddCyl(kit, cab, 0.032, 0.038, 0.36, 8, cabYellow, -0.57, 0.67, pz);
      cPillar.rotation.z = -0.32;
    });
    // Rounded side cabin windows with dark perimeter trim & diagonal glass sheen
    [-0.415, 0.415].forEach(function(sz){
      var sSign = sz > 0 ? 1 : -1;
      regionInteriorAddBox(kit, cab, 0.41, 0.27, 0.025, slate, 0.16, 0.67, sz - sSign * 0.004);
      regionInteriorAddBox(kit, cab, 0.41, 0.27, 0.025, slate, -0.28, 0.67, sz - sSign * 0.004);
      regionInteriorAddBox(kit, cab, 0.37, 0.23, 0.032, glassMat, 0.16, 0.67, sz);
      regionInteriorAddBox(kit, cab, 0.37, 0.23, 0.032, glassMat, -0.28, 0.67, sz);
      var sh1 = regionInteriorAddBox(kit, cab, 0.055, 0.21, 0.036, kit.M(0xeefaff, { emissive: 0x325866 }), 0.12, 0.67, sz + sSign * 0.002);
      sh1.rotation.z = -0.35;
      var sh2 = regionInteriorAddBox(kit, cab, 0.055, 0.21, 0.036, kit.M(0xeefaff, { emissive: 0x325866 }), -0.32, 0.67, sz + sSign * 0.002);
      sh2.rotation.z = -0.35;
    });
    // Glowing backlit TAXI roof topper beacon with rounded housing
    regionInteriorAddBox(kit, cab, 0.22, 0.035, 0.36, slate, -0.05, 0.95, 0);
    regionInteriorAddBox(kit, cab, 0.18, 0.11, 0.32, kit.M(0xffe878, { emissive: 0x6e5210 }), -0.05, 1.02, 0);
    var beaconCap = regionInteriorAdd(cab, new T.SphereGeometry(0.11, 10, 8), kit.M(0xffe878, { emissive: 0x6e5210 }), -0.05, 1.06, 0);
    beaconCap.scale.set(0.82, 0.42, 1.45);
    // Chrome front & rear rounded bumper bars with spherical end-caps
    addRoundedCapBar(0.94, 0.052, chrome, 1.28, 0.20, 0, Math.PI / 2, 0, 0);
    addRoundedCapBar(0.92, 0.050, chrome, -1.21, 0.20, 0, Math.PI / 2, 0, 0);
    [-0.47, 0.47].forEach(function(bz){
      regionInteriorAdd(cab, new T.SphereGeometry(0.052, 8, 8), kit.M(chrome), 1.28, 0.20, bz);
      regionInteriorAdd(cab, new T.SphereGeometry(0.050, 8, 8), kit.M(chrome), -1.21, 0.20, bz);
    });
    // Chrome-framed front grille + twin glowing round headlights & round taillights
    regionInteriorAddBox(kit, cab, 0.06, 0.15, 0.42, chrome, 1.25, 0.33, 0);
    regionInteriorAddBox(kit, cab, 0.07, 0.12, 0.36, slate, 1.26, 0.33, 0);
    [-0.31, 0.31].forEach(function(hz){
      regionInteriorAddCyl(kit, cab, 0.088, 0.088, 0.08, 14, chrome, 1.24, 0.35, hz, 0, Math.PI / 2);
      regionInteriorAddCyl(kit, cab, 0.072, 0.072, 0.095, 14, kit.M(0xfff6c4, { emissive: 0x725a14 }), 1.26, 0.35, hz, 0, Math.PI / 2);
      regionInteriorAddCyl(kit, cab, 0.065, 0.065, 0.06, 12, chrome, -1.19, 0.34, hz, 0, Math.PI / 2);
      regionInteriorAddCyl(kit, cab, 0.052, 0.052, 0.075, 12, 0xe0483e, -1.20, 0.34, hz, 0, Math.PI / 2);
    });
    // Four sculpted multi-ring tires with silver rims & domed chrome hubcaps strictly touching y = 0
    [[-0.68, -0.47], [0.70, -0.47], [-0.68, 0.47], [0.70, 0.47]].forEach(function(wh){
      var sideSign = wh[1] > 0 ? 1 : -1;
      regionInteriorAddCyl(kit, cab, 0.20, 0.20, 0.14, 16, slate, wh[0], 0.20, wh[1], Math.PI / 2);
      var tread = regionInteriorAdd(cab, new T.TorusGeometry(0.165, 0.036, 8, 16), kit.M(0x1b2229), wh[0], 0.20, wh[1]);
      tread.rotation.y = 0;
      regionInteriorAddCyl(kit, cab, 0.12, 0.12, 0.155, 14, chrome, wh[0], 0.20, wh[1], Math.PI / 2);
      var cap = regionInteriorAdd(cab, new T.SphereGeometry(0.085, 10, 8), kit.M(0xeef4f8), wh[0], 0.20, wh[1] + sideSign * 0.07);
      cap.scale.set(1, 1, 0.38);
    });
    group.add(cab);
  }

  function regionInteriorAddSubwayTrainNose(kit, group, x, y, z){
    var T = window.THREE;
    var tr = new T.Group();
    tr.position.set(x, y, z);
    var bodyCream = 0xeaf1f6;
    var bodySilver = 0xc5d3de;
    var metroTeal = 0x26879c;
    var darkSteel = 0x263544;
    var glassMat = kit.M(0x284d66, { emissive: 0x0c2436 });
    // Main streamlined metro car nose body peeking out of left track tunnel
    regionInteriorAddBox(kit, tr, 1.62, 1.88, 1.95, bodyCream, 0, 1.06, -0.35);
    regionInteriorAddBox(kit, tr, 1.56, 0.24, 1.95, bodySilver, 0, 2.08, -0.35);
    regionInteriorAddCyl(kit, tr, 0.78, 0.78, 1.95, 14, bodySilver, 0, 2.04, -0.35, Math.PI / 2);
    // Bold Harbor Metro turquoise & saffron livery stripe across front nose
    regionInteriorAddBox(kit, tr, 1.66, 0.34, 1.98, metroTeal, 0, 0.76, -0.34);
    regionInteriorAddBox(kit, tr, 1.68, 0.08, 2.00, 0xf2be3c, 0, 0.96, -0.34);
    // Rounded streamline nose cap & curved dark panoramic windshield
    regionInteriorAddBox(kit, tr, 1.54, 0.68, 0.14, darkSteel, 0, 1.44, 0.62);
    regionInteriorAddBox(kit, tr, 1.42, 0.56, 0.16, glassMat, 0, 1.45, 0.63);
    // Subtle diagonal cyan windshield gloss sheen
    var sheen = regionInteriorAddBox(kit, tr, 0.16, 0.44, 0.17, kit.M(0x8be4f2, { transparent: true, opacity: 0.35 }), -0.36, 1.46, 0.64);
    sheen.rotation.z = -0.35;
    // Glowing amber LED destination header board ("LINE 1")
    regionInteriorAddBox(kit, tr, 0.92, 0.20, 0.14, 0x16222c, 0, 1.92, 0.60);
    regionInteriorAddBox(kit, tr, 0.76, 0.10, 0.16, kit.M(0xffdc70, { emissive: 0x7c580e }), 0, 1.92, 0.61);
    // Chrome front bumper & lower undercarriage skirt
    regionInteriorAddBox(kit, tr, 1.60, 0.20, 0.22, darkSteel, 0, 0.24, 0.60);
    regionInteriorAddBox(kit, tr, 1.48, 0.10, 0.26, 0xd8e2ea, 0, 0.34, 0.62);
    // Twin bright glowing circular metro train headlights + chrome bezels!
    [-0.48, 0.48].forEach(function(hx){
      regionInteriorAddCyl(kit, tr, 0.14, 0.14, 0.10, 14, 0xd8e2ea, hx, 0.68, 0.64, Math.PI / 2);
      regionInteriorAddCyl(kit, tr, 0.115, 0.115, 0.12, 14, kit.M(0xfff9d6, { emissive: 0x8a7022 }), hx, 0.68, 0.66, Math.PI / 2);
    });
    group.add(tr);
  }

  function regionInteriorAddGrandMarbleStaircase(kit, group){
    var T = window.THREE;
    var marble = 0xf7f1e6;
    var marbleTrim = 0xe5dac6;
    var crimson = 0x8e2d42;
    var brass = 0xd4a348;
    var brightBrass = 0xe8be58;
    var mahog = 0x58311a;
    // 10 sweeping graduated curved marble steps ascending on the LEFT from mid-left to upper mezzanine (generous clearance behind Shelly!)
    var steps = 10;
    var bx0 = -2.14, bz0 = -0.92;
    for(var i = 0; i < steps; i++){
      var t = i / (steps - 1);
      var sy = (i + 1) * 0.19;
      var ang = -0.32 + t * 0.68; // graceful inward curve
      var sx = -2.84 - Math.sin(t * Math.PI * 0.52) * 0.84;
      var sz = -1.16 - t * 1.46;
      var sw = 1.42 + (1 - t) * 0.28;
      var sd = 0.34;
      // Solid grounded marble step block rising from y = 0 up to sy (zero floating!)
      regionInteriorAddBox(kit, group, sw, sy, sd, marble, sx, sy * 0.5, sz, ang);
      regionInteriorAddBox(kit, group, sw + 0.04, 0.036, sd + 0.04, marbleTrim, sx, sy - 0.015, sz, ang);
      // Royal crimson-velvet stair runner & brass stair rod on each step
      regionInteriorAddBox(kit, group, sw * 0.56, 0.022, sd + 0.02, crimson, sx, sy + 0.010, sz, ang);
      regionInteriorAddBox(kit, group, sw * 0.58, 0.014, 0.018, brightBrass, sx, sy + 0.008, sz + sd * 0.48, ang);
      // Turned polished-brass baluster rising from the inner edge of each curved step
      var bx = sx + Math.cos(ang) * (sw * 0.44);
      var bz = sz - Math.sin(ang) * (sw * 0.44);
      if(i === 0){ bx0 = bx; bz0 = bz; }
      if(i <= 6){
        regionInteriorAddCyl(kit, group, 0.018, 0.022, 0.74, 8, brass, bx, sy + 0.37, bz);
        regionInteriorAdd(group, new T.SphereGeometry(0.026, 8, 6), kit.M(brightBrass), bx, sy + 0.74, bz);
      }
      // Continuous curved mahogany banister rail connecting step balusters
      if(i > 0 && i <= 6){
        var pt = (i - 1) / (steps - 1);
        var psy = i * 0.19;
        var pang = -0.32 + pt * 0.68;
        var psx = -2.84 - Math.sin(pt * Math.PI * 0.52) * 0.84;
        var psz = -1.16 - pt * 1.46;
        var psw = 1.42 + (1 - pt) * 0.28;
        var pbx = psx + Math.cos(pang) * (psw * 0.44);
        var pbz = psz - Math.sin(pang) * (psw * 0.44);
        var dx = bx - pbx, dy = (sy + 0.76) - (psy + 0.76), dz = bz - pbz;
        var len = Math.hypot(dx, dy, dz) || 0.1;
        var rail = regionInteriorAddBox(kit, group, 0.07, 0.06, len + 0.04, mahog, (bx + pbx) * 0.5, (sy + psy) * 0.5 + 0.76, (bz + pbz) * 0.5);
        rail.lookAt(bx, sy + 0.76, bz);
      }
    }
    // Carved mahogany & brass-orb grand bottom newel post grounded at y = 0 right at step 0's inner edge
    regionInteriorAddBox(kit, group, 0.16, 0.96, 0.16, mahog, bx0, 0.48, bz0);
    regionInteriorAddBox(kit, group, 0.20, 0.06, 0.20, brass, bx0, 0.94, bz0);
    regionInteriorAdd(group, new T.SphereGeometry(0.085, 10, 8), kit.M(brightBrass), bx0, 1.05, bz0);
    // Elevated upper marble mezzanine landing & brass-baluster balcony railing at back-left
    regionInteriorAddBox(kit, group, 2.95, 0.22, 1.25, marble, -3.10, 1.98, -2.42);
    regionInteriorAddBox(kit, group, 2.98, 0.05, 1.28, brass, -3.10, 2.09, -2.42);
    regionInteriorAddBox(kit, group, 2.90, 0.07, 0.08, mahog, -3.10, 2.76, -1.84);
    for(var mb = 0; mb < 8; mb++){
      var mx = -4.35 + mb * 0.35;
      regionInteriorAddCyl(kit, group, 0.018, 0.022, 0.66, 8, brass, mx, 2.42, -1.84);
    }
    // Ornate carved marble column supporting the inner mezzanine corner cleanly to floor y = 0
    regionInteriorAddCyl(kit, group, 0.15, 0.18, 0.14, 14, marbleTrim, -1.68, 0.07, -1.88);
    regionInteriorAddCyl(kit, group, 0.11, 0.13, 1.76, 14, marble, -1.68, 1.00, -1.88);
    regionInteriorAddCyl(kit, group, 0.16, 0.12, 0.12, 14, brass, -1.68, 1.88, -1.88);
  }

  function regionEncounterInteriorBuild(view, kind){
    var T = window.THREE;
    var kit = view && view.kit;
    var theme = REGION_INTERIOR_VENUES[kind];
    var layout = REGION_INTERIOR_LAYOUTS[kind] || REGION_INTERIOR_LAYOUTS.cafe;
    if(!T || !kit || !theme) return null;

    var root = new T.Group();
    root.name = 'encounter-interior-' + kind;
    var room = new T.Group();
    var night = typeof reefNight === 'function' && reefNight();
    var wallMat = regionInteriorWallMat(kit, kind, theme);
    var floorShadows = [];
    var aoStrips = [];
    var extraLights = [];
    var floorSlabSpec = { w: 9.4, d: 7.4, x: 0, z: 0.65 };

    // 1. Venue-specific floor slab spec (rendered live on root as glossy PBR surface!) & architectural room shell
    if(kind === 'taxi'){
      // Extended sunlit harbor pier apron running seamlessly outside the open garage arch (z = -5.45 .. +4.35)
      floorSlabSpec = { w: 10.6, d: 9.8, x: 0, z: -0.55 };
      // Yellow-and-charcoal curb stripe right across the sunlit harbor pier garage threshold
      for(var tc = -11; tc <= 3; tc++){
        regionInteriorAddBox(kit, room, 0.36, 0.018, 0.18, (tc % 2 === 0) ? 0xf2c13e : 0x252e38, tc * 0.36, 0.009, -3.02);
      }
      // Side walls + baseboards
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.6, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.6, wallMat, 4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.12, 0.13, 7.6, theme.windowFrame, -4.64, 0.065, 0.65);
      regionInteriorAddBox(kit, room, 0.12, 0.13, 7.6, theme.windowFrame, 4.64, 0.065, 0.65);
    } else if(kind === 'subway'){
      // Directive #364: Tracks & train shifted strictly <= -2.75; glossy passenger concourse x = -2.42..+4.70; yellow safety strip at x = -2.15!
      floorSlabSpec = { w: 7.12, d: 7.6, x: 1.14, z: 0.65 };
      regionInteriorAddBox(kit, room, 2.45, 0.14, 9.4, 0x2c3742, -3.65, -0.22, -0.35);
      // Concrete platform curb wall & bold textured yellow tactile safety edge strip cleanly at x = -2.15
      regionInteriorAddBox(kit, room, 0.18, 0.24, 7.6, 0x5c6d7d, -2.42, -0.10, 0.65);
      regionInteriorAddBox(kit, room, 0.24, 0.022, 7.6, 0xf4c438, -2.15, 0.011, 0.65);
      for(var td = -10; td <= 12; td++){
        regionInteriorAddCyl(kit, room, 0.030, 0.030, 0.012, 6, 0xe0aa24, -2.15, 0.024, td * 0.28);
      }
      // Twin steel train rails & oak railroad ties along recessed left track (strictly x <= -2.75!)
      [-4.22, -3.08].forEach(function(rx){
        regionInteriorAddBox(kit, room, 0.07, 0.08, 9.2, 0x9aa8b6, rx, -0.11, -0.35);
      });
      for(var ti = -12; ti <= 8; ti++){
        regionInteriorAddBox(kit, room, 1.54, 0.05, 0.18, 0x5c4432, -3.65, -0.14, ti * 0.42);
      }
      // Side walls + baseboards
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.6, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.6, wallMat, 4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.12, 0.13, 7.6, theme.windowFrame, 4.64, 0.065, 0.65);
    } else {
      floorSlabSpec = (kind === 'shop') ? { w: 9.4, d: 11.4, x: 0, z: 2.65 } : { w: 9.4, d: 7.4, x: 0, z: 0.65 };
      var sideFloorD = (kind === 'shop') ? 11.4 : 7.4;
      var sideFloorZ = (kind === 'shop') ? 2.65 : 0.65;
      regionInteriorAddBox(kit, room, 9.4, 0.13, 0.12, theme.windowFrame, 0, 0.065, -2.94);
      regionInteriorAddBox(kit, room, 9.4, 0.05, 0.10, theme.trim, 0, 0.155, -2.95);
      regionInteriorAddBox(kit, room, 0.12, 0.13, sideFloorD, theme.windowFrame, -4.64, 0.065, sideFloorZ);
      regionInteriorAddBox(kit, room, 0.10, 0.05, sideFloorD, theme.trim, -4.65, 0.155, sideFloorZ);
      regionInteriorAddBox(kit, room, 0.12, 0.13, sideFloorD, theme.windowFrame, 4.64, 0.065, sideFloorZ);
      regionInteriorAddBox(kit, room, 0.10, 0.05, sideFloorD, theme.trim, 4.65, 0.155, sideFloorZ);
    }

    // 2. Venue-specific mat/inlay directly beneath Shelly (zero repeated round rug template!)
    regionInteriorAddRug(kit, room, kind, theme, layout.rugX, layout.rugZ);

    // 3. Bespoke distinct architectural floor plan per Harbor Town venue!
    if(kind === 'cafe'){
      // =========================================================================
      // CAFE: Sage-Cream Ceramic Subway Tile + Warm Walnut Paneling, Curved
      // L-Shaped Espresso Bar & Arched Chalkboard, Large Harbor Bay Window RIGHT!
      // =========================================================================
      var cafeWainMat = regionInteriorWainscotMat(kit, 'cafe', theme);
      regionInteriorAddBox(kit, room, 9.4, 4.6, 0.14, wallMat, 0, 2.3, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, 4.7, 2.3, 0.65);
      // Warm recessed-frame walnut paneling & sage-and-brass chair rail
      regionInteriorAddBox(kit, room, 9.3, 1.24, 0.05, cafeWainMat, 0, 0.72, -2.93);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, cafeWainMat, -4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, cafeWainMat, 4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 9.3, 0.10, 0.09, theme.trim, 0, 1.38, -2.91);
      regionInteriorAddBox(kit, room, 9.3, 0.06, 0.12, theme.accent, 0, 1.45, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.018, 0.135, 0xd4a348, 0, 1.488, -2.895);
      regionInteriorAddBox(kit, room, 9.4, 0.16, 0.22, theme.trim, 0, 3.84, -2.88);
      regionInteriorAddBox(kit, room, 9.4, 0.12, 0.30, theme.counterPanel, 0, 3.96, -2.84);

      // Warm arched timber chalkboard menu behind Seahorse barista (left-center x = -1.26, crown cleanly inside camera frustum!)
      regionInteriorAddBox(kit, room, 1.88, 0.96, 0.05, theme.trim, -1.26, 2.04, -2.93);
      regionInteriorAddBox(kit, room, 1.80, 0.88, 0.055, 0xd4a348, -1.26, 2.04, -2.92);
      regionInteriorAddBox(kit, room, 1.72, 0.80, 0.058, regionInteriorArtMat(kit, 'cafe', theme), -1.26, 2.04, -2.90);
      // Semicircular arched timber chalkboard crown & brass keystone
      regionInteriorAdd(room, new T.TorusGeometry(0.92, 0.066, 8, 22, Math.PI), kit.M(theme.trim), -1.26, 2.50, -2.90);
      regionInteriorAdd(room, new T.TorusGeometry(0.83, 0.022, 6, 20, Math.PI), kit.M(0xd4a348), -1.26, 2.50, -2.88);
      regionInteriorAdd(room, new T.SphereGeometry(0.062, 10, 8), kit.M(0xe6be5c), -1.26, 3.42, -2.86);

      // Two-tiered coffee-tin, mug & trailing-ivy wall shelves on far left (x = -3.45)
      regionInteriorAddShelf(kit, room, -3.45, 2.12, 1.42, theme);
      regionInteriorAddShelf(kit, room, -3.45, 1.66, 1.42, theme);
      [[-3.90, 0x4b8f7a], [-3.52, 0xd98c46], [-3.14, 0xe26d5c]].forEach(function(tin){
        regionInteriorAddCyl(kit, room, 0.075, 0.075, 0.18, 10, tin[1], tin[0], 2.24, -2.82);
        regionInteriorAddCyl(kit, room, 0.08, 0.08, 0.03, 10, 0xd4a348, tin[0], 2.34, -2.82);
      });
      regionInteriorAddCyl(kit, room, 0.055, 0.044, 0.09, 10, 0xc76d47, -2.88, 2.20, -2.82);
      [[-2.88, 2.27, 0x489c64], [-2.82, 2.18, 0x5eb87a], [-2.79, 2.07, 0x3b8554]].forEach(function(iv){
        regionInteriorAdd(room, new T.SphereGeometry(0.048, 8, 6), kit.M(iv[2]), iv[0], iv[1], -2.79);
      });
      [-3.88, -3.60, -3.32, -3.04].forEach(function(mx, idx){
        regionInteriorAddCyl(kit, room, 0.06, 0.052, 0.10, 8, idx % 2 ? 0xfbf7f0 : theme.accent, mx, 1.74, -2.82);
      });

      // LEFT-CENTER CURVED L-SHAPED ESPRESSO BAR (front run x = -2.28..-0.18 + curved corner + left return back to wall!)
      regionInteriorAddBox(kit, room, 2.12, 0.06, 0.58, theme.windowFrame, -1.24, 0.03, -0.80);
      regionInteriorAddBox(kit, room, 2.08, 0.50, 0.54, theme.counter, -1.24, 0.25, -0.80);
      regionInteriorAddBox(kit, room, 0.84, 0.32, 0.04, theme.counterPanel, -1.72, 0.26, -0.52);
      regionInteriorAddBox(kit, room, 0.84, 0.32, 0.04, theme.counterPanel, -0.76, 0.26, -0.52);
      [-1.72, -0.76].forEach(function(px){
        regionInteriorAddBox(kit, room, 0.80, 0.016, 0.046, 0xd4a348, px, 0.41, -0.515);
        regionInteriorAddBox(kit, room, 0.80, 0.016, 0.046, 0xd4a348, px, 0.11, -0.515);
      });
      regionInteriorAddBox(kit, room, 2.24, 0.08, 0.66, theme.counterTop, -1.24, 0.54, -0.80);
      regionInteriorAddCyl(kit, room, 0.33, 0.33, 0.50, 16, theme.counter, -2.28, 0.25, -0.80);
      regionInteriorAddCyl(kit, room, 0.36, 0.36, 0.08, 16, theme.counterTop, -2.28, 0.54, -0.80);
      regionInteriorAddBox(kit, room, 0.58, 0.50, 2.04, theme.counter, -2.30, 0.25, -1.82);
      regionInteriorAddBox(kit, room, 0.66, 0.08, 2.12, theme.counterTop, -2.30, 0.54, -1.82);
      regionInteriorAddCyl(kit, room, 0.016, 0.016, 2.04, 10, 0xd4a348, -1.24, 0.095, -0.44, 0, Math.PI / 2);

      // Espresso machine on the curved left L-bar wing (x = -2.24, z = -1.24)
      var ex = -2.24, ez = -1.24;
      regionInteriorAddBox(kit, room, 0.36, 0.34, 0.44, 0xcbd2d9, ex, 0.75, ez);
      regionInteriorAddBox(kit, room, 0.38, 0.06, 0.46, theme.accent, ex, 0.94, ez);
      regionInteriorAddBox(kit, room, 0.34, 0.025, 0.42, 0xd4a348, ex, 0.98, ez);
      regionInteriorAddBox(kit, room, 0.14, 0.04, 0.44, 0x454f59, ex + 0.16, 0.60, ez);
      regionInteriorAddCyl(kit, room, 0.055, 0.055, 0.08, 10, 0x454f59, ex + 0.16, 0.78, ez + 0.08);
      regionInteriorAddCyl(kit, room, 0.014, 0.014, 0.14, 6, 0x3a2416, ex + 0.24, 0.74, ez + 0.08, 0, Math.PI / 2);
      regionInteriorAddCyl(kit, room, 0.042, 0.042, 0.02, 12, 0xfbf7f0, ex + 0.18, 0.82, ez - 0.10, 0, Math.PI / 2);
      [[ex - 0.04, 1.02, ez - 0.08], [ex + 0.04, 1.02, ez + 0.08], [ex + 0.04, 1.08, ez + 0.08]].forEach(function(cp){
        regionInteriorAddCyl(kit, room, 0.040, 0.035, 0.056, 10, 0xfbf7f0, cp[0], cp[1], cp[2]);
      });
      // Steaming heart-foam latte on left-front bar & glass pastry cloche dome on right-front bar
      regionInteriorAddCyl(kit, room, 0.085, 0.068, 0.014, 12, 0xfbf7f0, -1.78, 0.587, -0.76);
      regionInteriorAddCyl(kit, room, 0.064, 0.052, 0.095, 10, 0xffffff, -1.78, 0.64, -0.76);
      regionInteriorAddCyl(kit, room, 0.056, 0.056, 0.012, 10, 0xb87b4b, -1.78, 0.684, -0.76);
      regionInteriorAdd(room, new T.SphereGeometry(0.022, 8, 6), kit.M(0xfff6e5), -1.78, 0.691, -0.76);
      regionInteriorAddCyl(kit, room, 0.08, 0.11, 0.06, 12, 0x6f4325, -0.54, 0.61, -0.78);
      regionInteriorAddCyl(kit, room, 0.22, 0.20, 0.03, 14, 0x8c6244, -0.54, 0.65, -0.78);
      var cr = regionInteriorAdd(room, new T.TorusGeometry(0.062, 0.026, 8, 12, Math.PI * 1.15), kit.M(0xe5a448), -0.60, 0.685, -0.76, Math.PI / 2);
      cr.rotation.z = 0.4;
      [[-0.46, -0.82, 0xf296a8], [-0.48, -0.72, 0x7fd4b0], [-0.62, -0.86, 0xf5d678]].forEach(function(mc){
        regionInteriorAddCyl(kit, room, 0.034, 0.034, 0.028, 10, mc[2], mc[0], 0.682, mc[1]);
      });
      var cloche = regionInteriorAdd(room, new T.SphereGeometry(0.195, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), kit.M(0xeaf8ff, { transparent: true, opacity: 0.26 }), -0.54, 0.662, -0.78);
      cloche.scale.set(1, 0.92, 1);
      regionInteriorAdd(room, new T.SphereGeometry(0.024, 8, 6), kit.M(0xd4a348), -0.54, 0.85, -0.78);

      // Overhead sage-and-cream scalloped valance & twin hanging cafe pendants over LEFT espresso bar
      for(var av = 0; av < 6; av++){
        var avCol = av % 2 ? 0xfff6e5 : theme.accent;
        var avX = -2.28 + av * 0.42;
        regionInteriorAddBox(kit, room, 0.42, 0.26, 0.44, avCol, avX, 2.94, -0.95);
        regionInteriorAdd(room, new T.CylinderGeometry(0.21, 0.21, 0.44, 12, 1, false, -Math.PI / 2, Math.PI), kit.M(avCol), avX, 2.81, -0.95, Math.PI / 2);
      }
      [-2.04, -0.44].forEach(function(lx){
        regionInteriorAddCyl(kit, room, 0.09, 0.11, 0.04, 10, 0xd4a348, lx, 3.92, -0.62);
        regionInteriorAddCyl(kit, room, 0.015, 0.015, 1.24, 6, 0x3b3532, lx, 3.28, -0.62);
        regionInteriorAddCyl(kit, room, 0.10, 0.24, 0.18, 14, theme.accent, lx, 2.60, -0.62);
        regionInteriorAddCyl(kit, room, 0.24, 0.25, 0.028, 14, 0xf6d488, lx, 2.51, -0.62);
        regionInteriorAdd(room, new T.SphereGeometry(0.075, 8, 6), kit.M(0xfff4c2, { emissive: 0x5c461a }), lx, 2.49, -0.62);
      });

      // LARGE HARBOR BAY WINDOW ON THE RIGHT (x = +2.24, y = 2.26, z = -2.90) + Window Seat Banquette!
      var bwx = 2.24;
      regionInteriorAddBox(kit, room, 2.86, 1.66, 0.10, theme.windowFrame, bwx, 2.26, -2.93);
      regionInteriorAddBox(kit, room, 2.60, 1.42, 0.04, regionInteriorWindowMat(kit, night, 'default'), bwx, 2.26, -2.89);
      [bwx - 0.86, bwx + 0.86].forEach(function(mx){
        regionInteriorAddBox(kit, room, 0.06, 1.46, 0.06, theme.windowFrame, mx, 2.26, -2.86);
      });
      regionInteriorAddBox(kit, room, 2.64, 0.06, 0.06, theme.windowFrame, bwx, 2.44, -2.86);
      regionInteriorAddBox(kit, room, 2.96, 0.12, 0.28, theme.trim, bwx, 1.44, -2.82);
      regionInteriorAddCyl(kit, room, 0.028, 0.028, 3.26, 8, theme.trim, bwx, 3.16, -2.82, 0, Math.PI / 2);
      [-1, 1].forEach(function(side){
        var baseX = bwx + side * 1.38;
        for(var f = -1; f <= 1; f++){
          regionInteriorAddCyl(kit, room, 0.065, 0.055, 0.98, 8, theme.curtain, baseX + f * 0.09, 2.64, -2.80);
          regionInteriorAddCyl(kit, room, 0.055, 0.085, 0.58, 8, theme.curtain, baseX + f * 0.09 + side * 0.02, 1.84, -2.80);
        }
        regionInteriorAddBox(kit, room, 0.28, 0.055, 0.14, theme.rugTrim, baseX, 2.12, -2.79);
      });
      regionInteriorAddPlant(kit, room, bwx + 0.84, 1.50, -2.78, 0.44);
      regionInteriorAddBox(kit, room, 2.74, 0.44, 0.54, theme.counter, bwx, 0.22, -2.66);
      regionInteriorAddBox(kit, room, 2.66, 0.10, 0.50, theme.accent, bwx, 0.49, -2.64);
      regionInteriorAddBox(kit, room, 0.28, 0.24, 0.11, 0xfaf0d6, bwx - 1.02, 0.64, -2.74, 0.22);
      regionInteriorAddBox(kit, room, 0.28, 0.24, 0.11, 0xe26d5c, bwx + 1.02, 0.64, -2.74, -0.22);
      regionInteriorAddBistroTable(kit, room, 2.94, 0.0, -1.66);
      regionInteriorAddStool(kit, room, 2.34, 0.0, -1.78, 0.44, 0x6f4325, 0x579c87, true, 0.44);
      regionInteriorAddStool(kit, room, 3.54, 0.0, -1.78, 0.44, 0x6f4325, 0x579c87, true, -0.44);
      regionInteriorAddFramedArt(kit, room, 'cafe', 4.18, 2.34, 0.68, 0.78, 0x5c3e29);
      regionInteriorAddPlant(kit, room, -3.96, 0.0, -2.38, 0.86);
      // MIN-14: Bespoke roasted coffee-bean barrel & burlap sack in fg-left (no repeated plant template!)
      regionInteriorAddCoffeeBarrel(kit, room, -1.90, 0.0, 1.38);
      floorShadows.push(
        [-1.24, -0.80, 2.32, 0.78], [-2.30, -1.82, 0.80, 2.15],
        [-3.96, -2.38, 0.72, 0.72], [2.94, -1.66, 0.84, 0.84],
        [2.34, -1.78, 0.44, 0.44], [3.54, -1.78, 0.44, 0.44],
        [-1.80, 1.40, 0.72, 0.56]
      );
      aoStrips.push(
        [-1.24, -0.36, 2.28, 0.40, 0],
        [-2.74, -1.82, 2.12, 0.38, -Math.PI / 2],
        [bwx, -2.26, 2.86, 0.36, 0]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffeec2, intensity: night ? 0.38 : 0.72, dist: 12, pos: [2.24, 1.40, -2.35] },
        { color: 0xffe4aa, intensity: 0.42, dist: 9, pos: [-1.24, 1.75, -1.05] }
      );

    } else if(kind === 'restaurant'){
      // =========================================================================
      // RESTAURANT: Warm Mediterranean Terracotta Plaster + Rustic Stone/Brick
      // Dado & Open Kitchen Pass-Through Arch (Otter 100% Unobstructed!),
      // Round Bistro Table Moved Cleanly to Left-Center (x = -1.65, z = -1.35)!
      // =========================================================================
      var restWainMat = regionInteriorWainscotMat(kit, 'restaurant', theme);
      regionInteriorAddBox(kit, room, 9.4, 4.6, 0.14, wallMat, 0, 2.3, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, 4.7, 2.3, 0.65);
      // Rustic limestone & terracotta-brick Mediterranean dado wall + carved travertine chair rail
      regionInteriorAddBox(kit, room, 9.3, 1.24, 0.05, restWainMat, 0, 0.72, -2.93);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, restWainMat, -4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, restWainMat, 4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 9.3, 0.10, 0.10, 0xdfd0b8, 0, 1.38, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.06, 0.12, theme.accent, 0, 1.45, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.020, 0.135, 0xd4a348, 0, 1.49, -2.895);
      regionInteriorAddBox(kit, room, 9.4, 0.16, 0.22, 0x7c4b2b, 0, 3.84, -2.88);
      regionInteriorAddBox(kit, room, 9.4, 0.12, 0.30, 0x5c361d, 0, 3.96, -2.84);

      // MIN-10: ARCHED OPEN KITCHEN PASS-THROUGH WITH WARM TERRACOTTA-TILED BACKSPLASH, WOODEN DISH SHELVES,
      // STACKED BOWLS & OLIVE-OIL BOTTLES, AND SOFTLY GLOWING HAMMERED COPPER RANGE HOOD BEHIND OTTER (x = +0.52)!
      var pkx = 0.52;
      var kBackMat = regionInteriorKitchenBacksplashMat(kit, night);
      regionInteriorAddBox(kit, room, 2.22, 1.10, 0.06, kBackMat, pkx, 1.98, -2.93);
      regionInteriorAdd(room, new T.CircleGeometry(1.11, 24, 0, Math.PI), kBackMat, pkx, 2.46, -2.905);
      // Warm recessed walnut arch interior reveals for cozy architectural depth
      [-1.04, 1.04].forEach(function(rx){
        regionInteriorAddBox(kit, room, 0.06, 1.06, 0.16, 0x5c361d, pkx + rx, 1.96, -2.86);
      });
      // Softly glowing hammered copper range hood centered inside upper pass-through arch (y = 2.72..3.48)
      regionInteriorAddBox(kit, room, 0.42, 0.42, 0.14, 0xba6234, pkx, 3.26, -2.85);
      regionInteriorAddBox(kit, room, 0.48, 0.045, 0.17, 0xd4a348, pkx, 3.06, -2.84);
      regionInteriorAddCyl(kit, room, 0.24, 0.62, 0.34, 4, 0xc86d3d, pkx, 2.89, -2.84, 0, 0);
      var hoodBody = room.children[room.children.length - 1];
      hoodBody.rotation.y = Math.PI * 0.25;
      hoodBody.scale.set(1.38, 1.0, 0.36);
      // Riveted hammered brass range-hood apron rim & warm glowing culinary under-hood light strip
      regionInteriorAddBox(kit, room, 1.24, 0.075, 0.22, 0xb25a2e, pkx, 2.71, -2.82);
      regionInteriorAddBox(kit, room, 1.28, 0.028, 0.24, 0xe8bc62, pkx, 2.74, -2.81);
      regionInteriorAddBox(kit, room, 1.06, 0.028, 0.14, kit.M(0xfff0b8, { emissive: 0x9c7224 }), pkx, 2.665, -2.82);
      [-0.50, -0.25, 0.0, 0.25, 0.50].forEach(function(rvx){
        regionInteriorAdd(room, new T.SphereGeometry(0.016, 6, 6), kit.M(0xf2cf78), pkx + rvx, 2.71, -2.705);
      });
      // Cozy wooden dish shelves flanking inside the terracotta kitchen alcove (clearly visible around Otter!)
      [[-0.66, 1.88, 0.66], [0.66, 1.88, 0.66], [-0.66, 2.28, 0.62], [0.66, 2.28, 0.62]].forEach(function(sh){
        regionInteriorAddBox(kit, room, sh[2], 0.042, 0.14, 0x6f4325, pkx + sh[0], sh[1], -2.84);
        regionInteriorAddBox(kit, room, 0.04, 0.09, 0.11, 0x56321a, pkx + sh[0] - sh[2] * 0.34, sh[1] - 0.055, -2.85);
        regionInteriorAddBox(kit, room, 0.04, 0.09, 0.11, 0x56321a, pkx + sh[0] + sh[2] * 0.34, sh[1] - 0.055, -2.85);
      });
      // Left lower shelf: stacked cream & cobalt ceramic soup bowls + olive-oil bottle!
      for(var lb = 0; lb < 3; lb++){
        regionInteriorAddCyl(kit, room, 0.082, 0.058, 0.036, 10, lb === 1 ? 0x467a94 : 0xfbf7f0, pkx - 0.80, 1.92 + lb * 0.036, -2.83);
      }
      // Tall emerald-green & golden-amber glass olive-oil bottles w/ cork stoppers on left & right kitchen shelves
      [[-0.54, 1.90, 0x4b8e52, 0.18], [-0.42, 1.90, 0xdca038, 0.15], [0.44, 1.90, 0x4b8e52, 0.19], [0.58, 1.90, 0xd48e32, 0.16], [-0.52, 2.30, 0x56965c, 0.15], [0.50, 2.30, 0xe0a83c, 0.16]].forEach(function(ob){
        regionInteriorAddCyl(kit, room, 0.036, 0.040, ob[3], 10, ob[2], pkx + ob[0], ob[1] + ob[3] * 0.5, -2.83);
        regionInteriorAddCyl(kit, room, 0.015, 0.024, 0.06, 8, ob[2], pkx + ob[0], ob[1] + ob[3] + 0.03, -2.83);
        regionInteriorAddCyl(kit, room, 0.016, 0.014, 0.028, 8, 0xb8804a, pkx + ob[0], ob[1] + ob[3] + 0.068, -2.83);
        regionInteriorAddBox(kit, room, 0.048, 0.052, 0.012, 0xfbf3dc, pkx + ob[0], ob[1] + ob[3] * 0.48, -2.79);
      });
      // Right lower shelf: stacked bistro bowls & decorative upright painted Mediterranean ceramic plates on upper shelves
      for(var rb = 0; rb < 3; rb++){
        regionInteriorAddCyl(kit, room, 0.080, 0.056, 0.036, 10, rb === 1 ? 0xd96b5a : 0xfbf7f0, pkx + 0.80, 1.92 + rb * 0.036, -2.83);
      }
      [[-0.78, 2.40, 0xfbf7f0, 0x427fa3], [0.76, 2.40, 0xfbf7f0, 0xd96b5a]].forEach(function(pl){
        regionInteriorAddCyl(kit, room, 0.105, 0.105, 0.018, 14, pl[2], pkx + pl[0], pl[1], -2.86, Math.PI / 2);
        regionInteriorAddCyl(kit, room, 0.068, 0.068, 0.022, 12, pl[3], pkx + pl[0], pl[1], -2.855, Math.PI / 2);
      });
      // Rustic alternating terracotta-brick & cream-limestone arch voussoir blocks around arch!
      regionInteriorAdd(room, new T.TorusGeometry(1.13, 0.11, 8, 26, Math.PI), kit.M(0xb8583e), pkx, 2.46, -2.87);
      for(var vi = 0; vi <= 10; vi++){
        var va = (vi / 10) * Math.PI;
        var vx = pkx + Math.cos(va) * 1.14, vy = 2.46 + Math.sin(va) * 1.14;
        var vCol = (vi === 5) ? 0xebdbc0 : ((vi % 2 === 0) ? 0xc86448 : 0xdcc5a4);
        var vBlock = regionInteriorAddBox(kit, room, vi === 5 ? 0.26 : 0.20, vi === 5 ? 0.30 : 0.24, 0.18, vCol, vx, vy, -2.84);
        vBlock.rotation.z = va - Math.PI * 0.5;
      }
      regionInteriorAdd(room, new T.TorusGeometry(1.01, 0.030, 6, 24, Math.PI), kit.M(0x6f4325), pkx, 2.46, -2.81);
      // Rustic staggered stone & brick pass-through jamb pilasters
      [-1.14, 1.14].forEach(function(sideX){
        for(var jb = 0; jb < 5; jb++){
          regionInteriorAddBox(kit, room, jb % 2 ? 0.24 : 0.20, 0.20, 0.18, jb % 2 ? 0xdcc5a4 : 0xc25f44, pkx + sideX, 1.54 + jb * 0.21, -2.85);
        }
        regionInteriorAddBox(kit, room, 0.28, 0.08, 0.22, 0x6f4325, pkx + sideX, 2.46, -2.83);
      });
      // Beveled walnut pass-through serving shelf with stacked soup bowls & simmering copper stockpot inside kitchen
      regionInteriorAddBox(kit, room, 2.58, 0.11, 0.38, 0x6f4325, pkx, 1.44, -2.76);
      regionInteriorAddBox(kit, room, 2.60, 0.026, 0.40, 0xd4a348, pkx, 1.49, -2.75);
      regionInteriorAddCyl(kit, room, 0.14, 0.14, 0.18, 14, 0xd67a48, pkx - 0.74, 1.59, -2.78);
      regionInteriorAddCyl(kit, room, 0.15, 0.15, 0.03, 14, 0xe89b66, pkx - 0.74, 1.69, -2.78);
      [pkx + 0.70, pkx + 0.94].forEach(function(bx){
        for(var bi = 0; bi < 3; bi++){
          regionInteriorAddCyl(kit, room, 0.095, 0.07, 0.032, 12, 0xfbf7f0, bx, 1.52 + bi * 0.032, -2.76);
        }
      });
      // Gleaming brass pot-rack rail spanning across the kitchen pass-through arch with 4 HANGING COPPER POTS & SKILLETS!
      regionInteriorAddCyl(kit, room, 0.024, 0.024, 2.06, 10, 0xd4a348, pkx, 2.62, -2.74, 0, Math.PI / 2);
      [[-0.66, 0.14, 2.26, 0.21], [-0.22, 0.17, 2.24, 0.21], [0.22, 0.14, 2.28, 0.19], [0.66, 0.16, 2.25, 0.21]].forEach(function(pan){
        var px = pkx + pan[0];
        regionInteriorAdd(room, new T.TorusGeometry(0.024, 0.007, 6, 10), kit.M(0xe6bc58), px, 2.60, -2.74);
        regionInteriorAddBox(kit, room, 0.036, pan[3], 0.026, 0x5c361d, px, 2.50, -2.74);
        regionInteriorAddCyl(kit, room, pan[1], pan[1] * 0.88, 0.05, 14, 0xd67a48, px, pan[2], -2.73, Math.PI / 2);
        regionInteriorAddCyl(kit, room, pan[1] * 0.76, pan[1] * 0.76, 0.056, 14, 0x994a28, px, pan[2], -2.725, Math.PI / 2);
        regionInteriorAdd(room, new T.TorusGeometry(pan[1] * 0.94, 0.011, 6, 14), kit.M(0xe89b66), px, pan[2], -2.705);
      });
      [pkx - 0.88, pkx + 0.88].forEach(function(lx){
        regionInteriorAddCyl(kit, room, 0.012, 0.012, 0.42, 6, 0x3b302a, lx, 2.86, -2.62);
        regionInteriorAddCyl(kit, room, 0.05, 0.13, 0.13, 14, 0xd4a348, lx, 2.60, -2.62);
        regionInteriorAdd(room, new T.SphereGeometry(0.055, 10, 8), kit.M(0xfff4c2, { emissive: 0x6e5214 }), lx, 2.52, -2.62);
      });

      // TWIN NARROW ARCHED LANTERN WINDOWS FLANKING THE PASS-THROUGH (x = -2.86 and x = +3.52)
      [[-2.86, 1], [3.52, -1]].forEach(function(wSpec){
        var wx = wSpec[0], lDir = wSpec[1];
        regionInteriorAddBox(kit, room, 1.32, 1.48, 0.08, theme.windowFrame, wx, 2.16, -2.93);
        regionInteriorAddBox(kit, room, 1.10, 1.28, 0.04, regionInteriorWindowMat(kit, night, 'restaurant'), wx, 2.16, -2.89);
        regionInteriorAdd(room, new T.CircleGeometry(0.56, 18, 0, Math.PI), regionInteriorWindowMat(kit, night, 'restaurant'), wx, 2.80, -2.88);
        regionInteriorAdd(room, new T.TorusGeometry(0.60, 0.062, 8, 18, Math.PI), kit.M(theme.windowFrame), wx, 2.80, -2.86);
        regionInteriorAddBox(kit, room, 0.05, 1.32, 0.06, theme.windowFrame, wx, 2.16, -2.86);
        regionInteriorAddBox(kit, room, 1.12, 0.05, 0.06, theme.windowFrame, wx, 2.20, -2.86);
        regionInteriorAddBox(kit, room, 1.44, 0.10, 0.18, 0xdfd0b8, wx, 1.42, -2.85);
        [-0.58, 0.58].forEach(function(sd){
          regionInteriorAddCyl(kit, room, 0.06, 0.05, 0.90, 8, theme.curtain, wx + sd, 2.58, -2.82);
          regionInteriorAddCyl(kit, room, 0.05, 0.075, 0.56, 8, theme.curtain, wx + sd, 1.82, -2.82);
          regionInteriorAddBox(kit, room, 0.18, 0.045, 0.12, theme.rugTrim, wx + sd, 2.12, -2.81);
        });
        regionInteriorAddPlant(kit, room, wx - lDir * 0.24, 1.48, -2.80, 0.36);
        var lnx = wx + lDir * 0.98;
        regionInteriorAddBox(kit, room, 0.08, 0.22, 0.04, 0x5c361d, lnx, 2.40, -2.91);
        regionInteriorAddBox(kit, room, 0.04, 0.04, 0.18, 0xd4a348, lnx, 2.46, -2.82);
        regionInteriorAddCyl(kit, room, 0.03, 0.11, 0.08, 8, 0x5c361d, lnx, 2.38, -2.74);
        regionInteriorAddCyl(kit, room, 0.08, 0.065, 0.17, 8, kit.M(0xffe896, { emissive: 0x6a4e12 }), lnx, 2.25, -2.74);
        regionInteriorAddCyl(kit, room, 0.075, 0.03, 0.05, 8, 0xd4a348, lnx, 2.15, -2.74);
      });

      // MAJ-1 & MIN-14: Round Coral-Bistro Dining Table cleanly repositioned to LEFT-CENTER (x = -1.65, z = -1.48)
      // so Otter stands 100% unobstructed and nudged Shelly has generous room behind her!
      var dtx = -1.65, dtz = -1.48;
      regionInteriorAddCyl(kit, room, 0.24, 0.30, 0.05, 18, 0x5c361d, dtx, 0.025, dtz);
      regionInteriorAddCyl(kit, room, 0.16, 0.20, 0.03, 18, 0xd4a348, dtx, 0.062, dtz);
      regionInteriorAddCyl(kit, room, 0.068, 0.086, 0.50, 14, 0x7c4c2b, dtx, 0.32, dtz);
      regionInteriorAdd(room, new T.SphereGeometry(0.09, 12, 8), kit.M(0x5c361d), dtx, 0.28, dtz);
      regionInteriorAddCyl(kit, room, 0.46, 0.44, 0.048, 24, 0xf6efe4, dtx, 0.595, dtz);
      regionInteriorAdd(room, new T.TorusGeometry(0.46, 0.013, 6, 24), kit.M(0xd4a348), dtx, 0.595, dtz, Math.PI / 2);
      regionInteriorAddBox(kit, room, 0.24, 0.012, 0.92, 0xd96b5a, dtx, 0.625, dtz);
      regionInteriorAddBox(kit, room, 0.17, 0.014, 0.92, 0xf7e7cf, dtx, 0.626, dtz);
      [-0.465, 0.465].forEach(function(ez){
        regionInteriorAddBox(kit, room, 0.24, 0.12, 0.016, 0xd96b5a, dtx, 0.562, dtz + ez);
      });
      // Hurricane candle lantern, bread basket & plate on moved left-center dining table
      regionInteriorAddCyl(kit, room, 0.065, 0.076, 0.020, 14, 0xd4a348, dtx - 0.02, 0.640, dtz - 0.03);
      regionInteriorAddCyl(kit, room, 0.032, 0.034, 0.095, 10, 0xfff8e6, dtx - 0.02, 0.695, dtz - 0.03);
      regionInteriorAdd(room, new T.SphereGeometry(0.019, 8, 6), kit.M(0xffde74, { emissive: 0x7c5210 }), dtx - 0.02, 0.76, dtz - 0.03);
      regionInteriorAddCyl(kit, room, 0.058, 0.058, 0.15, 12, kit.M(0xfff6e0, { transparent: true, opacity: 0.24 }), dtx - 0.02, 0.72, dtz - 0.03);
      regionInteriorAddCyl(kit, room, 0.12, 0.09, 0.068, 12, 0xc98f4a, dtx - 0.24, 0.655, dtz + 0.05);
      regionInteriorAdd(room, new T.SphereGeometry(0.042, 8, 6), kit.M(0xe6b062), dtx - 0.24, 0.70, dtz + 0.05);
      regionInteriorAddCyl(kit, room, 0.10, 0.075, 0.016, 14, 0xfbf7f0, dtx + 0.24, 0.630, dtz + 0.10);
      regionInteriorAddCyl(kit, room, 0.068, 0.068, 0.012, 12, 0xe26d5c, dtx + 0.24, 0.640, dtz + 0.10);
      // Two cozy curved bentwood dining chairs tucked cleanly beside the left-center dining table (clear of Shelly & Otter!)
      regionInteriorAddStool(kit, room, -2.32, 0.0, -1.66, 0.44, 0x6f4325, 0xd96b5a, true, 0.74);
      regionInteriorAddStool(kit, room, -0.96, 0.0, -1.68, 0.44, 0x6f4325, 0xd96b5a, true, -0.72);

      // Supporting Mediterranean bistro details (oak wine/olive-oil cask replaces repeated right potted plant!)
      regionInteriorAddBistroSideboard(kit, room, 3.44, 0.0, -2.44);
      regionInteriorAddEaselMenu(kit, room, 2.38, 0.0, -0.78, -0.38);
      regionInteriorAddFramedArt(kit, room, 'restaurant', -4.08, 2.34, 0.68, 0.78, 0x6f4325);
      regionInteriorAddPlant(kit, room, -3.96, 0.0, -2.38, 0.80);
      regionInteriorAddBistroWineCask(kit, room, 1.78, 0.0, 1.38);
      regionInteriorAddBistroOliveLemonTree(kit, room, -1.94, 0.0, 1.54);
      floorShadows.push(
        [dtx, dtz, 1.02, 1.02], [-2.32, -1.56, 0.48, 0.48], [-0.96, -1.58, 0.48, 0.48],
        [3.44, -2.44, 1.26, 0.62], [2.38, -0.78, 0.56, 0.54], [-3.96, -2.38, 0.66, 0.66],
        [1.78, 1.38, 0.58, 0.58], [-1.94, 1.54, 0.42, 0.42]
      );
      aoStrips.push(
        [3.44, -2.02, 1.22, 0.36, 0]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffe8b8, intensity: night ? 0.36 : 0.64, dist: 11, pos: [-2.86, 1.45, -2.35] },
        { color: night ? 0x9ec4f8 : 0xffe8b8, intensity: night ? 0.36 : 0.64, dist: 11, pos: [3.52, 1.45, -2.35] },
        { color: 0xffdf9e, intensity: 0.48, dist: 9, pos: [pkx, 1.95, -2.25] }
      );

    } else if(kind === 'shop'){
      // =========================================================================
      // SHOP: Coastal Pearl-Mosaic Upper Wall + Scalloped Aqua Beadboard Dado,
      // Curved Boutique Showcase Gallery, Octagonal Display Pedestal, Sunburst Arch!
      // =========================================================================
      var shopWainMat = regionInteriorWainscotMat(kit, 'shop', theme);
      regionInteriorAddBox(kit, room, 9.4, 7.6, 0.14, wallMat, 0, 3.8, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 7.6, 11.4, wallMat, -4.7, 3.8, 2.65);
      regionInteriorAddBox(kit, room, 0.14, 7.6, 11.4, wallMat, 4.7, 3.8, 2.65);
      // Scalloped coastal aqua-seafoam vertical beadboard paneling & sculpted pearl wave chair rail!
      regionInteriorAddBox(kit, room, 9.3, 1.24, 0.05, shopWainMat, 0, 0.72, -2.93);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, shopWainMat, -4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, shopWainMat, 4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 9.3, 0.09, 0.10, 0xf8f1e0, 0, 1.38, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.045, 0.12, 0x5ca4ac, 0, 1.445, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.020, 0.135, 0xd4a348, 0, 1.485, -2.895);
      regionInteriorAddBox(kit, room, 9.4, 0.16, 0.22, 0x5ca4ac, 0, 3.84, -2.88);
      regionInteriorAddBox(kit, room, 9.4, 0.12, 0.30, 0xf8f1e0, 0, 3.96, -2.84);

      // CENTERED ARCHED SUNLIT SKYLIGHT WINDOW BEHIND OCTOPUS (x = +0.18, sunburst crown at y = 3.56 cleanly inside viewport!)
      var skx = 0.18;
      regionInteriorAddBox(kit, room, 2.24, 1.18, 0.08, theme.windowFrame, skx, 2.02, -2.93);
      regionInteriorAddBox(kit, room, 2.02, 1.00, 0.04, regionInteriorWindowMat(kit, night, 'default'), skx, 2.02, -2.89);
      regionInteriorAdd(room, new T.CircleGeometry(1.02, 24, 0, Math.PI), regionInteriorWindowMat(kit, night, 'default'), skx, 2.52, -2.88);
      regionInteriorAdd(room, new T.TorusGeometry(1.04, 0.082, 8, 26, Math.PI), kit.M(theme.windowFrame), skx, 2.52, -2.86);
      regionInteriorAdd(room, new T.TorusGeometry(0.95, 0.024, 6, 24, Math.PI), kit.M(0xd4a348), skx, 2.52, -2.84);
      for(var sr = 1; sr <= 5; sr++){
        var sAng = (sr / 6) * Math.PI;
        var ray = regionInteriorAddBox(kit, room, 0.032, 0.98, 0.04, 0xd4a348, skx + Math.cos(sAng) * 0.48, 2.52 + Math.sin(sAng) * 0.48, -2.85);
        ray.rotation.z = sAng - Math.PI * 0.5;
      }
      regionInteriorAddBox(kit, room, 0.06, 1.04, 0.06, theme.windowFrame, skx - 0.52, 2.02, -2.86);
      regionInteriorAddBox(kit, room, 0.06, 1.04, 0.06, theme.windowFrame, skx + 0.52, 2.02, -2.86);
      regionInteriorAddBox(kit, room, 2.06, 0.06, 0.06, theme.windowFrame, skx, 2.52, -2.85);
      regionInteriorAddBox(kit, room, 2.38, 0.10, 0.18, 0xf8f1e0, skx, 1.44, -2.85);
      [-1.10, 1.10].forEach(function(sd){
        regionInteriorAddCyl(kit, room, 0.07, 0.055, 0.88, 8, theme.curtain, skx + sd, 2.36, -2.82);
        regionInteriorAddCyl(kit, room, 0.055, 0.085, 0.52, 8, theme.curtain, skx + sd, 1.72, -2.82);
        regionInteriorAddBox(kit, room, 0.24, 0.05, 0.12, theme.rugTrim, skx + sd, 1.96, -2.81);
      });
      regionInteriorAdd(room, new T.TorusGeometry(0.15, 0.015, 6, 14), kit.M(0xd4a348), skx, 2.94, -2.66, Math.PI / 2);
      [[-0.10, 0xf28c74], [0, 0x62d0d8], [0.10, 0xf3c64f]].forEach(function(ch, ci){
        regionInteriorAddCyl(kit, room, 0.005, 0.005, 0.18 + ci * 0.03, 6, 0xf7edd9, skx + ch[0], 2.84 - ci * 0.015, -2.66);
        regionInteriorAdd(room, new T.SphereGeometry(0.030, 8, 6), kit.M(ch[1]), skx + ch[0], 2.73 - ci * 0.03, -2.66);
      });

      // CURVED BOUTIQUE SHOWCASE GALLERY WRAPPING BOTH WALLS (left angled bay & right angled bay)
      function addBoutiqueShowcaseUnit(cx, cz, ry, isRight){
        var sg = new T.Group();
        sg.position.set(cx, 0, cz);
        sg.rotation.y = ry;
        regionInteriorAddBox(kit, sg, 1.88, 0.68, 0.48, theme.counter, 0, 0.34, 0);
        regionInteriorAddBox(kit, sg, 1.94, 0.06, 0.54, theme.counterTop, 0, 0.70, 0);
        regionInteriorAddBox(kit, sg, 1.84, 0.025, 0.04, 0xd4a348, 0, 0.62, 0.24);
        [-0.90, 0.90].forEach(function(px){
          regionInteriorAddBox(kit, sg, 0.09, 2.02, 0.44, 0x8c6239, px, 1.68, -0.02);
        });
        regionInteriorAddBox(kit, sg, 1.96, 0.12, 0.48, 0x8c6239, 0, 2.72, -0.02);
        regionInteriorAddBox(kit, sg, 1.88, 0.04, 0.50, 0xd4a348, 0, 2.66, -0.01);
        [1.36, 1.98].forEach(function(sy){
          regionInteriorAddBox(kit, sg, 1.80, 0.055, 0.36, 0x8c6239, 0, sy, -0.04);
        });
        if(!isRight){
          [[-0.48, 0.80, 0xe87b6a], [-0.26, 0.80, 0x52b6c8], [-0.37, 0.90, 0xf2c24b]].forEach(function(fb){
            regionInteriorAddCyl(kit, sg, 0.064, 0.064, 0.34, 12, fb[2], fb[0], fb[1], 0.02, Math.PI / 2);
            regionInteriorAddCyl(kit, sg, 0.066, 0.066, 0.022, 12, 0xfff4dc, fb[0], fb[1], 0.02, Math.PI / 2);
          });
          regionInteriorAddCyl(kit, sg, 0.11, 0.13, 0.06, 10, 0xd4a348, 0.42, 0.76, 0.02);
          regionInteriorAdd(sg, new T.SphereGeometry(0.10, 10, 8), kit.M(0xfff9ee), 0.42, 0.87, 0.02);
          [[-0.58, 0xff7f66], [-0.18, 0x55b8d4], [0.22, 0x73c992], [0.60, 0xe6b85c]].forEach(function(jr){
            regionInteriorAddCyl(kit, sg, 0.085, 0.10, 0.18, 10, jr[1], jr[0], 1.48, -0.02);
            regionInteriorAddCyl(kit, sg, 0.038, 0.085, 0.08, 10, jr[1], jr[0], 1.61, -0.02);
            regionInteriorAdd(sg, new T.SphereGeometry(0.046, 8, 6), kit.M(0xf7ecd2), jr[0], 1.68, -0.02);
          });
          regionInteriorAddCyl(kit, sg, 0.16, 0.12, 0.06, 10, 0xf28c74, -0.36, 2.04, -0.02);
          regionInteriorAdd(sg, new T.SphereGeometry(0.08, 10, 8), kit.M(0xfff9ee), -0.36, 2.11, -0.02);
          regionInteriorAddBox(kit, sg, 0.32, 0.14, 0.22, 0xf3c64f, 0.40, 2.08, -0.02);
          regionInteriorAddBox(kit, sg, 0.28, 0.12, 0.20, 0xe87b88, 0.40, 2.21, -0.02);
        } else {
          var rx = -0.32;
          regionInteriorAddBox(kit, sg, 0.40, 0.10, 0.32, 0x7d4c2a, rx, 0.78, 0.04);
          regionInteriorAddBox(kit, sg, 0.36, 0.24, 0.26, 0xd8a848, rx, 0.93, 0.02);
          regionInteriorAddBox(kit, sg, 0.22, 0.10, 0.03, 0x2a333d, rx, 1.09, 0.0);
          regionInteriorAddBox(kit, sg, 0.18, 0.06, 0.036, 0xfff4c2, rx, 1.09, 0.004);
          regionInteriorAddBox(kit, sg, 0.34, 0.18, 0.24, 0x52b6c8, 0.44, 0.82, 0.02);
          regionInteriorAddBox(kit, sg, 0.36, 0.04, 0.26, 0xf2c24b, 0.44, 0.92, 0.02);
          [[-0.56, 0xe87b88], [-0.14, 0xf3c64f], [0.28, 0x55b8d4], [0.62, 0xf28c74]].forEach(function(jr){
            regionInteriorAddCyl(kit, sg, 0.075, 0.10, 0.18, 10, jr[1], jr[0], 1.48, -0.02);
            regionInteriorAddCyl(kit, sg, 0.035, 0.075, 0.07, 10, jr[1], jr[0], 1.60, -0.02);
            regionInteriorAdd(sg, new T.SphereGeometry(0.044, 8, 6), kit.M(0xfff4dc), jr[0], 1.67, -0.02);
          });
          regionInteriorAddBox(kit, sg, 1.44, 0.56, 0.05, regionInteriorArtMat(kit, 'shop', theme), 0, 2.32, -0.06);
        }
        room.add(sg);
      }
      addBoutiqueShowcaseUnit(-3.04, -2.06, 0.44, false);
      addBoutiqueShowcaseUnit(3.26, -2.02, -0.44, true);

      // CENTRAL OCTAGONAL DISPLAY PEDESTAL IN FRONT OF OCTOPUS (x = +0.18, z = -0.72)
      var opx = 0.18, opz = -0.72;
      regionInteriorAddCyl(kit, room, 0.66, 0.70, 0.08, 8, theme.windowFrame, opx, 0.04, opz);
      regionInteriorAddCyl(kit, room, 0.56, 0.58, 0.44, 8, theme.counter, opx, 0.28, opz);
      regionInteriorAddCyl(kit, room, 0.585, 0.585, 0.03, 8, 0xd4a348, opx, 0.12, opz);
      regionInteriorAddCyl(kit, room, 0.585, 0.585, 0.03, 8, 0xd4a348, opx, 0.46, opz);
      regionInteriorAddCyl(kit, room, 0.64, 0.60, 0.07, 8, theme.counterTop, opx, 0.535, opz);
      regionInteriorAddCyl(kit, room, 0.12, 0.15, 0.04, 14, 0xd4a348, opx, 0.59, opz);
      regionInteriorAdd(room, new T.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), kit.M(0xf28c74), opx, 0.615, opz, Math.PI);
      regionInteriorAdd(room, new T.SphereGeometry(0.068, 12, 10), kit.M(0xfffaf0, { emissive: 0x423822 }), opx, 0.68, opz);
      [[-0.36, 0.06], [0.36, 0.06]].forEach(function(sb, sbi){
        regionInteriorAddCyl(kit, room, 0.15, 0.11, 0.13, 12, 0xc98f4a, opx + sb[0], 0.635, opz + sb[1]);
        regionInteriorAdd(room, new T.TorusGeometry(0.148, 0.014, 6, 12), kit.M(0xa66e32), opx + sb[0], 0.70, opz + sb[1], Math.PI / 2);
        [[-0.045, sbi ? 0x55b8d4 : 0xe87b88], [0.04, sbi ? 0xf3c64f : 0x6ac8a2], [0.0, 0xf28c74]].forEach(function(sc, si){
          regionInteriorAddCyl(kit, room, 0.034, 0.034, 0.14, 8, sc[1], opx + sb[0] + sc[0], 0.72, opz + sb[1] + (si - 1) * 0.025, 0.25, (si - 1) * 0.22);
        });
      });

      [-1.08, 1.44].forEach(function(lx){
        regionInteriorAddCyl(kit, room, 0.08, 0.10, 0.04, 10, 0xd4a348, lx, 3.92, -0.68);
        regionInteriorAddCyl(kit, room, 0.014, 0.014, 1.18, 6, 0x3b3532, lx, 3.30, -0.68);
        regionInteriorAddCyl(kit, room, 0.09, 0.23, 0.17, 14, theme.accent, lx, 2.66, -0.68);
        regionInteriorAdd(room, new T.SphereGeometry(0.072, 8, 6), kit.M(0xfff4c2, { emissive: 0x5c461a }), lx, 2.55, -0.68);
      });

      // Coastal gift treasure chest, framed art & woven seashell/scarf gift hamper (replaces repeated plant!)
      var gcx = 3.24, gcz = -0.82;
      regionInteriorAddBox(kit, room, 0.74, 0.40, 0.44, 0x7d4c2a, gcx, 0.20, gcz, -0.32);
      regionInteriorAddCyl(kit, room, 0.21, 0.21, 0.74, 10, 0x6e4222, gcx, 0.40, gcz, 0, Math.PI / 2);
      regionInteriorAddBox(kit, room, 0.12, 0.12, 0.04, 0xf2cc62, gcx - 0.08, 0.32, gcz + 0.22, -0.32);
      regionInteriorAddFramedArt(kit, room, 'shop', -4.18, 2.36, 0.66, 0.76, 0x6c4928);
      regionInteriorAddShopShellHamper(kit, room, 1.76, 0.0, 1.36);
      floorShadows.push(
        [opx, opz, 1.62, 1.62], [-3.04, -2.06, 2.02, 0.88], [3.26, -2.02, 2.02, 0.88],
        [gcx, gcz, 0.88, 0.62], [1.76, 1.36, 0.62, 0.62]
      );
      aoStrips.push(
        [-2.88, -1.70, 1.98, 0.36, 0.44],
        [3.10, -1.66, 1.98, 0.36, -0.44]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffeec2, intensity: night ? 0.38 : 0.72, dist: 12, pos: [skx, 1.55, -2.25] }
      );

    } else if(kind === 'taxi'){
      // =========================================================================
      // TAXI: Open-Air Harbor Pier Taxi Garage Arch — Wide Striped Garage Bay
      // Opening Straight onto Sunlit Harbor Pier w/ 3D Parked Yellow Harbor Cab
      // Visible Outside + Right-Side Dispatch Booth & Fare Board + Raised Squid!
      // =========================================================================
      // Sunlit Harbor Pier panoramic backdrop visible through the wide open garage arch (z = -5.42)
      regionInteriorAddBox(kit, room, 10.8, 4.5, 0.08, regionInteriorWindowMat(kit, night, 'friend'), 0, 2.25, -5.42);
      // Right-side solid cream harbor dispatch wall (x = +0.76 .. +4.70)
      regionInteriorAddBox(kit, room, 4.02, 4.6, 0.18, wallMat, 2.74, 2.3, -2.96);
      regionInteriorAddBox(kit, room, 3.96, 1.24, 0.06, theme.counterPanel, 2.74, 0.72, -2.86);
      for(var td2 = 4; td2 <= 19; td2++){
        regionInteriorAddBox(kit, room, 0.24, 0.085, 0.04, (td2 % 2) ? 0x252e38 : 0xf0be38, td2 * 0.24, 1.48, -2.84);
      }

      // WIDE OPEN-AIR STRIPED GARAGE BAY ARCH (x = -4.20 .. +0.76, opening straight onto sunlit pier!)
      // Left & right striped masonry garage piers
      [-4.34, 0.82].forEach(function(px){
        regionInteriorAddBox(kit, room, 0.52, 3.65, 0.34, 0x364554, px, 1.825, -2.92);
        for(var sy = 0; sy < 5; sy++){
          regionInteriorAddBox(kit, room, 0.56, 0.22, 0.38, (sy % 2 === 0) ? 0xf2c13e : 0x252e38, px, 0.14 + sy * 0.24, -2.92);
        }
      });
      // Overhead wide striped garage arch header + rolled corrugated garage shutter slats peeking from top!
      regionInteriorAddBox(kit, room, 5.66, 0.96, 0.34, 0x364554, -1.76, 3.64, -2.92);
      for(var sh = 0; sh < 4; sh++){
        regionInteriorAddBox(kit, room, 4.72, 0.09, 0.14, (sh % 2) ? 0xb4c0ca : 0x9aa8b4, -1.76, 3.12 - sh * 0.10, -2.98);
      }
      // Bold checkered yellow-and-black garage bay arch stripe + backlit HARBOR TAXI beacon!
      for(var gc = 0; gc < 18; gc++){
        regionInteriorAddBox(kit, room, 0.28, 0.11, 0.38, (gc % 2) ? 0x252e38 : 0xf2c13e, -4.16 + gc * 0.28, 3.20, -2.90);
      }
      // Corner arch knee brackets giving an unmistakable curved garage arch silhouette
      [-3.82, 0.30].forEach(function(kx, ki){
        var kb = regionInteriorAddBox(kit, room, 0.16, 0.82, 0.26, 0x252e38, kx, 2.86, -2.90);
        kb.rotation.z = ki ? -0.78 : 0.78;
      });
      regionInteriorAddBox(kit, room, 1.72, 0.34, 0.26, 0x252e38, -1.76, 3.52, -2.80);
      regionInteriorAddBox(kit, room, 1.58, 0.24, 0.28, kit.M(0xffe178, { emissive: 0x6a4e10 }), -1.76, 3.52, -2.79);
      // Twin brass-caged maritime pier garage hanging lamps inside the arch
      [-3.36, 0.08].forEach(function(lx){
        regionInteriorAddCyl(kit, room, 0.014, 0.014, 0.42, 6, 0x252e38, lx, 2.98, -2.72);
        regionInteriorAddCyl(kit, room, 0.04, 0.13, 0.10, 12, 0x252e38, lx, 2.74, -2.72);
        regionInteriorAddCyl(kit, room, 0.09, 0.08, 0.18, 10, kit.M(0xfff4c2, { emissive: 0x6c5218 }), lx, 2.60, -2.72);
        regionInteriorAdd(room, new T.TorusGeometry(0.105, 0.010, 6, 12), kit.M(0xd4a348), lx, 2.60, -2.72, Math.PI / 2);
      });

      // 3D PARKED YELLOW HARBOR CAB VISIBLE RIGHT OUTSIDE THE GARAGE ARCH ON THE PIER (framed cleanly between Shelly & Squid!)
      regionInteriorAddParkedYellowCab(kit, room, -1.16, 0.0, -4.18, 0.42);
      // Wooden harbor pier mooring bollard & coiled rope outside on the pier beside the cab
      regionInteriorAddCyl(kit, room, 0.11, 0.13, 0.44, 10, 0x6f4325, -3.32, 0.22, -3.98);
      regionInteriorAdd(room, new T.TorusGeometry(0.16, 0.036, 6, 14), kit.M(0xdcc28e), -3.32, 0.06, -3.98, Math.PI / 2);

      // RIGHT-SIDE DISPATCH BOOTH COUNTER (extended smoothly left so shifted radio sits solidly with wide tentacle clearance!)
      var dx = 1.56, dz = -0.78;
      regionInteriorAddBox(kit, room, 2.48, 0.06, 0.62, theme.windowFrame, dx, 0.03, dz);
      regionInteriorAddBox(kit, room, 2.44, 0.42, 0.58, theme.counter, dx, 0.24, dz);
      regionInteriorAddBox(kit, room, 2.58, 0.07, 0.68, theme.counterTop, dx, 0.465, dz);
      for(var tck = 0; tck < 12; tck++){
        var ckx = 0.44 + tck * 0.204;
        regionInteriorAddBox(kit, room, 0.194, 0.10, 0.03, (tck % 2) ? 0x252e38 : 0xf4c642, ckx, 0.34, dz + 0.30);
        regionInteriorAddBox(kit, room, 0.194, 0.10, 0.03, (tck % 2) ? 0xf4c642 : 0x252e38, ckx, 0.24, dz + 0.30);
      }
      // MIN-4: Retro Dispatch Radio & Antenna shifted 0.42u left + 0.16u forward (x = 0.52, z = -0.62) — wide daylight clearance from Taxi Squid's curled tentacle!
      var rx = 0.52, rz = dz + 0.16;
      regionInteriorAddBox(kit, room, 0.28, 0.16, 0.19, 0x2a333d, rx, 0.58, rz);
      regionInteriorAddBox(kit, room, 0.16, 0.065, 0.03, kit.M(0xffe07a, { emissive: 0x5c440e }), rx - 0.03, 0.60, rz + 0.095);
      regionInteriorAddCyl(kit, room, 0.018, 0.018, 0.025, 8, 0xd4a348, rx + 0.09, 0.58, rz + 0.10, Math.PI / 2);
      var rAnt = regionInteriorAddCyl(kit, room, 0.007, 0.009, 0.26, 6, 0xd8dde4, rx - 0.10, 0.76, rz - 0.02);
      rAnt.rotation.z = 0.14;
      regionInteriorAdd(room, new T.SphereGeometry(0.014, 6, 6), kit.M(0xf2c13e), rx - 0.12, 0.89, rz - 0.02);
      // Brass Fare Meter w/ red FOR HIRE flag on FAR RIGHT (x = 2.54)
      regionInteriorAddCyl(kit, room, 0.085, 0.10, 0.04, 12, 0xd4a348, 2.54, 0.52, dz);
      regionInteriorAddBox(kit, room, 0.26, 0.22, 0.18, 0x252e38, 2.54, 0.65, dz);
      regionInteriorAddBox(kit, room, 0.20, 0.11, 0.03, kit.M(0x68f0b8, { emissive: 0x166848 }), 2.54, 0.67, dz + 0.088);
      regionInteriorAddCyl(kit, room, 0.010, 0.010, 0.22, 6, 0xd4a348, 2.69, 0.76, dz, 0, -0.22);
      regionInteriorAddBox(kit, room, 0.12, 0.075, 0.02, 0xe04a3e, 2.75, 0.85, dz);

      // Framed HARBOR TAXI MAP & ZONE FARES board on right wall + wooden steering wheel + life ring + cab bollard
      regionInteriorAddBox(kit, room, 1.72, 1.00, 0.05, 0x252e38, 2.74, 2.34, -2.84);
      regionInteriorAddBox(kit, room, 1.64, 0.92, 0.055, 0xf0be38, 2.74, 2.34, -2.83);
      regionInteriorAddBox(kit, room, 1.56, 0.84, 0.058, regionInteriorArtMat(kit, 'taxi', theme), 2.74, 2.34, -2.81);
      // Maritime red-and-white life ring on center arch pier
      regionInteriorAdd(room, new T.TorusGeometry(0.24, 0.065, 10, 20), kit.M(0xfaf6ec), 0.82, 2.34, -2.72);
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function(la){
        regionInteriorAddBox(kit, room, 0.11, 0.15, 0.145, 0xd94c3e, 0.82 + Math.cos(la) * 0.24, 2.34 + Math.sin(la) * 0.24, -2.72);
      });
      // Steering wheel mounted on far right + cab stand lantern bollard + passenger luggage rack
      var swx = 4.04, swy = 2.32, swz = -2.82;
      regionInteriorAdd(room, new T.TorusGeometry(0.26, 0.030, 8, 18), kit.M(0x7a4c28), swx, swy, swz);
      regionInteriorAddCyl(kit, room, 0.06, 0.06, 0.06, 10, 0xd4a348, swx, swy, swz, Math.PI / 2);
      for(var spk = 0; spk < 4; spk++){
        var spM = regionInteriorAddCyl(kit, room, 0.014, 0.014, 0.48, 6, 0xd4a348, swx, swy, swz);
        spM.rotation.z = spk * Math.PI / 2;
      }
      regionInteriorAddLuggageRack(kit, room, -3.76, 0.0, -1.78);
      var cbx = 3.32, cbz = -0.82;
      regionInteriorAddCyl(kit, room, 0.14, 0.17, 0.12, 12, 0x26313d, cbx, 0.06, cbz);
      regionInteriorAddCyl(kit, room, 0.095, 0.11, 0.74, 12, 0xf0be38, cbx, 0.48, cbz);
      regionInteriorAddCyl(kit, room, 0.102, 0.102, 0.09, 12, 0x26313d, cbx, 0.62, cbz);
      regionInteriorAddCyl(kit, room, 0.085, 0.085, 0.18, 10, kit.M(0xffe88c, { emissive: 0x624a10 }), cbx, 0.94, cbz);
      regionInteriorAddCyl(kit, room, 0.02, 0.12, 0.08, 10, 0xd4a348, cbx, 1.07, cbz);
      // MIN-14: Bespoke harbor cab traffic cones & nautical mooring rope coil (replaces repeated plant!)
      regionInteriorAddTaxiCones(kit, room, 1.72, 0.0, 1.38);
      regionInteriorAddHotelSteamerTrunk(kit, room, -1.80, 0.0, 1.46, 0.22);
      floorShadows.push(
        [-1.16, -4.18, 2.25, 1.25], [dx, dz, 2.66, 0.78], [-3.76, -1.78, 0.96, 0.58],
        [cbx, cbz, 0.48, 0.48], [1.72, 1.38, 0.64, 0.56], [-1.80, 1.46, 0.56, 0.42]
      );
      aoStrips.push(
        [dx, dz + 0.44, 2.54, 0.40, 0],
        [2.74, -2.68, 4.00, 0.44, 0],
        [0.82, -2.56, 0.64, 0.36, 0]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffeec2, intensity: night ? 0.38 : 0.76, dist: 13, pos: [-1.72, 1.48, -2.25] },
        { color: 0xffe6b0, intensity: 0.44, dist: 9, pos: [1.72, 1.98, -0.95] }
      );

    } else if(kind === 'subway'){
      // =========================================================================
      // SUBWAY: Curved Vaulted Underground Metro Tunnel Platform w/ Sunlit
      // Street-Level Clerestory Skylights, 3D Subway Train Nose Shifted Strictly
      // Left (x <= -2.75) Clear of Shelly's Concourse Inlay, Brighter Larger Ray!
      // =========================================================================
      // Right/center glossy ivory ceramic metro tile back wall (x = -2.42 .. +4.70) — bright contrast behind Subway Ray!
      regionInteriorAddBox(kit, room, 7.12, 4.4, 0.16, wallMat, 1.14, 2.2, -3.02);
      // Clean turquoise-and-aqua ceramic station mosaic stripe along metro tile wall
      regionInteriorAddBox(kit, room, 7.08, 0.16, 0.05, 0x26879c, 1.14, 1.56, -2.92);
      regionInteriorAddBox(kit, room, 7.08, 0.07, 0.055, 0x74c8d4, 1.14, 1.44, -2.92);
      regionInteriorAddBox(kit, room, 7.08, 0.16, 0.06, 0x354452, 1.14, 0.08, -2.93);

      // LEFT TRACK UNDERGROUND TUNNEL PORTAL & 3D SUBWAY TRAIN NOSE SHIFTED STRICTLY <= -2.75!
      // Recessed dark underground tunnel bore (x = -4.68 .. -2.44, z = -3.00 .. -5.20)
      regionInteriorAddBox(kit, room, 2.38, 3.8, 0.12, 0x16202a, -3.65, 1.85, -5.10);
      regionInteriorAddBox(kit, room, 0.14, 3.8, 2.20, 0x24313e, -2.46, 1.85, -4.05);
      regionInteriorAddBox(kit, room, 0.14, 3.8, 2.20, 0x24313e, -4.68, 1.85, -4.05);
      regionInteriorAddBox(kit, room, 2.38, 0.24, 2.20, 0x1d2833, -3.65, 3.45, -4.05);
      // Curved concrete tunnel portal arch cleanly framed left of the yellow platform edge
      regionInteriorAdd(room, new T.TorusGeometry(1.10, 0.13, 8, 22, Math.PI), kit.M(0x455666), -3.65, 1.98, -2.94);
      regionInteriorAddBox(kit, room, 2.38, 0.72, 0.18, 0x3b4c5c, -3.65, 3.55, -2.94);
      // 3D Sculpted Harbor Metro Subway Train Nose peeking proudly out on the left track (x = -3.65, right edge = -2.81 <= -2.75!)
      regionInteriorAddSubwayTrainNose(kit, room, -3.65, -0.08, -2.86);

      // CURVED VAULTED UNDERGROUND RIBBED TILE CEILING ARCH + GLOWING RECESSED LIGHT STRIPS + SUNLIT CLERESTORY SKYLIGHTS!
      var vaultSegs = 10, vaultW = 4.66;
      [-2.85, -1.90, -0.95, 0.0, 0.95].forEach(function(vz){
        for(var vs = 0; vs < vaultSegs; vs++){
          var a0 = Math.PI * (vs / vaultSegs);
          var a1 = Math.PI * ((vs + 1) / vaultSegs);
          var am = (a0 + a1) * 0.5;
          var rx = -Math.cos(am) * vaultW;
          var ry = 2.15 + Math.sin(am) * 1.18;
          var segLen = Math.hypot(Math.cos(a1) - Math.cos(a0), (Math.sin(a1) - Math.sin(a0)) * (1.18 / vaultW)) * vaultW + 0.06;
          var rib = regionInteriorAddBox(kit, room, segLen, 0.13, 0.16, 0x3d4e5e, rx, ry, vz);
          rib.rotation.z = Math.atan2((Math.sin(a1) - Math.sin(a0)) * 1.18, -(Math.cos(a1) - Math.cos(a0)) * vaultW);
          // Vaulted ceramic tile soffit ceiling arch panel between ribs
          if(vz < 0.8){
            var panel = regionInteriorAddBox(kit, room, segLen + 0.04, 0.06, 0.98, 0xe8f1f6, rx, ry + 0.08, vz + 0.48);
            panel.rotation.z = rib.rotation.z;
          }
        }
        // Bright glowing recessed white LED metro ceiling light strip along upper vault crown!
        regionInteriorAddBox(kit, room, 3.20, 0.06, 0.14, kit.M(0xfffef4, { emissive: 0x8a8c84 }), 0.25, 3.24, vz);
      });
      // MAJ-5: Twin sunlit Harbor Metro street-level clerestory glass skylight transom bays overhead!
      var skyGlowMat = kit.M(night ? 0x5c80b4 : 0xfff8de, { emissive: night ? 0x1e3052 : 0x8a7438 });
      [-0.25, 1.85].forEach(function(slx){
        regionInteriorAddBox(kit, room, 1.56, 0.10, 0.92, 0x354452, slx, 3.30, -1.92);
        regionInteriorAddBox(kit, room, 1.40, 0.06, 0.78, skyGlowMat, slx, 3.26, -1.92);
        [-0.46, 0.0, 0.46].forEach(function(mx){
          regionInteriorAddBox(kit, room, 0.036, 0.08, 0.80, 0x455666, slx + mx, 3.25, -1.92);
        });
        regionInteriorAddBox(kit, room, 1.42, 0.08, 0.036, 0x455666, slx, 3.25, -1.92);
      });

      // CENTER-RIGHT STATION SERVICE DESK & OVERHEAD HARBOR METRO ARRIVAL GANTRY (aligned to Ray x = +1.20)
      var skx2 = 1.20, skz2 = -0.78;
      regionInteriorAddBox(kit, room, 2.28, 0.06, 0.58, theme.windowFrame, skx2, 0.03, skz2);
      regionInteriorAddBox(kit, room, 2.24, 0.46, 0.54, theme.counter, skx2, 0.26, skz2);
      regionInteriorAddBox(kit, room, 0.88, 0.28, 0.04, theme.counterPanel, skx2 - 0.52, 0.26, skz2 + 0.27);
      regionInteriorAddBox(kit, room, 0.88, 0.28, 0.04, theme.counterPanel, skx2 + 0.52, 0.26, skz2 + 0.27);
      regionInteriorAddBox(kit, room, 2.40, 0.08, 0.64, theme.counterTop, skx2, 0.52, skz2);
      // IC tap-card reader pad on far-left desk & ticket terminal on far-right desk
      regionInteriorAddBox(kit, room, 0.24, 0.07, 0.22, 0x354452, skx2 - 0.80, 0.59, skz2 + 0.04);
      regionInteriorAddBox(kit, room, 0.16, 0.02, 0.14, kit.M(0x62f0bc, { emissive: 0x1a7856 }), skx2 - 0.80, 0.635, skz2 + 0.05);
      regionInteriorAddBox(kit, room, 0.30, 0.24, 0.20, 0x26879c, skx2 + 0.80, 0.68, skz2);
      regionInteriorAddBox(kit, room, 0.22, 0.13, 0.03, kit.M(0xc4f4fa, { emissive: 0x265e6a }), skx2 + 0.80, 0.71, skz2 + 0.105);

      // Illuminated HARBOR TRANSIT route map, station clock & sleek overhead LED arrival gantry
      regionInteriorAddBox(kit, room, 2.16, 0.94, 0.05, theme.trim, skx2, 2.20, -2.93);
      regionInteriorAddBox(kit, room, 2.04, 0.82, 0.05, regionInteriorArtMat(kit, 'subway', theme), skx2, 2.20, -2.90);
      regionInteriorAddCyl(kit, room, 0.28, 0.28, 0.06, 16, theme.trim, -0.78, 2.38, -2.92, Math.PI / 2);
      regionInteriorAddCyl(kit, room, 0.24, 0.24, 0.07, 16, regionInteriorClockMat(kit), -0.78, 2.38, -2.89, Math.PI / 2);
      regionInteriorAddBox(kit, room, 2.66, 0.22, 0.32, 0x4b5d6e, skx2, 2.78, -0.92);
      regionInteriorAddBox(kit, room, 2.66, 0.05, 0.34, 0x26879c, skx2, 2.65, -0.92);
      regionInteriorAddBox(kit, room, 1.48, 0.12, 0.04, 0x16222c, skx2, 2.78, -0.75);
      regionInteriorAddBox(kit, room, 0.56, 0.04, 0.046, kit.M(0x6ef2c4, { emissive: 0x1a6e4e }), skx2 - 0.34, 2.79, -0.74);
      regionInteriorAddBox(kit, room, 0.44, 0.04, 0.046, kit.M(0xffd86b, { emissive: 0x6b4c0c }), skx2 + 0.34, 2.79, -0.74);
      // Bright overhead station pendant domes flanking Ray
      [skx2 - 0.96, skx2 + 0.96].forEach(function(lx){
        regionInteriorAddCyl(kit, room, 0.013, 0.013, 0.62, 6, 0x354452, lx, 2.94, -0.72);
        regionInteriorAddCyl(kit, room, 0.055, 0.18, 0.13, 14, 0x26879c, lx, 2.58, -0.72);
        regionInteriorAdd(room, new T.SphereGeometry(0.072, 10, 8), kit.M(0xfffbe6, { emissive: 0x7c6e38 }), lx, 2.48, -0.72);
      });

      // ZERO-PIERCING TURNSTILE & BENCH (well separated & strictly on passenger concourse!)
      // 1. Stainless-steel tripod turnstile gate cleanly in back-left platform (x = -1.52, z = -2.42)
      var tsx = -1.52, tsz = -2.42;
      regionInteriorAddBox(kit, room, 0.30, 0.86, 0.56, 0x687b8c, tsx, 0.43, tsz);
      regionInteriorAddBox(kit, room, 0.32, 0.06, 0.58, 0x26879c, tsx, 0.88, tsz);
      regionInteriorAddBox(kit, room, 0.18, 0.02, 0.16, kit.M(0x62f0bc, { emissive: 0x166b4c }), tsx, 0.92, tsz + 0.14);
      regionInteriorAddCyl(kit, room, 0.065, 0.065, 0.08, 10, 0x354452, tsx + 0.18, 0.66, tsz, 0, Math.PI / 2);
      [0, 2.09, 4.19].forEach(function(ang){
        var arm = regionInteriorAddCyl(kit, room, 0.016, 0.016, 0.44, 8, 0xe8eff5, tsx + 0.35, 0.66 + Math.sin(ang) * 0.13, tsz + Math.cos(ang) * 0.13);
        arm.rotation.z = Math.PI / 2 - 0.32;
        arm.rotation.x = ang * 0.4;
      });
      // 2. Slatted oak-and-steel Harbor Metro platform bench on RIGHT-BACK wall (x = +3.74, z = -2.28) with wide wingtip clearance!
      var mbx = 3.74, mbz = -2.28;
      [-0.52, 0.0, 0.52].forEach(function(lx){
        regionInteriorAddBox(kit, room, 0.065, 0.43, 0.065, 0x354452, mbx + lx, 0.215, mbz + 0.16);
        regionInteriorAddBox(kit, room, 0.065, 0.86, 0.065, 0x354452, mbx + lx, 0.43, mbz - 0.19);
        regionInteriorAddBox(kit, room, 0.065, 0.06, 0.40, 0x354452, mbx + lx, 0.40, mbz - 0.015);
      });
      [-0.12, 0, 0.12].forEach(function(sz){
        regionInteriorAddBox(kit, room, 1.24, 0.048, 0.095, 0xb27e4c, mbx, 0.45, mbz + sz);
      });
      [0.64, 0.79].forEach(function(sy){
        regionInteriorAddBox(kit, room, 1.24, 0.09, 0.044, 0xb27e4c, mbx, sy, mbz - 0.145);
      });
      // Illuminated transit timetable shelf above the bench on right back wall
      regionInteriorAddShelf(kit, room, 3.74, 2.04, 1.22, theme);
      [3.40, 3.74, 4.08].forEach(function(bx, idx){
        regionInteriorAddBox(kit, room, 0.20, 0.26, 0.08, idx === 1 ? 0xe58e49 : 0x26879c, bx, 2.20, -2.82);
      });
      // MIN-14: Bespoke Harbor Metro transit brochure stand (replaces repeated plant!)
      regionInteriorAddSubwayKiosk(kit, room, 1.74, 0.0, 1.38);
      floorShadows.push(
        [skx2, skz2, 2.48, 0.76], [tsx, tsz, 0.62, 0.74], [mbx, mbz, 1.38, 0.56], [1.74, 1.38, 0.52, 0.44]
      );
      aoStrips.push(
        [1.14, -2.72, 7.04, 0.46, 0],
        [skx2, skz2 + 0.44, 2.38, 0.38, 0],
        [mbx, mbz + 0.28, 1.34, 0.32, 0]
      );
      // Dedicated BRIGHT overhead station key light + skylight floor specular bounce + soft face fill so Subway Ray POPS!
      extraLights.push(
        { color: 0xfffaf0, intensity: 1.25, dist: 12, pos: [skx2, 2.38, -0.35] },
        { color: 0xeef8ff, intensity: 0.55, dist: 8, pos: [skx2 - 0.10, 1.15, 0.35] },
        { color: night ? 0x9ec4f8 : 0xfff4d6, intensity: night ? 0.34 : 0.68, dist: 12, pos: [0.55, 1.62, -2.05] }
      );

    } else if(kind === 'hotel'){
      // =========================================================================
      // HOTEL: Grand Double-Height Lobby — Sweeping Curved Marble Staircase
      // Ascending on LEFT, Tall Arched Leaded-Glass Atrium Window on RIGHT,
      // Semicircular Mahogany Concierge Desk & Key-Board Rotunda Behind Whale!
      // =========================================================================
      regionInteriorAddBox(kit, room, 9.4, 4.6, 0.14, wallMat, 0, 2.3, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, 4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 9.3, 1.24, 0.05, theme.counterPanel, 0, 0.72, -2.93);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, theme.counterPanel, -4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 0.05, 1.24, 7.3, theme.counterPanel, 4.62, 0.72, 0.65);
      regionInteriorAddBox(kit, room, 9.3, 0.10, 0.09, theme.trim, 0, 1.38, -2.91);
      regionInteriorAddBox(kit, room, 9.3, 0.06, 0.12, theme.accent, 0, 1.45, -2.90);
      regionInteriorAddBox(kit, room, 9.3, 0.020, 0.135, 0xd4a348, 0, 1.49, -2.895);
      // Tall double-height fluted lobby pilasters with gold capitals rising to grand cornice
      [-4.45, -1.32, 1.98, 4.45].forEach(function(px){
        regionInteriorAddBox(kit, room, 0.24, 3.82, 0.16, 0xf2e7d2, px, 1.91, -2.90);
        regionInteriorAddBox(kit, room, 0.30, 0.12, 0.22, 0xd4a348, px, 3.74, -2.88);
        regionInteriorAddBox(kit, room, 0.30, 0.14, 0.22, 0x58311a, px, 0.07, -2.88);
      });
      regionInteriorAddBox(kit, room, 9.4, 0.18, 0.26, 0x58311a, 0, 3.86, -2.86);
      regionInteriorAddBox(kit, room, 9.4, 0.04, 0.28, 0xd4a348, 0, 3.76, -2.85);

      // SWEEPING CURVED MARBLE GRAND STAIRCASE ASCENDING ON THE LEFT!
      regionInteriorAddGrandMarbleStaircase(kit, room);
      regionInteriorAddFramedArt(kit, room, 'hotel', -3.05, 3.06, 0.78, 0.66, 0x58311a);
      regionInteriorAddHotelFloorLamp(kit, room, -4.12, 0.0, -0.20);

      // TALL ARCHED LEADED-GLASS ATRIUM WINDOW ON THE RIGHT (x = +3.24, y = 0.68..3.52)
      var awx = 3.24;
      regionInteriorAddBox(kit, room, 1.96, 2.08, 0.09, 0x58311a, awx, 1.72, -2.92);
      regionInteriorAddBox(kit, room, 1.74, 1.88, 0.04, regionInteriorWindowMat(kit, night, 'hotel'), awx, 1.72, -2.88);
      regionInteriorAdd(room, new T.CircleGeometry(0.88, 22, 0, Math.PI), regionInteriorHotelArchSkyMat(kit, night), awx, 2.66, -2.87);
      regionInteriorAdd(room, new T.TorusGeometry(0.92, 0.085, 8, 24, Math.PI), kit.M(0x58311a), awx, 2.66, -2.85);
      regionInteriorAdd(room, new T.TorusGeometry(0.84, 0.025, 6, 22, Math.PI), kit.M(0xd4a348), awx, 2.66, -2.83);
      // Golden leaded-glass mullions & diamond lattice across the tall atrium window
      [-0.44, 0.0, 0.44].forEach(function(mx){
        regionInteriorAddBox(kit, room, 0.032, 1.90, 0.04, 0xd4a348, awx + mx, 1.72, -2.85);
      });
      [1.24, 1.84, 2.44, 2.66].forEach(function(my){
        regionInteriorAddBox(kit, room, 1.76, 0.032, 0.04, 0xd4a348, awx, my, -2.85);
      });
      for(var ar = 1; ar <= 3; ar++){
        var aAng = (ar / 4) * Math.PI;
        var aSp = regionInteriorAddBox(kit, room, 0.028, 0.84, 0.04, 0xd4a348, awx + Math.cos(aAng) * 0.42, 2.66 + Math.sin(aAng) * 0.42, -2.84);
        aSp.rotation.z = aAng - Math.PI * 0.5;
      }
      regionInteriorAddBox(kit, room, 2.08, 0.10, 0.22, 0x58311a, awx, 0.68, -2.82);
      // Tasseled golden hotel drapes framing the tall right atrium window
      [-0.96, 0.96].forEach(function(sd){
        regionInteriorAddCyl(kit, room, 0.072, 0.056, 1.56, 8, theme.curtain, awx + sd, 2.18, -2.80);
        regionInteriorAddCyl(kit, room, 0.056, 0.088, 0.72, 8, theme.curtain, awx + sd, 1.06, -2.80);
        regionInteriorAddBox(kit, room, 0.24, 0.055, 0.14, 0xd4a348, awx + sd, 1.44, -2.79);
      });
      regionInteriorAddLuggageRack(kit, room, 3.44, 0.0, -1.78);

      // SEMICIRCULAR MAHOGANY CONCIERGE DESK & ARCHED KEY-BOARD ROTUNDA BEHIND HOTEL WHALE!
      var cdx = 0.52, cdz = -1.32, cdR = 1.08;
      var segN = 7;
      for(var si = 0; si < segN; si++){
        var aStart = -Math.PI * 0.44 + (si / segN) * Math.PI * 0.88;
        var aEnd = -Math.PI * 0.44 + ((si + 1) / segN) * Math.PI * 0.88;
        var aMid = (aStart + aEnd) * 0.5;
        var segW = 2 * cdR * Math.sin((aEnd - aStart) * 0.5) + 0.06;
        var sx = cdx + Math.sin(aMid) * cdR;
        var sz = cdz + Math.cos(aMid) * cdR;
        regionInteriorAddBox(kit, room, segW, 0.50, 0.36, theme.counter, sx, 0.25, sz, aMid);
        regionInteriorAddBox(kit, room, segW * 0.78, 0.30, 0.04, theme.counterPanel, cdx + Math.sin(aMid) * (cdR + 0.18), 0.26, cdz + Math.cos(aMid) * (cdR + 0.18), aMid);
        regionInteriorAddBox(kit, room, segW * 0.80, 0.018, 0.046, 0xd4a348, cdx + Math.sin(aMid) * (cdR + 0.185), 0.41, cdz + Math.cos(aMid) * (cdR + 0.185), aMid);
        regionInteriorAddBox(kit, room, segW * 0.80, 0.018, 0.046, 0xd4a348, cdx + Math.sin(aMid) * (cdR + 0.185), 0.11, cdz + Math.cos(aMid) * (cdR + 0.185), aMid);
        regionInteriorAddBox(kit, room, segW + 0.06, 0.075, 0.46, theme.counterTop, sx, 0.54, sz, aMid);
      }
      // Gleaming brass crest medallion on center front panel of semicircular desk
      regionInteriorAddCyl(kit, room, 0.062, 0.062, 0.025, 14, 0xe8be58, cdx, 0.27, cdz + cdR + 0.20, Math.PI / 2);
      regionInteriorAddCyl(kit, room, 0.042, 0.042, 0.030, 14, 0x1b3d5a, cdx, 0.27, cdz + cdR + 0.202, Math.PI / 2);
      // Curved concierge desk props: brass call bell (left arc), open guestbook (center arc), green banker's lamp (right arc)
      regionInteriorAddCyl(kit, room, 0.082, 0.092, 0.022, 12, 0x4f2b18, -0.34, 0.59, -0.70);
      regionInteriorAdd(room, new T.SphereGeometry(0.068, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), kit.M(0xe8b948), -0.34, 0.60, -0.70);
      regionInteriorAddBox(kit, room, 0.42, 0.024, 0.28, 0x7d4628, 0.52, 0.592, -0.34, 0.06);
      regionInteriorAddBox(kit, room, 0.18, 0.022, 0.25, 0xfbf7f0, 0.43, 0.608, -0.34, 0.06);
      regionInteriorAddBox(kit, room, 0.18, 0.022, 0.25, 0xfbf7f0, 0.61, 0.608, -0.34, 0.06);
      regionInteriorAddBox(kit, room, 0.02, 0.026, 0.28, 0xc94a4a, 0.52, 0.606, -0.34, 0.06);
      var lmx = 1.32, lmz = -0.68;
      regionInteriorAddCyl(kit, room, 0.082, 0.10, 0.028, 14, 0xd4a348, lmx, 0.594, lmz);
      regionInteriorAddCyl(kit, room, 0.015, 0.017, 0.22, 10, 0xd4a348, lmx, 0.72, lmz);
      regionInteriorAddBox(kit, room, 0.22, 0.09, 0.12, kit.M(0x288452, { emissive: 0x072414 }), lmx, 0.85, lmz + 0.02);
      regionInteriorAdd(room, new T.SphereGeometry(0.038, 10, 8), kit.M(0xfff4bc, { emissive: 0x5c4a1c }), lmx, 0.81, lmz + 0.02);

      // Curved Mahogany Key-Board Rotunda directly behind Hotel Whale (x = +0.52, z = -2.88, arch crown at y = 3.50 inside viewport!)
      regionInteriorAddBox(kit, room, 2.28, 1.98, 0.08, 0x522d17, cdx, 2.34, -2.93);
      regionInteriorAdd(room, new T.TorusGeometry(1.12, 0.085, 8, 24, Math.PI), kit.M(0xd4a348), cdx, 2.38, -2.88);
      regionInteriorAddBox(kit, room, 1.72, 0.72, 0.05, 0x58311a, cdx, 2.44, -2.89);
      regionInteriorAddBox(kit, room, 1.64, 0.64, 0.055, 0xd4a348, cdx, 2.44, -2.88);
      regionInteriorAddBox(kit, room, 1.56, 0.56, 0.058, regionInteriorArtMat(kit, 'hotel', theme), cdx, 2.44, -2.86);
      // Twin warm frosted opal globe sconces flanking the key-board rotunda
      var hGlobeMat = kit.M(0xfff6dc, { emissive: 0x5c461e });
      [cdx - 1.06, cdx + 1.06].forEach(function(sx){
        regionInteriorAddCyl(kit, room, 0.075, 0.075, 0.03, 12, 0xd4a348, sx, 2.74, -2.86, Math.PI / 2);
        regionInteriorAddCyl(kit, room, 0.018, 0.018, 0.16, 8, 0xd4a348, sx, 2.64, -2.80);
        regionInteriorAdd(room, new T.SphereGeometry(0.11, 14, 10), hGlobeMat, sx, 2.50, -2.80);
      });
      // Tufted burgundy ottoman, brass umbrella & cane stand (replaces repeated plant!), & foreground steamer trunk
      regionInteriorAddHotelOttoman(kit, room, 1.82, 0.0, 0.28);
      regionInteriorAddHotelUmbrellaStand(kit, room, 1.78, 0.0, 1.36);
      regionInteriorAddHotelSteamerTrunk(kit, room, -1.86, 0.0, 1.48, 0.22);
      regionInteriorAddHotelParlorPalm(kit, room, -1.42, 0.0, 1.56);
      floorShadows.push(
        [cdx, cdz + 0.65, 2.48, 1.45], [-4.12, -0.20, 0.62, 0.62], [3.44, -1.78, 0.88, 0.52],
        [1.82, 0.28, 0.54, 0.54], [1.78, 1.36, 0.44, 0.44], [-1.86, 1.48, 0.56, 0.40], [-1.42, 1.56, 0.34, 0.34]
      );
      aoStrips.push(
        [cdx - 0.82, cdz + 1.06, 0.94, 0.36, -0.62],
        [cdx,        cdz + 1.38, 1.06, 0.38, 0],
        [cdx + 0.82, cdz + 1.06, 0.94, 0.36, 0.62],
        [-2.78, -0.84, 1.86, 0.38, -0.32]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffecc0, intensity: night ? 0.38 : 0.78, dist: 13, pos: [awx, 1.52, -2.25] },
        { color: 0xffe2a6, intensity: 0.44, dist: 10, pos: [cdx, 2.15, -1.15] }
      );

    } else if(kind === 'pharmacy'){
      // =========================================================================
      // PHARMACY: Bright Glass-Walled Botanical Apothecary Conservatory —
      // 3 Tall Arched Greenhouse Panes Across Back Wall w/ Hanging Herb Bundles,
      // Tiered Wooden Apothecary Drawer Wall on LEFT, White Marble Compounding
      // Counter on RIGHT!
      // =========================================================================
      // Left plaster wall behind apothecary cabinet + side walls
      regionInteriorAddBox(kit, room, 3.16, 4.6, 0.14, wallMat, -3.14, 2.3, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, -4.7, 2.3, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.6, 7.4, wallMat, 4.7, 2.3, 0.65);

      // BRIGHT GLASS-WALLED BOTANICAL CONSERVATORY GREENHOUSE PANES ACROSS BACK WALL (x = -1.56 .. +4.56)
      // Continuous sunlit botanical flower & herb garden vista visible through all 3 tall glass arches
      regionInteriorAddBox(kit, room, 6.26, 3.10, 0.06, regionInteriorWindowMat(kit, night, 'pharmacy'), 1.50, 2.30, -3.04);
      // Low cream-and-mint paneled conservatory knee wall (y = 0..0.76)
      regionInteriorAddBox(kit, room, 6.26, 0.76, 0.16, 0xf2f8f5, 1.50, 0.38, -2.92);
      regionInteriorAddBox(kit, room, 6.26, 0.08, 0.22, 0x4ca888, 1.50, 0.78, -2.89);
      // Three tall arched conservatory greenhouse bays centered at x = -0.52, +1.36, +3.24 (arch crowns at y = 3.52 cleanly framed!)
      [-0.52, 1.36, 3.24].forEach(function(gx){
        // Tall painted white & mint conservatory arch piers + semicircular greenhouse crown rib
        regionInteriorAddBox(kit, room, 0.12, 1.98, 0.14, 0xffffff, gx - 0.90, 1.76, -2.90);
        regionInteriorAddBox(kit, room, 0.12, 1.98, 0.14, 0xffffff, gx + 0.90, 1.76, -2.90);
        regionInteriorAdd(room, new T.TorusGeometry(0.86, 0.062, 8, 22, Math.PI), kit.M(0xffffff), gx, 2.66, -2.89);
        regionInteriorAdd(room, new T.TorusGeometry(0.79, 0.022, 6, 20, Math.PI), kit.M(0x4ca888), gx, 2.66, -2.87);
        // Delicate greenhouse glass mullions inside each arch bay
        [-0.44, 0.0, 0.44].forEach(function(mx){
          regionInteriorAddBox(kit, room, 0.028, 1.94, 0.04, 0xf2f8f5, gx + mx, 1.74, -2.89);
        });
        [1.36, 2.02, 2.66].forEach(function(my){
          regionInteriorAddBox(kit, room, 1.76, 0.030, 0.04, 0xf2f8f5, gx, my, -2.89);
        });
        // Subtle translucent pale-aqua conservatory glass pane sheen
        regionInteriorAddBox(kit, room, 1.72, 1.90, 0.014, kit.M(0xdcfaf5, { transparent: true, opacity: 0.10 }), gx, 1.74, -2.91);
        // Curved white conservatory glasshouse ceiling roof ribs arching forward overhead!
        var rib = regionInteriorAddBox(kit, room, 0.09, 0.12, 3.10, 0xffffff, gx - 0.90, 3.54, -1.42);
        rib.rotation.x = 0.08;
      });
      // Top white-and-mint conservatory header fascia + brass hanging herb-drying rafter bar across the arches!
      regionInteriorAddBox(kit, room, 6.26, 0.14, 0.20, 0x3b9b7b, 1.50, 3.58, -2.88);
      regionInteriorAddCyl(kit, room, 0.018, 0.018, 5.80, 8, 0xd4a348, 1.38, 3.04, -2.42, 0, Math.PI / 2);
      // 11 colorful hanging dried-herb & lavender bundles suspended across the sunlit conservatory arches!
      [
        [-1.12, 0x55a07a, 0.95], [-0.62, 0x9b78cc, 1.05], [-0.12, 0x428761, 0.92],
        [ 0.38, 0xebbf54, 0.98], [ 0.88, 0xe87b86, 0.90], [ 1.36, 0x55a07a, 0.86],
        [ 1.84, 0x9b78cc, 0.92], [ 2.34, 0x4b9972, 1.00], [ 2.84, 0xebbf54, 0.96],
        [ 3.34, 0xe87b86, 1.02], [ 3.82, 0x428761, 0.95]
      ].forEach(function(hb){
        regionInteriorAddHangingHerbBundle(kit, room, hb[0], 3.04, -2.42, hb[1], hb[2]);
      });

      // TIERED WOODEN APOTHECARY DRAWER WALL ON THE LEFT (x = -4.45 .. -1.80)
      var dwx = -3.14, dwz = -2.52;
      regionInteriorAddBox(kit, room, 2.38, 1.56, 0.50, 0x6f4325, dwx, 0.78, dwz);
      regionInteriorAddBox(kit, room, 2.48, 0.08, 0.56, 0x56341c, dwx, 1.58, dwz);
      regionInteriorAddBox(kit, room, 2.42, 0.08, 0.52, 0x56341c, dwx, 0.04, dwz);
      // 20 recessed warm-oak apothecary herb drawers (5 cols x 4 rows) with cream labels & brass pulls!
      for(var dr = 0; dr < 4; dr++){
        for(var dc = 0; dc < 5; dc++){
          var ddx = dwx + (dc - 2) * 0.44;
          var ddy = 0.26 + dr * 0.32;
          regionInteriorAddBox(kit, room, 0.38, 0.26, 0.04, 0x9c6d42, ddx, ddy, dwz + 0.24);
          regionInteriorAddBox(kit, room, 0.18, 0.06, 0.02, 0xfaf6ec, ddx, ddy + 0.045, dwz + 0.265);
          regionInteriorAdd(room, new T.SphereGeometry(0.020, 6, 6), kit.M(0xd4a348), ddx, ddy - 0.045, dwz + 0.275);
        }
      }
      // Upper tiered wooden apothecary bottle gallery hutch rising to y = 3.16!
      // Recessed back panel (z = dwz - 0.18, depth 0.10) so shelves & bottles sit cleanly in front of the backing!
      regionInteriorAddBox(kit, room, 2.32, 1.52, 0.10, 0x7c4e2c, dwx, 2.36, dwz - 0.18);
      regionInteriorAddBox(kit, room, 2.46, 0.12, 0.46, 0x56341c, dwx, 3.16, dwz - 0.04);
      [2.08, 2.60].forEach(function(sy){
        regionInteriorAddBox(kit, room, 2.22, 0.055, 0.34, 0x56341c, dwx, sy, dwz - 0.02);
      });
      // Stocked colorful pastel/jewel LatheGeometry apothecary elixir bottles & ceramic herb jars across all 3 upper shelves!
      [
        [-3.96, 1.62, 0x3ec99b, 0.22], [-3.64, 1.62, 'jar', 0xf4efe2], [-3.30, 1.62, 0xe8ae3c, 0.23],
        [-2.96, 1.62, 0x9c7ae0, 0.20], [-2.62, 1.62, 'jar', 0xd7ece2], [-2.28, 1.62, 0xe88258, 0.19],
        [-3.90, 2.11, 0xd9843b, 0.21], [-3.52, 2.11, 0x58b896, 0.22], [-3.12, 2.11, 'jar', 0xf6e7cc],
        [-2.72, 2.11, 0x649ec9, 0.21], [-2.32, 2.11, 0xe6c242, 0.20],
        [-3.82, 2.63, 'jar', 0xe2efe8], [-3.40, 2.63, 0xde6d7d, 0.22], [-2.96, 2.63, 0x5893c4, 0.19],
        [-2.56, 2.63, 0x49ab88, 0.20], [-2.22, 2.63, 0xe2ad44, 0.21]
      ].forEach(function(bt){
        if(bt[2] === 'jar'){
          regionInteriorAddApothecaryHerbJar(kit, room, bt[0], bt[1], dwz + 0.05, bt[3]);
        } else {
          regionInteriorAddApothecaryBottle(kit, room, bt[0], bt[1], dwz + 0.05, bt[3], bt[2]);
        }
      });
      // Brass rolling library ladder rail + petite wooden ladder leaning cleanly against far-left apothecary cabinet!
      regionInteriorAddCyl(kit, room, 0.016, 0.016, 2.40, 8, 0xd4a348, dwx, 3.04, dwz + 0.20, 0, Math.PI / 2);
      [-4.22, -3.90].forEach(function(lx){
        var rail = regionInteriorAddBox(kit, room, 0.04, 3.06, 0.045, 0x6f4325, lx, 1.50, dwz + 0.36);
        rail.rotation.x = -0.11;
      });
      for(var lr = 0; lr < 7; lr++){
        regionInteriorAddBox(kit, room, 0.34, 0.032, 0.05, 0x8e603a, -4.06, 0.34 + lr * 0.38, dwz + 0.48 - lr * 0.042);
      }
      // Wardian glass botanical terrarium tucked beside the left drawer wall
      regionInteriorAddTerrarium(kit, room, -1.78, 0.0, -2.06);

      // WHITE MARBLE COMPOUNDING COUNTER ON THE RIGHT (x = +1.28, z = -0.78, top y = 0.58)
      var pmx = 1.28, pmz = -0.78;
      regionInteriorAddBox(kit, room, 2.34, 0.06, 0.60, 0x3b8f74, pmx, 0.03, pmz);
      regionInteriorAddBox(kit, room, 2.30, 0.48, 0.56, 0xeef5f2, pmx, 0.26, pmz);
      [pmx - 0.54, pmx + 0.54].forEach(function(px){
        regionInteriorAddBox(kit, room, 0.88, 0.32, 0.04, 0xd2e6de, px, 0.26, pmz + 0.28);
        regionInteriorAddBox(kit, room, 0.88, 0.016, 0.046, 0x4ca888, px, 0.42, pmz + 0.284);
        regionInteriorAddBox(kit, room, 0.88, 0.016, 0.046, 0x4ca888, px, 0.10, pmz + 0.284);
      });
      // Emerald apothecary cross badge centered on front of marble compounding counter
      regionInteriorAddBox(kit, room, 0.084, 0.084, 0.020, 0xffffff, pmx, 0.27, pmz + 0.295);
      regionInteriorAddBox(kit, room, 0.020, 0.060, 0.024, 0x2f9676, pmx, 0.27, pmz + 0.300);
      regionInteriorAddBox(kit, room, 0.060, 0.020, 0.024, 0x2f9676, pmx, 0.27, pmz + 0.300);
      // Thick polished white marble compounding slab (top strictly at y = 0.58)
      regionInteriorAddBox(kit, room, 2.46, 0.09, 0.68, 0xffffff, pmx, 0.535, pmz);
      regionInteriorAddBox(kit, room, 2.48, 0.02, 0.70, 0xd4a348, pmx, 0.49, pmz);
      // Compounding counter props: prescription pad, mortar & pestle, brass balance scale, corked elixir bottles
      regionInteriorAddBox(kit, room, 0.20, 0.022, 0.24, 0x8e603a, 0.34, 0.591, -0.70, 0.14);
      regionInteriorAddBox(kit, room, 0.16, 0.012, 0.19, 0xfafcf9, 0.34, 0.606, -0.70, 0.14);
      regionInteriorAddCyl(kit, room, 0.125, 0.075, 0.11, 12, 0xf2f5f3, 0.70, 0.635, -0.72);
      regionInteriorAddCyl(kit, room, 0.105, 0.105, 0.02, 10, 0x5eb898, 0.70, 0.682, -0.72);
      regionInteriorAddCyl(kit, room, 0.024, 0.018, 0.18, 8, 0xe6ebe8, 0.74, 0.72, -0.71, 0.22, -0.52);
      regionInteriorAddCyl(kit, room, 0.09, 0.11, 0.03, 12, 0xd4a348, 2.00, 0.595, -0.84);
      regionInteriorAddCyl(kit, room, 0.016, 0.022, 0.26, 8, 0xd4a348, 2.00, 0.73, -0.84);
      regionInteriorAddBox(kit, room, 0.34, 0.018, 0.02, 0xd4a348, 2.00, 0.86, -0.84);
      [-0.15, 0.15].forEach(function(sx){
        regionInteriorAddCyl(kit, room, 0.005, 0.005, 0.14, 6, 0xb88b5a, 2.00 + sx, 0.78, -0.84);
        regionInteriorAddCyl(kit, room, 0.065, 0.055, 0.016, 10, 0xe8b948, 2.00 + sx, 0.71, -0.84);
      });
      regionInteriorAddApothecaryBottle(kit, room, 0.18, 0.58, -0.96, 0.21, 0x4ca888);
      regionInteriorAddApothecaryBottle(kit, room, 2.34, 0.58, -0.60, 0.18, 0xd98c46);
      regionInteriorAddApothecaryBottle(kit, room, 2.36, 0.58, -0.92, 0.23, 0x6ca2cf);

      // Conservatory botanical planters, stool, herb basket & foreground vignettes
      regionInteriorAddHerbPlanter(kit, room, 3.02, 0.0, -1.24);
      regionInteriorAddStool(kit, room, 2.52, 0.0, -0.14, 0.43, 0x7c5333, 0x5eb898, false, 0);
      regionInteriorAddHerbBasket(kit, room, 1.62, 0.0, 0.48);
      regionInteriorAddCoastalPlant(kit, room, 1.28, 0.0, 1.38, 'pharmacy');
      regionInteriorAddApothecaryHerbCrate(kit, room, 1.78, 0.0, 1.48, -0.26);
      regionInteriorAddTerracottaHerbPot(kit, room, -1.94, 0.0, 1.32);
      regionInteriorAddHerbalistFootstool(kit, room, -1.64, 0.0, 1.50, 0.20);
      regionInteriorAddWillowHerbBasket(kit, room, -1.34, 0.0, 1.42, -0.22);
      floorShadows.push(
        [pmx, pmz, 2.52, 0.78], [dwx, dwz, 2.52, 0.68], [-1.78, -2.06, 0.74, 0.74],
        [3.02, -1.24, 0.58, 0.58], [2.52, -0.14, 0.48, 0.48], [1.62, 0.48, 0.48, 0.48],
        [1.28, 1.38, 0.54, 0.54], [1.78, 1.48, 0.46, 0.36],
        [-1.94, 1.32, 0.30, 0.30], [-1.64, 1.50, 0.44, 0.34], [-1.34, 1.42, 0.40, 0.40]
      );
      extraLights.push(
        { color: 0xf6fff9, intensity: 0.45, dist: 12, pos: [1.24, 2.95, -0.60] },
        { color: night ? 0xa4d0f8 : 0xf4ffe8, intensity: night ? 0.36 : 0.68, dist: 12, pos: [-0.45, 1.50, -2.30] },
        { color: night ? 0xa4d0f8 : 0xf4ffe8, intensity: night ? 0.34 : 0.64, dist: 12, pos: [1.45, 1.50, -2.30] }
      );

    } else {
      // =========================================================================
      // FRIEND: Keep the Distinct Open-Air Sunset Harbor Promenade Gazebo/Courtyard!
      // =========================================================================
      regionInteriorAddBox(kit, room, 9.2, 3.65, 0.08, regionInteriorWindowMat(kit, night, 'friend'), 0, 2.38, -3.02);
      regionInteriorAddBox(kit, room, 0.14, 4.4, 7.4, wallMat, -4.7, 2.2, 0.65);
      regionInteriorAddBox(kit, room, 0.14, 4.4, 7.4, wallMat, 4.7, 2.2, 0.65);
      regionInteriorAddBox(kit, room, 0.12, 1.06, 7.2, 0xf3ead8, -4.58, 0.53, 0.65);
      regionInteriorAddBox(kit, room, 0.12, 1.06, 7.2, 0xf3ead8, 4.58, 0.53, 0.65);
      regionInteriorAddBox(kit, room, 9.2, 0.14, 0.28, 0xeae0cd, 0, 0.07, -2.84);
      regionInteriorAddBox(kit, room, 9.2, 0.10, 0.30, 0xf7f0e2, 0, 1.03, -2.84);
      for(var bl = -14; bl <= 14; bl++){
        var bx2 = bl * 0.30;
        if(Math.abs(Math.abs(bx2) - 1.65) < 0.24 || Math.abs(Math.abs(bx2) - 3.85) < 0.24) continue;
        regionInteriorAddCyl(kit, room, 0.036, 0.052, 0.84, 8, 0xf4ecdc, bx2, 0.56, -2.84);
        regionInteriorAdd(room, new T.SphereGeometry(0.056, 8, 6), kit.M(0xf7f0e2), bx2, 0.46, -2.84);
      }
      [-3.85, -1.65, 1.65, 3.85].forEach(function(px, pi){
        regionInteriorAddBox(kit, room, 0.36, 1.08, 0.36, 0xeee5d4, px, 0.54, -2.82);
        regionInteriorAddBox(kit, room, 0.42, 0.08, 0.42, 0xf9f3e6, px, 1.08, -2.82);
        regionInteriorAddBox(kit, room, 0.20, 2.56, 0.20, 0xf8f0e2, px, 2.38, -2.76);
        regionInteriorAddBox(kit, room, 0.26, 0.10, 0.26, 0x8d6340, px, 3.56, -2.76);
        [-1, 1].forEach(function(sd){
          var br = regionInteriorAddBox(kit, room, 0.08, 0.56, 0.08, 0x8d6340, px + sd * 0.24, 3.36, -2.76);
          br.rotation.z = sd * 0.72;
        });
        if(pi === 1 || pi === 2){
          regionInteriorAddCyl(kit, room, 0.08, 0.10, 0.06, 8, 0xd4a348, px, 1.15, -2.70);
          regionInteriorAddCyl(kit, room, 0.075, 0.065, 0.16, 8, kit.M(0xffe896, { emissive: 0x624a12 }), px, 1.26, -2.70);
          regionInteriorAddCyl(kit, room, 0.01, 0.11, 0.08, 8, 0x7a5436, px, 1.38, -2.70);
        }
      });
      [-3.2, -2.1, -0.8, 0.6, 2.1, 3.2].forEach(function(vx, vi){
        regionInteriorAdd(room, new T.SphereGeometry(0.18, 8, 6), kit.M(0x3f8f59), vx, 3.46, -2.62);
        regionInteriorAdd(room, new T.SphereGeometry(0.13, 8, 6), kit.M(vi % 2 ? 0xe86c82 : 0xf28b78), vx + 0.10, 3.36, -2.56);
        regionInteriorAdd(room, new T.SphereGeometry(0.11, 7, 6), kit.M(0x4fa66a), vx - 0.14, 3.40, -2.58);
      });
      regionInteriorAddCounterOverhead(kit, room, 'friend', theme);
      // Promenade bench, tea table & palms
      var bx = -1.68, bz = -2.26;
      [-0.64, 0.64].forEach(function(lx){
        regionInteriorAddBox(kit, room, 0.07, 0.44, 0.48, 0x454f58, bx + lx, 0.22, bz);
        regionInteriorAddBox(kit, room, 0.06, 0.56, 0.06, 0x454f58, bx + lx, 0.66, bz - 0.22);
        regionInteriorAddBox(kit, room, 0.07, 0.05, 0.46, 0x8d6340, bx + lx, 0.64, bz - 0.02);
      });
      regionInteriorAddBox(kit, room, 1.38, 0.06, 0.48, 0x9c6e46, bx, 0.44, bz);
      [0.62, 0.76, 0.90].forEach(function(sy){ regionInteriorAddBox(kit, room, 1.34, 0.09, 0.045, 0x9c6e46, bx, sy, bz - 0.21); });
      regionInteriorAddBox(kit, room, 1.24, 0.09, 0.42, 0xfcf2dc, bx, 0.51, bz + 0.01);
      [-0.36, 0, 0.36].forEach(function(sx){ regionInteriorAddBox(kit, room, 0.16, 0.095, 0.43, 0xe38472, bx + sx, 0.51, bz + 0.01); });
      var pil1 = regionInteriorAddBox(kit, room, 0.26, 0.24, 0.11, 0x5ca8a8, bx - 0.44, 0.66, bz - 0.10, 0.24); pil1.rotation.x = -0.18;
      var pil2 = regionInteriorAddBox(kit, room, 0.24, 0.22, 0.10, 0xf2be5c, bx + 0.46, 0.65, bz - 0.10, -0.22); pil2.rotation.x = -0.18;
      var tx = 2.66, tz = -1.16;
      regionInteriorAddCyl(kit, room, 0.22, 0.26, 0.045, 16, 0x6f4325, tx, 0.022, tz);
      regionInteriorAddCyl(kit, room, 0.055, 0.072, 0.56, 12, 0x8d6340, tx, 0.32, tz);
      regionInteriorAddCyl(kit, room, 0.46, 0.44, 0.05, 22, 0xfaf2e1, tx, 0.61, tz);
      regionInteriorAddCyl(kit, room, 0.47, 0.47, 0.024, 22, 0x5ca8a8, tx, 0.635, tz);
      var fp = regionInteriorAdd(room, new T.SphereGeometry(0.11, 12, 8), kit.M(0xe38472), tx - 0.10, 0.72, tz - 0.06);
      fp.scale.set(1.0, 0.86, 1.0);
      regionInteriorAdd(room, new T.SphereGeometry(0.028, 8, 6), kit.M(0xf2c258), tx - 0.10, 0.83, tz - 0.06);
      regionInteriorAddCyl(kit, room, 0.015, 0.028, 0.12, 8, 0xe38472, tx - 0.22, 0.75, tz - 0.06, 0, 0.72);
      regionInteriorAdd(room, new T.TorusGeometry(0.054, 0.013, 6, 12, Math.PI), kit.M(0xe38472), tx, 0.72, tz - 0.06, 0, 0, -Math.PI / 2);
      [[0.14, 0.10], [-0.14, 0.18]].forEach(function(tc){
        regionInteriorAddCyl(kit, room, 0.062, 0.046, 0.014, 12, 0xfbf7f0, tx + tc[0], 0.654, tz + tc[1]);
        regionInteriorAddCyl(kit, room, 0.042, 0.034, 0.052, 10, 0xfbf7f0, tx + tc[0], 0.686, tz + tc[1]);
        regionInteriorAddCyl(kit, room, 0.043, 0.043, 0.008, 10, 0x5ca8a8, tx + tc[0], 0.710, tz + tc[1]);
      });
      regionInteriorAddCyl(kit, room, 0.115, 0.095, 0.018, 14, 0xfbf7f0, tx + 0.16, 0.656, tz - 0.12);
      regionInteriorAddCyl(kit, room, 0.072, 0.076, 0.048, 12, 0xf5d468, tx + 0.16, 0.690, tz - 0.12);
      regionInteriorAddStool(kit, room, 3.36, 0.0, -1.36, 0.44, 0x7b5234, 0xe38472, true, -0.58);
      regionInteriorAddPlant(kit, room, -3.65, 0.0, -2.22, 1.12);
      regionInteriorAddPlant(kit, room, 3.70, 0.0, -2.24, 1.08);
      // MIN-14: Bespoke seaside picnic basket & gingham cloth (replaces repeated plant!)
      regionInteriorAddFriendPicnicBasket(kit, room, 1.88, 0.0, 1.38);
      regionInteriorAddBistroOliveLemonTree(kit, room, -1.90, 0.0, 1.44);
      floorShadows.push(
        [-1.68, -2.26, 1.54, 0.66], [2.66, -1.16, 0.96, 0.96],
        [3.36, -1.36, 0.52, 0.52], [-3.65, -2.22, 0.88, 0.88],
        [3.70, -2.24, 0.86, 0.86], [1.88, 1.38, 0.58, 0.46], [-1.90, 1.44, 0.46, 0.46]
      );
      aoStrips.push(
        [0, -2.54, 9.10, 0.42, 0],
        [-1.68, -1.88, 1.48, 0.36, 0]
      );
      extraLights.push(
        { color: night ? 0x9ec4f8 : 0xffdcb0, intensity: night ? 0.36 : 0.72, dist: 13, pos: [-0.85, 1.38, -2.25] },
        { color: night ? 0x9ec4f8 : 0xffdcb0, intensity: night ? 0.36 : 0.70, dist: 13, pos: [1.35, 1.38, -2.25] }
      );
    }

    if(typeof reef3dMerge === 'function'){
      var merged = reef3dMerge(room, view.rig, view.bake);
      root.add(merged);
    } else {
      root.add(room);
    }

    // MAJ-8 & FPS Fix #378: Mount live lit glossy Phong floor directly on root (after reef3dMerge so shininess 95..120,
    // specular '#fff6e0', tile/plank bump bevels & specular floor sheen remain 100% active at silky 60 FPS!)
    var floorMat = regionInteriorGlossyFloorMat(view, kind, theme, night);
    var floorGeo = new T.BoxGeometry(floorSlabSpec.w, 0.14, floorSlabSpec.d);
    var floorMesh = new T.Mesh(floorGeo, floorMat);
    floorMesh.position.set(floorSlabSpec.x, -0.07, floorSlabSpec.z);
    floorMesh.receiveShadow = true;
    root.add(floorMesh);
    var disposables = [floorGeo, floorMat];
    root.userData.disposables = disposables;
    if(kind === 'taxi'){
      var taxiCounterShadGeo = new T.PlaneGeometry(1.12, 0.64);
      var taxiCounterShadMat = regionInteriorRadialShadowMat(0.32);
      disposables.push(taxiCounterShadGeo, taxiCounterShadMat);
      var taxiCounterShad = new T.Mesh(taxiCounterShadGeo, taxiCounterShadMat);
      taxiCounterShad.rotation.x = -Math.PI / 2;
      taxiCounterShad.position.set(1.66, 0.502, -0.82);
      taxiCounterShad.renderOrder = 3;
      root.add(taxiCounterShad);
    } else if(kind === 'pharmacy'){
      // Grounded 3D celadon ceramic & gilded brass apothecary pedestal tide-basin at (1.24, 0, -1.92)
      var phPedGeo = new T.CylinderGeometry(0.30, 0.42, 0.52, 20);
      var phPedMat = kit.M(0x3a846c);
      var phTrimGeo = new T.TorusGeometry(0.36, 0.035, 8, 20);
      var phTrimMat = kit.M(0xd8ae52);
      var phBowlBodyGeo = new T.CylinderGeometry(0.56, 0.34, 0.28, 24);
      var phBowlBodyMat = kit.M(0x4ca888);
      var phBowlRimGeo = new T.TorusGeometry(0.56, 0.048, 10, 24);
      var phBowlRimMat = kit.M(0xd8ae52);
      var phBowlWaterGeo = new T.CircleGeometry(0.52, 24);
      var phBowlWaterMat = new T.MeshBasicMaterial({ color: 0x3ec8d2, transparent: true, opacity: 0.90 });
      disposables.push(phPedGeo, phTrimGeo, phBowlBodyGeo, phBowlRimGeo, phBowlWaterGeo, phBowlWaterMat);
      var phPed = new T.Mesh(phPedGeo, phPedMat);
      phPed.position.set(1.24, 0.26, -1.92);
      root.add(phPed);
      [0.05, 0.50].forEach(function(ty){
        var phTr = new T.Mesh(phTrimGeo, phTrimMat);
        phTr.rotation.x = -Math.PI / 2;
        phTr.position.set(1.24, ty, -1.92);
        root.add(phTr);
      });
      var phBowlBody = new T.Mesh(phBowlBodyGeo, phBowlBodyMat);
      phBowlBody.position.set(1.24, 0.64, -1.92);
      root.add(phBowlBody);
      var phBowlRim = new T.Mesh(phBowlRimGeo, phBowlRimMat);
      phBowlRim.rotation.x = -Math.PI / 2;
      phBowlRim.position.set(1.24, 0.78, -1.92);
      root.add(phBowlRim);
      var phBowlWater = new T.Mesh(phBowlWaterGeo, phBowlWaterMat);
      phBowlWater.rotation.x = -Math.PI / 2;
      phBowlWater.position.set(1.24, 0.75, -1.92);
      root.add(phBowlWater);
    }

    // Soft feathered radial contact shadows under Shelly's body & outstretched flippers oriented along her aim toward the resident!
    var shX = layout.shellyX, shZ = layout.shellyZ;
    var shellyAimYaw = Math.atan2(layout.actorX - shX, layout.actorZ - shZ);
    var shellyShadowGrp = new T.Group();
    shellyShadowGrp.position.set(shX, 0.022, shZ);
    shellyShadowGrp.rotation.y = shellyAimYaw;
    var shellyOuter = new T.Mesh(new T.PlaneGeometry(1.36, 1.06), regionInteriorRadialShadowMat(0.42));
    shellyOuter.rotation.x = -Math.PI / 2;
    shellyOuter.renderOrder = 3;
    shellyShadowGrp.add(shellyOuter);
    var shellyCore = new T.Mesh(new T.PlaneGeometry(0.84, 0.70), regionInteriorContactCoreMat(0.38));
    shellyCore.rotation.x = -Math.PI / 2;
    shellyCore.position.y = 0.001;
    shellyCore.renderOrder = 4;
    shellyShadowGrp.add(shellyCore);
    [-1, 1].forEach(function(side){
      var flipShad = new T.Mesh(new T.PlaneGeometry(0.54, 0.30), regionInteriorRadialShadowMat(0.32));
      flipShad.rotation.x = -Math.PI / 2;
      flipShad.rotation.z = side * 0.24;
      flipShad.position.set(side * 0.48, 0.0006, 0.06);
      flipShad.renderOrder = 3;
      shellyShadowGrp.add(flipShad);
    });
    root.add(shellyShadowGrp);

    // MAJ-1, MIN-2 & MIN-4: Crisp double-layered grounded contact shadows directly beneath grounded residents
    // (Otter, Sua the Seal on her rug, Seahorse, Octopus) + soft ambient drop shadows beneath hovering swimmers!
    var actorShadowSpecs = {
      restaurant: { outerW: 1.28, outerD: 0.98, outerOp: 0.48, coreW: 0.80, coreD: 0.60, coreOp: 0.62, y: 0.006 },
      friend:     { outerW: 1.96, outerD: 1.48, outerOp: 0.62, coreW: 1.38, coreD: 1.02, coreOp: 0.80, y: 0.024, orient: true, lobes: [[-0.56, 0.26, 0.56, 0.36], [0.56, 0.26, 0.56, 0.36]] },
      cafe:       { outerW: 1.16, outerD: 0.90, outerOp: 0.42, coreW: 0.70, coreD: 0.56, coreOp: 0.52, y: 0.006 },
      shop:       { outerW: 2.26, outerD: 1.48, outerOp: 0.44, coreW: 1.54, coreD: 0.98, coreOp: 0.54, y: 0.006 },
      hotel:      { outerW: 1.58, outerD: 1.12, outerOp: 0.24, y: 0.004 },
      pharmacy:   { outerW: 1.32, outerD: 0.96, outerOp: 0.24, y: 0.004 },
      subway:     { outerW: 1.72, outerD: 1.16, outerOp: 0.24, y: 0.004 },
      taxi:       { outerW: 1.42, outerD: 1.02, outerOp: 0.24, y: 0.004 }
    }[kind];
    if(actorShadowSpecs){
      var asGrp = new T.Group();
      asGrp.position.set(layout.actorX, actorShadowSpecs.y, layout.actorZ);
      if(actorShadowSpecs.orient){
        var actorAimYaw = Math.atan2(layout.shellyX - layout.actorX, layout.shellyZ - layout.actorZ) * (layout.actorYawFrac || 0.70);
        asGrp.rotation.y = actorAimYaw;
      }
      var asOuterGeo = new T.PlaneGeometry(actorShadowSpecs.outerW, actorShadowSpecs.outerD);
      var asOuterMat = regionInteriorRadialShadowMat(actorShadowSpecs.outerOp);
      disposables.push(asOuterGeo, asOuterMat);
      var asOuter = new T.Mesh(asOuterGeo, asOuterMat);
      asOuter.rotation.x = -Math.PI / 2;
      asOuter.renderOrder = 3;
      asGrp.add(asOuter);
      if(actorShadowSpecs.coreW){
        var asCoreGeo = new T.PlaneGeometry(actorShadowSpecs.coreW, actorShadowSpecs.coreD);
        var asCoreMat = regionInteriorContactCoreMat(actorShadowSpecs.coreOp);
        disposables.push(asCoreGeo, asCoreMat);
        var asCore = new T.Mesh(asCoreGeo, asCoreMat);
        asCore.rotation.x = -Math.PI / 2;
        asCore.position.y = 0.001;
        asCore.renderOrder = 4;
        asGrp.add(asCore);
      }
      if(actorShadowSpecs.lobes){
        var lobeMat = regionInteriorContactCoreMat(0.54);
        disposables.push(lobeMat);
        actorShadowSpecs.lobes.forEach(function(lb){
          var lGeo = new T.PlaneGeometry(lb[2], lb[3]);
          disposables.push(lGeo);
          var lMesh = new T.Mesh(lGeo, lobeMat);
          lMesh.rotation.x = -Math.PI / 2;
          lMesh.position.set(lb[0], 0.0008, lb[1]);
          lMesh.renderOrder = 4;
          asGrp.add(lMesh);
        });
      }
      root.add(asGrp);
    }

    var cornerShadowMat = regionInteriorRadialShadowMat(0.30);
    floorShadows.forEach(function(ps){
      var pShad = new T.Mesh(new T.PlaneGeometry(ps[2], ps[3]), cornerShadowMat);
      pShad.rotation.x = -Math.PI / 2;
      pShad.position.set(ps[0], 0.0035, ps[1]);
      pShad.renderOrder = 1;
      root.add(pShad);
    });

    // MAJ-8: Soft ambient-occlusion baseboard shadow strips along floor-wall & counter-floor seams
    var aoMat = regionInteriorAoMat(0.32);
    if(kind !== 'taxi' && kind !== 'subway'){
      regionInteriorAddAoStrip(root, aoMat, 0, -2.68, 9.2, 0.50, 0);
    }
    if(kind !== 'subway'){
      regionInteriorAddAoStrip(root, aoMat, -4.40, 0.65, 7.2, 0.48, Math.PI / 2);
    }
    regionInteriorAddAoStrip(root, aoMat, 4.40, 0.65, 7.2, 0.48, -Math.PI / 2);
    var counterAoMat = regionInteriorAoMat(0.28);
    aoStrips.forEach(function(st){
      regionInteriorAddAoStrip(root, counterAoMat, st[0], st[1], st[2], st[3], st[4] || 0, 0.003);
    });

    // MAJ-8: Unmistakable Jamboree diagonal sunlit window floor patches (opacity 0.34..0.42, bright #fff4cc
    // with crisp dark diagonal mullion-bar shadow stripes!), glossy window-reflection floor sheen panels,
    // & angled diagonal volumetric window sunbeams (opacity 0.14..0.18) across ALL 8 Harbor Town rooms!
    var sunRoomSpecs = {
      cafe: {
        beamOp: night ? 0.12 : 0.22,
        sheenOp: night ? 0.13 : 0.22,
        patches: [
          { style: 'grid3x2', x0: 0.94, x1: 3.50, zB: -2.10, zF: 1.48, slant: -1.62, op: night ? 0.18 : 0.32, mullOp: night ? 0.16 : 0.26 }
        ],
        sheens: [[1.42, -0.35, 2.75, 2.15, -0.42], [-0.15, 0.25, 1.85, 1.55, -0.35]],
        beams: [
          [1.04, 2.18, 2.92, -2.84, -0.36, 0.78, 0.32],
          [2.28, 3.42, 2.92, -2.84,  0.88, 2.02, 0.32]
        ]
      },
      restaurant: {
        beamOp: night ? 0.20 : 0.30,
        sheenOp: night ? 0.21 : 0.30,
        patches: [
          { style: 'arch2x2', x0:  2.78, x1:  4.08, zB: -2.10, zF: 1.50, slant: -1.72, op: night ? 0.26 : 0.40, mullOp: night ? 0.24 : 0.34 },
          { style: 'arch2x2', x0: -3.48, x1: -2.18, zB: -2.10, zF: 1.45, slant: -1.18, op: night ? 0.26 : 0.38, mullOp: night ? 0.24 : 0.33 },
          { style: 'grid2x2', x0: -0.14, x1:  1.24, zB: -2.05, zF: 1.15, slant: -0.88, op: night ? 0.26 : 0.36, mullOp: night ? 0.24 : 0.32 }
        ],
        sheens: [[2.15, -0.42, 2.45, 2.10, -0.44], [-0.35, -0.45, 2.15, 1.70, -0.28]],
        beams: [
          [ 2.94,  4.04, 3.06, -2.84,  1.42,  2.52, 0.42],
          [-3.40, -2.32, 3.06, -2.84, -4.18, -3.10, 0.10]
        ]
      },
      shop: {
        beamOp: night ? 0.12 : 0.22,
        sheenOp: night ? 0.13 : 0.22,
        patches: [
          { style: 'grid3x2', x0: -1.25, x1: 1.65, zB: -1.15, zF: 2.10, slant: 1.15, op: night ? 0.18 : 0.32, mullOp: night ? 0.16 : 0.28 }
        ],
        sheens: [[1.18, -0.35, 2.65, 2.10, 0.42], [-0.55, 0.12, 1.95, 1.55, 0.34]],
        beams: [
          [-0.78, 0.14, 3.08, -2.84, 0.56, 1.48, 0.42],
          [ 0.22, 1.14, 3.08, -2.84, 1.56, 2.48, 0.42]
        ]
      },
      taxi: {
        beamOp: night ? 0.20 : 0.29,
        sheenOp: night ? 0.21 : 0.29,
        patches: [
          { style: 'pergola', x0: -3.72, x1: -1.56, zB: -2.10, zF: 1.48, slant: 1.62, op: night ? 0.26 : 0.38, mullOp: night ? 0.24 : 0.33 },
          { style: 'pergola', x0: -1.42, x1:  0.66, zB: -2.10, zF: 1.48, slant: 1.62, op: night ? 0.26 : 0.38, mullOp: night ? 0.24 : 0.33 }
        ],
        sheens: [[-0.55, -0.38, 3.10, 2.15, 0.44], [0.95, 0.22, 2.10, 1.60, 0.36]],
        beams: [
          [-3.58, -2.02, 3.00, -2.86, -2.14, -0.58, 0.36],
          [-1.64, -0.08, 3.00, -2.86, -0.20,  1.36, 0.36]
        ]
      },
      subway: {
        beamOp: night ? 0.24 : 0.38,
        sheenOp: night ? 0.25 : 0.40,
        patches: [
          { style: 'grid3x2', x0: -0.92, x1: 0.50, zB: -2.10, zF: 1.48, slant: -1.26, op: night ? 0.30 : 0.48, mullOp: night ? 0.26 : 0.38 },
          { style: 'grid3x2', x0:  1.12, x1: 2.58, zB: -2.10, zF: 1.48, slant: -1.28, op: night ? 0.30 : 0.48, mullOp: night ? 0.26 : 0.38 }
        ],
        sheens: [[0.42, -0.38, 2.65, 2.05, -0.38], [1.65, 0.18, 2.10, 1.65, -0.38]],
        beams: [
          [-0.90, 0.42, 3.24, -1.98, -1.92, -0.60, 0.32],
          [ 1.20, 2.52, 3.24, -1.98,  0.14,  1.46, 0.32]
        ]
      },
      hotel: {
        beamOp: night ? 0.12 : 0.24,
        sheenOp: night ? 0.13 : 0.22,
        patches: [
          { style: 'grid3x2', x0: 0.55, x1: 2.75, zB: -1.25, zF: 2.15, slant: -1.25, op: night ? 0.18 : 0.40, mullOp: night ? 0.16 : 0.34 }
        ],
        sheens: [[1.68, -0.35, 2.85, 2.20, -0.46], [0.18, 0.22, 2.15, 1.65, -0.40]],
        beams: [
          [2.38, 3.22, 3.14, -2.82, 0.80, 1.64, 0.44],
          [3.26, 4.08, 3.14, -2.82, 1.68, 2.50, 0.44]
        ]
      },
      pharmacy: {
        beamOp: night ? 0.20 : 0.29,
        sheenOp: night ? 0.21 : 0.30,
        patches: [
          { style: 'grid3x2', x0: -0.80, x1: 1.15, zB: -1.15, zF: 2.05, slant: -1.10, op: night ? 0.26 : 0.48, mullOp: night ? 0.24 : 0.42 },
          { style: 'arch2x2', x0:  1.35, x1: 3.25, zB: -1.15, zF: 2.05, slant: -1.10, op: night ? 0.26 : 0.48, mullOp: night ? 0.24 : 0.42 }
        ],
        sheens: [[0.24, -0.36, 3.10, 2.15, -0.42], [2.10, 0.10, 2.25, 1.75, -0.42]],
        beams: [
          [-1.24, -0.14, 3.00, -2.86, -2.46, -1.36, 0.36],
          [ 0.64,  1.74, 3.00, -2.86, -0.60,  0.50, 0.36],
          [ 2.52,  3.62, 3.00, -2.86,  1.28,  2.38, 0.36]
        ]
      },
      friend: {
        beamOp: night ? 0.12 : 0.24,
        sheenOp: night ? 0.13 : 0.22,
        patches: [
          { style: 'pergola', x0: -3.28, x1: -1.16, zB: -2.10, zF: 1.52, slant: 1.62, op: night ? 0.18 : 0.32, mullOp: night ? 0.16 : 0.26 },
          { style: 'pergola', x0: -0.68, x1:  1.62, zB: -2.10, zF: 1.52, slant: 1.62, op: night ? 0.18 : 0.32, mullOp: night ? 0.16 : 0.26 }
        ],
        sheens: [[0.25, -0.35, 3.10, 2.15, 0.44], [1.95, 0.18, 2.05, 1.65, 0.40]],
        beams: [
          [-2.74, -1.46, 3.02, -2.74, -1.32, -0.04, 0.44],
          [-0.48,  0.86, 3.02, -2.74,  0.94,  2.28, 0.44]
        ]
      }
    }[kind];
    if(sunRoomSpecs){
      var beamMat = regionInteriorSunbeamMat(night, sunRoomSpecs.beamOp);
      var sheenMat = regionInteriorFloorSheenMat(night, sunRoomSpecs.sheenOp);
      disposables.push(beamMat, sheenMat);
      sunRoomSpecs.patches.forEach(function(pt){
        if(!pt.noMullion){
          var mMat = regionInteriorSunMullionMat(night, pt.style, pt.mullOp);
          disposables.push(mMat);
          var mMesh = regionInteriorAddDiagSunPatch(root, mMat, pt.x0, pt.x1, pt.zB, pt.zF, pt.slant, 0.0155);
          if(mMesh && mMesh.geometry) disposables.push(mMesh.geometry);
        }
        var pMat = regionInteriorSunPatchMat(night, pt.style, pt.op);
        disposables.push(pMat);
        var pMesh = regionInteriorAddDiagSunPatch(root, pMat, pt.x0, pt.x1, pt.zB, pt.zF, pt.slant, 0.0165);
        if(pMesh && pMesh.geometry) disposables.push(pMesh.geometry);
      });
      sunRoomSpecs.sheens.forEach(function(sh){
        var shGeo = new T.PlaneGeometry(sh[2], sh[3]);
        disposables.push(shGeo);
        var shMesh = new T.Mesh(shGeo, sheenMat);
        shMesh.rotation.x = -Math.PI / 2;
        shMesh.rotation.z = sh[4] || 0;
        shMesh.position.set(sh[0], 0.0044, sh[1]);
        shMesh.renderOrder = 2;
        root.add(shMesh);
      });
      sunRoomSpecs.beams.forEach(function(bm){
        var bMesh = regionInteriorAddQuad(root, [
          [bm[0], bm[2], bm[3]],
          [bm[1], bm[2], bm[3]],
          [bm[5], 0.008, bm[6]],
          [bm[4], 0.008, bm[6]]
        ], beamMat);
        bMesh.renderOrder = 5;
        if(bMesh && bMesh.geometry) disposables.push(bMesh.geometry);
      });
    }

    // Venue-matched soft light cones (pendants, sconces, or Subway train headlights!)
    var coneMat = regionInteriorGlowConeMat();
    if(kind === 'cafe'){
      [-2.04, -0.44].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.12, 0.72, 1.32, 16, 1, true), coneMat);
        cone.position.set(lx, 1.84, -0.62);
        root.add(cone);
      });
    } else if(kind === 'restaurant'){
      [-1.88, 2.54].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.10, 0.52, 1.12, 16, 1, true), coneMat);
        cone.position.set(lx, 1.62, -2.74);
        root.add(cone);
      });
    } else if(kind === 'shop'){
      [-1.08, 1.44].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.12, 0.74, 1.32, 16, 1, true), coneMat);
        cone.position.set(lx, 1.88, -0.68);
        root.add(cone);
      });
    } else if(kind === 'taxi'){
      [-3.36, 0.08].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.12, 0.64, 1.32, 16, 1, true), coneMat);
        cone.position.set(lx, 1.92, -2.72);
        root.add(cone);
      });
    } else if(kind === 'subway'){
      [0.24, 2.16].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.12, 0.66, 1.26, 16, 1, true), coneMat);
        cone.position.set(lx, 1.84, -0.72);
        root.add(cone);
      });
      // Soft glowing subway train twin headlight cones projecting forward along the shifted left track!
      [-4.13, -3.17].forEach(function(hx){
        var hCone = new T.Mesh(new T.CylinderGeometry(0.10, 0.42, 1.45, 14, 1, true), coneMat);
        hCone.rotation.x = Math.PI / 2 - 0.14;
        hCone.position.set(hx, 0.50, -1.48);
        root.add(hCone);
      });
    } else if(kind === 'hotel'){
      [[-0.54, 1.88, -2.80, 0.12, 0.58, 1.15], [1.58, 1.88, -2.80, 0.12, 0.58, 1.15], [-4.12, 0.94, -0.20, 0.24, 0.66, 1.12]].forEach(function(lc){
        var cone = new T.Mesh(new T.CylinderGeometry(lc[3], lc[4], lc[5], 16, 1, true), coneMat);
        cone.position.set(lc[0], lc[1], lc[2]);
        root.add(cone);
      });
    } else if(kind === 'friend'){
      [-1.65, 0.0, 1.65].forEach(function(lx){
        var cone = new T.Mesh(new T.CylinderGeometry(0.10, 0.68, 1.38, 16, 1, true), coneMat);
        cone.position.set(lx, 2.32, -1.65);
        root.add(cone);
      });
    }

    // FPS Fix #378: Cap active room PointLights strictly to <= 2 per room (1 warm indoor fill + 1 primary window/key specular light)!
    var indoorLight = new T.PointLight(kind === 'pharmacy' ? 0xf6fff9 : (kind === 'subway' ? 0xf4faff : 0xfff2dc), kind === 'subway' ? 0.78 : (kind === 'pharmacy' ? 0.74 : (kind === 'friend' ? 0.68 : 0.62)), 16);
    indoorLight.position.set(0, 3.15, 0.35);
    root.add(indoorLight);
    if(extraLights.length){
      var lt = extraLights[0];
      var pl = new T.PointLight(lt.color, lt.intensity, lt.dist);
      pl.position.set(lt.pos[0], lt.pos[1], lt.pos[2]);
      root.add(pl);
    }

    return root;
  }

  // MAJ-1: Tight visible-only bounding box (skips hidden procedural fallbacks, hidden board GLBs, and contact shadows!)
  function regionInteriorVisibleBox(obj){
    var T = window.THREE;
    var box = new T.Box3();
    if(!obj || !T || !T.Box3) return box;
    obj.updateMatrixWorld(true);
    var v = new T.Vector3();
    function walk(node){
      if(!node || node.visible === false) return;
      if(node.userData && (node.userData.isContactShadow || node.userData.isWaterRipple)) return;
      if(node.isMesh && node.geometry && node.geometry.attributes && node.geometry.attributes.position){
        var pos = node.geometry.attributes.position;
        if(pos.count > 0 && pos.count <= 24000){
          for(var i = 0; i < pos.count; i++){
            v.fromBufferAttribute(pos, i).applyMatrix4(node.matrixWorld);
            box.expandByPoint(v);
          }
        } else {
          if(!node.geometry.boundingBox) node.geometry.computeBoundingBox();
          if(node.geometry.boundingBox && !node.geometry.boundingBox.isEmpty()){
            box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
          }
        }
      }
      var ch = node.children;
      for(var c = 0; c < ch.length; c++) walk(ch[c]);
    }
    walk(obj);
    if(box.isEmpty()) box.setFromObject(obj);
    return box;
  }

  function regionEncounterInteriorPlaceActor(view, e){
    var T = window.THREE;
    if(!T || !e || !e.interior || !e.actor) return;
    var base = e.savedActorTransformForExit || e.savedActorTransform;
    var actor = e.actor;
    var yaw = e.interior.yaw;
    var kind = e.interior.kind;
    var layout = REGION_INTERIOR_LAYOUTS[kind] || REGION_INTERIOR_LAYOUTS.cafe;

    actor.scale.copy(base.scale);
    var actorLocalX = layout.actorX;
    var actorLocalZ = layout.actorZ;
    var npcWorld = regionInteriorToWorld(base.position, yaw, actorLocalX, 0, actorLocalZ);
    actor.position.copy(npcWorld);

    // Directive #364 & MAJ-2 (Mutual Eye Contact): Turn resident's body ~68-84% toward Shelly's exact room position
    // (compensating for decorative encounterPose.yaw like hotel-whale while preserving modelForwardFix yaw like cafe-seahorse!)
    var toShellyYaw = Math.atan2(layout.shellyX - actorLocalX, layout.shellyZ - actorLocalZ);
    var ep = actor.userData && actor.userData.encounterPose;
    var poseYaw = (ep && !ep.modelForwardFix && typeof ep.yaw === 'number') ? ep.yaw : 0;
    var relYaw = toShellyYaw * (layout.actorYawFrac || 0.70) - poseYaw;
    actor.rotation.set(base.rotation.x, yaw + relYaw, base.rotation.z);
    actor.updateMatrixWorld(true);

    if(T.Box3){
      var ab = regionInteriorVisibleBox(actor);
      var size = new T.Vector3();
      ab.getSize(size);
      var maxY = layout.maxY;
      var targetY = layout.targetY;
      var maxXZ = layout.maxXZ;
      var targetXZ = layout.targetXZ;
      var maxHoriz = Math.max(size.x, size.z);
      var sx = (isFinite(maxHoriz) && maxHoriz > maxXZ) ? (targetXZ / maxHoriz) : 1;
      var sy = (isFinite(size.y) && size.y > maxY) ? (targetY / size.y) : 1;
      var mult = Math.min(sx, sy);
      // For Subway Ray: also ensure she fills the generous 2.65u wingspan crisply if close GLB was smaller
      if(kind === 'subway' && isFinite(maxHoriz) && maxHoriz > 0.2 && maxHoriz < targetXZ && isFinite(size.y) && size.y > 0.05){
        mult = Math.min(targetXZ / maxHoriz, targetY / size.y);
      }
      if(mult !== 1 && isFinite(mult) && mult > 0.05){
        actor.scale.multiplyScalar(mult);
        actor.updateMatrixWorld(true);
        ab = regionInteriorVisibleBox(actor);
        ab.getSize(size);
      }
      if(isFinite(ab.min.y)){
        if(typeof layout.hoverY === 'number'){
          // Raised swimmers & Taxi Squid hover cleanly above their counter/dispatch ledge so tentacles/fins read crisply!
          actor.position.y += (base.position.y + layout.hoverY) - ab.min.y;
        } else {
          // MAJ-1 & MIN-2: Grounded characters (otter, seahorse, octopus, friend seal) plant BOTH feet solidly at y = 0 (+ rug lift)!
          actor.position.y += (base.position.y + (layout.floorLift || 0)) - ab.min.y;
        }
      }
    }

    e.savedActorTransform = {
      position: actor.position.clone(),
      rotation: actor.rotation.clone(),
      scale: actor.scale.clone()
    };
  }

  function regionEncounterInteriorBegin(view){
    var T = window.THREE;
    var e = view && view.encounter;
    if(!T || !e) return false;
    var kind = regionEncounterInteriorKind(view, e);
    if(!kind) return false;
    var room = regionEncounterInteriorBuild(view, kind);
    if(!room) return false;

    var base = e.savedActorTransform;
    var actor = e.actor;
    var guide = view.guide;
    var yaw = base.rotation.y;
    var layout = REGION_INTERIOR_LAYOUTS[kind] || REGION_INTERIOR_LAYOUTS.cafe;

    room.position.copy(base.position);
    room.rotation.set(0, yaw, 0);
    view.scene.add(room);
    // Mark _shellyDialogFramed = true because every bespoke room places Shelly & her contact shadows directly clear of the dialog card!
    e.interior = { kind: kind, room: room, yaw: yaw, _shellyDialogFramed: true };
    e.savedActorTransformForExit = base;

    e.interiorHidden = [];
    view.scene.children.forEach(function(o){
      if(!o || o === room || o === actor || o === guide || o.isLight) return;
      if(regionInteriorIsAncestor(o, actor) || regionInteriorIsAncestor(o, guide)) return;
      e.interiorHidden.push({ object: o, visible: o.visible });
      o.visible = false;
    });

    regionEncounterInteriorPlaceActor(view, e);

    if(guide){
      var origVis = true;
      (e.hiddenObjects || []).forEach(function(item){
        if(item.object === guide) origVis = item.visible;
      });
      e.savedGuide = {
        position: guide.position.clone(),
        rotation: guide.rotation.clone(),
        scale: guide.scale.clone(),
        visible: origVis
      };
      guide.visible = true;
      if(guide.userData && guide.userData.body){
        guide.userData.body.visible = true;
        guide.userData.body.position.set(0, 0, 0);
        guide.userData.body.rotation.set(0, 0, 0);
        guide.userData.body.scale.set(1, 1, 1);
      }
      guide.scale.copy(e.savedGuide.scale).multiplyScalar(0.741);
      var mobShopShellyShift = (kind === 'shop' && view.cam && view.cam.aspect < 0.75) ? 0.46 : 0;
      var shellyWorld = regionInteriorToWorld(base.position, yaw, layout.shellyX + mobShopShellyShift, 0, layout.shellyZ);
      guide.position.copy(shellyWorld);
      // Directive #364 (Mutual Eye Contact): Orient Shelly directly toward the resident's exact room position!
      var shellyAimYaw = Math.atan2(layout.actorX - (layout.shellyX + mobShopShellyShift), layout.actorZ - layout.shellyZ);
      guide.rotation.set(0, yaw + shellyAimYaw, 0);
      guide.updateMatrixWorld(true);

      if(!(guide.userData && guide.userData.shelly) && T.Box3){
        var gb = regionInteriorVisibleBox(guide);
        if(isFinite(gb.min.y)){
          var dy = base.position.y - gb.min.y;
          if(Math.abs(dy) < 2.0) guide.position.y += dy;
        }
      }
      e.interior.shellyX = guide.position.x;
      e.interior.shellyZ = guide.position.z;
      e.interior.shellyBaseY = guide.position.y;
      e.interior.shellyBaseRotY = guide.rotation.y;
      e.interior.shellyBaseRotZ = guide.rotation.z;
    }

    view.zoomAnim = null;
    view.zoomGoal = null;
    view.zoomNow = 0;
    view.zoomCenter = null;
    view.drift = 0;
    if(view.camPos && view.camLook && view.cam){
      regionEncounterInteriorCamera(view, view.camPos, view.camLook);
      view.cam.position.copy(view.camPos);
      view.cam.lookAt(view.camLook);
      view.camModeWas = 'encounter';
      view.camGlide = 0;
    }

    if(view.wrap) view.wrap.classList.add('rpg-stage-interior');
    if(view._jamboreeVisuals && view._jamboreeVisuals.root) view._jamboreeVisuals.root.visible = false;
    if(view._jamboree && view._jamboree.group) view._jamboree.group.visible = false;
    if(window.JamboreeBridge && JamboreeBridge.onInteriorBegin) JamboreeBridge.onInteriorBegin(view, e);
    return true;
  }

  function regionEncounterInteriorCamera(view, out, look){
    var e = view && view.encounter;
    if(!e || !e.interior) return false;
    var base = e.savedActorTransformForExit || e.savedActorTransform;
    if(!base) return false;
    var yaw = e.interior.yaw;
    var aspect = Math.max(0.45, view.cam && view.cam.aspect ? view.cam.aspect : 1.33);
    var isMobShop = (aspect < 1.1 && e.interior.kind === 'shop');
    var dist = isMobShop
      ? Math.max(6.4, 4.85 / Math.max(0.58, Math.min(1.0, aspect * 0.85)))
      : Math.max(4.75, 4.65 / Math.max(0.68, Math.min(1.0, aspect * 0.78)));
    var lxOff = -0.04 + (isMobShop ? -0.34 : 0);
    var lyCam = (e.interior.kind === 'hotel') ? 1.84 : (isMobShop ? 1.18 : 1.42);
    var lyLook = (e.interior.kind === 'hotel') ? 0.86 : (0.92 + (isMobShop ? -0.04 : 0));

    var camPos = regionInteriorToWorld(base.position, yaw, lxOff, lyCam, dist);
    var target = regionInteriorToWorld(base.position, yaw, lxOff, lyLook, -0.78);
    out.copy(camPos);
    look.copy(target);
    if(view.cam && view.cam.aspect < 1.1){
      if(e.interior.kind === 'cafe') look.x += 0.22;
    }
    e.interior._lastAspect = aspect;
    view.camMode = 'encounter';
    return true;
  }

  function regionEncounterInteriorTick(view, now){
    var e = view && view.encounter;
    if(!e || !e.interior || !view.guide) return;
    if(view._jamboreeVisuals && view._jamboreeVisuals.root) view._jamboreeVisuals.root.visible = false;
    if(view._jamboree && view._jamboree.group) view._jamboree.group.visible = false;
    if(!view.camPin && view.cam && view.camPos && view.camLook){
      if(Math.abs((view.cam.aspect || 1.33) - (e.interior._lastAspect || 0)) > 0.01){
        regionEncounterInteriorCamera(view, view.camPos, view.camLook);
      }
      view.drift = 0;
      view.cam.position.copy(view.camPos);
      view.cam.lookAt(view.camLook);
    }
    view.guide.visible = true;
    view.guide.position.x = e.interior.shellyX;
    view.guide.position.z = e.interior.shellyZ;
    view.guide.rotation.y = e.interior.shellyBaseRotY;
    if(view.guide.userData && view.guide.userData.body){
      view.guide.userData.body.visible = true;
      view.guide.userData.body.scale.set(1, 1, 1);
    }
    if(reefCalm()){
      view.guide.position.y = e.interior.shellyBaseY;
      return;
    }
    var t = now * 0.001;
    view.guide.position.y = e.interior.shellyBaseY + Math.sin(t * 2.1) * 0.014;
    view.guide.rotation.z = e.interior.shellyBaseRotZ + Math.sin(t * 1.3) * 0.015;
    if(window.JamboreeBridge && JamboreeBridge.onInteriorTick) JamboreeBridge.onInteriorTick(view, now);
  }

  function regionEncounterInteriorEnd(view, e){
    if(!e || !e.interior) return false;
    if(window.JamboreeBridge && JamboreeBridge.onInteriorEnd) JamboreeBridge.onInteriorEnd(view, e);
    if(e.interior.room){
      if(e.interior.room.parent) e.interior.room.parent.remove(e.interior.room);
      if(e.interior.room.userData && e.interior.room.userData.disposables){
        e.interior.room.userData.disposables.forEach(function(d){
          if(d && typeof d.dispose === 'function') d.dispose();
        });
        e.interior.room.userData.disposables = null;
      }
    }
    if(e.savedActorTransformForExit){
      e.savedActorTransform = e.savedActorTransformForExit;
      delete e.savedActorTransformForExit;
    }
    (e.interiorHidden || []).forEach(function(savedObject){
      savedObject.object.visible = savedObject.visible;
    });
    if(view.guide && e.savedGuide){
      view.guide.position.copy(e.savedGuide.position);
      view.guide.rotation.copy(e.savedGuide.rotation);
      view.guide.scale.copy(e.savedGuide.scale);
      view.guide.visible = e.savedGuide.visible;
      if(view.guide.userData && view.guide.userData.body){
        view.guide.userData.body.rotation.set(0, 0, 0);
        view.guide.userData.body.scale.set(1, 1, 1);
      }
    }
    view.camGlide = 0;
    if(view.wrap) view.wrap.classList.remove('rpg-stage-interior');
    if(view._jamboreeVisuals && view._jamboreeVisuals.root) view._jamboreeVisuals.root.visible = true;
    if(view._jamboree && view._jamboree.group) view._jamboree.group.visible = true;
    e._wasInterior = true;
    e.interior = null;
    return true;
  }
