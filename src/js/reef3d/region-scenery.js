  /* Regional board scenery. The board owns the route, characters and camera; this adds
     one still, baked world around that route. All shapes share the board's materials. */
  window.regionBoardDecorate = function(view, config){
    var id = config && config.id, allowed = { town: 1, lagoon: 1, caves: 1, patterns: 1, beach: 1, light: 1, captain: 1 };
    if(!allowed[id] || !view || !view.kit || !view.spaces) return;
    var T = window.THREE, M = view.kit.M, mesh = view.kit.mesh, sp = view.spaces,
        main = sp.slice(0, sp.mainN || sp.length), root = new T.Group(), geos = {};
    root.name = 'region-' + id;
    function box(w,h,d){ var k = ['b',w,h,d].join(':'); return geos[k] || (geos[k] = new T.BoxGeometry(w,h,d)); }
    function cyl(rt,rb,h,n){ var k = ['c',rt,rb,h,n || 10].join(':'); return geos[k] || (geos[k] = new T.CylinderGeometry(rt,rb,h,n || 10)); }
    function cone(r,h,n){ return cyl(0,r,h,n || 7); }
    function ball(r,n){ var k = ['s',r,n || 10].join(':'); return geos[k] || (geos[k] = new T.SphereGeometry(r,n || 10,7)); }
    function torus(r,t){ var k = ['t',r,t].join(':'); return geos[k] || (geos[k] = new T.TorusGeometry(r,t,6,16)); }
    function add(g,col,x,y,z,rx,ry,rz){ var o = mesh(g,M(col),x,y,z); if(rx) o.rotation.x=rx; if(ry) o.rotation.y=ry; if(rz) o.rotation.z=rz; root.add(o); return o; }
    function block(w,h,d,col,x,y,z,ry){ return add(box(w,h,d),col,x,y,z,0,ry); }
    function post(r,h,col,x,y,z){ return add(cyl(r,r,h,8),col,x,y+h/2,z); }
    function orb(r,col,x,y,z){ return add(ball(r,10),col,x,y,z); }
    function at(s,side,dist,dz){ var x=s.x+side*(dist||5), z=s.z+(dz||0); return [x,-.27,z]; }
    function placed(s,side,dist,dz,fn){ var p=at(s,side,dist,dz); fn(p[0],p[1],p[2]); }
    function pathSide(s,i){ return ((i%2)?1:-1) * (s.x>3 ? -1 : s.x< -3 ? 1 : 1); }
    function foundations(col){
      main.forEach(function(s,i){ if(i%2) return; add(cyl(1.75,1.9,.12,12),col,s.x,(s.y||0)-.16,s.z); });
    }
    function lantern(x,y,z,col){
      post(.07,2.2,'#50445d',x,y,z); add(cyl(.42,.24,.52,6),'#744f64',x,y+2.16,z);
      orb(.24,col,x,y+2.16,z); add(cone(.48,.24,6),'#4c5367',x,y+2.55,z);
    }
    function crystal(x,y,z,scale,col){
      add(cyl(0,.43*scale,1.8*scale,5),col,x,y+.9*scale,z,0,(x+z)*.2,.16);
      add(cone(.23*scale,.72*scale,5),'#d8f7fb',x+.27*scale,y+.4*scale,z+.17*scale,0,0,-.32);
    }
    function coral(x,y,z,k,col){
      post(.13*k,1.5*k,col,x,y,z);
      for(var a=0;a<3;a++){ var ang=a*2.094+.3, bx=x+Math.cos(ang)*.45*k, bz=z+Math.sin(ang)*.45*k;
        add(cyl(.04*k,.1*k,1.15*k,5),col,bx,y+.85*k,bz,Math.sin(ang)*.42,0,Math.cos(ang)*-.42);
        orb(.12*k,'#ffe3d5',bx+Math.cos(ang)*.15*k,y+1.48*k,bz+Math.sin(ang)*.15*k);
      }
    }
    function harborBoat(x,z,n){
      var sh=new T.Shape(); sh.moveTo(-.67,-1.4); sh.lineTo(.67,-1.4);
      sh.lineTo(1,0); sh.lineTo(.67,1.4); sh.lineTo(-.67,1.4); sh.lineTo(-1,0); sh.closePath();
      var hull=new T.ExtrudeGeometry(sh,{depth:.42,bevelEnabled:false}); hull.rotateX(-Math.PI/2);
      add(hull,n%2?'#c66f56':'#487e89',x,-.42,z);
      block(1.38,.08,2.25,'#d8be8c',x,-.03,z);
      [-1,1].forEach(function(sd){ block(.12,.12,2.6,'#f5e7be',x+sd*.72,.08,z); });
      post(.055,2.6,'#795d49',x,-.02,z);
      var sail=new T.BufferGeometry(); sail.setAttribute('position',new T.Float32BufferAttribute([
        0,.35,0, 0,2.35,0, .9,.35,0,
        0,.35,0, -.68,.35,0, 0,1.65,0
      ],3)); sail.computeVertexNormals();
      root.add(mesh(sail,M(n%2?'#fff1cf':'#f7d9bf',{side:T.DoubleSide}),x,-.02,z));
      block(.1,.07,.36,'#efb665',x,.55,z+.95);
    }
    // Replace the generic dune mesh with a broad, flat regional landform. Its top is
    // below the path, so every original tile, ribbon and character remains visible.
    var terrainColor={ town:'#b5bbb6', lagoon:'#4ca8ad', caves:'#647281', patterns:'#bc9aa1',
      beach:'#f3dba9', light:'#557f87', captain:'#387d91' };
    var length=main.length*2.6+35, middle=(main[0].z+main[main.length-1].z)/2;
    if(view.floor) view.floor.visible=false;
    block(70,.16,length,terrainColor[id],0,-.43,middle);
    if(view.wrap) view.wrap.classList.add('region-'+id);
    function sea(x,w,col,y){ block(w,.06,length,col,x,y,middle); }
    if(id==='town'){
      sea(18.3,33.4,'#559ca7',-.31);
      block(15.6,.1,length,'#c4c2ad',-6.2,-.29,middle);
      block(.4,.48,length,'#7e8990',1.6,-.05,middle);
      // The route occasionally reaches over the harbor; short timber piers
      // carry those tiles while leaving blue water visible between them.
      main.forEach(function(s,i){ if(s.x<.55) return;
        block(4.8,.18,2.8,'#a67b55',s.x,-.27,s.z);
        for(var dj=-1;dj<=1;dj++) block(4.8,.05,.1,'#d4aa75',s.x,-.14,s.z+dj*.83);
        if(i%2===0) post(.12,1.1,'#7e6049',s.x+2.15,-.4,s.z+1.1);
      });
    } else if(id==='lagoon'){
      sea(0,70,'#4cabb0',-.3);
      for(var li=0;li<main.length;li+=2){ var ls=main[li];
        add(cyl(2.2,2.45,.26,12),'#a9c9ae',ls.x,-.14,ls.z);
        add(cyl(1.65,1.82,.1,12),'#dfd6b0',ls.x,.04,ls.z);
      }
    } else if(id==='caves'){
      [-1,1].forEach(function(sd){
        block(8,7,length,'#3c5361',sd*20,2.9,middle);
        for(var ci=0;ci<main.length;ci+=4){ var cs=main[ci];
          add(cone(2.4,4.6,6),'#486071',sd*13,1.9,cs.z);
          add(cone(1.4,3.2,6),'#435667',sd*10,-.3,cs.z-1.8,Math.PI);
        }
      });
    } else if(id==='patterns'){
      for(var pi=0;pi<main.length;pi+=3){ var ps=main[pi];
        add(cyl(4.5,5,.34,8),['#ca929d','#dcb090','#91b7b0'][Math.floor(pi/3)%3],ps.x,-.13,ps.z);
      }
    } else if(id==='beach'){
      sea(18.3,33.4,'#58b5c0',-.31);
      block(15.6,.13,length,'#f3dba9',-6.2,-.27,middle);
      block(1.4,.08,length,'#f8efe0',1.8,-.22,middle);
      main.forEach(function(s){ if(s.x>.5) add(cyl(1.75,2,.22,12),'#f0d7a7',s.x,-.17,s.z); });
      for(var bi=0;bi<main.length;bi+=3){ var bs=main[bi];
        add(cyl(2.5,3,.18,12),'#f0d7a7',bs.x,-.17,bs.z);
      }
    } else if(id==='light'){
      sea(18.3,33.4,'#4d9ba9',-.32);
      block(15.6,.42,length,'#8b9b93',-6.2,-.12,middle);
      block(1.2,1.15,length,'#677e78',1.6,-.78,middle);
      main.forEach(function(s){ if(s.x>.5) add(cyl(1.8,2,.3,10),'#879a92',s.x,-.13,s.z); });
    } else if(id==='captain'){
      sea(0,70,'#3b8498',-.31);
      block(16,.52,length,'#654531',0,-.34,middle);
      [-1,1].forEach(function(sd){
        block(.65,1.15,length,'#8a6040',sd*8,-.08,middle);
        block(.22,.17,length,'#d6b580',sd*8,.55,middle);
        for(var ri=0;ri<main.length;ri+=3){
          post(.1,1.15,'#72523b',sd*8,.1,main[ri].z);
        }
      });
    }
    function town(){
      foundations('#a9afb0');
      harborBoat(2.65,-8.5,0); harborBoat(3.15,-18,1);
      function shop(x,y,z,n){
        var wall=n%3===0?'#f5dbc1':n%3===1?'#d8e6dd':'#e8d5d5', roof=n%2?'#335b72':'#aa4e58';
        block(3.8,2.9,2.7,wall,x,y+1.45,z);
        block(4.25,.28,3.05,roof,x,y+2.96,z); block(4.45,.18,.26,'#e7b889',x,y+2.73,z+1.48);
        // Separate roof ridges and deep eaves give the street its Korean harbor profile.
        block(4.1,.16,.2,'#243d50',x,y+3.19,z-1.28);
        block(.9,1.65,.12,'#7c5245',x,y+.83,z+1.42);
        [-1,1].forEach(function(sd){
          block(.68,.73,.13,'#47758a',x+sd*1.22,y+1.75,z+1.42);
          block(.72,.1,.19,'#f0be84',x+sd*1.22,y+2.16,z+1.45);
          block(.1,.8,.2,'#f0be84',x+sd*1.22,y+1.75,z+1.51);
        });
        block(1.45,.38,.13,n%2?'#b84e65':'#547c87',x,y+2.35,z+1.51);
        lantern(x+2.55,y,z+1.3,'#ffd58c');
      }
      main.forEach(function(s,i){ if(i%4!==1) return; placed(s,-1,5.7,0,function(x,y,z){ shop(x,y,z,i); }); });
      for(var k=4;k<main.length;k+=9) placed(main[k],1,5.7,0,function(x,y,z){
        block(3.1,.18,2.2,'#936443',x,y+.1,z); for(var j=-1;j<=1;j++) block(.14,.12,2.2,'#c39161',x+j*.95,y+.23,z);
        post(.12,2.5,'#754c38',x-1.3,y,z); post(.12,2.5,'#754c38',x+1.3,y,z);
        block(2.8,.16,.14,'#e8cc9c',x,y+2.45,z);
      });
    }
    function lagoon(){
      foundations('#7fbdad');
      function reeds(x,y,z){ for(var j=0;j<5;j++){ var dx=(j-2)*.25, h=1.7+(j%3)*.37;
        add(cyl(.025,.05,h,5),'#408970',x+dx,y+h/2,z+(j%2)*.18,0,0,dx*.23);
        add(cyl(.075,.09,.37,6),'#ac8251',x+dx+dx*.12,y+h-.1,z+(j%2)*.18);
      } }
      main.forEach(function(s,i){ if(i%3!==0) return; var sd=pathSide(s,i);
        placed(s,sd,4.4,0,function(x,y,z){
          add(cyl(1.2,1.35,.22,10),'#8cb9a4',x,y+.07,z);
          add(cyl(.83,.91,.17,10),'#e4d7a8',x+.35,y+.2,z+.35);
          reeds(x-1.3,y,z-.5);
          if(i%2===0){ orb(.34,'#f9a8c4',x+.45,y+.48,z-.3); orb(.18,'#ffe4b3',x+.55,y+.78,z-.28); }
        });
        placed(s,-sd,5.4,1,function(x,y,z){ reeds(x,y,z); reeds(x+1,y,z+.6); });
      });
      for(var k=4;k<main.length;k+=8) placed(main[k],-pathSide(main[k],k),6,0,function(x,y,z){
        post(.17,2.6,'#7a604d',x-1.4,y,z); post(.17,2.6,'#7a604d',x+1.4,y,z);
        block(3,.19,.55,'#b59568',x,y+2.45,z); block(2.6,.13,.44,'#5b907e',x,y+2.15,z);
      });
    }
    function caves(){
      if(view.scene.fog){ view.scene.fog.color.set('#284354'); view.scene.fog.near=12; view.scene.fog.far=47; }
      foundations('#7b93a3');
      function arch(x,y,z,n){
        var col=n%2?'#555b78':'#45687a';
        add(cyl(.54,.82,4,7),col,x-2,y+2,z,0,0,-.18);
        add(cyl(.54,.82,4,7),col,x+2,y+2,z,0,0,.18);
        block(4.2,.6,1.1,col,x,y+4.25,z);
        [-1,1].forEach(function(sd){ crystal(x+sd*2.3,y,z+.7,.9,sd<0?'#9dbfe1':'#90e4d8'); });
        crystal(x,y+4.4,z,.8,'#9bd9ef');
      }
      for(var i=3;i<main.length;i+=7){ var s=main[i]; arch(s.x,(s.y||0)-.28,s.z,i); }
      main.forEach(function(s,i){ if(i%3!==1) return; var sd=pathSide(s,i);
        placed(s,sd,4.6,0,function(x,y,z){ crystal(x,y,z,1.25,i%2?'#79d5dc':'#aaa7e9'); crystal(x+1,y,z+.65,.65,'#c5eaff'); });
        placed(s,-sd,5.2,-1,function(x,y,z){
          add(cone(.8,2,7),'#556878',x,y+1,z); crystal(x+.8,y,z,.58,'#8de4e4');
        });
      });
    }
    function patterns(){
      foundations('#d7b1a1');
      function terrace(x,y,z,i){
        var pal=['#d88891','#e9b878','#9badd0','#80bfae'];
        for(var l=0;l<3;l++){
          var rr=2.55-l*.48, h=.55;
          add(cyl(rr,rr+.14,h,8),pal[(i+l)%4],x,y+h/2+l*.57,z,0,l*.2);
          add(torus(rr-.16,.085),'#ffe7ce',x,y+h+l*.57,z,Math.PI/2);
        }
        coral(x,y+1.65,z,.9,pal[(i+2)%4]);
      }
      main.forEach(function(s,i){ if(i%4!==1) return; var sd=pathSide(s,i);
        placed(s,sd,5,0,function(x,y,z){ terrace(x,y,z,i); });
        placed(s,-sd,5.4,1,function(x,y,z){ terrace(x,y,z,i+2); });
      });
      // Repeated colored blocks follow each rise like a board-game pattern.
      main.forEach(function(s,i){ if(i%2) return; var sd=pathSide(s,i), p=at(s,sd,2.25,0);
        block(.48,.18,.48,['#eaa0a2','#f3cc86','#8ebdc7','#bba6d9'][Math.floor(i/2)%4],p[0],p[1]+.13,p[2],Math.PI/4);
      });
    }
    function beach(){
      foundations('#f2dcad');
      function palm(x,y,z,i){
        var h=3.8+(i%3)*.45;
        add(cyl(.16,.25,h,8),'#a77b54',x,y+h/2,z,0,0,.11);
        orb(.38,'#c79c68',x+.22,y+h,z);
        for(var j=0;j<6;j++){ var a=j*Math.PI/3;
          var leaf=add(cone(.45,2.3,5),j%2?'#5eaa76':'#3a9277',x+.22+Math.cos(a)*1.05,y+h-.2,z+Math.sin(a)*1.05);
          leaf.rotation.z=Math.cos(a)*1.18; leaf.rotation.x=-Math.sin(a)*1.18;
        }
        for(var c=0;c<3;c++) orb(.16,'#9a7045',x+.22+(c-1)*.2,y+h-.38,z+.18);
      }
      function bottle(x,y,z){
        add(cyl(.27,.33,.75,10),'#8fc9bb',x,y+.45,z,0,0,.36);
        add(cyl(.11,.11,.32,10),'#addbd0',x-.15,y+.91,z,0,0,.36);
        add(cyl(.12,.12,.12,8),'#b98754',x-.2,y+1.09,z,0,0,.36);
        block(.42,.3,.06,'#fff0d0',x,y+.48,z+.27,.36);
      }
      main.forEach(function(s,i){ if(i%4!==0) return; var sd=pathSide(s,i);
        placed(s,sd,5.5,0,function(x,y,z){ palm(x,y,z,i); bottle(x+1.3,y,z+.8); });
        placed(s,-sd,4.7,1,function(x,y,z){
          add(cyl(1.5,1.7,.36,10),'#eac991',x,y+.12,z);
          for(var j=0;j<3;j++) orb(.22,['#e58f87','#f7e3bc','#e8ad78'][j],x-.6+j*.52,y+.39,z+.4);
        });
      });
    }
    function light(){
      if(view.scene.fog){ view.scene.fog.color.set('#9ac4d2'); view.scene.fog.far=55; }
      foundations('#b9b8aa');
      function cliff(x,y,z,i){
        var h=2.5+(i%3)*.75;
        add(cyl(2.1,2.55,h,8),'#7d8d8d',x,y+h/2,z);
        add(cyl(2.25,2.3,.32,8),'#b7b8a5',x,y+h+.08,z);
        for(var j=0;j<3;j++) add(cone(.46,1.1,6),'#5f8584',x+(j-1)*1.1,y+h+.63,z+.7);
      }
      main.forEach(function(s,i){ if(i%5!==1) return; placed(s,-1,6.1,0,function(x,y,z){ cliff(x,y,z,i); }); });
      var mid=main[Math.floor(main.length*.5)] || main[0];
      if(mid) placed(mid,-1,8.5,0,function(x,y,z){
        add(cyl(3,3.5,3.2,12),'#747f81',x,y+1.6,z);
        add(cyl(2.7,2.85,.35,12),'#e4d9be',x,y+3.37,z);
        for(var l=0;l<5;l++) add(cyl(l%2?1.1:1.18,l%2?1.12:1.2,1.08,12),l%2?'#d75d5d':'#fff0dc',x,y+4.1+l*1.07,z);
        add(cyl(1.5,1.5,.26,12),'#384f5c',x,y+9.55,z);
        add(cyl(1.05,1.05,1.15,12),'#ffe09b',x,y+10.24,z);
        for(var k=0;k<6;k++){ var a=k*Math.PI/3; post(.06,1.08,'#354e60',x+Math.cos(a)*1.06,y+9.65,z+Math.sin(a)*1.06); }
        add(cone(1.68,.83,12),'#c9545e',x,y+11.22,z);
      });
    }
    function captain(){
      // Seven colored watch sections repeat along the voyage; the walkway stays below the tiles.
      var watch=['#b75863','#d99a5f','#e8c273','#74a4aa','#6d829e','#a185ab','#8ba578'];
      main.forEach(function(s,i){
        var c=watch[Math.floor(i/5)%7], y=(s.y||0)-.24;
        block(5.1,.24,2.38,'#805a42',s.x,y,s.z);
        for(var j=-1;j<=1;j++) block(4.9,.08,.12,'#b7875b',s.x,y+.15,s.z+j*.67);
        if(i%5!==0) return;
        var sd=pathSide(s,i), p=at(s,sd,3.25,0), q=at(s,-sd,3.25,0);
        post(.13,2.9,'#72513c',p[0],p[1],p[2]); post(.13,2.9,'#72513c',q[0],q[1],q[2]);
        block(6.6,.18,.18,c,s.x,(s.y||0)+2.72,s.z);
        add(cone(.52,.72,3),c,s.x,(s.y||0)+3.1,s.z,0,0,Math.PI/2);
        [-1,1].forEach(function(side){ var r=at(s,side,4.5,1.1);
          block(1.2,1,.82,'#976945',r[0],r[1]+.5,r[2]);
          block(1.3,.11,.9,c,r[0],r[1]+1.03,r[2]);
        });
      });
      for(var k=2;k<main.length;k+=8){ var s=main[k];
        var p=at(s,pathSide(s,k),5,0);
        post(.2,3.8,'#765138',p[0],p[1],p[2]);
        add(torus(.75,.08),'#ebd4a0',p[0],p[1]+2.9,p[2],0,Math.PI/2);
        for(var n=0;n<6;n++){ var a=n*Math.PI/3;
          block(.07,1.4,.08,'#c39760',p[0]+Math.cos(a)*.35,p[1]+2.9+Math.sin(a)*.35,p[2]+.1,a);
        }
      }
    }
    ({ town:town, lagoon:lagoon, caves:caves, patterns:patterns, beach:beach, light:light, captain:captain })[id]();
    // Chunked baked meshes use the same fast path and fog as the original board scenery.
    var merged = reef3dMerge(root,view.rig,view.bake);
    merged.name = root.name; view.scene.add(merged);
    view.regionScenery = merged;
  };
