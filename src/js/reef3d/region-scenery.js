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
    function pebble(x,y,z,r,col){
      var p=add(cyl(r*.85,r,.14,7),col,x,y+.06,z,0,(x+z)*.43);
      p.scale.z=.67; return p;
    }
    function seaGrass(x,y,z,k,col){
      for(var j=0;j<4;j++){
        var q=(j-1.5)*.19, blade=add(cone(.09*k,(.65+(j%3)*.19)*k,5),col,x+q,y+.39*k,z+(j%2)*.16);
        blade.rotation.z=q*.9;
      }
    }
    function shoreSpray(x,y,z,col){
      for(var j=0;j<5;j++){
        var p=add(torus(.31+j*.1,.025),col,x+(j%2)*.28,y,z+j*.39,Math.PI/2);
        p.scale.y=.43;
      }
    }
    function ropeCoil(x,y,z){
      for(var j=0;j<3;j++) add(torus(.38+j*.09,.045),'#dcc28a',x,y+j*.065,z,Math.PI/2);
    }
    function plankLines(x,w,y,z0,z1,step,col){
      for(var z=z0;z>z1;z-=step){
        block(w,.018,.055,col,x,y,z);
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
      block(.1,.09,length,'#ebd7a7',1.25,-.23,middle);
      plankLines(-6.1,13.7,-.224,5,-length+5,2.5,'#a8aaa3');
      // The route occasionally reaches over the harbor; short timber piers
      // carry those tiles while leaving blue water visible between them.
      main.forEach(function(s,i){ if(s.x<.55) return;
        block(4.8,.18,2.8,'#a67b55',s.x,-.27,s.z);
        for(var dj=-1;dj<=1;dj++) block(4.8,.05,.1,'#d4aa75',s.x,-.14,s.z+dj*.83);
        if(i%2===0) post(.12,1.1,'#7e6049',s.x+2.15,-.4,s.z+1.1);
      });
    } else if(id==='lagoon'){
      sea(0,70,'#4cabb0',-.3);
      for(var la=0;la<main.length;la+=2){ var lz=main[la].z;
        pebble(-10,-.24,lz,2.4,'#7ab9aa'); pebble(10,-.24,lz-1.1,1.9,'#83bca8');
        shoreSpray(-8,-.24,lz-.4,'#b9e4d1');
      }
      for(var li=0;li<main.length;li+=2){ var ls=main[li];
        add(cyl(2.2,2.45,.22,12),'#a9c9ae',ls.x,-.17,ls.z);
        add(cyl(1.65,1.82,.08,12),'#dfd6b0',ls.x,-.095,ls.z);
      }
    } else if(id==='caves'){
      [-1,1].forEach(function(sd){
        block(8,7,length,'#3c5361',sd*20,2.9,middle);
        block(1.6,4.9,length,'#536777',sd*16.7,1.9,middle);
        for(var ci=0;ci<main.length;ci+=4){ var cs=main[ci];
          add(cyl(1.1,2.35,4.2,6),'#486071',sd*14.8,1.72,cs.z);
          add(cone(1.25,2.8,6),'#435667',sd*14,4.1,cs.z-1.8,Math.PI);
          block(3.2,.12,1.7,'#708090',sd*15.4,1.35,cs.z-1.7,sd*.23);
        }
      });
      for(var cv=0;cv<main.length;cv+=3){ var cz=main[cv].z;
        pebble(-7,-.26,cz,1.7,'#566c79'); pebble(8,-.26,cz-1,1.2,'#526876');
      }
    } else if(id==='patterns'){
      for(var pi=0;pi<main.length;pi+=3){ var ps=main[pi], pc=['#ca929d','#dcb090','#91b7b0'][Math.floor(pi/3)%3];
        add(cyl(3.4,4.1,.2,9),pc,ps.x,-.22,ps.z);
        pebble(ps.x+2,-.14,ps.z-1,1.1,'#d6b7a7');
      }
    } else if(id==='beach'){
      sea(18.3,33.4,'#58b5c0',-.31);
      block(15.6,.13,length,'#f3dba9',-6.2,-.27,middle);
      block(1.4,.08,length,'#f8efe0',1.8,-.22,middle);
      for(var bz=3;bz>middle-length/2;bz-=3.9){
        shoreSpray(2.8,-.18,bz,'#e7f8e9');
        pebble(-8.5,-.18,bz-.5,.65,'#ebc999');
      }
      main.forEach(function(s){ if(s.x>.5) add(cyl(1.75,2,.22,12),'#f0d7a7',s.x,-.17,s.z); });
      for(var bi=0;bi<main.length;bi+=3){ var bs=main[bi];
        add(cyl(2.5,3,.18,12),'#f0d7a7',bs.x,-.17,bs.z);
      }
    } else if(id==='light'){
      sea(18.3,33.4,'#4d9ba9',-.32);
      block(15.6,.34,length,'#8b9b93',-6.2,-.21,middle);
      block(1.2,1.15,length,'#677e78',1.6,-.78,middle);
      for(var lx=3;lx>middle-length/2;lx-=4){
        block(3.8,.03,.09,'#c6c6b2',-7.6,.12,lx,.18);
        pebble(-12.4,.12,lx-.7,.8,'#aab1a2');
      }
      main.forEach(function(s){ if(s.x>.5) add(cyl(1.8,2,.22,10),'#879a92',s.x,-.17,s.z); });
    } else if(id==='captain'){
      sea(0,70,'#3b8498',-.31);
      block(16,.52,length,'#654531',0,-.34,middle);
      plankLines(0,15.1,-.063,5,-length+5,.92,'#a17750');
      plankLines(0,15.1,-.05,4.55,-length+5,4.6,'#533d32');
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
      harborBoat(6.6,-3.2,1); harborBoat(8,-8.5,0); harborBoat(10,-22,1);
      function shop(x,y,z,n){
        var wall=n%3===0?'#f5dbc1':n%3===1?'#d8e6dd':'#e8d5d5', roof=n%2?'#335b72':'#aa4e58';
        block(4.05,2.9,4.25,wall,x,y+1.45,z);
        block(4.4,.2,4.45,roof,x,y+2.98,z);
        // Sloped, deep eaves and narrow tiles make a recognizable harbor street.
        block(4.55,.17,2.55,roof,x,y+3.36,z-1.05,0); root.children[root.children.length-1].rotation.x=-.31;
        block(4.55,.17,2.55,roof,x,y+3.36,z+1.05,0); root.children[root.children.length-1].rotation.x=.31;
        block(4.7,.14,.16,'#243d50',x,y+3.76,z);
        for(var rt=-1;rt<=1;rt++) block(.08,.08,4.35,'#e8b887',x+rt*1.6,y+3.52,z);
        block(4.45,.18,.25,'#e7b889',x,y+2.68,z+2.18);
        block(.95,1.68,.12,'#7c5245',x,y+.83,z+2.16);
        block(.25,.15,.13,'#eacb80',x+.29,y+.84,z+2.25);
        [-1,1].forEach(function(sd){
          block(.69,.78,.13,'#47758a',x+sd*1.25,y+1.75,z+2.17);
          block(.79,.09,.2,'#f0be84',x+sd*1.25,y+2.18,z+2.22);
          block(.1,.82,.2,'#f0be84',x+sd*1.25,y+1.75,z+2.24);
          block(.65,.3,.12,'#78968c',x+sd*1.25,y+.47,z+2.24);
        });
        block(2.1,.42,.14,n%2?'#b84e65':'#547c87',x,y+2.36,z+2.27);
        for(var aw=-1;aw<=1;aw++) block(.67,.12,.88,aw===0?'#f7e2b7':roof,x+aw*.72,y+2.13,z+2.65);
        block(3.8,.12,.9,'#ad9e84',x,y+.07,z+2.53);
        lantern(x+2.7,y,z+1.3,'#ffd58c');
      }
      main.forEach(function(s,i){ if(i%3!==1) return; placed(s,-1,6.2,0,function(x,y,z){ shop(x,y,z,i); }); });
      main.forEach(function(s,i){ if(i%2) return; placed(s,-1,3.4,0,function(x,y,z){
        pebble(x,y,z,.5,'#eee1c8'); pebble(x-.55,y,z-.6,.36,'#e3d5be');
      }); });
      for(var k=4;k<main.length;k+=9) placed(main[k],1,5.7,0,function(x,y,z){
        block(3.1,.18,2.2,'#936443',x,y+.1,z); for(var j=-1;j<=1;j++) block(.14,.12,2.2,'#c39161',x+j*.95,y+.23,z);
        post(.12,2.5,'#754c38',x-1.3,y,z); post(.12,2.5,'#754c38',x+1.3,y,z);
        block(2.8,.16,.14,'#e8cc9c',x,y+2.45,z);
        block(.8,.73,.8,'#b8784e',x-.75,y+.55,z-.2);
        add(cyl(.44,.49,.85,8),'#987052',x+.65,y+.53,z+.2);
        ropeCoil(x,y+.26,z+.9);
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
          seaGrass(x+.8,y+.12,z-.6,.75,'#52957f');
          pebble(x-.6,y+.1,z+.8,.3,'#f0d8a8');
          if(i%2===0){ orb(.34,'#f9a8c4',x+.45,y+.48,z-.3); orb(.18,'#ffe4b3',x+.55,y+.78,z-.28); }
        });
        placed(s,-sd,5.4,1,function(x,y,z){ reeds(x,y,z); reeds(x+1,y,z+.6); });
      });
      for(var lp=2;lp<main.length;lp+=5){ var ls=main[lp], d=pathSide(ls,lp);
        placed(ls,d,7.6,-1.3,function(x,y,z){
          add(cyl(1.9,2.2,.28,9),'#c2cda9',x,y+.09,z);
          add(cyl(1.35,1.48,.12,9),'#f2dbb4',x,y+.29,z);
          coral(x+.6,y+.36,z-.25,.8,'#e38b91');
          seaGrass(x-.8,y+.33,z+.45,1.1,'#3f997f');
        });
      }
      for(var k=4;k<main.length;k+=8) placed(main[k],-pathSide(main[k],k),6,0,function(x,y,z){
        post(.17,2.6,'#7a604d',x-1.4,y,z); post(.17,2.6,'#7a604d',x+1.4,y,z);
        block(3,.19,.55,'#b59568',x,y+2.45,z); block(2.6,.13,.44,'#5b907e',x,y+2.15,z);
      });
    }
    function caves(){
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#20343f':'#526d7b'); view.scene.fog.near=12; view.scene.fog.far=47; }
      foundations('#7b93a3');
      for(var i=2;i<main.length;i+=5){ var s=main[i], z=s.z;
        [-1,1].forEach(function(sd){
          add(cyl(1.15,1.9,3.8,7),'#455d70',sd*9,-.27+1.9,z);
          add(cone(1.7,2.2,7),'#3f566a',sd*9,4.7,z-.8,Math.PI);
          block(2.4,.2,1.1,'#7b88a1',sd*9.2,2.5,z-1.1,sd*.4);
          crystal(sd*8.1,-.27,z+.7,.8,sd<0?'#9dbfe1':'#90e4d8');
        });
      }
      main.forEach(function(s,i){ if(i%3!==1) return; var sd=pathSide(s,i);
        placed(s,sd,4.6,0,function(x,y,z){ crystal(x,y,z,1.25,i%2?'#79d5dc':'#aaa7e9'); crystal(x+1,y,z+.65,.65,'#c5eaff'); });
        placed(s,-sd,5.2,-1,function(x,y,z){
          add(cone(.8,2,7),'#556878',x,y+1,z); crystal(x+.8,y,z,.58,'#8de4e4');
        });
      });
      for(var c=1;c<main.length;c+=4){ var v=main[c];
        for(var p=0;p<4;p++) pebble(v.x+(p-1.5)*.5,-.24,v.z-1.2-(p%2)*.48,.13+p*.07,p%2?'#8fa4a8':'#a3a4c3');
      }
      [[-3,1.2,0],[-6.4,-8.5,1],[8.4,-5.2,2]].forEach(function(near){
        var x=near[0], z=near[1], n=near[2], colors=['#8cdde1','#b9a7e5','#7bd3cf'];
        add(cyl(n===0?1.35:1.5,n===0?1.55:1.85,.32,8),'#536e7b',x,-.12,z);
        add(cyl(1.12,1.28,.12,8),'#708c99',x+.18,.07,z-.14);
        crystal(x-.35,.13,z-.18,.55,colors[n]);
        crystal(x+.6,.12,z+.35,.34,'#c8e9ee');
        pebble(x-.8,.03,z+.65,.24,'#a9a4cc');
      });
    }
    function patterns(){
      foundations('#d7b1a1');
      function terrace(x,y,z,i){
        var pal=['#d88891','#e9b878','#9badd0','#80bfae'], k=i%4;
        add(cyl(1.75,2,.34,9),pal[k],x,y+.18,z);
        add(cyl(1.25,1.45,.25,9),pal[(k+1)%4],x-.52,y+.47,z-.48);
        add(cyl(.92,1.13,.22,9),pal[(k+2)%4],x+.7,y+.42,z+.73);
        coral(x-.56,y+.59,z-.52,.8,pal[(k+3)%4]);
        coral(x+.85,y+.52,z+.63,.46,pal[(k+1)%4]);
        seaGrass(x-1.25,y+.36,z+.57,.72,'#669f9a');
        pebble(x+1.45,y,z-.6,.32,'#f0d8bb');
      }
      main.forEach(function(s,i){ if(i%3!==1) return; var sd=pathSide(s,i);
        placed(s,sd,5,0,function(x,y,z){ terrace(x,y,z,i); });
        placed(s,-sd,5.4,1,function(x,y,z){ terrace(x,y,z,i+2); });
      });
      main.forEach(function(s,i){ if(i%2) return; var sd=pathSide(s,i), p=at(s,sd,3.2,0);
        pebble(p[0],p[1],p[2],.44,['#eaa0a2','#f3cc86','#8ebdc7','#bba6d9'][Math.floor(i/2)%4]);
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
          seaGrass(x-1.3,y+.2,z-.7,.72,'#7dac77');
        });
      });
      main.forEach(function(s,i){ if(i%3!==2) return;
        placed(s,-1,3.7,-.7,function(x,y,z){
          pebble(x,y,z,.35,'#f5b2a0'); pebble(x-.7,y,z+.35,.2,'#f7f0d0');
          seaGrass(x+.7,y,z-.45,.55,'#79aa7d');
        });
      });
    }
    function light(){
      if(view.scene.fog){ view.scene.fog.color.set(view.night?'#334c57':'#9ac4d2'); view.scene.fog.far=55; }
      foundations('#b9b8aa');
      function cliff(x,y,z,i){
        var h=2.5+(i%3)*.75;
        add(cyl(2.1,2.55,h,8),'#7d8d8d',x,y+h/2,z);
        add(cyl(2.25,2.3,.32,8),'#b7b8a5',x,y+h+.08,z);
        for(var j=0;j<3;j++) add(cone(.46,1.1,6),'#5f8584',x+(j-1)*1.1,y+h+.63,z+.7);
      }
      main.forEach(function(s,i){ if(i%5!==1) return; placed(s,-1,6.1,0,function(x,y,z){ cliff(x,y,z,i); }); });
      main.forEach(function(s,i){ if(i%4!==0) return;
        placed(s,-1,4.3,-.3,function(x,y,z){
          pebble(x,y+.1,z,.7,'#b6b9a7');
          seaGrass(x-.7,y+.19,z+.5,.72,'#608b77');
        });
      });
      var mid=main[Math.min(6,main.length-1)] || main[0];
      if(mid) placed(mid,-1,8.5,0,function(x,y,z){
        add(cyl(3,3.5,3.2,12),'#747f81',x,y+1.6,z);
        add(cyl(2.7,2.85,.35,12),'#e4d9be',x,y+3.37,z);
        for(var q=0;q<6;q++){
          var ledgeAngle=q*Math.PI/3;
          block(1.1,.14,.34,'#a5aaa1',x+Math.cos(ledgeAngle)*2.3,y+1.1,z+Math.sin(ledgeAngle)*2.3,ledgeAngle);
        }
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
        var flag=at(s,-1,3.25,0);
        block(1.35,.18,.18,c,flag[0]-.55,(s.y||0)+2.72,s.z);
        add(cone(.42,.6,3),c,flag[0]-1.15,(s.y||0)+3.04,s.z,0,0,Math.PI/2);
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
      for(var d=1;d<main.length;d+=4){ var ds=main[d];
        [-1,1].forEach(function(sd){
          var x=sd*5.7, z=ds.z;
          ropeCoil(x,-.04,z);
          block(.9,.2,.22,'#c59b67',x,-.01,z-1.1);
          post(.07,.35,'#dcc394',x-.31,-.04,z-1.1);
          post(.07,.35,'#dcc394',x+.31,-.04,z-1.1);
        });
      }
      var mast=main[Math.min(4,main.length-1)];
      if(mast){ var mx=-6.5,mz=mast.z;
        post(.22,6.7,'#6e5139',mx,-.04,mz);
        block(4.8,.12,.12,'#b99866',mx-1.45,5.78,mz);
        var sail=new T.BufferGeometry();
        sail.setAttribute('position',new T.Float32BufferAttribute([
          mx-3.7,5.65,mz, mx-.15,5.65,mz, mx-.15,.9,mz,
          mx-3.7,5.65,mz, mx-.15,.9,mz, mx-3.15,1.5,mz
        ],3)); sail.computeVertexNormals();
        root.add(mesh(sail,M('#f3dfb1',{side:T.DoubleSide}),0,0,0));
      }
    }
    ({ town:town, lagoon:lagoon, caves:caves, patterns:patterns, beach:beach, light:light, captain:captain })[id]();
    if(view.scene.fog && view.scene.background && view.scene.background.isColor)
      view.scene.background.copy(view.scene.fog.color);
    // Chunked baked meshes use the same fast path and fog as the original board scenery.
    var merged = reef3dMerge(root,view.rig,view.bake);
    merged.name = root.name; view.scene.add(merged);
    view.regionScenery = merged;
  };
